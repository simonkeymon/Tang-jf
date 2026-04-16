import { randomBytes, randomUUID } from 'node:crypto';

import bcrypt from 'bcryptjs';
import { and, eq, gt } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

import { getDb, isDatabaseEnabled } from '../../db/connection.js';
import { password_reset_tokens, refresh_tokens, users } from '../../db/schema/index.js';
import type { LoginInput, RefreshTokenInput, RegisterInput } from './auth.validator.js';

const PASSWORD_SALT_ROUNDS = 10;
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 30;

interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
}

export interface PasswordResetResult {
  success: true;
  resetToken?: string;
}

export interface AuthService {
  register(input: RegisterInput): Promise<AuthTokens>;
  bootstrapAdmin(input: RegisterInput): Promise<AuthTokens>;
  login(input: LoginInput): Promise<AuthTokens>;
  refresh(input: RefreshTokenInput): Promise<{ accessToken: string; user: AuthenticatedUser }>;
  logout(input: RefreshTokenInput): Promise<void>;
  authenticateAccessToken(token: string): Promise<AuthenticatedUser>;
  listUsers(): Promise<AuthenticatedUser[]>;
  hasAdminUsers(): Promise<boolean>;
  requestPasswordReset(email: string): Promise<PasswordResetResult>;
  resetPassword(token: string, nextPassword: string): Promise<void>;
}

export class AuthError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export function createAuthService(config: { jwtSecret: string }): AuthService {
  const usersById = new Map<string, StoredUser>();
  const usersByEmail = new Map<string, StoredUser>();
  const refreshTokens = new Map<string, string>();
  const passwordResetTokens = new Map<string, { userId: string; expiresAt: number }>();

  return {
    async register(input) {
      return createUserWithRole(input, resolveRoleForEmail(normalizeEmail(input.email)));
    },

    async bootstrapAdmin(input) {
      const hasAdmin = await this.hasAdminUsers();
      if (hasAdmin) {
        throw new AuthError(409, 'Admin account has already been initialized');
      }

      return createUserWithRole(input, 'admin');
    },

    async login(input) {
      const email = normalizeEmail(input.email);
      const db = getDb();

      if (db && isDatabaseEnabled()) {
        const records = await db.select().from(users).where(eq(users.email, email)).limit(1);
        const record = records[0];

        if (!record) {
          throw new AuthError(401, 'Invalid email or password');
        }

        const passwordMatches = await bcrypt.compare(input.password, record.password_hash);
        if (!passwordMatches) {
          throw new AuthError(401, 'Invalid email or password');
        }

        return issuePersistentAuthTokens(
          {
            id: record.id,
            email: record.email,
            passwordHash: record.password_hash,
            role: (record.role as 'user' | 'admin') ?? 'user',
          },
          config.jwtSecret,
        );
      }

      const storedUser = usersByEmail.get(email);
      if (!storedUser) {
        throw new AuthError(401, 'Invalid email or password');
      }

      const passwordMatches = await bcrypt.compare(input.password, storedUser.passwordHash);
      if (!passwordMatches) {
        throw new AuthError(401, 'Invalid email or password');
      }

      return issueInMemoryAuthTokens(storedUser, refreshTokens, config.jwtSecret);
    },

    async refresh(input) {
      const db = getDb();

      if (db && isDatabaseEnabled()) {
        const storedUser = await authenticatePersistentRefreshToken(
          input.refreshToken,
          config.jwtSecret,
        );
        const user = toAuthenticatedUser(storedUser);
        return {
          accessToken: createAccessToken(user, config.jwtSecret),
          user,
        };
      }

      const storedUser = authenticateInMemoryRefreshToken(
        input.refreshToken,
        refreshTokens,
        usersById,
        config.jwtSecret,
      );
      const user = toAuthenticatedUser(storedUser);

      return {
        accessToken: createAccessToken(user, config.jwtSecret),
        user,
      };
    },

    async logout(input) {
      const db = getDb();

      if (db && isDatabaseEnabled()) {
        await authenticatePersistentRefreshToken(input.refreshToken, config.jwtSecret);
        await db.delete(refresh_tokens).where(eq(refresh_tokens.token, input.refreshToken));
        return;
      }

      authenticateInMemoryRefreshToken(
        input.refreshToken,
        refreshTokens,
        usersById,
        config.jwtSecret,
      );
      refreshTokens.delete(input.refreshToken);
    },

    async authenticateAccessToken(token) {
      const payload = verifyTokenPayload(token, 'access', config.jwtSecret, 'Invalid access token');
      const db = getDb();

      if (db && isDatabaseEnabled()) {
        const records = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
        const record = records[0];
        if (!record) {
          throw new AuthError(401, 'Invalid access token');
        }

        return {
          id: record.id,
          email: record.email,
          role: (record.role as 'user' | 'admin') ?? 'user',
        };
      }

      const storedUser = usersById.get(payload.sub);
      if (!storedUser) {
        throw new AuthError(401, 'Invalid access token');
      }

      return toAuthenticatedUser(storedUser);
    },

    async listUsers() {
      const db = getDb();

      if (db && isDatabaseEnabled()) {
        const records = await db.select().from(users);
        return records.map((record) => ({
          id: record.id,
          email: record.email,
          role: (record.role as 'user' | 'admin') ?? 'user',
        }));
      }

      return [...usersById.values()].map(toAuthenticatedUser);
    },

    async hasAdminUsers() {
      const db = getDb();

      if (db && isDatabaseEnabled()) {
        const records = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
        return Boolean(records[0]);
      }

      return [...usersById.values()].some((user) => user.role === 'admin');
    },

    async requestPasswordReset(email) {
      const normalizedEmail = normalizeEmail(email);
      const db = getDb();

      if (db && isDatabaseEnabled()) {
        const records = await db
          .select()
          .from(users)
          .where(eq(users.email, normalizedEmail))
          .limit(1);
        const record = records[0];
        if (!record) {
          return { success: true };
        }

        const resetToken = randomBytes(24).toString('hex');
        const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

        await db.delete(password_reset_tokens).where(eq(password_reset_tokens.user_id, record.id));
        await db.insert(password_reset_tokens).values({
          token: resetToken,
          user_id: record.id,
          expires_at: expiresAt,
        });

        return {
          success: true,
          resetToken: process.env.NODE_ENV === 'production' ? undefined : resetToken,
        };
      }

      const user = usersByEmail.get(normalizedEmail);
      if (!user) {
        return { success: true };
      }

      const resetToken = randomBytes(24).toString('hex');
      passwordResetTokens.set(resetToken, {
        userId: user.id,
        expiresAt: Date.now() + PASSWORD_RESET_TTL_MS,
      });

      return {
        success: true,
        resetToken: process.env.NODE_ENV === 'production' ? undefined : resetToken,
      };
    },

    async resetPassword(token, nextPassword) {
      const db = getDb();

      if (db && isDatabaseEnabled()) {
        const tokenRecords = await db
          .select()
          .from(password_reset_tokens)
          .where(
            and(
              eq(password_reset_tokens.token, token),
              gt(password_reset_tokens.expires_at, new Date()),
            ),
          )
          .limit(1);
        const tokenRecord = tokenRecords[0];
        if (!tokenRecord) {
          throw new AuthError(400, 'Invalid or expired reset token');
        }

        const passwordHash = await bcrypt.hash(nextPassword, PASSWORD_SALT_ROUNDS);
        await db
          .update(users)
          .set({ password_hash: passwordHash, updated_at: new Date() })
          .where(eq(users.id, tokenRecord.user_id));
        await db
          .delete(password_reset_tokens)
          .where(eq(password_reset_tokens.user_id, tokenRecord.user_id));
        await db.delete(refresh_tokens).where(eq(refresh_tokens.user_id, tokenRecord.user_id));
        return;
      }

      const tokenRecord = passwordResetTokens.get(token);
      if (!tokenRecord || tokenRecord.expiresAt < Date.now()) {
        throw new AuthError(400, 'Invalid or expired reset token');
      }

      const user = usersById.get(tokenRecord.userId);
      if (!user) {
        throw new AuthError(400, 'Invalid or expired reset token');
      }

      user.passwordHash = await bcrypt.hash(nextPassword, PASSWORD_SALT_ROUNDS);
      usersById.set(user.id, user);
      usersByEmail.set(user.email, user);
      passwordResetTokens.delete(token);

      for (const [refreshToken, userId] of refreshTokens.entries()) {
        if (userId === user.id) {
          refreshTokens.delete(refreshToken);
        }
      }
    },
  };

  async function createUserWithRole(
    input: RegisterInput,
    role: 'user' | 'admin',
  ): Promise<AuthTokens> {
    const email = normalizeEmail(input.email);
    const db = getDb();

    if (db && isDatabaseEnabled()) {
      const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existing[0]) {
        throw new AuthError(409, 'Email is already registered');
      }

      const storedUser: StoredUser = {
        id: randomUUID(),
        email,
        passwordHash: await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS),
        role,
      };

      await db.insert(users).values({
        id: storedUser.id,
        email: storedUser.email,
        password_hash: storedUser.passwordHash,
        role: storedUser.role,
      });

      return issuePersistentAuthTokens(storedUser, config.jwtSecret);
    }

    if (usersByEmail.has(email)) {
      throw new AuthError(409, 'Email is already registered');
    }

    const storedUser: StoredUser = {
      id: randomUUID(),
      email,
      passwordHash: await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS),
      role,
    };

    usersById.set(storedUser.id, storedUser);
    usersByEmail.set(storedUser.email, storedUser);

    return issueInMemoryAuthTokens(storedUser, refreshTokens, config.jwtSecret);
  }

  async function issuePersistentAuthTokens(
    storedUser: StoredUser,
    jwtSecret: string,
  ): Promise<AuthTokens> {
    const user = toAuthenticatedUser(storedUser);
    const refreshToken = createRefreshToken(user, jwtSecret);
    const db = getDb();

    if (db) {
      await db.insert(refresh_tokens).values({
        token: refreshToken,
        user_id: storedUser.id,
        expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      });
    }

    return {
      accessToken: createAccessToken(user, jwtSecret),
      refreshToken,
      user,
    };
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function resolveRoleForEmail(email: string): 'user' | 'admin' {
  const adminEmails = (process.env.ADMIN_EMAILS ?? 'admin@example.com')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return adminEmails.includes(email) ? 'admin' : 'user';
}

function issueInMemoryAuthTokens(
  storedUser: StoredUser,
  refreshTokens: Map<string, string>,
  jwtSecret: string,
): AuthTokens {
  const user = toAuthenticatedUser(storedUser);
  const refreshToken = createRefreshToken(user, jwtSecret);

  refreshTokens.set(refreshToken, user.id);

  return {
    accessToken: createAccessToken(user, jwtSecret),
    refreshToken,
    user,
  };
}

function createAccessToken(user: AuthenticatedUser, jwtSecret: string): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenType: 'access',
    },
    jwtSecret,
    {
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      jwtid: randomUUID(),
    },
  );
}

function createRefreshToken(user: AuthenticatedUser, jwtSecret: string): string {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      tokenType: 'refresh',
    },
    jwtSecret,
    {
      expiresIn: REFRESH_TOKEN_TTL_SECONDS,
      jwtid: randomUUID(),
    },
  );
}

async function authenticatePersistentRefreshToken(
  token: string,
  jwtSecret: string,
): Promise<StoredUser> {
  const db = getDb();
  if (!db) {
    throw new AuthError(401, 'Invalid refresh token');
  }

  const payload = verifyTokenPayload(token, 'refresh', jwtSecret, 'Invalid refresh token');
  const tokenRecords = await db
    .select()
    .from(refresh_tokens)
    .where(and(eq(refresh_tokens.token, token), eq(refresh_tokens.user_id, payload.sub)))
    .limit(1);

  if (!tokenRecords[0]) {
    throw new AuthError(401, 'Invalid refresh token');
  }

  const userRecords = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
  const userRecord = userRecords[0];
  if (!userRecord) {
    throw new AuthError(401, 'Invalid refresh token');
  }

  return {
    id: userRecord.id,
    email: userRecord.email,
    passwordHash: userRecord.password_hash,
    role: (userRecord.role as 'user' | 'admin') ?? 'user',
  };
}

function authenticateInMemoryRefreshToken(
  token: string,
  refreshTokens: Map<string, string>,
  usersById: Map<string, StoredUser>,
  jwtSecret: string,
): StoredUser {
  const payload = verifyTokenPayload(token, 'refresh', jwtSecret, 'Invalid refresh token');

  if (refreshTokens.get(token) !== payload.sub) {
    throw new AuthError(401, 'Invalid refresh token');
  }

  const storedUser = usersById.get(payload.sub);
  if (!storedUser) {
    throw new AuthError(401, 'Invalid refresh token');
  }

  return storedUser;
}

function verifyTokenPayload(
  token: string,
  expectedTokenType: 'access' | 'refresh',
  jwtSecret: string,
  errorMessage: string,
): jwt.JwtPayload & { sub: string; tokenType: 'access' | 'refresh' } {
  let payload: jwt.JwtPayload | string;

  try {
    payload = jwt.verify(token, jwtSecret);
  } catch {
    throw new AuthError(401, errorMessage);
  }

  if (
    typeof payload === 'string' ||
    typeof payload.sub !== 'string' ||
    payload.tokenType !== expectedTokenType
  ) {
    throw new AuthError(401, errorMessage);
  }

  return payload as jwt.JwtPayload & { sub: string; tokenType: 'access' | 'refresh' };
}

function toAuthenticatedUser(user: StoredUser): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}

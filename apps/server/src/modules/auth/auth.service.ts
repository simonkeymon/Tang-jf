import { randomUUID } from 'node:crypto';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import type { LoginInput, RefreshTokenInput, RegisterInput } from './auth.validator.js';

const PASSWORD_SALT_ROUNDS = 10;
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
}

export interface AuthService {
  register(input: RegisterInput): Promise<AuthTokens>;
  login(input: LoginInput): Promise<AuthTokens>;
  refresh(input: RefreshTokenInput): { accessToken: string; user: AuthenticatedUser };
  logout(input: RefreshTokenInput): void;
  authenticateAccessToken(token: string): AuthenticatedUser;
  listUsers(): AuthenticatedUser[];
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

  return {
    async register(input) {
      const email = normalizeEmail(input.email);

      if (usersByEmail.has(email)) {
        throw new AuthError(409, 'Email is already registered');
      }

      const storedUser: StoredUser = {
        id: randomUUID(),
        email,
        passwordHash: await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS),
      };

      usersById.set(storedUser.id, storedUser);
      usersByEmail.set(storedUser.email, storedUser);

      return issueAuthTokens(storedUser, refreshTokens, config.jwtSecret);
    },

    async login(input) {
      const email = normalizeEmail(input.email);
      const storedUser = usersByEmail.get(email);

      if (!storedUser) {
        throw new AuthError(401, 'Invalid email or password');
      }

      const passwordMatches = await bcrypt.compare(input.password, storedUser.passwordHash);

      if (!passwordMatches) {
        throw new AuthError(401, 'Invalid email or password');
      }

      return issueAuthTokens(storedUser, refreshTokens, config.jwtSecret);
    },

    refresh(input) {
      const storedUser = authenticateRefreshToken(
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

    logout(input) {
      authenticateRefreshToken(input.refreshToken, refreshTokens, usersById, config.jwtSecret);
      refreshTokens.delete(input.refreshToken);
    },

    authenticateAccessToken(token) {
      const storedUser = authenticateToken(
        token,
        'access',
        usersById,
        config.jwtSecret,
        'Invalid access token',
      );

      if (!storedUser) {
        throw new AuthError(401, 'Invalid access token');
      }

      return toAuthenticatedUser(storedUser);
    },

    listUsers() {
      return [...usersById.values()].map(toAuthenticatedUser);
    },
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function issueAuthTokens(
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
      tokenType: 'refresh',
    },
    jwtSecret,
    {
      expiresIn: REFRESH_TOKEN_TTL_SECONDS,
      jwtid: randomUUID(),
    },
  );
}

function authenticateRefreshToken(
  token: string,
  refreshTokens: Map<string, string>,
  usersById: Map<string, StoredUser>,
  jwtSecret: string,
): StoredUser {
  const storedUser = authenticateToken(
    token,
    'refresh',
    usersById,
    jwtSecret,
    'Invalid refresh token',
  );

  if (refreshTokens.get(token) !== storedUser.id) {
    throw new AuthError(401, 'Invalid refresh token');
  }

  return storedUser;
}

function authenticateToken(
  token: string,
  expectedTokenType: 'access' | 'refresh',
  usersById: Map<string, StoredUser>,
  jwtSecret: string,
  errorMessage: string,
): StoredUser {
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

  const storedUser = usersById.get(payload.sub);

  if (!storedUser) {
    throw new AuthError(401, errorMessage);
  }

  return storedUser;
}

function toAuthenticatedUser(user: StoredUser): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
  };
}

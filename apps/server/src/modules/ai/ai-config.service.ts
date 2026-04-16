import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';

import type { AIConfig } from '@tang/shared';
import { eq } from 'drizzle-orm';

import { getDb, isDatabaseEnabled } from '../../db/connection.js';
import { ai_configs } from '../../db/schema/index.js';

export interface StoredAIConfig {
  base_url: string;
  encrypted_api_key: string;
  model: string;
  temperature: number;
  max_tokens: number;
  is_custom: boolean;
}

export interface AIConfigResponse {
  base_url: string;
  api_key: string | null;
  model: string;
  temperature: number;
  max_tokens: number;
  is_custom: boolean;
}

export interface AIConfigInput {
  base_url: string;
  api_key: string;
  model: string;
  temperature: number;
  max_tokens: number;
  is_custom: boolean;
}

export interface AIConfigService {
  getUserConfig(userId: string): AIConfigResponse | null;
  setUserConfig(userId: string, input: AIConfigInput): AIConfigResponse;
  getPlatformConfig(): AIConfigResponse | null;
  setPlatformConfig(input: AIConfigInput): AIConfigResponse;
  getRuntimeConfigForUser(userId: string): AIConfig | null;
}

const DEFAULT_ENCRYPTION_SECRET = 'dev-ai-config-secret';

function createEncryptionKey(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

function encryptApiKey(apiKey: string, secret: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', createEncryptionKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptApiKey(payload: string, secret: string): string {
  const [ivHex, encryptedHex] = payload.split(':');
  if (!ivHex || !encryptedHex) {
    throw new Error('Invalid encrypted API key payload');
  }

  const decipher = createDecipheriv(
    'aes-256-cbc',
    createEncryptionKey(secret),
    Buffer.from(ivHex, 'hex'),
  );

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return `${apiKey.slice(0, 2)}***`;
  }

  return `${apiKey.slice(0, 4)}***${apiKey.slice(-4)}`;
}

function toResponse(config: StoredAIConfig, secret: string): AIConfigResponse {
  const decrypted = decryptApiKey(config.encrypted_api_key, secret);

  return {
    base_url: config.base_url,
    api_key: maskApiKey(decrypted),
    model: config.model,
    temperature: config.temperature,
    max_tokens: config.max_tokens,
    is_custom: config.is_custom,
  };
}

function toRuntimeConfig(config: StoredAIConfig, secret: string): AIConfig {
  return {
    provider: 'openai-compatible',
    baseUrl: config.base_url,
    apiKey: decryptApiKey(config.encrypted_api_key, secret),
    model: config.model,
    temperature: config.temperature,
    maxTokens: config.max_tokens,
  };
}

export function createAIConfigService(options?: {
  encryptionSecret?: string;
}): AIConfigService & { hydrate?(): Promise<void> } {
  const encryptionSecret =
    options?.encryptionSecret ?? process.env.AI_CONFIG_SECRET ?? DEFAULT_ENCRYPTION_SECRET;
  const userConfigs = new Map<string, StoredAIConfig>();
  let platformConfig: StoredAIConfig | null = null;

  return {
    async hydrate() {
      const db = getDb();
      if (!db || !isDatabaseEnabled()) {
        return;
      }

      userConfigs.clear();
      platformConfig = null;

      const records = await db.select().from(ai_configs);
      for (const record of records) {
        const mapped: StoredAIConfig = {
          base_url: record.base_url,
          encrypted_api_key: record.encrypted_api_key,
          model: record.model,
          temperature: record.temperature,
          max_tokens: record.max_tokens,
          is_custom: record.is_custom,
        };

        if (record.scope === 'platform') {
          platformConfig = mapped;
        } else if (record.user_id) {
          userConfigs.set(record.user_id, mapped);
        }
      }
    },

    getUserConfig(userId) {
      const config = userConfigs.get(userId);
      return config ? toResponse(config, encryptionSecret) : null;
    },

    setUserConfig(userId, input) {
      const existing = userConfigs.get(userId);
      const encryptedApiKey = resolveEncryptedApiKey(existing, input.api_key, encryptionSecret);
      const stored: StoredAIConfig = {
        base_url: input.base_url,
        encrypted_api_key: encryptedApiKey,
        model: input.model,
        temperature: input.temperature,
        max_tokens: input.max_tokens,
        is_custom: input.is_custom,
      };

      userConfigs.set(userId, stored);
      persistAiConfig('user', userId, stored);
      return toResponse(stored, encryptionSecret);
    },

    getPlatformConfig() {
      return platformConfig ? toResponse(platformConfig, encryptionSecret) : null;
    },

    setPlatformConfig(input) {
      const encryptedApiKey = resolveEncryptedApiKey(
        platformConfig,
        input.api_key,
        encryptionSecret,
      );
      platformConfig = {
        base_url: input.base_url,
        encrypted_api_key: encryptedApiKey,
        model: input.model,
        temperature: input.temperature,
        max_tokens: input.max_tokens,
        is_custom: input.is_custom,
      };

      persistAiConfig('platform', null, platformConfig);
      return toResponse(platformConfig, encryptionSecret);
    },

    getRuntimeConfigForUser(userId) {
      const userConfig = userConfigs.get(userId);
      if (userConfig?.is_custom) {
        return toRuntimeConfig(userConfig, encryptionSecret);
      }

      if (platformConfig) {
        return toRuntimeConfig(platformConfig, encryptionSecret);
      }

      return null;
    },
  };

  function persistAiConfig(
    scope: 'user' | 'platform',
    userId: string | null,
    config: StoredAIConfig,
  ) {
    const db = getDb();
    if (!db || !isDatabaseEnabled()) {
      return;
    }

    const removeExisting =
      scope === 'platform'
        ? db.delete(ai_configs).where(eq(ai_configs.scope, 'platform'))
        : userId
          ? db.delete(ai_configs).where(eq(ai_configs.user_id, userId))
          : Promise.resolve();

    void (async () => {
      await removeExisting;
      await db.insert(ai_configs).values({
        id: randomUUID(),
        user_id: userId,
        scope,
        base_url: config.base_url,
        encrypted_api_key: config.encrypted_api_key,
        model: config.model,
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        is_custom: config.is_custom,
        created_at: new Date(),
        updated_at: new Date(),
      });
    })();
  }
}

function resolveEncryptedApiKey(
  existing: StoredAIConfig | null | undefined,
  apiKey: string,
  secret: string,
): string {
  const normalizedApiKey = apiKey.trim();

  if (normalizedApiKey.length > 0) {
    return encryptApiKey(normalizedApiKey, secret);
  }

  if (existing?.encrypted_api_key) {
    return existing.encrypted_api_key;
  }

  throw new Error('API key is required');
}

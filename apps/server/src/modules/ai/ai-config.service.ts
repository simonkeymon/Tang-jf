import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

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

export function createAIConfigService(options?: { encryptionSecret?: string }): AIConfigService {
  const encryptionSecret =
    options?.encryptionSecret ?? process.env.AI_CONFIG_SECRET ?? DEFAULT_ENCRYPTION_SECRET;
  const userConfigs = new Map<string, StoredAIConfig>();
  let platformConfig: StoredAIConfig | null = null;

  return {
    getUserConfig(userId) {
      const config = userConfigs.get(userId);
      return config ? toResponse(config, encryptionSecret) : null;
    },

    setUserConfig(userId, input) {
      const stored: StoredAIConfig = {
        base_url: input.base_url,
        encrypted_api_key: encryptApiKey(input.api_key, encryptionSecret),
        model: input.model,
        temperature: input.temperature,
        max_tokens: input.max_tokens,
        is_custom: input.is_custom,
      };

      userConfigs.set(userId, stored);
      return toResponse(stored, encryptionSecret);
    },

    getPlatformConfig() {
      return platformConfig ? toResponse(platformConfig, encryptionSecret) : null;
    },

    setPlatformConfig(input) {
      platformConfig = {
        base_url: input.base_url,
        encrypted_api_key: encryptApiKey(input.api_key, encryptionSecret),
        model: input.model,
        temperature: input.temperature,
        max_tokens: input.max_tokens,
        is_custom: input.is_custom,
      };

      return toResponse(platformConfig, encryptionSecret);
    },
  };
}

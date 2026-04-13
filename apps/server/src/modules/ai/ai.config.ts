import type { AIConfig } from '@tang/shared';

export interface AIConfigResolutionInput {
  platformDefault?: AIConfig;
  userConfig?: AIConfig;
  fallback?: AIConfig;
}

const DEFAULT_CONFIG: AIConfig = {
  provider: 'mock',
  model: 'mock-gpt',
  temperature: 0.2,
  maxTokens: 512,
};

export function resolveAIConfig(input: AIConfigResolutionInput = {}): AIConfig {
  return {
    ...DEFAULT_CONFIG,
    ...(input.fallback ?? {}),
    ...(input.platformDefault ?? {}),
    ...(input.userConfig ?? {}),
    provider:
      input.userConfig?.provider ??
      input.platformDefault?.provider ??
      input.fallback?.provider ??
      DEFAULT_CONFIG.provider,
  };
}

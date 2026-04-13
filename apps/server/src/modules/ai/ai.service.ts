import { AIClient } from '@tang/shared';
import type {
  AIChatMessage,
  AIConfig,
  AIStreamChunk,
  AITextResponse,
  AIVisionImageInput,
} from '@tang/shared';
import { resolveAIConfig } from './ai.config.js';
import {
  createAIRateLimiter,
  createAIUsageTracker,
  getUsageKey,
  withAIRetry,
} from './ai.middleware.js';

export interface AIServerService {
  chat(messages: AIChatMessage[], config?: AIConfig): Promise<AITextResponse>;
  chatWithVision(
    messages: AIChatMessage[],
    images: AIVisionImageInput[],
    config?: AIConfig,
  ): Promise<AITextResponse>;
  stream(messages: AIChatMessage[], config?: AIConfig): AsyncGenerator<AIStreamChunk, void, void>;
  getUsage(config?: AIConfig): {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    requestCount: number;
  };
}

export function createAIService(): AIServerService {
  const client = new AIClient();
  const usageTracker = createAIUsageTracker();
  const rateLimiter = createAIRateLimiter({ maxRequestsPerMinute: 5 });

  return {
    async chat(messages, config) {
      const resolvedConfig = withMockDefault(resolveAIConfig({ userConfig: config }));
      const key = getUsageKey(resolvedConfig);

      rateLimiter.check(key);
      const response = await withAIRetry(() => client.chat(messages, resolvedConfig));
      usageTracker.record(key, response);

      return response;
    },

    async chatWithVision(messages, images, config) {
      const resolvedConfig = withMockDefault(resolveAIConfig({ userConfig: config }));
      const key = getUsageKey(resolvedConfig);

      rateLimiter.check(key);
      const response = await withAIRetry(() =>
        client.chatWithVision(messages, images, resolvedConfig),
      );
      usageTracker.record(key, response);

      return response;
    },

    async *stream(messages, config) {
      const resolvedConfig = withMockDefault(resolveAIConfig({ userConfig: config }));
      const key = getUsageKey(resolvedConfig);

      rateLimiter.check(key);

      const chunks: AIStreamChunk[] = [];
      for await (const chunk of client.stream(messages, resolvedConfig)) {
        chunks.push(chunk);
        yield chunk;
      }

      const content = chunks
        .filter((chunk) => !chunk.done)
        .map((chunk) => chunk.content)
        .join('');
      usageTracker.record(key, {
        content,
        model: resolvedConfig.model ?? 'mock-gpt',
        provider: resolvedConfig.provider ?? 'mock',
        usage: {
          promptTokens: Math.max(
            1,
            Math.ceil(messages.map((message) => message.content).join('\n').length / 4),
          ),
          completionTokens: Math.max(1, Math.ceil(content.length / 4)),
          totalTokens:
            Math.max(
              1,
              Math.ceil(messages.map((message) => message.content).join('\n').length / 4),
            ) + Math.max(1, Math.ceil(content.length / 4)),
        },
      });
    },

    getUsage(config) {
      return usageTracker.getUsage(
        getUsageKey(withMockDefault(resolveAIConfig({ userConfig: config }))),
      );
    },
  };
}

function withMockDefault(config?: AIConfig): AIConfig {
  return {
    provider: config?.provider ?? 'mock',
    ...config,
  };
}

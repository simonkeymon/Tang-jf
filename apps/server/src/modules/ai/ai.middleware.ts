import type { AIConfig, AITextResponse } from '@tang/shared';

interface UsageTotals {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestCount: number;
}

interface RateLimitEntry {
  count: number;
  windowStartedAt: number;
}

export interface AIRateLimitOptions {
  maxRequestsPerMinute: number;
}

export interface AIUsageTracker {
  record(key: string, response: AITextResponse): void;
  getUsage(key: string): UsageTotals;
}

export interface AIRateLimiter {
  check(key: string): void;
}

export function createAIUsageTracker(): AIUsageTracker {
  const totals = new Map<string, UsageTotals>();

  return {
    record(key, response) {
      const current = totals.get(key) ?? {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        requestCount: 0,
      };

      totals.set(key, {
        promptTokens: current.promptTokens + response.usage.promptTokens,
        completionTokens: current.completionTokens + response.usage.completionTokens,
        totalTokens: current.totalTokens + response.usage.totalTokens,
        requestCount: current.requestCount + 1,
      });
    },

    getUsage(key) {
      return (
        totals.get(key) ?? {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          requestCount: 0,
        }
      );
    },
  };
}

export function createAIRateLimiter(options: AIRateLimitOptions): AIRateLimiter {
  const requests = new Map<string, RateLimitEntry>();
  const windowMs = 60_000;

  return {
    check(key) {
      const now = Date.now();
      const current = requests.get(key);

      if (!current || now - current.windowStartedAt >= windowMs) {
        requests.set(key, { count: 1, windowStartedAt: now });
        return;
      }

      if (current.count >= options.maxRequestsPerMinute) {
        throw new Error('AI rate limit exceeded');
      }

      current.count += 1;
      requests.set(key, current);
    },
  };
}

export async function withAIRetry<T>(operation: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) {
        break;
      }
    }
  }

  throw lastError;
}

export function getUsageKey(config?: AIConfig): string {
  return `${config?.provider ?? 'mock'}:${config?.model ?? 'mock-gpt'}`;
}

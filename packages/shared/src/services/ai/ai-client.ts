import type {
  AIChatMessage,
  AIConfig,
  AIProvider,
  AIStreamChunk,
  AITextResponse,
  AIVisionImageInput,
} from './ai-types.js';

const DEFAULT_MODEL = 'mock-gpt';

function getProvider(config?: AIConfig): AIProvider {
  return config?.provider ?? 'mock';
}

function getModel(config?: AIConfig): string {
  return config?.model ?? DEFAULT_MODEL;
}

function buildMockContent(
  messages: AIChatMessage[],
  config?: AIConfig,
  images?: AIVisionImageInput[],
): string {
  if (config?.mockResponse) {
    return config.mockResponse;
  }

  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
  const base = lastUserMessage?.content ?? 'mock-response';

  if (images && images.length > 0) {
    return `Mock vision analysis for: ${base} (${images.length} image${images.length > 1 ? 's' : ''})`;
  }

  return `Mock response for: ${base}`;
}

function estimateUsage(input: string, output: string) {
  const promptTokens = Math.max(1, Math.ceil(input.length / 4));
  const completionTokens = Math.max(1, Math.ceil(output.length / 4));

  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
}

async function requestOpenAICompatible(
  messages: AIChatMessage[],
  config: AIConfig,
  images?: AIVisionImageInput[],
): Promise<AITextResponse> {
  if (!config.baseUrl || !config.apiKey) {
    throw new Error('OpenAI-compatible provider requires baseUrl and apiKey');
  }

  const endpoint = config.baseUrl.replace(/\/$/, '');
  const body = {
    model: getModel(config),
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    messages: messages.map((message) => ({
      role: message.role,
      content:
        images && images.length > 0 && message.role === 'user'
          ? [
              { type: 'text', text: message.content },
              ...images.map((image) =>
                image.url
                  ? { type: 'image_url', image_url: { url: image.url } }
                  : {
                      type: 'image_url',
                      image_url: {
                        url: `data:${image.mimeType ?? 'image/jpeg'};base64,${image.base64 ?? ''}`,
                      },
                    },
              ),
            ]
          : message.content,
    })),
  };

  const response = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`AI request failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('AI response did not contain message content');
  }

  return {
    content,
    model: getModel(config),
    provider: 'openai-compatible',
    usage: {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
    },
  };
}

export class AIClient {
  async chat(messages: AIChatMessage[], config?: AIConfig): Promise<AITextResponse> {
    const provider = getProvider(config);
    if (provider === 'openai-compatible') {
      return requestOpenAICompatible(messages, config ?? {});
    }

    const content = buildMockContent(messages, config);
    const prompt = messages.map((message) => message.content).join('\n');

    return {
      content,
      model: getModel(config),
      provider: 'mock',
      usage: estimateUsage(prompt, content),
    };
  }

  async chatWithVision(
    messages: AIChatMessage[],
    images: AIVisionImageInput[],
    config?: AIConfig,
  ): Promise<AITextResponse> {
    const provider = getProvider(config);
    if (provider === 'openai-compatible') {
      return requestOpenAICompatible(messages, config ?? {}, images);
    }

    const content = buildMockContent(messages, config, images);
    const prompt = `${messages.map((message) => message.content).join('\n')}\nimages:${images.length}`;

    return {
      content,
      model: getModel(config),
      provider: 'mock',
      usage: estimateUsage(prompt, content),
    };
  }

  async *stream(
    messages: AIChatMessage[],
    config?: AIConfig,
  ): AsyncGenerator<AIStreamChunk, void, void> {
    const response = await this.chat(messages, config);
    const parts = response.content.split(' ');

    for (const [index, part] of parts.entries()) {
      yield {
        index,
        content: index === 0 ? part : ` ${part}`,
        done: false,
      };
    }

    yield {
      index: parts.length,
      content: '',
      done: true,
    };
  }
}

export type AIProvider = 'openai-compatible' | 'mock';

export interface AIConfig {
  provider?: AIProvider;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  mockResponse?: string;
}

export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIVisionImageInput {
  url?: string;
  base64?: string;
  mimeType?: string;
}

export interface AIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AITextResponse {
  content: string;
  model: string;
  provider: AIProvider;
  usage: AIUsage;
}

export interface AIStreamChunk {
  index: number;
  content: string;
  done: boolean;
}

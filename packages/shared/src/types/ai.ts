export type AIProvider = 'openai' | 'custom' | 'mock';

export interface AIConfig {
  provider: AIProvider;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface AIRequest {
  prompt: string;
  messages?: ChatMessage[];
  config?: AIConfig;
}

export interface AIResponse {
  reply: string;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}

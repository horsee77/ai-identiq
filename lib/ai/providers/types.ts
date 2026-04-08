export type AiMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

export type ChatCompletionRequest = {
  model: string;
  messages: AiMessage[];
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  tools?: unknown[];
  stream?: boolean;
};

export type ChatCompletionResponse = {
  content: string;
  inputTokens: number;
  outputTokens: number;
  finishReason?: string;
  raw?: unknown;
};

export type EmbeddingRequest = {
  model: string;
  input: string[];
};

export type EmbeddingResponse = {
  vectors: number[][];
  raw?: unknown;
};

export type ProviderCapabilities = {
  responses: boolean;
  chat: boolean;
  embeddings: boolean;
  tools: boolean;
  streaming: boolean;
  multimodal: boolean;
};

export type ProviderConfig = {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
  capabilities: ProviderCapabilities;
};

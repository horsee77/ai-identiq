import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ProviderCapabilities,
  ProviderConfig,
} from "@/lib/ai/providers/types";

export abstract class BaseAiProvider {
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  get id() {
    return this.config.id;
  }

  get capabilities(): ProviderCapabilities {
    return this.config.capabilities;
  }

  abstract chat(payload: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  abstract responses(payload: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  abstract embeddings(payload: EmbeddingRequest): Promise<EmbeddingResponse>;
  abstract health(): Promise<{ ok: boolean; message: string }>;
}

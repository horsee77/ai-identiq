import OpenAI from "openai";
import { BaseAiProvider } from "@/lib/ai/providers/base";
import type { ChatCompletionRequest, ChatCompletionResponse, EmbeddingRequest, EmbeddingResponse, ProviderConfig } from "@/lib/ai/providers/types";

export class OpenAiCompatibleProvider extends BaseAiProvider {
  private client: OpenAI;

  constructor(config: ProviderConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      timeout: config.timeoutMs,
    });
  }

  async chat(payload: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const messages = payload.messages.map((message) => {
      if (message.role === "tool") {
        return {
          role: "assistant",
          content: message.content,
        };
      }

      return {
        role: message.role,
        content: message.content,
      };
    });

    const completion = await (
      this.client.chat.completions as unknown as { create: (payload: unknown) => Promise<unknown> }
    ).create({
      model: payload.model,
      messages,
      temperature: payload.temperature,
      top_p: payload.topP,
      max_completion_tokens: payload.maxTokens,
      tools: payload.tools,
      stream: false,
    });

    const completionPayload = completion as OpenAI.Chat.Completions.ChatCompletion;
    const choice = completionPayload.choices[0];

    return {
      content: choice?.message?.content ?? "",
      inputTokens: completionPayload.usage?.prompt_tokens ?? 0,
      outputTokens: completionPayload.usage?.completion_tokens ?? 0,
      finishReason: choice?.finish_reason ?? undefined,
      raw: completionPayload,
    };
  }

  async responses(payload: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const input = payload.messages.map((message) => ({
      role: message.role === "tool" ? "assistant" : message.role,
      content: message.content,
    }));

    const response = await (
      this.client.responses as unknown as { create: (payload: unknown) => Promise<unknown> }
    ).create({
      model: payload.model,
      input,
      temperature: payload.temperature,
      top_p: payload.topP,
      max_output_tokens: payload.maxTokens,
    });

    const responsePayload = response as OpenAI.Responses.Response;

    return {
      content: responsePayload.output_text ?? "",
      inputTokens: responsePayload.usage?.input_tokens ?? 0,
      outputTokens: responsePayload.usage?.output_tokens ?? 0,
      finishReason: responsePayload.status ?? undefined,
      raw: responsePayload,
    };
  }

  async embeddings(payload: EmbeddingRequest): Promise<EmbeddingResponse> {
    const response = await this.client.embeddings.create({
      model: payload.model,
      input: payload.input,
    });

    return {
      vectors: response.data.map((entry) => entry.embedding),
      raw: response,
    };
  }

  async health() {
    try {
      await this.client.models.list();
      return { ok: true, message: "Provider disponível" };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Falha de health check",
      };
    }
  }
}


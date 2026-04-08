import type { ProviderConfig } from "@/lib/ai/providers/types";
import { OpenAiCompatibleProvider } from "@/lib/ai/providers/openai-compatible";

export class OpenAiProvider extends OpenAiCompatibleProvider {
  constructor(config: ProviderConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || "https://api.openai.com/v1",
    });
  }
}

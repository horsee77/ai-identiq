import "server-only";
import { prisma } from "@/lib/db/prisma";
import { decryptSecret } from "@/lib/security/encryption";
import { ApiError } from "@/lib/api/errors";
import { OpenAiProvider } from "@/lib/ai/providers/openai";
import { OpenAiCompatibleProvider } from "@/lib/ai/providers/openai-compatible";
import type { BaseAiProvider } from "@/lib/ai/providers/base";

export async function createProviderFromDatabase(providerId: string): Promise<BaseAiProvider> {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
  });

  if (!provider || provider.status !== "ACTIVE") {
    throw new ApiError("provider_not_found", "Provider não encontrado ou inativo.", 404);
  }

  const config = {
    id: provider.id,
    name: provider.name,
    baseUrl: provider.baseUrl,
    apiKey: decryptSecret(provider.apiKeyEncrypted),
    timeoutMs: provider.timeoutMs,
    capabilities: {
      responses: provider.supportsResponses,
      chat: provider.supportsChat,
      embeddings: provider.supportsEmbeddings,
      tools: provider.supportsTools,
      streaming: provider.supportsStreaming,
      multimodal: provider.supportsMultimodal,
    },
  };

  switch (provider.type) {
    case "OPENAI":
      return new OpenAiProvider(config);
    case "OPENAI_COMPATIBLE":
    case "AZURE_OPENAI":
    case "OTHER":
      return new OpenAiCompatibleProvider(config);
    default:
      throw new ApiError("provider_not_supported", "Tipo de provider não suportado.", 400);
  }
}

export async function getDefaultProviderForTenant(tenantId: string): Promise<BaseAiProvider> {
  const provider = await prisma.provider.findFirst({
    where: {
      status: "ACTIVE",
      OR: [{ tenantId }, { tenantId: null }],
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });

  if (!provider) {
    throw new ApiError("provider_missing", "Nenhum provider ativo disponível para o tenant.", 400);
  }

  return createProviderFromDatabase(provider.id);
}


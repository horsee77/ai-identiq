import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { authenticatePublicApiRequest } from "@/lib/api/public-auth";
import { assertRateLimit, assertScope } from "@/lib/api/public-usage";
import { prisma } from "@/lib/db/prisma";

const BUILTIN_MODELS = [
  {
    id: "identiq-core-v1",
    object: "model",
    created: Math.floor(Date.now() / 1000),
    owned_by: "identiq-core",
    category: "CHAT",
    context_window: 16000,
    supports_tools: true,
    supports_reasoning: true,
    supports_streaming: false,
    source: "core_engine",
  },
  {
    id: "local-embedding-v1",
    object: "model",
    created: Math.floor(Date.now() / 1000),
    owned_by: "identiq-core",
    category: "EMBEDDING",
    context_window: 0,
    supports_tools: false,
    supports_reasoning: false,
    supports_streaming: false,
    source: "local_embeddings",
  },
];

export const GET = withApiHandler(async (request, requestId) => {
  const apiContext = await authenticatePublicApiRequest(request);
  assertRateLimit(`public:${apiContext.apiKeyId}`);
  await assertScope(apiContext.scopes, "models:read");

  const models = await prisma.model.findMany({
    where: {
      OR: [{ tenantId: apiContext.tenantId }, { tenantId: null }],
      isActive: true,
    },
    include: {
      provider: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return ok(requestId, {
    object: "list",
    data: [
      ...BUILTIN_MODELS,
      ...models.map((model) => ({
        id: model.technicalName,
        object: "model",
        created: Math.floor(new Date(model.createdAt).getTime() / 1000),
        owned_by: model.provider.slug,
        category: model.category,
        context_window: model.maxContextTokens,
        supports_tools: model.supportsTools,
        supports_reasoning: model.supportsReasoning,
        supports_streaming: model.supportsStreaming,
        source: "configured_provider",
      })),
    ],
  });
});

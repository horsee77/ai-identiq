import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { ok, fail } from "@/lib/api/response";
import { authenticatePublicApiRequest } from "@/lib/api/public-auth";
import { assertQuota, assertRateLimit, assertScope } from "@/lib/api/public-usage";
import { runEmbeddings } from "@/lib/ai/runtime";

const embeddingsSchema = z.object({
  model: z.string().optional(),
  input: z.union([z.string(), z.array(z.string()).min(1)]),
});

export const POST = withApiHandler(async (request, requestId) => {
  const apiContext = await authenticatePublicApiRequest(request);
  assertRateLimit(`public:${apiContext.apiKeyId}`);
  await assertQuota(apiContext.tenantId, apiContext.apiKeyId);
  await assertScope(apiContext.scopes, "embeddings:create");

  const parsed = embeddingsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return fail(requestId, "invalid_payload", "Payload inválido para /embeddings.", 422, parsed.error.flatten());
  }

  const input = Array.isArray(parsed.data.input) ? parsed.data.input : [parsed.data.input];

  const result = await runEmbeddings({
    tenantId: apiContext.tenantId,
    requestId,
    endpoint: "/api/v1/embeddings",
    modelName: parsed.data.model,
    input,
    apiKeyId: apiContext.apiKeyId,
  });

  return ok(requestId, {
    object: "list",
    model: result.model.technicalName,
    data: result.vectors.map((vector, index) => ({
      object: "embedding",
      embedding: vector,
      index,
    })),
    usage: {
      prompt_tokens: 0,
      total_tokens: 0,
    },
    latency_ms: result.latencyMs,
    source: result.source,
  });
});


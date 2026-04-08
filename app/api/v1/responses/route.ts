import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { ok, fail } from "@/lib/api/response";
import { authenticatePublicApiRequest } from "@/lib/api/public-auth";
import { assertQuota, assertRateLimit, assertScope } from "@/lib/api/public-usage";
import { runInference } from "@/lib/ai/runtime";

const responsesSchema = z.object({
  model: z.string().optional(),
  input: z.union([
    z.string(),
    z.array(
      z.object({
        role: z.enum(["system", "user", "assistant", "tool"]),
        content: z.string(),
      })
    ),
  ]),
  temperature: z.coerce.number().min(0).max(2).optional(),
  max_output_tokens: z.coerce.number().int().positive().optional(),
  use_rag: z.boolean().optional(),
});

export const POST = withApiHandler(async (request, requestId) => {
  const apiContext = await authenticatePublicApiRequest(request);
  assertRateLimit(`public:${apiContext.apiKeyId}`);
  await assertQuota(apiContext.tenantId, apiContext.apiKeyId);
  await assertScope(apiContext.scopes, "responses:create");

  const parsed = responsesSchema.safeParse(await request.json());
  if (!parsed.success) {
    return fail(requestId, "invalid_payload", "Payload inválido para /responses.", 422, parsed.error.flatten());
  }

  const input = parsed.data.input;
  const normalizedMessages =
    typeof input === "string"
      ? [{ role: "user" as const, content: input }]
      : input.map((item) => ({ role: item.role, content: item.content }));

  const latestMessage = normalizedMessages[normalizedMessages.length - 1]?.content ?? "";

  const result = await runInference({
    tenantId: apiContext.tenantId,
    requestId,
    endpoint: "/api/v1/responses",
    message: latestMessage,
    messages: normalizedMessages,
    model: parsed.data.model,
    temperature: parsed.data.temperature,
    maxTokens: parsed.data.max_output_tokens,
    useRag: parsed.data.use_rag,
    apiKeyId: apiContext.apiKeyId,
  });

  return ok(requestId, {
    id: `resp_${result.conversationId}`,
    object: "response",
    created: Math.floor(Date.now() / 1000),
    model: result.model.technicalName,
    output: [
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: result.content }],
      },
    ],
    usage: {
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      total_tokens: result.inputTokens + result.outputTokens,
    },
    latency_ms: result.latencyMs,
    cost_usd: result.totalCost,
    engine: result.engine,
  });
});


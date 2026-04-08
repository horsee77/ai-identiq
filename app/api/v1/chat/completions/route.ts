import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { ok, fail } from "@/lib/api/response";
import { authenticatePublicApiRequest } from "@/lib/api/public-auth";
import { assertQuota, assertRateLimit, assertScope } from "@/lib/api/public-usage";
import { runInference } from "@/lib/ai/runtime";

const chatSchema = z.object({
  model: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant", "tool"]),
        content: z.string(),
      })
    )
    .min(1),
  temperature: z.coerce.number().min(0).max(2).optional(),
  max_tokens: z.coerce.number().int().positive().optional(),
  stream: z.boolean().optional(),
});

export const POST = withApiHandler(async (request, requestId) => {
  const apiContext = await authenticatePublicApiRequest(request);
  assertRateLimit(`public:${apiContext.apiKeyId}`);
  await assertQuota(apiContext.tenantId, apiContext.apiKeyId);
  await assertScope(apiContext.scopes, "chat:completions");

  const parsed = chatSchema.safeParse(await request.json());
  if (!parsed.success) {
    return fail(requestId, "invalid_payload", "Payload inválido para /chat/completions.", 422, parsed.error.flatten());
  }

  const latest = parsed.data.messages[parsed.data.messages.length - 1]?.content ?? "";

  const result = await runInference({
    tenantId: apiContext.tenantId,
    requestId,
    endpoint: "/api/v1/chat/completions",
    message: latest,
    messages: parsed.data.messages,
    model: parsed.data.model,
    temperature: parsed.data.temperature,
    maxTokens: parsed.data.max_tokens,
    apiKeyId: apiContext.apiKeyId,
  });

  return ok(requestId, {
    id: `chatcmpl_${result.conversationId}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: result.model.technicalName,
    choices: [
      {
        index: 0,
        finish_reason: "stop",
        message: {
          role: "assistant",
          content: result.content,
        },
      },
    ],
    usage: {
      prompt_tokens: result.inputTokens,
      completion_tokens: result.outputTokens,
      total_tokens: result.inputTokens + result.outputTokens,
    },
    latency_ms: result.latencyMs,
    cost_usd: result.totalCost,
    engine: result.engine,
  });
});


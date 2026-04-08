import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { ok, fail } from "@/lib/api/response";
import { requireInternalPermission } from "@/lib/api/internal-auth";
import { getToolDefinition } from "@/lib/ai/tools/registry";
import { runInference } from "@/lib/ai/runtime";
import { writeAuditLog } from "@/lib/audit/service";
import { prisma } from "@/lib/db/prisma";

const playgroundSchema = z.object({
  agentId: z.string().cuid().optional(),
  providerId: z.string().cuid().optional(),
  modelId: z.string().cuid().optional(),
  temperature: z.coerce.number().min(0).max(2).default(0.2),
  message: z.string().min(2),
  enableRag: z.boolean().default(true),
  enableTools: z.boolean().default(true),
});

export const POST = withApiHandler(async (request, requestId) => {
  const context = await requireInternalPermission("playground.use");
  const parsed = playgroundSchema.safeParse(await request.json());

  if (!parsed.success) {
    return fail(requestId, "invalid_payload", "Dados inválidos para execução no playground.", 422, parsed.error.flatten());
  }

  const payload = parsed.data;

  const model = payload.modelId
    ? await prisma.model.findUnique({
        where: { id: payload.modelId },
        select: { technicalName: true },
      })
    : null;

  const toolExecution = payload.enableTools
    ? await getToolDefinition("classificar_intencao").execute({ text: payload.message })
    : null;

  const result = await runInference({
    tenantId: context.tenantId,
    requestId,
    endpoint: "/api/internal/playground",
    message: payload.message,
    messages: [{ role: "user", content: payload.message }],
    model: model?.technicalName,
    agentId: payload.agentId,
    temperature: payload.temperature,
    providerId: payload.providerId,
    userId: context.userId,
    useRag: payload.enableRag,
  });

  await writeAuditLog({
    tenantId: context.tenantId,
    userId: context.userId,
    action: "playground.executed",
    entityType: "Conversation",
    entityId: result.conversationId,
    severity: "LOW",
    message: "Teste de playground executado com o core engine autônomo.",
    metadata: {
      engine: result.engine,
      handoff: result.handoff,
    },
  });

  return ok(requestId, {
    conversationId: result.conversationId,
    response: result.content,
    latencyMs: result.latencyMs,
    tokens: {
      input: result.inputTokens,
      output: result.outputTokens,
      total: result.inputTokens + result.outputTokens,
    },
    costUsd: result.totalCost,
    handoff: result.handoff.shouldHandoff,
    handoffReason: result.handoff.reason,
    ragDocuments: result.ragResults,
    toolExecution,
    engine: result.engine,
  });
});


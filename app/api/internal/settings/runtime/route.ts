import { withApiHandler } from "@/lib/api/handler";
import { ok, fail } from "@/lib/api/response";
import { requireInternalPermission } from "@/lib/api/internal-auth";
import { getAiRuntimeConfig, upsertAiRuntimeConfig } from "@/lib/ai/core-engine/config";
import { runtimeConfigPatchSchema } from "@/lib/schemas/runtime-config";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/service";

export const GET = withApiHandler(async (request, requestId) => {
  const context = await requireInternalPermission("settings.manage");
  const url = new URL(request.url);
  const agentId = url.searchParams.get("agentId") ?? undefined;

  const runtime = await getAiRuntimeConfig({
    tenantId: context.tenantId,
    agentId,
  });

  return ok(requestId, runtime);
});

export const PUT = withApiHandler(async (request, requestId) => {
  const context = await requireInternalPermission("settings.manage");
  const parsed = runtimeConfigPatchSchema.safeParse(await request.json());

  if (!parsed.success) {
    return fail(requestId, "invalid_payload", "Dados inválidos para configuração runtime.", 422, parsed.error.flatten());
  }

  const payload = parsed.data;

  if (payload.agentId) {
    const agent = await prisma.agent.findFirst({
      where: {
        id: payload.agentId,
        OR: [{ tenantId: context.tenantId }, { tenantId: null }],
      },
      select: { id: true },
    });

    if (!agent) {
      return fail(requestId, "not_found", "Agente não encontrado no contexto do tenant.", 404);
    }
  }

  await upsertAiRuntimeConfig({
    tenantId: context.tenantId,
    agentId: payload.agentId,
    values: {
      autonomousMode: payload.autonomousMode,
      externalProviderEnabled: payload.externalProviderEnabled,
      localLlmEnabled: payload.localLlmEnabled,
      localEmbeddingsEnabled: payload.localEmbeddingsEnabled,
      lexicalSearchEnabled: payload.lexicalSearchEnabled,
      handoffThreshold: payload.handoffThreshold,
      strictTemplatesOnly: payload.strictTemplatesOnly,
      allowEnrichment: payload.allowEnrichment,
      safetyLevel: payload.safetyLevel,
      knowledgeRequiredCategories: payload.knowledgeRequiredCategories,
      defaultResponseMode: payload.defaultResponseMode,
      localLlmProviderId: payload.localLlmProviderId ?? undefined,
      externalProviderId: payload.externalProviderId ?? undefined,
    },
  });

  const runtime = await getAiRuntimeConfig({
    tenantId: context.tenantId,
    agentId: payload.agentId,
  });

  await writeAuditLog({
    tenantId: context.tenantId,
    userId: context.userId,
    action: "settings.runtime_updated",
    entityType: "Setting",
    entityId: payload.agentId ?? context.tenantId,
    severity: "HIGH",
    message: "Configuração de runtime autônomo atualizada.",
    metadata: {
      scope: payload.agentId ? "agent" : "tenant",
      agentId: payload.agentId,
      values: payload,
    },
  });

  return ok(requestId, runtime);
});


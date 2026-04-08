import { withApiHandler } from "@/lib/api/handler";
import { ok, fail } from "@/lib/api/response";
import { requireInternalPermission } from "@/lib/api/internal-auth";
import { prisma } from "@/lib/db/prisma";
import { modelSchema } from "@/lib/schemas/models";
import { writeAuditLog } from "@/lib/audit/service";

export const GET = withApiHandler(async (_request, requestId) => {
  const context = await requireInternalPermission("models.view");

  const models = await prisma.model.findMany({
    where: {
      OR: [{ tenantId: context.tenantId }, { tenantId: null }],
    },
    include: {
      provider: true,
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return ok(requestId, models);
});

export const POST = withApiHandler(async (request, requestId) => {
  const context = await requireInternalPermission("models.manage");
  const parsed = modelSchema.safeParse(await request.json());

  if (!parsed.success) {
    return fail(requestId, "invalid_payload", "Dados de modelo inválidos.", 422, parsed.error.flatten());
  }

  const payload = parsed.data;

  const model = await prisma.model.create({
    data: {
      tenantId: context.tenantId,
      providerId: payload.providerId,
      technicalName: payload.technicalName,
      displayName: payload.displayName,
      slug: payload.slug,
      category: payload.category,
      maxContextTokens: payload.maxContextTokens,
      maxOutputTokens: payload.maxOutputTokens,
      inputCostPer1kUsd: payload.inputCostPer1kUsd,
      outputCostPer1kUsd: payload.outputCostPer1kUsd,
      supportsTools: true,
      supportsStreaming: true,
      supportsReasoning: payload.category === "REASONING",
      supportsEmbeddings: payload.category === "EMBEDDING",
    },
  });

  await writeAuditLog({
    tenantId: context.tenantId,
    userId: context.userId,
    action: "model.created",
    entityType: "Model",
    entityId: model.id,
    severity: "HIGH",
    message: `Modelo ${model.displayName} cadastrado.`,
  });

  return ok(requestId, model, 201);
});


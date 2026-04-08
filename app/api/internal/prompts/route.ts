import { withApiHandler } from "@/lib/api/handler";
import { ok, fail } from "@/lib/api/response";
import { requireInternalPermission } from "@/lib/api/internal-auth";
import { prisma } from "@/lib/db/prisma";
import { promptSchema } from "@/lib/schemas/prompts";
import { writeAuditLog } from "@/lib/audit/service";

export const GET = withApiHandler(async (_request, requestId) => {
  const context = await requireInternalPermission("prompts.view");

  const prompts = await prisma.prompt.findMany({
    where: {
      OR: [{ tenantId: context.tenantId }, { scope: "GLOBAL" }],
    },
    include: {
      agent: true,
      versions: {
        orderBy: { version: "desc" },
        take: 5,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return ok(requestId, prompts);
});

export const POST = withApiHandler(async (request, requestId) => {
  const context = await requireInternalPermission("prompts.manage");
  const parsed = promptSchema.safeParse(await request.json());

  if (!parsed.success) {
    return fail(requestId, "invalid_payload", "Dados de prompt inválidos.", 422, parsed.error.flatten());
  }

  const payload = parsed.data;

  const prompt = await prisma.prompt.create({
    data: {
      tenantId: payload.scope === "TENANT" ? context.tenantId : null,
      agentId: payload.agentId,
      name: payload.name,
      slug: payload.slug,
      type: payload.type,
      scope: payload.scope,
      status: "DRAFT",
      notes: payload.notes,
      versions: {
        create: {
          version: 1,
          content: payload.content,
          status: "DRAFT",
          authorId: context.userId,
          changelog: "Versão inicial",
          supportedVariables: ["tenant_name", "user_name", "contexto_operacional"],
        },
      },
    },
    include: {
      versions: true,
    },
  });

  await writeAuditLog({
    tenantId: context.tenantId,
    userId: context.userId,
    action: "prompt.created",
    entityType: "Prompt",
    entityId: prompt.id,
    severity: "HIGH",
    message: `Prompt ${prompt.name} criado.`,
  });

  return ok(requestId, prompt, 201);
});


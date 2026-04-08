import { withApiHandler } from "@/lib/api/handler";
import { ok, fail } from "@/lib/api/response";
import { requireInternalPermission } from "@/lib/api/internal-auth";
import { prisma } from "@/lib/db/prisma";
import { tenantSchema } from "@/lib/schemas/tenants";
import { writeAuditLog } from "@/lib/audit/service";

export const GET = withApiHandler(async (_request, requestId) => {
  const context = await requireInternalPermission("tenants.view");
  const tenants = context.isMasterAdmin
    ? await prisma.tenant.findMany({ include: { plan: true }, orderBy: { createdAt: "desc" } })
    : await prisma.tenant.findMany({ where: { id: context.tenantId }, include: { plan: true } });

  return ok(requestId, tenants);
});

export const POST = withApiHandler(async (request, requestId) => {
  const context = await requireInternalPermission("tenants.manage");
  const parsed = tenantSchema.safeParse(await request.json());

  if (!parsed.success) {
    return fail(requestId, "invalid_payload", "Dados de tenant inválidos.", 422, parsed.error.flatten());
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      status: parsed.data.status,
      planId: parsed.data.planId,
      limits: {
        users: 25,
        agents: 25,
        documents: 2000,
        tokensMonthly: 1500000,
        costMonthlyUsd: 2000,
      },
    },
  });

  await writeAuditLog({
    userId: context.userId,
    action: "tenant.created",
    entityType: "Tenant",
    entityId: tenant.id,
    severity: "HIGH",
    message: `Tenant ${tenant.name} criado por ${context.name}.`,
  });

  return ok(requestId, tenant, 201);
});


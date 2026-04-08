import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireInternalPermission } from "@/lib/api/internal-auth";
import { prisma } from "@/lib/db/prisma";

export const GET = withApiHandler(async (_request, requestId) => {
  const context = await requireInternalPermission("audit.view");

  const auditLogs = await prisma.auditLog.findMany({
    where: context.isMasterAdmin ? undefined : { tenantId: context.tenantId },
    include: {
      user: true,
      tenant: true,
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return ok(requestId, auditLogs);
});

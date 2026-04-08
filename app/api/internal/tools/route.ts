import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireInternalPermission } from "@/lib/api/internal-auth";
import { prisma } from "@/lib/db/prisma";

export const GET = withApiHandler(async (_request, requestId) => {
  const context = await requireInternalPermission("tools.view");
  const tools = await prisma.toolDefinition.findMany({
    where: {
      OR: [{ tenantId: context.tenantId }, { tenantId: null }],
    },
    include: {
      _count: {
        select: {
          executions: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(requestId, tools);
});

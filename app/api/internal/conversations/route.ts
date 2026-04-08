import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireInternalPermission } from "@/lib/api/internal-auth";
import { prisma } from "@/lib/db/prisma";

export const GET = withApiHandler(async (_request, requestId) => {
  const context = await requireInternalPermission("conversations.view");
  const conversations = await prisma.conversation.findMany({
    where: { tenantId: context.tenantId },
    include: {
      messages: {
        orderBy: { sequence: "asc" },
      },
      agent: true,
      provider: true,
      model: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return ok(requestId, conversations);
});

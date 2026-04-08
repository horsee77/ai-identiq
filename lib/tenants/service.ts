import "server-only";
import { prisma } from "@/lib/db/prisma";

export async function getTenantWithUsage(tenantId: string) {
  const [tenant, conversationCount, documentsCount, monthlyCost] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { plan: true, subscriptions: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    prisma.conversation.count({ where: { tenantId } }),
    prisma.knowledgeDocument.count({ where: { tenantId } }),
    prisma.usageRecord.aggregate({
      where: {
        tenantId,
        periodStart: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: {
        costUsd: true,
      },
    }),
  ]);

  return {
    tenant,
    usage: {
      conversations: conversationCount,
      documents: documentsCount,
      monthlyCostUsd: Number(monthlyCost._sum.costUsd ?? 0),
    },
  };
}

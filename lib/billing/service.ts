import "server-only";
import { prisma } from "@/lib/db/prisma";

export async function getBillingSnapshot(tenantId: string) {
  const since = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [records, events, subscription] = await Promise.all([
    prisma.usageRecord.findMany({
      where: {
        tenantId,
        periodStart: { gte: since },
      },
      orderBy: { periodStart: "desc" },
      take: 50,
    }),
    prisma.billingEvent.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.subscription.findFirst({
      where: { tenantId },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totals = records.reduce(
    (acc, record) => {
      acc.requests += record.requests;
      acc.inputTokens += record.inputTokens;
      acc.outputTokens += record.outputTokens;
      acc.costUsd += Number(record.costUsd);
      return acc;
    },
    { requests: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 }
  );

  return {
    subscription,
    records,
    events,
    totals,
  };
}

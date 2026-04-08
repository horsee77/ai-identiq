import "server-only";
import { prisma } from "@/lib/db/prisma";

export async function getAnalyticsOverview(tenantId: string) {
  const [requests, errors, avgLatency, topAgents, providerFailures] = await Promise.all([
    prisma.apiRequestLog.count({ where: { tenantId } }),
    prisma.apiRequestLog.count({ where: { tenantId, success: false } }),
    prisma.apiRequestLog.aggregate({
      where: { tenantId },
      _avg: { latencyMs: true },
    }),
    prisma.apiRequestLog.groupBy({
      by: ["agentId"],
      where: { tenantId },
      _count: { _all: true },
      orderBy: { _count: { agentId: "desc" } },
      take: 5,
    }),
    prisma.apiRequestLog.groupBy({
      by: ["providerId"],
      where: { tenantId, success: false },
      _count: { _all: true },
      orderBy: { _count: { providerId: "desc" } },
      take: 5,
    }),
  ]);

  return {
    requests,
    errors,
    errorRate: requests === 0 ? 0 : (errors / requests) * 100,
    avgLatencyMs: Math.round(avgLatency._avg.latencyMs ?? 0),
    topAgents,
    providerFailures,
  };
}

import "server-only";
import { prisma } from "@/lib/db/prisma";

export async function getDashboardMetrics(tenantId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [
    conversationsTotal,
    conversationsPeriod,
    agentsActive,
    docsIndexed,
    ragQueries,
    usageAggregate,
    costByProvider,
    costByModel,
    costByAgent,
    errorCount,
    fallbackCount,
    avgLatency,
    requestByChannel,
    recentEvents,
    topTenants,
    unstableProviders,
    expensiveResponses,
  ] = await Promise.all([
    prisma.conversation.count({ where: { tenantId } }),
    prisma.conversation.count({ where: { tenantId, createdAt: { gte: since } } }),
    prisma.agent.count({ where: { OR: [{ tenantId }, { scope: "GLOBAL" }], status: "ACTIVE" } }),
    prisma.knowledgeDocument.count({
      where: { OR: [{ tenantId }, { tenantId: null }], status: "INDEXED" },
    }),
    prisma.apiRequestLog.count({ where: { tenantId, metadata: { path: ["rag"], equals: true } } }),
    prisma.usageRecord.aggregate({
      where: { tenantId, periodStart: { gte: since } },
      _sum: {
        costUsd: true,
        inputTokens: true,
        outputTokens: true,
        requests: true,
      },
    }),
    prisma.apiRequestLog.groupBy({
      by: ["providerId"],
      where: { tenantId, createdAt: { gte: since } },
      _sum: { totalCostUsd: true },
      _count: { _all: true },
      orderBy: { _sum: { totalCostUsd: "desc" } },
      take: 6,
    }),
    prisma.apiRequestLog.groupBy({
      by: ["modelId"],
      where: { tenantId, createdAt: { gte: since } },
      _sum: { totalCostUsd: true },
      _count: { _all: true },
      orderBy: { _sum: { totalCostUsd: "desc" } },
      take: 6,
    }),
    prisma.apiRequestLog.groupBy({
      by: ["agentId"],
      where: { tenantId, createdAt: { gte: since } },
      _sum: { totalCostUsd: true },
      _count: { _all: true },
      orderBy: { _sum: { totalCostUsd: "desc" } },
      take: 6,
    }),
    prisma.apiRequestLog.count({ where: { tenantId, success: false, createdAt: { gte: since } } }),
    prisma.apiRequestLog.count({ where: { tenantId, fallbackTriggered: true, createdAt: { gte: since } } }),
    prisma.apiRequestLog.aggregate({
      where: { tenantId, createdAt: { gte: since } },
      _avg: { latencyMs: true },
    }),
    prisma.apiRequestLog.groupBy({
      by: ["channel"],
      where: { tenantId, createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.usageRecord.groupBy({
      by: ["tenantId"],
      _sum: { costUsd: true },
      orderBy: { _sum: { costUsd: "desc" } },
      take: 5,
    }),
    prisma.apiRequestLog.groupBy({
      by: ["providerId"],
      where: { success: false, createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { providerId: "desc" } },
      take: 5,
    }),
    prisma.apiRequestLog.findMany({
      where: { tenantId, createdAt: { gte: since } },
      orderBy: [{ totalCostUsd: "desc" }, { createdAt: "desc" }],
      take: 5,
      select: {
        requestId: true,
        endpoint: true,
        totalCostUsd: true,
        modelId: true,
        createdAt: true,
      },
    }),
  ]);

  const totalRequests = Number(usageAggregate._sum.requests ?? 0);

  return {
    cards: {
      conversationsTotal,
      conversationsPeriod,
      agentsActive,
      docsIndexed,
      ragQueries,
      totalCost: Number(usageAggregate._sum.costUsd ?? 0),
      inputTokens: Number(usageAggregate._sum.inputTokens ?? 0),
      outputTokens: Number(usageAggregate._sum.outputTokens ?? 0),
      totalRequests,
      fallbackRate: totalRequests === 0 ? 0 : (fallbackCount / totalRequests) * 100,
      errorRate: totalRequests === 0 ? 0 : (errorCount / totalRequests) * 100,
      avgLatencyMs: Math.round(avgLatency._avg.latencyMs ?? 0),
    },
    charts: {
      costByProvider,
      costByModel,
      costByAgent,
      requestByChannel,
    },
    recentEvents,
    topTenants,
    unstableProviders,
    expensiveResponses,
  };
}

export async function getModuleCollections(tenantId: string) {
  const [
    tenants,
    users,
    roles,
    providers,
    models,
    agents,
    prompts,
    documents,
    jobs,
    conversations,
    tools,
    apiKeys,
    billingEvents,
    requestLogs,
    audits,
    featureFlags,
  ] = await Promise.all([
    prisma.tenant.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.user.findMany({
      where: { memberships: { some: { tenantId } } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        memberships: {
          where: { tenantId },
          include: { role: true },
        },
      },
    }),
    prisma.role.findMany({ include: { rolePermissions: { include: { permission: true } } } }),
    prisma.provider.findMany({ where: { OR: [{ tenantId }, { tenantId: null }] }, orderBy: { priority: "asc" } }),
    prisma.model.findMany({ where: { OR: [{ tenantId }, { tenantId: null }] }, include: { provider: true } }),
    prisma.agent.findMany({
      where: { OR: [{ tenantId }, { scope: "GLOBAL" }] },
      include: { defaultModel: true, defaultProvider: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.prompt.findMany({
      where: { OR: [{ tenantId }, { scope: "GLOBAL" }] },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.knowledgeDocument.findMany({
      where: { OR: [{ tenantId }, { tenantId: null }] },
      orderBy: { updatedAt: "desc" },
      include: { embeddingJobs: { take: 1, orderBy: { createdAt: "desc" } } },
    }),
    prisma.embeddingJob.findMany({
      where: { OR: [{ tenantId }, { tenantId: null }] },
      orderBy: { createdAt: "desc" },
      include: { document: true },
      take: 100,
    }),
    prisma.conversation.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: { agent: true, provider: true, model: true },
      take: 100,
    }),
    prisma.toolDefinition.findMany({ where: { OR: [{ tenantId }, { tenantId: null }] }, orderBy: { createdAt: "desc" } }),
    prisma.apiKey.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
    prisma.billingEvent.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.apiRequestLog.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.auditLog.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 150 }),
    prisma.featureFlag.findMany({ where: { OR: [{ tenantId }, { tenantId: null }] }, orderBy: { key: "asc" } }),
  ]);

  return {
    tenants,
    users,
    roles,
    providers,
    models,
    agents,
    prompts,
    documents,
    jobs,
    conversations,
    tools,
    apiKeys,
    billingEvents,
    requestLogs,
    audits,
    featureFlags,
  };
}

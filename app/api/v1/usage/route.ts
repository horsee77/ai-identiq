import { startOfMonth } from "date-fns";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { authenticatePublicApiRequest } from "@/lib/api/public-auth";
import { assertRateLimit, assertScope } from "@/lib/api/public-usage";
import { prisma } from "@/lib/db/prisma";

export const GET = withApiHandler(async (request, requestId) => {
  const apiContext = await authenticatePublicApiRequest(request);
  assertRateLimit(`public:${apiContext.apiKeyId}`);
  await assertScope(apiContext.scopes, "usage:read");

  const since = startOfMonth(new Date());

  const [records, logsAggregate] = await Promise.all([
    prisma.usageRecord.findMany({
      where: {
        tenantId: apiContext.tenantId,
        apiKeyId: apiContext.apiKeyId,
        periodStart: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.apiRequestLog.aggregate({
      where: {
        tenantId: apiContext.tenantId,
        apiKeyId: apiContext.apiKeyId,
        createdAt: { gte: since },
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalCostUsd: true,
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  return ok(requestId, {
    period_start: since.toISOString(),
    totals: {
      requests: logsAggregate._count._all,
      input_tokens: Number(logsAggregate._sum.inputTokens ?? 0),
      output_tokens: Number(logsAggregate._sum.outputTokens ?? 0),
      total_cost_usd: Number(logsAggregate._sum.totalCostUsd ?? 0),
    },
    records,
  });
});

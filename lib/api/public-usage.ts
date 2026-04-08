import "server-only";
import { startOfMonth } from "date-fns";
import { ApiError } from "@/lib/api/errors";
import { rateLimit } from "@/lib/api/rate-limit";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db/prisma";

export async function assertScope(scopes: string[], requiredScope: string) {
  if (!scopes.includes(requiredScope) && !scopes.includes("*") && !scopes.includes("all")) {
    throw new ApiError("forbidden_scope", `A chave não possui o escopo obrigatório: ${requiredScope}.`, 403);
  }
}

export function assertRateLimit(identifier: string) {
  const limit = rateLimit(identifier, env.RATE_LIMIT_MAX_REQUESTS, env.RATE_LIMIT_WINDOW_SECONDS);
  if (!limit.allowed) {
    throw new ApiError("rate_limit_exceeded", "Limite de requisições por janela excedido.", 429);
  }
}

export async function assertQuota(tenantId: string, apiKeyId: string) {
  const since = startOfMonth(new Date());

  const [subscription, apiKey, requestCount, costAggregate] = await Promise.all([
    prisma.subscription.findFirst({
      where: { tenantId, status: { in: ["TRIAL", "ACTIVE"] } },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.apiKey.findUnique({ where: { id: apiKeyId } }),
    prisma.apiRequestLog.count({
      where: {
        apiKeyId,
        createdAt: { gte: since },
      },
    }),
    prisma.apiRequestLog.aggregate({
      where: {
        apiKeyId,
        createdAt: { gte: since },
      },
      _sum: {
        totalCostUsd: true,
      },
    }),
  ]);

  const planLimit = subscription?.plan.requestPerMinuteLimit ?? null;
  const apiLimit = apiKey?.monthlyRequestLimit ?? null;

  const activeLimit = [planLimit, apiLimit].filter((value): value is number => Boolean(value)).sort((a, b) => a - b)[0] ?? null;

  if (activeLimit !== null && requestCount >= activeLimit) {
    throw new ApiError("quota_exceeded", "Limite mensal de requisições excedido para esta chave.", 402);
  }

  const monthlyCost = Number(costAggregate._sum.totalCostUsd ?? 0);
  const costLimit = Number(apiKey?.monthlyCostLimitUsd ?? subscription?.plan.monthlyCostLimitUsd ?? 0);

  if (costLimit > 0 && monthlyCost >= costLimit) {
    throw new ApiError("cost_limit_exceeded", "Limite de custo mensal excedido para esta chave.", 402);
  }
}


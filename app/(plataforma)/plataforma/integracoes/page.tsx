import { ApiIntegrationHub } from "@/components/modules/api-integration-hub";
import { SectionTitle } from "@/components/ui/section-title";
import { hasPermission, requirePermission } from "@/lib/auth/access";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";

export default async function IntegracoesPage() {
  const context = await requirePermission("apikeys.view");

  const apiKeys = await prisma.apiKey.findMany({
    where: { tenantId: context.tenantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Integrações e API"
        description="Conecte a IA da Identiq em qualquer sistema com autenticação por API key, escopos e controles de uso."
      />
      <ApiIntegrationHub
        initialKeys={apiKeys.map((apiKey) => ({
          id: apiKey.id,
          name: apiKey.name,
          prefix: apiKey.prefix,
          environment: apiKey.environment as "development" | "staging" | "production",
          status: apiKey.status as "ACTIVE" | "REVOKED" | "EXPIRED",
          scopes: Array.isArray(apiKey.scopes)
            ? apiKey.scopes.filter((scope): scope is string => typeof scope === "string")
            : [],
          monthlyRequestLimit: apiKey.monthlyRequestLimit,
          monthlyCostLimitUsd:
            apiKey.monthlyCostLimitUsd === null ? null : Number(apiKey.monthlyCostLimitUsd),
          lastUsedAt: apiKey.lastUsedAt ? apiKey.lastUsedAt.toISOString() : null,
          createdAt: apiKey.createdAt.toISOString(),
          notes: apiKey.notes,
        }))}
        canCreate={hasPermission(context, "apikeys.create")}
        canRevoke={hasPermission(context, "apikeys.revoke")}
        baseUrl={env.APP_URL}
      />
    </div>
  );
}

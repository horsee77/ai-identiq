import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { DataCell, DataTable } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/access";
import { prisma } from "@/lib/db/prisma";
import { getAnalyticsOverview } from "@/lib/analytics/service";

export default async function ObservabilidadePage() {
  const context = await requirePermission("analytics.view");

  const [overview, requestLogs] = await Promise.all([
    getAnalyticsOverview(context.tenantId),
    prisma.apiRequestLog.findMany({
      where: { tenantId: context.tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Observabilidade e Analytics"
        description="Métricas de performance, custo, estabilidade e qualidade das respostas da IA."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Volume total">
          <p className="text-2xl font-semibold text-zinc-900">{overview.requests.toLocaleString("pt-BR")}</p>
        </Card>
        <Card title="Falhas">
          <p className="text-2xl font-semibold text-zinc-900">{overview.errors.toLocaleString("pt-BR")}</p>
        </Card>
        <Card title="Taxa de erro">
          <p className="text-2xl font-semibold text-zinc-900">{overview.errorRate.toFixed(2)}%</p>
        </Card>
        <Card title="latência média">
          <p className="text-2xl font-semibold text-zinc-900">{overview.avgLatencyMs}ms</p>
        </Card>
      </section>

      <Card title="Logs operacionais" subtitle="Rastreamento por request-id, status, latência e custo de inferência.">
        <DataTable headers={["Request ID", "Endpoint", "Status", "latência", "Tokens", "Custo", "Data"]}>
          {requestLogs.map((log) => (
            <tr key={log.id}>
              <DataCell className="font-mono text-xs">{log.requestId}</DataCell>
              <DataCell>{log.endpoint}</DataCell>
              <DataCell>{log.statusCode}</DataCell>
              <DataCell>{log.latencyMs}ms</DataCell>
              <DataCell>{(log.inputTokens + log.outputTokens).toLocaleString("pt-BR")}</DataCell>
              <DataCell>{Number(log.totalCostUsd).toFixed(6)}</DataCell>
              <DataCell>{new Date(log.createdAt).toLocaleString("pt-BR")}</DataCell>
            </tr>
          ))}
        </DataTable>
      </Card>
    </div>
  );
}


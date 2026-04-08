import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionTitle } from "@/components/ui/section-title";
import { CostBarChart } from "@/components/charts/cost-bar-chart";
import { requirePermission } from "@/lib/auth/access";
import { getDashboardMetrics } from "@/lib/repositories/dashboard";
import { formatCompact, formatCurrency } from "@/lib/utils";

export default async function DashboardPage() {
  const context = await requirePermission("dashboard.view");
  const metrics = await getDashboardMetrics(context.tenantId);

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Dashboard Executivo"
        description="Visão operacional e financeira da IA por tenant, provider e agente."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Conversas totais" value={formatCompact(metrics.cards.conversationsTotal)} />
        <MetricCard title="Conversas (30 dias)" value={formatCompact(metrics.cards.conversationsPeriod)} />
        <MetricCard title="Agentes ativos" value={formatCompact(metrics.cards.agentsActive)} />
        <MetricCard title="Documentos indexados" value={formatCompact(metrics.cards.docsIndexed)} />
        <MetricCard title="Consultas RAG" value={formatCompact(metrics.cards.ragQueries)} />
        <MetricCard title="Custo do Período" value={formatCurrency(metrics.cards.totalCost)} />
        <MetricCard title="Tokens consumidos" value={formatCompact(metrics.cards.inputTokens + metrics.cards.outputTokens)} />
        <MetricCard title="latência média" value={`${metrics.cards.avgLatencyMs} ms`} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card title="Custo por provider" subtitle="Top providers por custo no Período.">
          <CostBarChart
            items={metrics.charts.costByProvider.map((item) => ({
              label: item.providerId ?? "Provider não identificado",
              value: Number(item._sum.totalCostUsd ?? 0),
            }))}
          />
        </Card>

        <Card title="Custo por modelo" subtitle="Modelos com maior impacto financeiro.">
          <CostBarChart
            items={metrics.charts.costByModel.map((item) => ({
              label: item.modelId ?? "Modelo não identificado",
              value: Number(item._sum.totalCostUsd ?? 0),
            }))}
          />
        </Card>

        <Card title="Distribuição por canal" subtitle="Volume de requisições por canal de entrada.">
          <div className="space-y-2">
            {metrics.charts.requestByChannel.map((item) => (
              <div key={item.channel} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2">
                <span className="text-sm text-zinc-700">{item.channel}</span>
                <Badge label={`${item._count._all} requisições`} variant="info" />
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card title="Eventos recentes" subtitle="Ações administrativas mais recentes no tenant.">
          <div className="space-y-2">
            {metrics.recentEvents.map((event) => (
              <div key={event.id} className="rounded-lg border border-zinc-200 p-3">
                <p className="text-sm font-medium text-zinc-900">{event.message}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {event.action} - {new Date(event.createdAt).toLocaleString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Risco operacional" subtitle="Sinais de estabilidade e custo da operação de IA.">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3">
              <span className="text-sm text-zinc-600">Taxa de fallback</span>
              <Badge label={`${metrics.cards.fallbackRate.toFixed(2)}%`} variant={metrics.cards.fallbackRate > 10 ? "warning" : "success"} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3">
              <span className="text-sm text-zinc-600">Taxa de erro</span>
              <Badge label={`${metrics.cards.errorRate.toFixed(2)}%`} variant={metrics.cards.errorRate > 5 ? "danger" : "success"} />
            </div>
            <div className="space-y-2 rounded-lg border border-zinc-200 p-3">
              <p className="text-sm font-medium text-zinc-800">Respostas mais caras</p>
              {metrics.expensiveResponses.map((response) => (
                <div key={response.requestId} className="flex items-center justify-between text-xs text-zinc-600">
                  <span>{response.endpoint}</span>
                  <span>{formatCurrency(Number(response.totalCostUsd))}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}


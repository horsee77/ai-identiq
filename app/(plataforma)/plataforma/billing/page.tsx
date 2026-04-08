import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { DataCell, DataTable } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/access";
import { getBillingSnapshot } from "@/lib/billing/service";
import { formatCurrency } from "@/lib/utils";

export default async function BillingPage() {
  const context = await requirePermission("billing.view");
  const snapshot = await getBillingSnapshot(context.tenantId);

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Billing, Uso e Limites"
        description="Métricas de franquia, consumo e eventos de limiar para controle financeiro da operação."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card title="requisições do mês">
          <p className="text-2xl font-semibold text-zinc-900">{snapshot.totals.requests.toLocaleString("pt-BR")}</p>
        </Card>
        <Card title="Tokens de entrada">
          <p className="text-2xl font-semibold text-zinc-900">{snapshot.totals.inputTokens.toLocaleString("pt-BR")}</p>
        </Card>
        <Card title="Tokens de saída">
          <p className="text-2xl font-semibold text-zinc-900">{snapshot.totals.outputTokens.toLocaleString("pt-BR")}</p>
        </Card>
        <Card title="Custo acumulado">
          <p className="text-2xl font-semibold text-zinc-900">{formatCurrency(snapshot.totals.costUsd)}</p>
        </Card>
      </section>

      <Card title="Registros de uso" subtitle="Evolução periódica de custos e tokens para o tenant ativo.">
        <DataTable headers={["Período", "requisições", "Tokens", "Custo"]}>
          {snapshot.records.map((record) => (
            <tr key={record.id}>
              <DataCell>
                {new Date(record.periodStart).toLocaleDateString("pt-BR")} - {new Date(record.periodEnd).toLocaleDateString("pt-BR")}
              </DataCell>
              <DataCell>{record.requests.toLocaleString("pt-BR")}</DataCell>
              <DataCell>{record.totalTokens.toLocaleString("pt-BR")}</DataCell>
              <DataCell>{formatCurrency(Number(record.costUsd))}</DataCell>
            </tr>
          ))}
        </DataTable>
      </Card>

      <Card title="Eventos de billing" subtitle="Alertas, bloqueios e ajustes administrativos de limites.">
        <DataTable headers={["Tipo", "Título", "Descrição", "Data"]}>
          {snapshot.events.map((event) => (
            <tr key={event.id}>
              <DataCell>{event.type}</DataCell>
              <DataCell>{event.title}</DataCell>
              <DataCell>{event.description ?? "-"}</DataCell>
              <DataCell>{new Date(event.createdAt).toLocaleString("pt-BR")}</DataCell>
            </tr>
          ))}
        </DataTable>
      </Card>
    </div>
  );
}


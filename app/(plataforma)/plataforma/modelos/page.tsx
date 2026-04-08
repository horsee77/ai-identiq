import { Badge } from "@/components/ui/badge";
import { DataCell } from "@/components/ui/table";
import { ListModule } from "@/components/modules/list-module";
import { SectionTitle } from "@/components/ui/section-title";
import { requirePermission } from "@/lib/auth/access";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency } from "@/lib/utils";

export default async function ModelosPage() {
  const context = await requirePermission("models.view");

  const models = await prisma.model.findMany({
    where: {
      OR: [{ tenantId: context.tenantId }, { tenantId: null }],
    },
    include: {
      provider: true,
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Modelos"
        description="Catálogo de modelos por provider com custos, limites e capacidades habilitadas."
      />
      <ListModule
        title="Modelos disponíveis"
        description="Controle de ativação, modelo padrão e Parâmetros de custo por token."
        headers={["Modelo", "Provider", "Categoria", "Contexto", "Custos", "Status"]}
        hasData={models.length > 0}
        emptyTitle="Nenhum modelo cadastrado"
        emptyDescription="Cadastre modelos para habilitar rotas de inferência e embeddings."
      >
        {models.map((model) => (
          <tr key={model.id}>
            <DataCell>
              <p className="font-medium text-zinc-900">{model.displayName}</p>
              <p className="text-xs text-zinc-500">{model.technicalName}</p>
            </DataCell>
            <DataCell>{model.provider.name}</DataCell>
            <DataCell>{model.category}</DataCell>
            <DataCell>{model.maxContextTokens.toLocaleString("pt-BR")} tokens</DataCell>
            <DataCell>
              <p className="text-xs text-zinc-500">
                Input: {formatCurrency(Number(model.inputCostPer1kUsd))} / 1k
              </p>
              <p className="text-xs text-zinc-500">
                Output: {formatCurrency(Number(model.outputCostPer1kUsd))} / 1k
              </p>
            </DataCell>
            <DataCell>
              <Badge label={model.isActive ? "Ativo" : "Inativo"} variant={model.isActive ? "success" : "warning"} />
            </DataCell>
          </tr>
        ))}
      </ListModule>
    </div>
  );
}


import { Badge } from "@/components/ui/badge";
import { DataCell } from "@/components/ui/table";
import { ListModule } from "@/components/modules/list-module";
import { SectionTitle } from "@/components/ui/section-title";
import { requirePermission } from "@/lib/auth/access";
import { prisma } from "@/lib/db/prisma";

export default async function AgentesPage() {
  const context = await requirePermission("agents.view");

  const agents = await prisma.agent.findMany({
    where: {
      OR: [{ tenantId: context.tenantId }, { scope: "GLOBAL" }],
    },
    include: {
      defaultModel: true,
      defaultProvider: true,
      toolMappings: true,
      knowledgeMappings: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Agentes de IA"
        description="Orquestração de comportamento, guardrails, versionamento e escopo multi-tenant dos agentes."
      />

      <ListModule
        title="Agentes cadastrados"
        description="Controle de publicação, fallback, modelo padrão, tools e fontes de conhecimento vinculadas."
        headers={["Agente", "Categoria", "Modelo/Provider", "Conhecimento", "Tools", "Status"]}
        hasData={agents.length > 0}
        emptyTitle="Nenhum agente disponível"
        emptyDescription="Crie agentes para os fluxos Comercial, Suporte, KYC, Compliance e Operação Interna."
      >
        {agents.map((agent) => (
          <tr key={agent.id}>
            <DataCell>
              <p className="font-medium text-zinc-900">{agent.name}</p>
              <p className="text-xs text-zinc-500">{agent.slug}</p>
            </DataCell>
            <DataCell>{agent.category}</DataCell>
            <DataCell>
              <p className="text-xs text-zinc-600">{agent.defaultModel?.displayName ?? "Sem modelo"}</p>
              <p className="text-xs text-zinc-500">{agent.defaultProvider?.name ?? "Sem provider"}</p>
            </DataCell>
            <DataCell>{agent.knowledgeMappings.length}</DataCell>
            <DataCell>{agent.toolMappings.length}</DataCell>
            <DataCell>
              <Badge
                label={agent.status}
                variant={agent.status === "ACTIVE" ? "success" : agent.status === "DRAFT" ? "warning" : "default"}
              />
            </DataCell>
          </tr>
        ))}
      </ListModule>
    </div>
  );
}


import { Badge } from "@/components/ui/badge";
import { DataCell } from "@/components/ui/table";
import { ListModule } from "@/components/modules/list-module";
import { SectionTitle } from "@/components/ui/section-title";
import { requirePermission } from "@/lib/auth/access";
import { prisma } from "@/lib/db/prisma";

export default async function ToolsPage() {
  const context = await requirePermission("tools.view");

  const tools = await prisma.toolDefinition.findMany({
    where: {
      OR: [{ tenantId: context.tenantId }, { tenantId: null }],
    },
    include: {
      _count: {
        select: {
          executions: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Tools e Actions"
        description="Ferramentas autorizadas por agente e tenant para execução de ações controladas."
      />

      <ListModule
        title="Catálogo de tools"
        description="Schemas de entrada/saída, timeout, status e volume de execuções."
        headers={["Tool", "Slug", "Timeout", "execuções", "Status", "Estratégia de falha"]}
        hasData={tools.length > 0}
        emptyTitle="Nenhuma tool cadastrada"
        emptyDescription="Cadastre tools para habilitar ações seguras e auditáveis pelos agentes."
      >
        {tools.map((tool) => (
          <tr key={tool.id}>
            <DataCell>
              <p className="font-medium text-zinc-900">{tool.name}</p>
              <p className="text-xs text-zinc-500">{tool.description}</p>
            </DataCell>
            <DataCell>{tool.slug}</DataCell>
            <DataCell>{tool.timeoutMs}ms</DataCell>
            <DataCell>{tool._count.executions}</DataCell>
            <DataCell>
              <Badge label={tool.status} variant={tool.status === "ACTIVE" ? "success" : "warning"} />
            </DataCell>
            <DataCell>{tool.failureStrategy ?? "fallback"}</DataCell>
          </tr>
        ))}
      </ListModule>
    </div>
  );
}


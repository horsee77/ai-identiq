import { Badge } from "@/components/ui/badge";
import { DataCell } from "@/components/ui/table";
import { ListModule } from "@/components/modules/list-module";
import { SectionTitle } from "@/components/ui/section-title";
import { requirePermission } from "@/lib/auth/access";
import { prisma } from "@/lib/db/prisma";

export default async function PromptsPage() {
  const context = await requirePermission("prompts.view");

  const prompts = await prisma.prompt.findMany({
    where: {
      OR: [{ tenantId: context.tenantId }, { scope: "GLOBAL" }],
    },
    include: {
      agent: true,
      versions: {
        orderBy: { version: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Prompts e Governança"
        description="Versionamento, publicação controlada e trilha de comportamento para agentes sensíveis."
      />

      <ListModule
        title="Biblioteca de prompts"
        description="Prompts por finalidade com histórico, status de publicação e vínculo de agente."
        headers={["Prompt", "Tipo", "Agente", "Versão", "Status", "Atualização"]}
        hasData={prompts.length > 0}
        emptyTitle="Nenhum prompt cadastrado"
        emptyDescription="Cadastre prompts base, fallback e cenários críticos para Governança de respostas."
      >
        {prompts.map((prompt) => (
          <tr key={prompt.id}>
            <DataCell>
              <p className="font-medium text-zinc-900">{prompt.name}</p>
              <p className="text-xs text-zinc-500">{prompt.slug}</p>
            </DataCell>
            <DataCell>{prompt.type}</DataCell>
            <DataCell>{prompt.agent?.name ?? "Sem vínculo"}</DataCell>
            <DataCell>v{prompt.versions[0]?.version ?? 0}</DataCell>
            <DataCell>
              <Badge
                label={prompt.status}
                variant={prompt.status === "PUBLISHED" ? "success" : prompt.status === "DRAFT" ? "warning" : "default"}
              />
            </DataCell>
            <DataCell>{new Date(prompt.updatedAt).toLocaleDateString("pt-BR")}</DataCell>
          </tr>
        ))}
      </ListModule>
    </div>
  );
}


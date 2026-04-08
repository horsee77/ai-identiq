import { Badge } from "@/components/ui/badge";
import { DataCell } from "@/components/ui/table";
import { ListModule } from "@/components/modules/list-module";
import { SectionTitle } from "@/components/ui/section-title";
import { requirePermission } from "@/lib/auth/access";
import { prisma } from "@/lib/db/prisma";

export default async function ProvidersPage() {
  const context = await requirePermission("providers.view");
  const providers = await prisma.provider.findMany({
    where: {
      OR: [{ tenantId: context.tenantId }, { tenantId: null }],
    },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Providers de IA"
        description="Camada de conectividade para LLMs e embeddings com health check e failover."
      />
      <ListModule
        title="Provedores conectados"
        description="Gestão de roteamento, timeout, compatibilidade e monitoramento por provider."
        headers={["Provider", "Tipo", "Base URL", "Capabilities", "Health", "Status"]}
        hasData={providers.length > 0}
        emptyTitle="Nenhum provider cadastrado"
        emptyDescription="Cadastre um provider OpenAI-compatible para habilitar consumo de modelos."
      >
        {providers.map((provider) => (
          <tr key={provider.id}>
            <DataCell>
              <p className="font-medium text-zinc-900">{provider.name}</p>
              <p className="text-xs text-zinc-500">{provider.slug}</p>
            </DataCell>
            <DataCell>{provider.type}</DataCell>
            <DataCell>{provider.baseUrl}</DataCell>
            <DataCell>
              <div className="flex flex-wrap gap-1">
                {provider.supportsChat && <Badge label="Chat" variant="info" />}
                {provider.supportsResponses && <Badge label="Responses" variant="info" />}
                {provider.supportsEmbeddings && <Badge label="Embeddings" variant="info" />}
                {provider.supportsTools && <Badge label="Tools" variant="info" />}
              </div>
            </DataCell>
            <DataCell>
              <Badge
                label={provider.healthStatus ?? "unknown"}
                variant={provider.healthStatus === "healthy" ? "success" : "warning"}
              />
            </DataCell>
            <DataCell>
              <Badge label={provider.status} variant={provider.status === "ACTIVE" ? "success" : "warning"} />
            </DataCell>
          </tr>
        ))}
      </ListModule>
    </div>
  );
}


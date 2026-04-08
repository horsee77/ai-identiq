import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DataCell } from "@/components/ui/table";
import { ListModule } from "@/components/modules/list-module";
import { SectionTitle } from "@/components/ui/section-title";
import { requirePermission } from "@/lib/auth/access";
import { prisma } from "@/lib/db/prisma";

function tenantStatusLabel(status: string) {
  switch (status) {
    case "ACTIVE":
      return { label: "Ativo", variant: "success" as const };
    case "SUSPENDED":
      return { label: "Suspenso", variant: "warning" as const };
    case "BLOCKED":
      return { label: "Bloqueado", variant: "danger" as const };
    default:
      return { label: "Arquivado", variant: "default" as const };
  }
}

export default async function TenantsPage() {
  const context = await requirePermission("tenants.view");

  const tenants = context.isMasterAdmin
    ? await prisma.tenant.findMany({
        include: {
          plan: true,
          memberships: true,
          _count: {
            select: {
              knowledgeDocuments: true,
              agents: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    : await prisma.tenant.findMany({
        where: { id: context.tenantId },
        include: {
          plan: true,
          memberships: true,
          _count: {
            select: {
              knowledgeDocuments: true,
              agents: true,
            },
          },
        },
      });

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Gestão de Tenants"
        description="Administração de isolamento de dados, planos, usuários e capacidade por tenant."
      />

      <ListModule
        title="Tenants cadastrados"
        description="Controle de status, plano ativo e alocação operacional de cada tenant."
        headers={["Tenant", "Plano", "Usuários", "Agentes", "Documentos", "Status", "Ações"]}
        hasData={tenants.length > 0}
        emptyTitle="Nenhum tenant encontrado"
        emptyDescription="Crie um tenant para iniciar a operação multi-tenant da plataforma."
      >
        {tenants.map((tenant) => {
          const status = tenantStatusLabel(tenant.status);
          return (
            <tr key={tenant.id}>
              <DataCell>
                <p className="font-medium text-zinc-900">{tenant.name}</p>
                <p className="text-xs text-zinc-500">{tenant.slug}</p>
              </DataCell>
              <DataCell>{tenant.plan?.name ?? "Sem plano"}</DataCell>
              <DataCell>{tenant.memberships.length}</DataCell>
              <DataCell>{tenant._count.agents}</DataCell>
              <DataCell>{tenant._count.knowledgeDocuments}</DataCell>
              <DataCell>
                <Badge label={status.label} variant={status.variant} />
              </DataCell>
              <DataCell>
                <Link href={`/plataforma/tenants/${tenant.id}`} className="text-sm font-medium text-zinc-900 hover:text-zinc-700">
                  Ver detalhe
                </Link>
              </DataCell>
            </tr>
          );
        })}
      </ListModule>
    </div>
  );
}


import { Badge } from "@/components/ui/badge";
import { DataCell } from "@/components/ui/table";
import { ListModule } from "@/components/modules/list-module";
import { SectionTitle } from "@/components/ui/section-title";
import { requirePermission } from "@/lib/auth/access";
import { prisma } from "@/lib/db/prisma";

export default async function AuditoriaPage() {
  const context = await requirePermission("audit.view");

  const audits = await prisma.auditLog.findMany({
    where: context.isMasterAdmin
      ? undefined
      : {
          tenantId: context.tenantId,
        },
    include: {
      user: true,
      tenant: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Auditoria"
        description="Trilha de ações administrativas, eventos de autenticação e mudanças críticas da plataforma."
      />

      <ListModule
        title="Eventos auditáveis"
        description="Filtros por usuário, ação, entidade, severidade e tenant com rastreabilidade temporal."
        headers={["Data", "Usuário", "Ação", "Entidade", "Tenant", "Severidade", "Mensagem"]}
        hasData={audits.length > 0}
        emptyTitle="Nenhum log disponível"
        emptyDescription="Eventos de auditoria aparecerão aqui conforme as ações administrativas forem executadas."
      >
        {audits.map((audit) => (
          <tr key={audit.id}>
            <DataCell>{new Date(audit.createdAt).toLocaleString("pt-BR")}</DataCell>
            <DataCell>{audit.user?.fullName ?? "Sistema"}</DataCell>
            <DataCell>{audit.action}</DataCell>
            <DataCell>{audit.entityType}</DataCell>
            <DataCell>{audit.tenant?.name ?? "Global"}</DataCell>
            <DataCell>
              <Badge
                label={audit.severity}
                variant={audit.severity === "CRITICAL" || audit.severity === "HIGH" ? "danger" : "warning"}
              />
            </DataCell>
            <DataCell>{audit.message}</DataCell>
          </tr>
        ))}
      </ListModule>
    </div>
  );
}


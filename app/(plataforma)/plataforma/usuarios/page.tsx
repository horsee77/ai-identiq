import { Badge } from "@/components/ui/badge";
import { DataCell } from "@/components/ui/table";
import { ListModule } from "@/components/modules/list-module";
import { SectionTitle } from "@/components/ui/section-title";
import { requirePermission } from "@/lib/auth/access";
import { prisma } from "@/lib/db/prisma";

export default async function UsuariosPage() {
  const context = await requirePermission("users.view");

  const users = await prisma.user.findMany({
    where: {
      memberships: {
        some: {
          tenantId: context.tenantId,
        },
      },
    },
    include: {
      memberships: {
        where: { tenantId: context.tenantId },
        include: { role: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Gestão de Usuários"
        description="Controle de acesso por papel, status operacional e vínculo com tenant ativo."
      />
      <ListModule
        title="Usuários do tenant"
        description="Administração de contas, papéis e status para operação segura da plataforma."
        headers={["Nome", "Email", "Papel", "Status", "Último login"]}
        hasData={users.length > 0}
        emptyTitle="Nenhum usuário vinculado"
        emptyDescription="Convide usuários para este tenant para iniciar colaboração operacional."
      >
        {users.map((user) => {
          const membership = user.memberships[0];
          return (
            <tr key={user.id}>
              <DataCell>
                <p className="font-medium text-zinc-900">{user.fullName}</p>
              </DataCell>
              <DataCell>{user.email}</DataCell>
              <DataCell>{membership?.role.name ?? "Sem papel"}</DataCell>
              <DataCell>
                <Badge label={user.status} variant={user.status === "ACTIVE" ? "success" : "warning"} />
              </DataCell>
              <DataCell>
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("pt-BR") : "Nunca"}
              </DataCell>
            </tr>
          );
        })}
      </ListModule>
    </div>
  );
}


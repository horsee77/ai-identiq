import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { requirePermission } from "@/lib/auth/access";
import { prisma } from "@/lib/db/prisma";

export default async function PapeisPage() {
  await requirePermission("roles.view");
  const roles = await prisma.role.findMany({
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Papéis e Permissões"
        description="Matriz RBAC por módulo e Ação para Governança de acesso administrativo."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {roles.map((role) => (
          <Card
            key={role.id}
            title={role.name}
            subtitle={`Código: ${role.code} - ${role.rolePermissions.length} Permissões`}
          >
            <div className="flex flex-wrap gap-2">
              {role.rolePermissions.map((entry) => (
                <Badge key={entry.permissionId} label={entry.permission.key} variant="info" />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}


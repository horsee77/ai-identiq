import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DataCell, DataTable } from "@/components/ui/table";
import { SectionTitle } from "@/components/ui/section-title";
import { requirePermission } from "@/lib/auth/access";
import { prisma } from "@/lib/db/prisma";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  await requirePermission("tenants.view");
  const { tenantId } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      plan: true,
      memberships: {
        include: {
          user: true,
          role: true,
        },
      },
      agents: {
        orderBy: { updatedAt: "desc" },
        take: 8,
      },
      knowledgeDocuments: {
        orderBy: { updatedAt: "desc" },
        take: 8,
      },
      apiKeys: {
        orderBy: { createdAt: "desc" },
        take: 8,
      },
    },
  });

  if (!tenant) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <SectionTitle title={`Tenant - ${tenant.name}`} description="Visão consolidada de plano, usuários, agentes, documentos e segurança de acesso." />

      <section className="grid gap-4 lg:grid-cols-3">
        <Card title="Status do tenant">
          <Badge
            label={tenant.status === "ACTIVE" ? "Ativo" : tenant.status === "BLOCKED" ? "Bloqueado" : tenant.status}
            variant={tenant.status === "ACTIVE" ? "success" : tenant.status === "BLOCKED" ? "danger" : "warning"}
          />
          <p className="mt-3 text-sm text-zinc-600">Slug: {tenant.slug}</p>
        </Card>

        <Card title="Plano e limites">
          <p className="text-sm text-zinc-700">Plano: {tenant.plan?.name ?? "Não definido"}</p>
          <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
            {JSON.stringify(tenant.limits ?? {}, null, 2)}
          </pre>
        </Card>

        <Card title="Configurações do tenant">
          <pre className="max-h-48 overflow-auto rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
            {JSON.stringify(tenant.settings ?? {}, null, 2)}
          </pre>
        </Card>
      </section>

      <Card title="Usuários do tenant" subtitle="Membros com papéis e status de vínculo.">
        <DataTable headers={["Usuário", "Email", "Papel", "Status"]}>
          {tenant.memberships.map((membership) => (
            <tr key={membership.id}>
              <DataCell>{membership.user.fullName}</DataCell>
              <DataCell>{membership.user.email}</DataCell>
              <DataCell>{membership.role.name}</DataCell>
              <DataCell>
                <Badge label={membership.status} variant={membership.status === "ACTIVE" ? "success" : "warning"} />
              </DataCell>
            </tr>
          ))}
        </DataTable>
      </Card>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card title="Agentes vinculados">
          <ul className="space-y-2">
            {tenant.agents.map((agent) => (
              <li key={agent.id} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700">
                {agent.name}
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Documentos recentes">
          <ul className="space-y-2">
            {tenant.knowledgeDocuments.map((document) => (
              <li key={document.id} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700">
                {document.title}
              </li>
            ))}
          </ul>
        </Card>

        <Card title="API keys">
          <ul className="space-y-2">
            {tenant.apiKeys.map((apiKey) => (
              <li key={apiKey.id} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700">
                {apiKey.name} - {apiKey.prefix}
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}

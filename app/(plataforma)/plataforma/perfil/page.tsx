import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { requireSession } from "@/lib/auth/access";

export default async function PerfilPage() {
  const context = await requireSession();

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Meu Perfil"
        description="Informações da conta, tenant ativo e controles de segurança de acesso."
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <Card title="Identidade de acesso">
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-zinc-500">Nome</dt>
              <dd className="font-medium text-zinc-900">{context.name}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-zinc-500">Email</dt>
              <dd className="font-medium text-zinc-900">{context.email}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-zinc-500">Papel atual</dt>
              <dd className="font-medium text-zinc-900">{context.role}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-zinc-500">Tenant ativo</dt>
              <dd className="font-medium text-zinc-900">{context.tenantId}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Boas práticas de segurança">
          <ul className="space-y-2 text-sm text-zinc-600">
            <li>Use senha forte e exclusiva para a plataforma.</li>
            <li>Revise periodicamente chaves de API ativas no tenant.</li>
            <li>Evite compartilhar credenciais ou tokens em canais não seguros.</li>
            <li>Acione administração master em caso de suspeita de acesso indevido.</li>
          </ul>
        </Card>
      </section>
    </div>
  );
}


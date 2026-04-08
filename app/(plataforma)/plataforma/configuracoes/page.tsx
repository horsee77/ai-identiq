import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { DataCell, DataTable } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/access";
import { prisma } from "@/lib/db/prisma";
import { RuntimeSettingsForm } from "@/components/modules/runtime-settings-form";
import { getAiRuntimeConfig } from "@/lib/ai/core-engine/config";
import { SiteSettingsForm } from "@/components/modules/site-settings-form";
import { getSiteWidgetSettings } from "@/lib/settings/site-widget";

export default async function ConfiguracoesPage() {
  const context = await requirePermission("settings.manage");

  const [settings, featureFlags, runtimeConfig, siteSettings, agents, providers] = await Promise.all([
    prisma.setting.findMany({
      where: {
        OR: [{ tenantId: context.tenantId }, { tenantId: null }],
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.featureFlag.findMany({
      where: {
        OR: [{ tenantId: context.tenantId }, { tenantId: null }],
      },
      orderBy: { key: "asc" },
      take: 100,
    }),
    getAiRuntimeConfig({ tenantId: context.tenantId }),
    getSiteWidgetSettings(context.tenantId),
    prisma.agent.findMany({
      where: {
        OR: [{ tenantId: context.tenantId }, { tenantId: null }],
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.provider.findMany({
      where: {
        OR: [{ tenantId: context.tenantId }, { tenantId: null }],
        status: "ACTIVE",
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Configurações e Feature Flags"
        description="Parâmetros globais e por tenant com governança para rollout seguro de funcionalidades."
      />

      <RuntimeSettingsForm initialConfig={runtimeConfig} agents={agents} providers={providers} />
      <SiteSettingsForm initialSettings={siteSettings} agents={agents} />

      <Card
        title="Configurações ativas"
        subtitle="Escopo global e tenant para políticas de segurança, operação e governança."
      >
        <DataTable headers={["Chave", "Escopo", "Valor", "Atualização"]}>
          {settings.map((setting) => (
            <tr key={setting.id}>
              <DataCell>{setting.key}</DataCell>
              <DataCell>{setting.tenantId ? "Tenant" : "Global"}</DataCell>
              <DataCell className="font-mono text-xs">{JSON.stringify(setting.value)}</DataCell>
              <DataCell>{new Date(setting.updatedAt).toLocaleString("pt-BR")}</DataCell>
            </tr>
          ))}
        </DataTable>
      </Card>

      <Card title="Feature flags" subtitle="Controle progressivo de módulos com ativação segura e auditável.">
        <DataTable headers={["Flag", "Descrição", "Escopo", "Habilitado", "Tenant"]}>
          {featureFlags.map((flag) => (
            <tr key={flag.id}>
              <DataCell>{flag.key}</DataCell>
              <DataCell>{flag.description ?? "-"}</DataCell>
              <DataCell>{flag.scope}</DataCell>
              <DataCell>{flag.enabled ? "Sim" : "Não"}</DataCell>
              <DataCell>{flag.tenantId ?? "Global"}</DataCell>
            </tr>
          ))}
        </DataTable>
      </Card>
    </div>
  );
}


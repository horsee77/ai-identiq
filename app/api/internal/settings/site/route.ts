import { withApiHandler } from "@/lib/api/handler";
import { ok, fail } from "@/lib/api/response";
import { requireInternalPermission } from "@/lib/api/internal-auth";
import { getSiteWidgetSettings, upsertSiteWidgetSettings } from "@/lib/settings/site-widget";
import { siteSettingsPatchSchema } from "@/lib/schemas/site-settings";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/service";

export const GET = withApiHandler(async (_request, requestId) => {
  const context = await requireInternalPermission("settings.manage");
  const settings = await getSiteWidgetSettings(context.tenantId);
  return ok(requestId, settings);
});

export const PUT = withApiHandler(async (request, requestId) => {
  const context = await requireInternalPermission("settings.manage");
  const parsed = siteSettingsPatchSchema.safeParse(await request.json());

  if (!parsed.success) {
    return fail(requestId, "invalid_payload", "Dados inválidos para configuração do site.", 422, parsed.error.flatten());
  }

  const payload = parsed.data;

  if (payload.defaultAgentId) {
    const agent = await prisma.agent.findFirst({
      where: {
        id: payload.defaultAgentId,
        OR: [{ tenantId: context.tenantId }, { tenantId: null }],
      },
      select: { id: true },
    });

    if (!agent) {
      return fail(requestId, "not_found", "Agente padrão não encontrado no contexto do tenant.", 404);
    }
  }

  await upsertSiteWidgetSettings({
    tenantId: context.tenantId,
    values: {
      enabled: payload.enabled,
      allowAnonymous: payload.allowAnonymous,
      allowedOrigins: payload.allowedOrigins,
      defaultAgentId: payload.defaultAgentId ?? undefined,
      defaultResponseMode: payload.defaultResponseMode,
    },
  });

  const settings = await getSiteWidgetSettings(context.tenantId);

  await writeAuditLog({
    tenantId: context.tenantId,
    userId: context.userId,
    action: "settings.site_updated",
    entityType: "Setting",
    entityId: context.tenantId,
    severity: "HIGH",
    message: "Configuração do motor de resposta do site atualizada.",
    metadata: payload,
  });

  return ok(requestId, settings);
});

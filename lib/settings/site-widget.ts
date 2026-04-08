import "server-only";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";

const SITE_SETTING_KEYS = {
  enabled: "site.widget.enabled",
  allowAnonymous: "site.widget.allow_anonymous",
  allowedOrigins: "site.widget.allowed_origins",
  defaultAgentId: "site.widget.default_agent_id",
  defaultResponseMode: "site.widget.default_response_mode",
} as const;

export type SiteWidgetSettings = {
  enabled: boolean;
  allowAnonymous: boolean;
  allowedOrigins: string[];
  defaultAgentId?: string;
  defaultResponseMode: "STRICT_TEMPLATE_MODE" | "KNOWLEDGE_COMPOSER_MODE" | "ENRICHED_MODE";
};

function normalizeOrigin(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  try {
    const url = new URL(normalized);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function resolveDefaultOrigins() {
  const defaults = new Set<string>([
    "https://identiq.ai",
    "https://www.identiq.ai",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);

  const appOrigin = normalizeOrigin(env.APP_URL);
  if (appOrigin) {
    defaults.add(appOrigin);
  }

  return Array.from(defaults);
}

function toBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return fallback;
}

function toString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function toOrigins(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const origins = value
    .map((item) => (typeof item === "string" ? normalizeOrigin(item) : null))
    .filter((item): item is string => Boolean(item));

  return origins.length ? Array.from(new Set(origins)) : fallback;
}

function toResponseMode(
  value: unknown,
  fallback: SiteWidgetSettings["defaultResponseMode"]
): SiteWidgetSettings["defaultResponseMode"] {
  if (
    value === "STRICT_TEMPLATE_MODE" ||
    value === "KNOWLEDGE_COMPOSER_MODE" ||
    value === "ENRICHED_MODE"
  ) {
    return value;
  }

  return fallback;
}

async function readScopedSetting({
  key,
  tenantId,
}: {
  key: string;
  tenantId: string;
}) {
  const [tenant, global] = await Promise.all([
    prisma.setting.findFirst({
      where: {
        key,
        tenantId,
        agentId: null,
        providerId: null,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.setting.findFirst({
      where: {
        key,
        tenantId: null,
        agentId: null,
        providerId: null,
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return tenant ?? global ?? null;
}

export async function getSiteWidgetSettings(tenantId: string): Promise<SiteWidgetSettings> {
  const defaults: SiteWidgetSettings = {
    enabled: true,
    allowAnonymous: true,
    allowedOrigins: resolveDefaultOrigins(),
    defaultResponseMode: "KNOWLEDGE_COMPOSER_MODE",
  };

  const entries = await Promise.all(
    Object.values(SITE_SETTING_KEYS).map(async (key) => {
      const setting = await readScopedSetting({ key, tenantId });
      return [key, setting?.value] as const;
    })
  );

  const map = new Map(entries);

  return {
    enabled: toBoolean(map.get(SITE_SETTING_KEYS.enabled), defaults.enabled),
    allowAnonymous: toBoolean(map.get(SITE_SETTING_KEYS.allowAnonymous), defaults.allowAnonymous),
    allowedOrigins: toOrigins(map.get(SITE_SETTING_KEYS.allowedOrigins), defaults.allowedOrigins),
    defaultAgentId: toString(map.get(SITE_SETTING_KEYS.defaultAgentId)),
    defaultResponseMode: toResponseMode(
      map.get(SITE_SETTING_KEYS.defaultResponseMode),
      defaults.defaultResponseMode
    ),
  };
}

export async function upsertSiteWidgetSettings({
  tenantId,
  values,
}: {
  tenantId: string;
  values: Partial<SiteWidgetSettings>;
}) {
  const entries: Array<[string, unknown]> = [];

  if (values.enabled !== undefined) {
    entries.push([SITE_SETTING_KEYS.enabled, values.enabled]);
  }
  if (values.allowAnonymous !== undefined) {
    entries.push([SITE_SETTING_KEYS.allowAnonymous, values.allowAnonymous]);
  }
  if (values.allowedOrigins !== undefined) {
    const normalized = values.allowedOrigins
      .map((origin) => normalizeOrigin(origin))
      .filter((origin): origin is string => Boolean(origin));
    entries.push([SITE_SETTING_KEYS.allowedOrigins, Array.from(new Set(normalized))]);
  }
  if (values.defaultAgentId !== undefined) {
    entries.push([SITE_SETTING_KEYS.defaultAgentId, values.defaultAgentId ?? null]);
  }
  if (values.defaultResponseMode !== undefined) {
    entries.push([SITE_SETTING_KEYS.defaultResponseMode, values.defaultResponseMode]);
  }

  await prisma.$transaction(async (tx) => {
    for (const [key, value] of entries) {
      const existing = await tx.setting.findFirst({
        where: {
          key,
          tenantId,
          agentId: null,
          providerId: null,
        },
        orderBy: { createdAt: "desc" },
      });

      if (existing) {
        await tx.setting.update({
          where: { id: existing.id },
          data: { value: value as never },
        });
      } else {
        await tx.setting.create({
          data: {
            key,
            tenantId,
            agentId: null,
            providerId: null,
            value: value as never,
          },
        });
      }
    }
  });
}

export function isOriginAllowed(origin: string | null, allowedOrigins: string[]) {
  if (!origin) {
    return false;
  }

  const normalized = normalizeOrigin(origin);
  if (!normalized) {
    return false;
  }

  return allowedOrigins.includes(normalized);
}

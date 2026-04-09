import "server-only";
import { prisma } from "@/lib/db/prisma";
import { AgentResponseMode, RuntimeSwitches, SafetyLevel } from "@/lib/ai/core-engine/types";
import { env } from "@/lib/env";

export const AI_RUNTIME_SETTING_KEYS = {
  autonomousMode: "ai.autonomous_mode",
  externalProviderEnabled: "ai.external_provider_enabled",
  localLlmEnabled: "ai.local_llm_enabled",
  localEmbeddingsEnabled: "ai.local_embeddings_enabled",
  lexicalSearchEnabled: "ai.lexical_search_enabled",
  handoffThreshold: "ai.handoff_threshold",
  strictTemplatesOnly: "ai.strict_templates_only",
  allowEnrichment: "ai.allow_enrichment",
  safetyLevel: "ai.safety_level",
  knowledgeRequiredCategories: "ai.knowledge_required_categories",
  defaultResponseMode: "ai.default_response_mode",
  debugMode: "ai.debug_mode",
  localLlmProviderId: "ai.local_llm_provider_id",
  externalProviderId: "ai.external_provider_id",
} as const;

export const AI_RUNTIME_DEFAULTS: RuntimeSwitches = {
  autonomousMode: env.AI_AUTONOMOUS_MODE_DEFAULT,
  externalProviderEnabled: false,
  localLlmEnabled: false,
  localEmbeddingsEnabled: true,
  lexicalSearchEnabled: true,
  handoffThreshold: 0.68,
  strictTemplatesOnly: false,
  allowEnrichment: false,
  safetyLevel: "BALANCED",
  knowledgeRequiredCategories: [],
  defaultResponseMode: "KNOWLEDGE_COMPOSER_MODE",
  debugMode: false,
  localLlmProviderId: undefined,
  externalProviderId: undefined,
};

function toBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return fallback;
}

function toNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function toStringArray(value: unknown, fallback: string[]) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return fallback;
}

function toSafetyLevel(value: unknown, fallback: SafetyLevel): SafetyLevel {
  if (value === "STRICT" || value === "BALANCED" || value === "ELEVATED") {
    return value;
  }
  return fallback;
}

function toResponseMode(value: unknown, fallback: AgentResponseMode): AgentResponseMode {
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
  agentId,
}: {
  key: string;
  tenantId: string;
  agentId?: string;
}) {
  const [agent, tenant, global] = await Promise.all([
    agentId
      ? prisma.setting.findFirst({
          where: { key, tenantId, agentId, providerId: null },
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve(null),
    prisma.setting.findFirst({
      where: { key, tenantId, agentId: null, providerId: null },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.setting.findFirst({
      where: { key, tenantId: null, agentId: null, providerId: null },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return agent ?? tenant ?? global ?? null;
}

export async function getAiRuntimeConfig({
  tenantId,
  agentId,
}: {
  tenantId: string;
  agentId?: string;
}): Promise<RuntimeSwitches> {
  const entries = await Promise.all(
    Object.values(AI_RUNTIME_SETTING_KEYS).map(async (key) => {
      const setting = await readScopedSetting({ key, tenantId, agentId });
      return [key, setting?.value] as const;
    })
  );

  const map = new Map(entries);

  const runtime: RuntimeSwitches = {
    autonomousMode: toBoolean(
      map.get(AI_RUNTIME_SETTING_KEYS.autonomousMode),
      AI_RUNTIME_DEFAULTS.autonomousMode
    ),
    externalProviderEnabled: toBoolean(
      map.get(AI_RUNTIME_SETTING_KEYS.externalProviderEnabled),
      AI_RUNTIME_DEFAULTS.externalProviderEnabled
    ),
    localLlmEnabled: toBoolean(
      map.get(AI_RUNTIME_SETTING_KEYS.localLlmEnabled),
      AI_RUNTIME_DEFAULTS.localLlmEnabled
    ),
    localEmbeddingsEnabled: toBoolean(
      map.get(AI_RUNTIME_SETTING_KEYS.localEmbeddingsEnabled),
      AI_RUNTIME_DEFAULTS.localEmbeddingsEnabled
    ),
    lexicalSearchEnabled: toBoolean(
      map.get(AI_RUNTIME_SETTING_KEYS.lexicalSearchEnabled),
      AI_RUNTIME_DEFAULTS.lexicalSearchEnabled
    ),
    handoffThreshold: Math.min(
      1,
      Math.max(
        0,
        toNumber(map.get(AI_RUNTIME_SETTING_KEYS.handoffThreshold), AI_RUNTIME_DEFAULTS.handoffThreshold)
      )
    ),
    strictTemplatesOnly: toBoolean(
      map.get(AI_RUNTIME_SETTING_KEYS.strictTemplatesOnly),
      AI_RUNTIME_DEFAULTS.strictTemplatesOnly
    ),
    allowEnrichment: toBoolean(
      map.get(AI_RUNTIME_SETTING_KEYS.allowEnrichment),
      AI_RUNTIME_DEFAULTS.allowEnrichment
    ),
    safetyLevel: toSafetyLevel(
      map.get(AI_RUNTIME_SETTING_KEYS.safetyLevel),
      AI_RUNTIME_DEFAULTS.safetyLevel
    ),
    knowledgeRequiredCategories: toStringArray(
      map.get(AI_RUNTIME_SETTING_KEYS.knowledgeRequiredCategories),
      AI_RUNTIME_DEFAULTS.knowledgeRequiredCategories
    ),
    defaultResponseMode: toResponseMode(
      map.get(AI_RUNTIME_SETTING_KEYS.defaultResponseMode),
      AI_RUNTIME_DEFAULTS.defaultResponseMode
    ),
    debugMode: toBoolean(
      map.get(AI_RUNTIME_SETTING_KEYS.debugMode),
      AI_RUNTIME_DEFAULTS.debugMode
    ),
    localLlmProviderId:
      typeof map.get(AI_RUNTIME_SETTING_KEYS.localLlmProviderId) === "string"
        ? (map.get(AI_RUNTIME_SETTING_KEYS.localLlmProviderId) as string)
        : undefined,
    externalProviderId:
      typeof map.get(AI_RUNTIME_SETTING_KEYS.externalProviderId) === "string"
        ? (map.get(AI_RUNTIME_SETTING_KEYS.externalProviderId) as string)
        : undefined,
  };

  if (runtime.autonomousMode) {
    runtime.externalProviderEnabled = false;
  }

  if (runtime.strictTemplatesOnly) {
    runtime.defaultResponseMode = "STRICT_TEMPLATE_MODE";
    runtime.allowEnrichment = false;
  }

  return runtime;
}

export type UpsertAiRuntimeConfigInput = {
  tenantId: string;
  agentId?: string;
  values: Partial<RuntimeSwitches>;
};

export async function upsertAiRuntimeConfig(input: UpsertAiRuntimeConfigInput) {
  const entries: [string, unknown][] = [];

  if (input.values.autonomousMode !== undefined) {
    entries.push([AI_RUNTIME_SETTING_KEYS.autonomousMode, input.values.autonomousMode]);
  }
  if (input.values.externalProviderEnabled !== undefined) {
    entries.push([AI_RUNTIME_SETTING_KEYS.externalProviderEnabled, input.values.externalProviderEnabled]);
  }
  if (input.values.localLlmEnabled !== undefined) {
    entries.push([AI_RUNTIME_SETTING_KEYS.localLlmEnabled, input.values.localLlmEnabled]);
  }
  if (input.values.localEmbeddingsEnabled !== undefined) {
    entries.push([AI_RUNTIME_SETTING_KEYS.localEmbeddingsEnabled, input.values.localEmbeddingsEnabled]);
  }
  if (input.values.lexicalSearchEnabled !== undefined) {
    entries.push([AI_RUNTIME_SETTING_KEYS.lexicalSearchEnabled, input.values.lexicalSearchEnabled]);
  }
  if (input.values.handoffThreshold !== undefined) {
    entries.push([AI_RUNTIME_SETTING_KEYS.handoffThreshold, input.values.handoffThreshold]);
  }
  if (input.values.strictTemplatesOnly !== undefined) {
    entries.push([AI_RUNTIME_SETTING_KEYS.strictTemplatesOnly, input.values.strictTemplatesOnly]);
  }
  if (input.values.allowEnrichment !== undefined) {
    entries.push([AI_RUNTIME_SETTING_KEYS.allowEnrichment, input.values.allowEnrichment]);
  }
  if (input.values.safetyLevel !== undefined) {
    entries.push([AI_RUNTIME_SETTING_KEYS.safetyLevel, input.values.safetyLevel]);
  }
  if (input.values.knowledgeRequiredCategories !== undefined) {
    entries.push([
      AI_RUNTIME_SETTING_KEYS.knowledgeRequiredCategories,
      input.values.knowledgeRequiredCategories,
    ]);
  }
  if (input.values.defaultResponseMode !== undefined) {
    entries.push([AI_RUNTIME_SETTING_KEYS.defaultResponseMode, input.values.defaultResponseMode]);
  }
  if (input.values.debugMode !== undefined) {
    entries.push([AI_RUNTIME_SETTING_KEYS.debugMode, input.values.debugMode]);
  }
  if (input.values.localLlmProviderId !== undefined) {
    entries.push([AI_RUNTIME_SETTING_KEYS.localLlmProviderId, input.values.localLlmProviderId]);
  }
  if (input.values.externalProviderId !== undefined) {
    entries.push([AI_RUNTIME_SETTING_KEYS.externalProviderId, input.values.externalProviderId]);
  }

  await prisma.$transaction(async (tx) => {
    for (const [key, value] of entries) {
      const existing = await tx.setting.findFirst({
        where: {
          key,
          tenantId: input.tenantId,
          agentId: input.agentId ?? null,
          providerId: null,
        },
        orderBy: { createdAt: "desc" },
      });

      if (existing) {
        await tx.setting.update({
          where: { id: existing.id },
          data: {
            value: value as never,
          },
        });
      } else {
        await tx.setting.create({
          data: {
            key,
            tenantId: input.tenantId,
            agentId: input.agentId ?? null,
            providerId: null,
            value: value as never,
          },
        });
      }
    }
  });
}
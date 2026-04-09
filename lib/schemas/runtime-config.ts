import { z } from "zod";

export const runtimeConfigPatchSchema = z.object({
  agentId: z.string().cuid().optional(),
  autonomousMode: z.boolean().optional(),
  externalProviderEnabled: z.boolean().optional(),
  localLlmEnabled: z.boolean().optional(),
  localEmbeddingsEnabled: z.boolean().optional(),
  lexicalSearchEnabled: z.boolean().optional(),
  handoffThreshold: z.coerce.number().min(0).max(1).optional(),
  strictTemplatesOnly: z.boolean().optional(),
  allowEnrichment: z.boolean().optional(),
  safetyLevel: z.enum(["STRICT", "BALANCED", "ELEVATED"]).optional(),
  knowledgeRequiredCategories: z.array(z.string().trim().min(1)).optional(),
  defaultResponseMode: z
    .enum(["STRICT_TEMPLATE_MODE", "KNOWLEDGE_COMPOSER_MODE", "ENRICHED_MODE"])
    .optional(),
  debugMode: z.boolean().optional(),
  localLlmProviderId: z.string().cuid().nullable().optional(),
  externalProviderId: z.string().cuid().nullable().optional(),
});
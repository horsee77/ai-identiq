import { z } from "zod";

const originSchema = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Origem inválida. Use formato http(s)://dominio")
  .transform((value) => {
    const url = new URL(value);
    return url.origin;
  });

export const siteSettingsPatchSchema = z.object({
  enabled: z.boolean().optional(),
  allowAnonymous: z.boolean().optional(),
  allowedOrigins: z.array(originSchema).max(30).optional(),
  defaultAgentId: z.string().cuid().nullable().optional(),
  defaultResponseMode: z
    .enum(["STRICT_TEMPLATE_MODE", "KNOWLEDGE_COMPOSER_MODE", "ENRICHED_MODE"])
    .optional(),
});

export type SiteSettingsPatchInput = z.infer<typeof siteSettingsPatchSchema>;

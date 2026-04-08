import { z } from "zod";

export const providerSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  baseUrl: z.string().url(),
  apiKey: z.string().min(10),
  timeoutMs: z.coerce.number().int().positive().default(60000),
  type: z.enum(["OPENAI_COMPATIBLE", "OPENAI", "AZURE_OPENAI", "OTHER"]).default("OPENAI_COMPATIBLE"),
});

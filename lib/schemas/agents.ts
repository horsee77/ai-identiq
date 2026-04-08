import { z } from "zod";

export const agentSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  description: z.string().min(10),
  objective: z.string().min(10),
  category: z.string().min(2),
  systemPrompt: z.string().min(10),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]).default("DRAFT"),
  scope: z.enum(["GLOBAL", "TENANT"]).default("TENANT"),
  defaultModelId: z.string().cuid().optional().nullable(),
  defaultProviderId: z.string().cuid().optional().nullable(),
  temperature: z.coerce.number().min(0).max(2).default(0.2),
  topP: z.coerce.number().min(0).max(1).default(1),
  maxTokens: z.coerce.number().int().positive().default(1024),
});

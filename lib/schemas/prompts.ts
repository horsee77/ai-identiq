import { z } from "zod";

export const promptSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  type: z.enum(["BASE", "SYSTEM", "FALLBACK", "SCENARIO", "ESCALATION", "TEMPLATE"]),
  scope: z.enum(["GLOBAL", "TENANT"]).default("TENANT"),
  content: z.string().min(10),
  notes: z.string().optional(),
  agentId: z.string().cuid().optional().nullable(),
});

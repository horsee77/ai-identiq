import { z } from "zod";

export const tenantSchema = z.object({
  name: z.string().min(2, "Nome inválido."),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "O slug deve conter apenas letras minúsculas, números e hífen."),
  status: z.enum(["ACTIVE", "SUSPENDED", "BLOCKED", "ARCHIVED"]).default("ACTIVE"),
  planId: z.string().optional().nullable(),
});


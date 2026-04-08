import { z } from "zod";

export const apiKeyCreateSchema = z.object({
  name: z.string().min(2),
  scopes: z.array(z.string()).min(1),
  environment: z.enum(["development", "staging", "production"]).default("production"),
  monthlyRequestLimit: z.coerce.number().int().positive().optional(),
  monthlyCostLimitUsd: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional(),
});

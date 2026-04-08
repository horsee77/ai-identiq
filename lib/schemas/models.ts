import { z } from "zod";

export const modelSchema = z.object({
  providerId: z.string().cuid(),
  technicalName: z.string().min(2),
  displayName: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  category: z.enum(["CHAT", "REASONING", "EMBEDDING", "MULTIMODAL", "MODERATION"]),
  maxContextTokens: z.coerce.number().int().positive().default(8192),
  maxOutputTokens: z.coerce.number().int().positive().default(2048),
  inputCostPer1kUsd: z.coerce.number().nonnegative().default(0),
  outputCostPer1kUsd: z.coerce.number().nonnegative().default(0),
});

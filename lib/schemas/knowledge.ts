import { z } from "zod";

export const knowledgeDocumentSchema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  category: z.string().min(2),
  description: z.string().optional(),
  tags: z.array(z.string().min(1)).optional(),
  language: z.string().default("pt-BR"),
  visibility: z.enum(["GLOBAL", "TENANT", "PRIVATE"]).default("TENANT"),
  sensitivity: z.enum(["PUBLIC", "INTERNAL", "PII", "SENSITIVE", "BIOMETRIC"]).default("INTERNAL"),
  source: z.string().optional(),
  content: z.string().min(20, "Informe um conteúdo com pelo menos 20 caracteres."),
  autoApprove: z.boolean().optional(),
  autoIndex: z.boolean().optional(),
  chunkSize: z.coerce.number().int().min(200).max(3000).optional(),
  overlap: z.coerce.number().int().min(0).max(600).optional(),
});

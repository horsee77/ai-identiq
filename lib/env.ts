import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_NAME: z.string().default("Identiq AI Platform"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1).default("postgresql://postgres:postgres@localhost:5432/identiq"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(12),
  SESSION_COOKIE_NAME: z.string().default("identiq_session"),
  TENANT_COOKIE_NAME: z.string().default("identiq_tenant"),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  PASSWORD_POLICY_MIN_LENGTH: z.coerce.number().int().min(8).default(10),
  API_DEFAULT_TIMEOUT_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(120),
  AI_AUTONOMOUS_MODE_DEFAULT: z.coerce.boolean().default(true),
  AI_LOCAL_EMBEDDING_DIMENSIONS: z.coerce.number().int().min(32).max(2048).default(192),
  ENCRYPTION_KEY: z.string().min(32).default("identiq-local-encryption-key-change-before-production"),
  MASTER_SEED_EMAIL: z.string().email().default("master@identiq.ai"),
  MASTER_SEED_PASSWORD: z.string().min(8).default("Identiq@123456")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n");
  throw new Error(`Variáveis de ambiente inválidas:\n${formatted}`);
}

export const env = parsed.data;


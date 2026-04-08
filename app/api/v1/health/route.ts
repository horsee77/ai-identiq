import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";

export const GET = withApiHandler(async (_request, requestId) => {
  const [providers, models, agents] = await Promise.all([
    prisma.provider.count({ where: { status: "ACTIVE" } }),
    prisma.model.count({ where: { isActive: true } }),
    prisma.agent.count({ where: { status: "ACTIVE" } }),
  ]);

  return ok(requestId, {
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "Identiq AI Platform Public API",
    uptime: process.uptime(),
    dependencies: {
      providers,
      models,
      agents,
    },
    runtime: {
      core_engine: true,
      knowledge_engine: true,
      optional_llm_engine: true,
      site_chat_engine: true,
      autonomous_mode_default: env.AI_AUTONOMOUS_MODE_DEFAULT,
    },
  });
});

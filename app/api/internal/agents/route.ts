import { withApiHandler } from "@/lib/api/handler";
import { ok, fail } from "@/lib/api/response";
import { requireInternalPermission } from "@/lib/api/internal-auth";
import { prisma } from "@/lib/db/prisma";
import { agentSchema } from "@/lib/schemas/agents";
import { writeAuditLog } from "@/lib/audit/service";

export const GET = withApiHandler(async (_request, requestId) => {
  const context = await requireInternalPermission("agents.view");

  const agents = await prisma.agent.findMany({
    where: {
      OR: [{ tenantId: context.tenantId }, { scope: "GLOBAL" }],
    },
    include: {
      defaultModel: true,
      defaultProvider: true,
      toolMappings: {
        include: {
          tool: true,
        },
      },
      knowledgeMappings: {
        include: {
          document: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return ok(requestId, agents);
});

export const POST = withApiHandler(async (request, requestId) => {
  const context = await requireInternalPermission("agents.create");
  const parsed = agentSchema.safeParse(await request.json());

  if (!parsed.success) {
    return fail(requestId, "invalid_payload", "Dados inválidos para criação de agente.", 422, parsed.error.flatten());
  }

  const payload = parsed.data;

  const agent = await prisma.agent.create({
    data: {
      tenantId: payload.scope === "TENANT" ? context.tenantId : null,
      name: payload.name,
      slug: payload.slug,
      description: payload.description,
      objective: payload.objective,
      category: payload.category,
      systemPrompt: payload.systemPrompt,
      prohibitiveRules:
        "Nunca afirmar aprovação documental sem base real. Nunca inventar biometria ou status de análise.",
      rigidInstructions:
        "Sempre sinalizar limites da resposta e escalar para humano em cenário crítico de risco/compliance.",
      fallbackBehavior:
        "Quando confiança baixa, acionar revisão humana e registrar motivo.",
      defaultModelId: payload.defaultModelId,
      defaultProviderId: payload.defaultProviderId,
      temperature: payload.temperature,
      topP: payload.topP,
      maxTokens: payload.maxTokens,
      scope: payload.scope,
      status: payload.status,
      securityPolicies: {
        maskSensitiveData: true,
        enforceGuardrails: true,
      },
      versions: {
        create: {
          version: 1,
          snapshot: payload,
          createdById: context.userId,
          changelog: "Versão inicial",
        },
      },
    },
  });

  await writeAuditLog({
    tenantId: context.tenantId,
    userId: context.userId,
    action: "agent.created",
    entityType: "Agent",
    entityId: agent.id,
    severity: "HIGH",
    message: `Agente ${agent.name} criado com sucesso.`,
  });

  return ok(requestId, agent, 201);
});


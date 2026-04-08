import "server-only";
import { prisma } from "@/lib/db/prisma";

export async function getAgentRuntime(agentId: string, tenantId: string) {
  const agent = await prisma.agent.findFirst({
    where: {
      id: agentId,
      status: "ACTIVE",
      OR: [{ tenantId }, { scope: "GLOBAL" }],
    },
    include: {
      defaultProvider: true,
      defaultModel: true,
      prompts: {
        include: {
          versions: {
            where: { status: "PUBLISHED" },
            orderBy: { version: "desc" },
            take: 1,
          },
        },
      },
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
  });

  return agent;
}

export function buildAgentGuardrails() {
  return [
    "Nunca afirmar aprovação documental sem base verificável.",
    "Nunca inventar resultado de biometria, face match ou análise de risco.",
    "Nunca afirmar conformidade legal absoluta.",
    "Nunca expor dado sensível sem autorização explícita.",
    "Sempre indicar quando a resposta é automatizada.",
    "Sempre sugerir revisão humana em cenários críticos ou ambíguos."
  ];
}


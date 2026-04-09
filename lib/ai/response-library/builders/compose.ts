import "server-only";
import { getIntentContract } from "@/lib/ai/core-engine/intent-contracts";
import { AgentResponseMode, CoreIntent, HandoffDecision, KnowledgeHit } from "@/lib/ai/core-engine/types";
import { compactLines, renderTemplate } from "@/lib/ai/core-engine/template-engine";
import { buildGreeting } from "@/lib/ai/response-library/builders/greeting";
import { resolveOperationalFlow } from "@/lib/ai/response-library/builders/operational-flow";
import {
  buildNextStepCta,
  buildValuePresentation,
} from "@/lib/ai/response-library/builders/sales-presentation";
import { IDENTIQ_INSTITUTIONAL_FACTS } from "@/lib/ai/response-library/templates/identiq-brain";
import {
  ApprovedTemplateBlock,
  INTENT_BLOCKS,
  getApprovedTemplateBlockById,
} from "@/lib/ai/response-library/templates/default-ptbr";

type ComposeApprovedResponseInput = {
  intent: CoreIntent;
  responseMode: AgentResponseMode;
  agentName: string;
  userName?: string;
  userMessage: string;
  userTurnCount: number;
  knowledge: KnowledgeHit[];
  safetyNotices: string[];
  handoff: HandoffDecision;
};

type ComposeApprovedResponseOutput = {
  content: string;
  usedBlocks: string[];
  citedDocuments: { id: string; title: string; category: string }[];
  responseSections: {
    greeting: string;
    main: string;
    value: string;
    limits?: string;
    nextStep: string;
  };
};

function pickBaseBlock(intent: CoreIntent): ApprovedTemplateBlock {
  return INTENT_BLOCKS[intent]?.[0] ?? INTENT_BLOCKS.faq_comercial[0];
}

function bulletList(lines: string[]) {
  if (!lines.length) {
    return "";
  }

  return lines.map((line) => `- ${line}`).join("\n");
}

function buildKnowledgeSummary(knowledge: KnowledgeHit[], responseMode: AgentResponseMode) {
  if (responseMode === "STRICT_TEMPLATE_MODE") {
    return "";
  }

  if (!knowledge.length) {
    return "";
  }

  const top = knowledge.slice(0, 4);
  const bullets = top.map((hit) => {
    const summary = hit.content.replace(/\s+/g, " ").slice(0, 180);
    const score = (hit.score * 100).toFixed(0);
    return `${hit.document.title} (${hit.document.category}, relevancia ${score}%): ${summary}`;
  });

  return ["Base aplicada:", bulletList(bullets)].join("\n");
}

function buildInstitutionalFacts(intent: CoreIntent) {
  const facts = IDENTIQ_INSTITUTIONAL_FACTS[intent] ?? [];
  if (!facts.length) {
    return "";
  }

  return bulletList(facts.slice(0, 2));
}

function renderBlock(blockId: string, variables: Record<string, string | undefined>) {
  const block = getApprovedTemplateBlockById(blockId);
  if (!block) {
    return "";
  }

  return renderTemplate(block.text, variables);
}

function buildMainResponse({
  baseResponse,
  flowSummary,
  institutionalFacts,
  knowledgeSummary,
}: {
  baseResponse: string;
  flowSummary: string;
  institutionalFacts: string;
  knowledgeSummary: string;
}) {
  return compactLines([
    baseResponse,
    flowSummary,
    institutionalFacts ? `Diretriz Identiq:\n${institutionalFacts}` : "",
    knowledgeSummary,
  ]);
}

function buildLimitsSection({
  assertionLimits,
  safetyNotices,
  handoff,
}: {
  assertionLimits: string[];
  safetyNotices: string[];
  handoff: HandoffDecision;
}) {
  const limits = [...assertionLimits];

  if (handoff.level === "RESPONDER_COM_RESSALVA") {
    limits.push("A orientacao segue com cautela por confianca moderada neste contexto.");
  }

  if (handoff.level === "SOLICITAR_CONTEXTO") {
    limits.push("Para elevar precisao, e necessario confirmar alguns pontos do seu fluxo.");
  }

  if (safetyNotices.length) {
    limits.push(...safetyNotices);
  }

  if (!limits.length) {
    return "";
  }

  return ["Cuidados e limites aplicados:", bulletList(limits.slice(0, 5))].join("\n");
}

function buildFlowSummary(intent: CoreIntent) {
  const flow = resolveOperationalFlow(intent);
  if (!flow) {
    return "";
  }

  return [
    "Direcao recomendada:",
    bulletList([`Acao: ${flow.allowedOutput}`, `Cautela: ${flow.caution}`]),
  ].join("\n");
}

function buildNextStep({
  intent,
  handoff,
}: {
  intent: CoreIntent;
  handoff: HandoffDecision;
}) {
  if (handoff.level === "ESCALAR_HUMANO") {
    return compactLines([
      renderBlock("common.handoff.notice", {}),
      handoff.reason ?? "Vamos seguir com revisao humana para manter seguranca e aderencia ao processo.",
    ]);
  }

  if (handoff.level === "SOLICITAR_CONTEXTO") {
    return compactLines([
      renderBlock("common.context.request", {}),
      handoff.contextRequest,
      buildNextStepCta(intent),
    ]);
  }

  return buildNextStepCta(intent);
}

function sanitizeTemplateOutput(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0 && !line.includes("{{") && !line.includes("}}"))
    .join("\n\n");
}

export function composeApprovedResponse(
  input: ComposeApprovedResponseInput
): ComposeApprovedResponseOutput {
  const contract = getIntentContract(input.intent);
  const usedBlocks = new Set<string>();

  const variables = {
    agent_name: input.agentName,
    user_name: input.userName,
    user_message: input.userMessage,
  };

  const baseBlock = pickBaseBlock(input.intent);
  usedBlocks.add(baseBlock.id);

  const baseResponse = renderTemplate(baseBlock.text, variables);

  for (const blockId of contract.mandatoryBlocks) {
    const block = getApprovedTemplateBlockById(blockId);
    if (block) {
      usedBlocks.add(block.id);
    }
  }

  const greeting = buildGreeting({
    intent: input.intent,
    userName: input.userName,
    latestMessage: input.userMessage,
    userTurnCount: input.userTurnCount,
  });

  const flowSummary = buildFlowSummary(input.intent);
  const institutionalFacts = buildInstitutionalFacts(input.intent);
  const knowledgeSummary = buildKnowledgeSummary(input.knowledge, input.responseMode);
  const mainResponse = buildMainResponse({
    baseResponse,
    flowSummary,
    institutionalFacts,
    knowledgeSummary,
  });

  const valuePresentation = contract.useCommercialPresentation
    ? buildValuePresentation({
        intent: input.intent,
        userMessage: input.userMessage,
        hasKnowledge: input.knowledge.length > 0,
      })
    : "";

  const limitsSection = buildLimitsSection({
    assertionLimits: contract.assertionLimits,
    safetyNotices: input.safetyNotices,
    handoff: input.handoff,
  });

  const nextStep = buildNextStep({ intent: input.intent, handoff: input.handoff });

  const rendered = renderTemplate(contract.outputTemplate, {
    greeting,
    main_response: mainResponse,
    value_presentation: valuePresentation,
    limits_section: limitsSection,
    knowledge_summary: "",
    next_step: nextStep,
  });

  const content = compactLines([sanitizeTemplateOutput(rendered)]);

  const citedDocuments = input.knowledge.slice(0, 5).map((hit) => ({
    id: hit.document.id,
    title: hit.document.title,
    category: hit.document.category,
  }));

  return {
    content,
    usedBlocks: [...usedBlocks],
    citedDocuments,
    responseSections: {
      greeting,
      main: mainResponse,
      value: valuePresentation,
      limits: limitsSection || undefined,
      nextStep,
    },
  };
}
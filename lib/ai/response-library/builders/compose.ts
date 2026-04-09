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
  internalTrace: {
    flowId?: string;
    mode: "CLIENT_POLISHED_V2";
    rawSafetyNotices: string[];
    mandatoryBlockIds: string[];
  };
};

function pickBaseBlock(intent: CoreIntent): ApprovedTemplateBlock {
  return INTENT_BLOCKS[intent]?.[0] ?? INTENT_BLOCKS.faq_comercial[0];
}

function renderBlock(blockId: string, variables: Record<string, string | undefined>) {
  const block = getApprovedTemplateBlockById(blockId);
  if (!block) {
    return "";
  }

  return renderTemplate(block.text, variables);
}

function buildInstitutionalFacts(intent: CoreIntent) {
  const facts = IDENTIQ_INSTITUTIONAL_FACTS[intent] ?? [];
  return facts.slice(0, 2);
}

function buildFlowNarrative(intent: CoreIntent) {
  const flow = resolveOperationalFlow(intent);
  if (!flow) {
    return { flowId: undefined, sentence: "" };
  }

  const sentence = `${flow.allowedOutput} ${flow.caution}`;
  return {
    flowId: flow.id,
    sentence,
  };
}

function buildKnowledgeNarrative(knowledge: KnowledgeHit[], responseMode: AgentResponseMode) {
  if (responseMode === "STRICT_TEMPLATE_MODE" || !knowledge.length) {
    return "";
  }

  const top = knowledge.slice(0, 3);
  const lines = top.map((hit) => {
    const snippet = hit.content.replace(/\s+/g, " ").slice(0, 130).trim();
    return `${hit.document.title}: ${snippet}`;
  });

  if (lines.length === 1) {
    return `Com base no contexto recuperado, ${lines[0]}.`;
  }

  return `Com base no contexto recuperado, destacam-se ${lines.join("; ")}.`;
}

function buildMainResponse({
  baseResponse,
  flowNarrative,
  institutionalFacts,
  knowledgeNarrative,
}: {
  baseResponse: string;
  flowNarrative: string;
  institutionalFacts: string[];
  knowledgeNarrative: string;
}) {
  const factsNarrative = institutionalFacts.length
    ? `Na pratica, isso se traduz em ${institutionalFacts.join(" ")}`
    : "";

  return compactLines([baseResponse, flowNarrative, factsNarrative, knowledgeNarrative]);
}

function buildLimitsNarrative({
  assertionLimits,
  safetyNotices,
  handoff,
}: {
  assertionLimits: string[];
  safetyNotices: string[];
  handoff: HandoffDecision;
}) {
  const notes: string[] = [];

  if (handoff.level === "RESPONDER_COM_RESSALVA") {
    notes.push("Para manter precisao neste ponto, a orientacao segue com cautela controlada.");
  }

  if (handoff.level === "SOLICITAR_CONTEXTO") {
    notes.push("Com mais contexto do seu fluxo, consigo aumentar bastante a precisao da recomendacao.");
  }

  if (safetyNotices.length) {
    notes.push(...safetyNotices);
  }

  if (handoff.level === "ESCALAR_HUMANO") {
    notes.push(...assertionLimits.slice(0, 2));
  }

  if (!notes.length) {
    return "";
  }

  return notes.join(" ");
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
      handoff.reason ?? "Este cenario pede validacao humana complementar para manter seguranca e aderencia ao processo.",
    ]);
  }

  if (handoff.level === "SOLICITAR_CONTEXTO") {
    return compactLines([
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

  const mandatoryBlockIds: string[] = [];
  for (const blockId of contract.mandatoryBlocks) {
    const block = getApprovedTemplateBlockById(blockId);
    if (block) {
      usedBlocks.add(block.id);
      mandatoryBlockIds.push(block.id);
    }
  }

  const greeting = buildGreeting({
    intent: input.intent,
    userName: input.userName,
    latestMessage: input.userMessage,
    userTurnCount: input.userTurnCount,
  });

  const flowNarrative = buildFlowNarrative(input.intent);
  const institutionalFacts = buildInstitutionalFacts(input.intent);
  const knowledgeNarrative = buildKnowledgeNarrative(input.knowledge, input.responseMode);

  const mainResponse = buildMainResponse({
    baseResponse,
    flowNarrative: flowNarrative.sentence,
    institutionalFacts,
    knowledgeNarrative,
  });

  const valuePresentation = contract.useCommercialPresentation
    ? buildValuePresentation({
        intent: input.intent,
        userMessage: input.userMessage,
        hasKnowledge: input.knowledge.length > 0,
      })
    : "";

  const limitsNarrative = buildLimitsNarrative({
    assertionLimits: contract.assertionLimits,
    safetyNotices: input.safetyNotices,
    handoff: input.handoff,
  });

  const nextStep = buildNextStep({ intent: input.intent, handoff: input.handoff });

  const rendered = renderTemplate(contract.outputTemplate, {
    greeting,
    main_response: mainResponse,
    value_presentation: valuePresentation,
    limits_section: limitsNarrative,
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
      limits: limitsNarrative || undefined,
      nextStep,
    },
    internalTrace: {
      flowId: flowNarrative.flowId,
      mode: "CLIENT_POLISHED_V2",
      rawSafetyNotices: input.safetyNotices,
      mandatoryBlockIds,
    },
  };
}
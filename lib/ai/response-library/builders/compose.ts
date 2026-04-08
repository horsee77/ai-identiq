import "server-only";
import { AgentResponseMode, CoreIntent, KnowledgeHit } from "@/lib/ai/core-engine/types";
import { compactLines, renderTemplate } from "@/lib/ai/core-engine/template-engine";
import { resolveOperationalFlow } from "@/lib/ai/response-library/builders/operational-flow";
import {
  ApprovedTemplateBlock,
  COMMON_BLOCKS,
  INTENT_BLOCKS,
} from "@/lib/ai/response-library/templates/default-ptbr";

type ComposeApprovedResponseInput = {
  intent: CoreIntent;
  responseMode: AgentResponseMode;
  agentName: string;
  userMessage: string;
  knowledge: KnowledgeHit[];
  safetyNotices: string[];
  includeHandoffNotice: boolean;
};

type ComposeApprovedResponseOutput = {
  content: string;
  usedBlocks: string[];
  citedDocuments: { id: string; title: string; category: string }[];
};

function pickBaseBlock(intent: CoreIntent): ApprovedTemplateBlock {
  return INTENT_BLOCKS[intent]?.[0] ?? INTENT_BLOCKS.faq[0];
}

function buildKnowledgeSummary(knowledge: KnowledgeHit[]) {
  if (!knowledge.length) {
    return "";
  }

  const top = knowledge.slice(0, 3);
  const bullets = top.map((hit) => {
    const summary = hit.content.replace(/\s+/g, " ").slice(0, 240);
    return `- ${hit.document.title}: ${summary}`;
  });

  return `Referências internas relevantes:\n${bullets.join("\n")}`;
}

export function composeApprovedResponse(
  input: ComposeApprovedResponseInput
): ComposeApprovedResponseOutput {
  const usedBlocks: string[] = [];
  const baseBlock = pickBaseBlock(input.intent);
  usedBlocks.push(baseBlock.id);

  const automationNotice = COMMON_BLOCKS.find((block) => block.id === "common.automation.notice");
  const handoffNotice = COMMON_BLOCKS.find((block) => block.id === "common.handoff.notice");
  const scopeLimit = COMMON_BLOCKS.find((block) => block.id === "common.scope.limit");

  const base = renderTemplate(baseBlock.text, {
    agent_name: input.agentName,
    user_message: input.userMessage,
  });

  const knowledgeSummary =
    input.responseMode === "STRICT_TEMPLATE_MODE" ? "" : buildKnowledgeSummary(input.knowledge);

  const safetySection = input.safetyNotices.length
    ? `Diretrizes de segurança aplicadas:\n${input.safetyNotices.map((notice) => `- ${notice}`).join("\n")}`
    : "";

  const flow = resolveOperationalFlow(input.intent);
  const flowSection = flow
    ? compactLines([
        `Fluxo operacional aplicado: ${flow.allowedOutput}`,
        `Cautela obrigatória: ${flow.caution}`,
      ])
    : "";

  const nextSteps = input.includeHandoffNotice
    ? "Próximo passo: encaminhar para analista humano com o contexto desta conversa."
    : "Próximo passo: se necessário, envie mais contexto para aprofundarmos com segurança.";

  const content = compactLines([
    base,
    knowledgeSummary,
    flowSection,
    safetySection,
    scopeLimit?.text,
    input.includeHandoffNotice ? handoffNotice?.text : "",
    nextSteps,
    automationNotice?.text,
  ]);

  if (automationNotice) usedBlocks.push(automationNotice.id);
  if (scopeLimit) usedBlocks.push(scopeLimit.id);
  if (input.includeHandoffNotice && handoffNotice) usedBlocks.push(handoffNotice.id);

  const citedDocuments = input.knowledge.slice(0, 5).map((hit) => ({
    id: hit.document.id,
    title: hit.document.title,
    category: hit.document.category,
  }));

  return {
    content,
    usedBlocks,
    citedDocuments,
  };
}


import "server-only";
import { composeApprovedResponse } from "@/lib/ai/response-library/builders/compose";
import {
  CoreComposedResponse,
  HandoffDecision,
  IntentClassification,
  KnowledgeHit,
  PolicyDecision,
} from "@/lib/ai/core-engine/types";

export function composeCoreResponse({
  classification,
  policy,
  knowledge,
  handoff,
  agentName,
  userName,
  message,
  userTurnCount,
}: {
  classification: IntentClassification;
  policy: PolicyDecision;
  knowledge: KnowledgeHit[];
  handoff: HandoffDecision;
  agentName: string;
  userName?: string;
  message: string;
  userTurnCount: number;
}): CoreComposedResponse {
  const composed = composeApprovedResponse({
    intent: classification.intent,
    responseMode: policy.responseMode,
    agentName,
    userName,
    userMessage: message,
    userTurnCount,
    knowledge,
    safetyNotices: policy.safetyNotices,
    handoff,
  });

  return {
    content: composed.content,
    usedBlocks: composed.usedBlocks,
    citedDocuments: composed.citedDocuments,
    responseSections: composed.responseSections,
    internalTrace: composed.internalTrace,
  };
}

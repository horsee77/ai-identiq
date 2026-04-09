import "server-only";
import { composeApprovedResponse } from "@/lib/ai/response-library/builders/compose";
import {
  CoreComposedResponse,
  IntentClassification,
  KnowledgeHit,
  PolicyDecision,
} from "@/lib/ai/core-engine/types";

export function composeCoreResponse({
  classification,
  policy,
  knowledge,
  agentName,
  userName,
  message,
}: {
  classification: IntentClassification;
  policy: PolicyDecision;
  knowledge: KnowledgeHit[];
  agentName: string;
  userName?: string;
  message: string;
}): CoreComposedResponse {
  const composed = composeApprovedResponse({
    intent: classification.intent,
    responseMode: policy.responseMode,
    agentName,
    userName,
    userMessage: message,
    knowledge,
    safetyNotices: policy.safetyNotices,
    includeHandoffNotice: policy.mustHandoff,
  });

  return {
    content: composed.content,
    usedBlocks: composed.usedBlocks,
    citedDocuments: composed.citedDocuments,
  };
}

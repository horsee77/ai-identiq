import "server-only";
import { IntentClassification, KnowledgeHit, PolicyDecision } from "@/lib/ai/core-engine/types";

function averageScore(hits: KnowledgeHit[]) {
  if (!hits.length) {
    return 0;
  }
  const sum = hits.reduce((acc, hit) => acc + hit.score, 0);
  return sum / hits.length;
}

export function calculateResponseConfidence({
  classification,
  knowledge,
  policy,
}: {
  classification: IntentClassification;
  knowledge: KnowledgeHit[];
  policy: PolicyDecision;
}) {
  const intentWeight = classification.confidence * 0.6;
  const knowledgeWeight = Math.min(1, averageScore(knowledge)) * 0.3;
  const safetyPenalty = policy.mustHandoff ? 0.2 : 0;
  const policyPenalty = policy.canRespond ? 0 : 0.25;
  const score = Math.max(0.05, Math.min(0.99, intentWeight + knowledgeWeight + 0.1 - safetyPenalty - policyPenalty));
  return Number(score.toFixed(2));
}

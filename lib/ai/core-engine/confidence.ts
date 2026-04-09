import "server-only";
import { IntentClassification, KnowledgeHit, PolicyDecision } from "@/lib/ai/core-engine/types";

function averageScore(hits: KnowledgeHit[]) {
  if (!hits.length) {
    return 0;
  }

  const sum = hits.reduce((acc, hit) => acc + hit.score, 0);
  return sum / hits.length;
}

function averageCategoryBoost(hits: KnowledgeHit[]) {
  if (!hits.length) {
    return 0;
  }

  const sum = hits.reduce((acc, hit) => acc + (hit.categoryBoost ?? 0), 0);
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
  const intentComponent = classification.confidence * 0.72;
  const retrievalComponent = Math.min(1, averageScore(knowledge)) * 0.18;
  const categoryComponent = Math.min(0.09, averageCategoryBoost(knowledge) * 0.9);
  const coverageBonus = knowledge.length ? Math.min(0.05, knowledge.length * 0.015) : 0;

  const emptyRetrievalPenalty =
    knowledge.length === 0
      ? classification.confidence >= 0.7
        ? 0.02
        : 0.06
      : 0;

  const handoffPenalty = policy.mustHandoff ? 0.14 : 0;
  const safetyPenalty = policy.safetyNotices.length ? Math.min(0.08, policy.safetyNotices.length * 0.02) : 0;
  const invalidPolicyPenalty = policy.canRespond ? 0 : 0.18;

  const score = Math.max(
    0.08,
    Math.min(
      0.99,
      intentComponent + retrievalComponent + categoryComponent + coverageBonus + 0.08 -
        emptyRetrievalPenalty -
        handoffPenalty -
        safetyPenalty -
        invalidPolicyPenalty
    )
  );

  const reasoning = [
    `intent=${classification.confidence.toFixed(2)} (peso 0.72)`,
    `retrieval=${Math.min(1, averageScore(knowledge)).toFixed(2)} (peso 0.18)`,
    `category_match=${averageCategoryBoost(knowledge).toFixed(2)} (peso 0.09)`,
    `bonus_cobertura=${coverageBonus.toFixed(2)}`,
    `penalidade_sem_retrieval=${emptyRetrievalPenalty.toFixed(2)}`,
    `penalidade_handoff=${handoffPenalty.toFixed(2)}`,
    `penalidade_safety=${safetyPenalty.toFixed(2)}`,
    `penalidade_politica=${invalidPolicyPenalty.toFixed(2)}`,
  ].join(" | ");

  return {
    score: Number(score.toFixed(2)),
    reason: reasoning,
  };
}
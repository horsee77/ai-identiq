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
  const intentWeight = classification.confidence * 0.58;
  const knowledgeWeight = Math.min(1, averageScore(knowledge)) * 0.3;
  const coverageBonus = knowledge.length ? Math.min(0.08, knowledge.length * 0.02) : 0;
  const handoffPenalty = policy.mustHandoff ? 0.18 : 0;
  const safetyPenalty = policy.safetyNotices.length ? Math.min(0.12, policy.safetyNotices.length * 0.03) : 0;

  const score = Math.max(
    0.05,
    Math.min(0.99, intentWeight + knowledgeWeight + coverageBonus + 0.12 - handoffPenalty - safetyPenalty)
  );

  const reasoning = [
    `classificacao=${classification.confidence.toFixed(2)} (peso 0.58)`,
    `contexto=${Math.min(1, averageScore(knowledge)).toFixed(2)} (peso 0.30)`,
    `bonus_cobertura=${coverageBonus.toFixed(2)}`,
    `penalidade_handoff=${handoffPenalty.toFixed(2)}`,
    `penalidade_safety=${safetyPenalty.toFixed(2)}`,
  ].join(" | ");

  return {
    score: Number(score.toFixed(2)),
    reason: reasoning,
  };
}
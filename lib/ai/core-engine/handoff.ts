import "server-only";
import { HandoffDecision, IntentClassification, PolicyDecision, RuntimeSwitches } from "@/lib/ai/core-engine/types";

const DEFAULT_QUEUE = "analise-humana";

export function decideHandoff({
  classification,
  policy,
  confidence,
  runtime,
}: {
  classification: IntentClassification;
  policy: PolicyDecision;
  confidence: number;
  runtime: RuntimeSwitches;
}): HandoffDecision {
  if (policy.mustHandoff) {
    return {
      shouldHandoff: true,
      reason: policy.restrictionReason ?? "Política de segurança exige validação humana.",
      queueName: DEFAULT_QUEUE,
    };
  }

  if (classification.intent === "solicitar_humano") {
    return {
      shouldHandoff: true,
      reason: "Usuário solicitou atendimento humano.",
      queueName: DEFAULT_QUEUE,
    };
  }

  if (classification.intent === "caso_critico") {
    return {
      shouldHandoff: true,
      reason: "Caso crítico identificado pela camada de classificação.",
      queueName: DEFAULT_QUEUE,
    };
  }

  if (confidence < runtime.handoffThreshold) {
    return {
      shouldHandoff: true,
      reason: "Confiança abaixo do limiar configurado.",
      queueName: DEFAULT_QUEUE,
    };
  }

  return { shouldHandoff: false };
}


import "server-only";
import { getIntentContract } from "@/lib/ai/core-engine/intent-contracts";
import {
  HandoffDecision,
  IntentClassification,
  PolicyDecision,
  RuntimeSwitches,
} from "@/lib/ai/core-engine/types";

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
  const contract = getIntentContract(classification.intent);
  const escalationHint = contract.escalateWhen[0] ?? "Regra de escalonamento da intent aplicada.";

  if (classification.intent === "handoff_humano") {
    return {
      level: "ESCALAR_HUMANO",
      shouldHandoff: true,
      reason: `Escalonamento solicitado pelo usuario. ${escalationHint}`,
      queueName: DEFAULT_QUEUE,
    };
  }

  if (policy.mustHandoff) {
    return {
      level: "ESCALAR_HUMANO",
      shouldHandoff: true,
      reason: policy.restrictionReason ?? escalationHint,
      queueName: DEFAULT_QUEUE,
    };
  }

  if (confidence >= contract.handoffPolicy.respondNormallyMin) {
    return {
      level: "RESPONDER_NORMALMENTE",
      shouldHandoff: false,
    };
  }

  if (confidence >= contract.handoffPolicy.respondWithCaveatMin) {
    return {
      level: "RESPONDER_COM_RESSALVA",
      shouldHandoff: false,
      reason: "Confianca moderada; resposta segue com cautela controlada.",
    };
  }

  if (confidence >= contract.handoffPolicy.requestContextMin || confidence >= runtime.handoffThreshold - 0.1) {
    return {
      level: "SOLICITAR_CONTEXTO",
      shouldHandoff: false,
      reason: "Confianca insuficiente para resposta conclusiva sem mais contexto.",
      contextRequest:
        "Para te responder com mais precisao, me informe o fluxo, endpoint ou etapa operacional exata que deseja analisar.",
    };
  }

  if (classification.criticality === "LOW") {
    return {
      level: "SOLICITAR_CONTEXTO",
      shouldHandoff: false,
      reason: "Pergunta ampla com baixa evidencia; coletar contexto antes de escalar.",
      contextRequest: "Se puder, detalhe melhor objetivo e ambiente para eu direcionar a resposta.",
    };
  }

  return {
    level: "ESCALAR_HUMANO",
    shouldHandoff: true,
    reason: `Confianca abaixo do limiar para intent ${classification.intent}. ${escalationHint}`,
    queueName: DEFAULT_QUEUE,
  };
}
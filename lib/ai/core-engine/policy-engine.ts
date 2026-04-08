import "server-only";
import { AgentResponseMode, IntentClassification, PolicyDecision, RuntimeSwitches } from "@/lib/ai/core-engine/types";

const FORBIDDEN_ASSERTIONS = [
  "aprovar documento",
  "documento aprovado",
  "documento reprovado",
  "biometria aprovada",
  "face match aprovado",
  "score de risco final",
  "compliance garantido",
];

const SENSITIVE_DATA_PATTERNS = [
  "cpf",
  "rg",
  "passaporte",
  "biometria",
  "selfie",
  "documento completo",
  "dados pessoais",
];

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function detectForbiddenAssertion(text: string) {
  const normalized = normalize(text);
  return FORBIDDEN_ASSERTIONS.some((pattern) => normalized.includes(pattern));
}

function detectSensitiveDataRequest(text: string) {
  const normalized = normalize(text);
  return SENSITIVE_DATA_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function selectResponseMode(
  classification: IntentClassification,
  runtime: RuntimeSwitches
): AgentResponseMode {
  if (runtime.strictTemplatesOnly) {
    return "STRICT_TEMPLATE_MODE";
  }

  if (classification.allowedResponseMode === "template_only") {
    return "STRICT_TEMPLATE_MODE";
  }

  if (runtime.defaultResponseMode === "ENRICHED_MODE" && runtime.allowEnrichment) {
    return "ENRICHED_MODE";
  }

  return runtime.defaultResponseMode;
}

export function evaluatePolicy({
  message,
  classification,
  runtime,
}: {
  message: string;
  classification: IntentClassification;
  runtime: RuntimeSwitches;
}): PolicyDecision {
  const notices: string[] = [];
  const forbiddenAssertion = detectForbiddenAssertion(message);
  const sensitiveRequest = detectSensitiveDataRequest(message);
  const responseMode = selectResponseMode(classification, runtime);

  if (forbiddenAssertion) {
    notices.push("Resposta restrita por guardrail de decisão sensível.");
  }

  if (sensitiveRequest) {
    notices.push("Dados sensíveis detectados: aplicar mascaramento e cautela.");
  }

  const strictSafety = runtime.safetyLevel === "STRICT";
  const elevatedSafety = runtime.safetyLevel === "ELEVATED";
  const highRiskIntent = classification.criticality === "HIGH" || classification.criticality === "CRITICAL";

  const mustHandoff =
    classification.requiresHandoff ||
    forbiddenAssertion ||
    (strictSafety && highRiskIntent) ||
    (elevatedSafety && classification.confidence < 0.55);

  const canRespond = !forbiddenAssertion || classification.intent === "solicitar_humano";

  const requiresKnowledge =
    classification.requiresRag ||
    runtime.knowledgeRequiredCategories.length > 0 ||
    responseMode === "KNOWLEDGE_COMPOSER_MODE";

  return {
    canRespond,
    mustHandoff,
    responseMode,
    requiresKnowledge,
    safetyNotices: notices,
    restrictionReason: !canRespond ? "Política de segurança impede resposta direta." : undefined,
  };
}


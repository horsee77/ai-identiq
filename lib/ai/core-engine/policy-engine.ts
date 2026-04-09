import "server-only";
import {
  AgentResponseMode,
  IntentClassification,
  PolicyDecision,
  RuntimeSwitches,
} from "@/lib/ai/core-engine/types";

const GLOBAL_FORBIDDEN_ASSERTION_PATTERNS = [
  "aprovar documento",
  "documento aprovado",
  "documento reprovado",
  "biometria aprovada",
  "face match aprovado",
  "score de risco final",
  "compliance garantido",
  "conformidade absoluta",
];

const SENSITIVE_DATA_PATTERNS = [
  "cpf",
  "rg",
  "passaporte",
  "selfie",
  "documento completo",
  "dados pessoais",
  "biometria",
];

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function detectByPattern(text: string, patterns: string[]) {
  const normalized = normalize(text);
  return patterns.find((pattern) => normalized.includes(pattern));
}

function selectResponseMode(classification: IntentClassification, runtime: RuntimeSwitches): AgentResponseMode {
  if (runtime.strictTemplatesOnly) {
    return "STRICT_TEMPLATE_MODE";
  }

  if (classification.allowedResponseMode === "template_only") {
    return "STRICT_TEMPLATE_MODE";
  }

  if (classification.allowedResponseMode === "restricted") {
    return "STRICT_TEMPLATE_MODE";
  }

  if (
    classification.allowedResponseMode === "enriched" &&
    runtime.defaultResponseMode === "ENRICHED_MODE" &&
    runtime.allowEnrichment
  ) {
    return "ENRICHED_MODE";
  }

  if (runtime.defaultResponseMode === "ENRICHED_MODE" && runtime.allowEnrichment) {
    return "ENRICHED_MODE";
  }

  return "KNOWLEDGE_COMPOSER_MODE";
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
  const appliedPolicies: string[] = [];

  const forbiddenAssertion = detectByPattern(message, GLOBAL_FORBIDDEN_ASSERTION_PATTERNS);
  const sensitiveRequest = detectByPattern(message, SENSITIVE_DATA_PATTERNS);
  const responseMode = selectResponseMode(classification, runtime);

  if (forbiddenAssertion) {
    notices.push("Guardrail aplicado: afirmacao sensivel bloqueada para resposta final.");
    appliedPolicies.push(`policy.forbidden_assertion:${forbiddenAssertion}`);
  }

  if (sensitiveRequest) {
    notices.push("Guardrail aplicado: pedido com dado sensivel exige mascaramento e contexto minimo.");
    appliedPolicies.push(`policy.sensitive_data:${sensitiveRequest}`);
  }

  const highRiskIntent = classification.criticality === "HIGH" || classification.criticality === "CRITICAL";

  if (runtime.safetyLevel === "STRICT") {
    appliedPolicies.push("policy.safety_level:STRICT");
  } else if (runtime.safetyLevel === "ELEVATED") {
    appliedPolicies.push("policy.safety_level:ELEVATED");
  }

  let mustHandoff = classification.intent === "handoff_humano" || classification.requiresHandoff;
  let restrictionReason: string | undefined;

  if (!mustHandoff && runtime.safetyLevel === "STRICT" && highRiskIntent && classification.confidence < 0.62) {
    mustHandoff = true;
    restrictionReason =
      "Nivel de seguranca STRICT acionou revisao humana para evitar afirmacao indevida em contexto sensivel.";
    appliedPolicies.push("policy.strict_handoff");
  }

  if (!mustHandoff && runtime.safetyLevel === "ELEVATED" && highRiskIntent && classification.confidence < 0.52) {
    mustHandoff = true;
    restrictionReason = "Confianca moderada em contexto sensivel; revisao humana complementar requerida.";
    appliedPolicies.push("policy.elevated_handoff");
  }

  if (!mustHandoff && Boolean(forbiddenAssertion)) {
    mustHandoff = true;
    restrictionReason = "Solicitacao inclui afirmacao que viola guardrails institucionais obrigatorios.";
    appliedPolicies.push("policy.guardrail_handoff");
  }

  const canRespond = true;

  const requiresKnowledge =
    classification.requiresRag ||
    runtime.knowledgeRequiredCategories.length > 0 ||
    responseMode !== "STRICT_TEMPLATE_MODE";

  return {
    canRespond,
    mustHandoff,
    responseMode,
    requiresKnowledge,
    safetyNotices: notices,
    appliedPolicies,
    restrictionReason,
  };
}
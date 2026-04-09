import { CoreIntent } from "@/lib/ai/core-engine/types";

type SalesPresentationInput = {
  intent: CoreIntent;
  userMessage: string;
  hasKnowledge: boolean;
};

const VALUE_LINES: Record<CoreIntent, string[]> = {
  institucional_comercial: [
    "A Identiq pode apoiar sua operacao com uma estrutura que combina seguranca, eficiencia e escalabilidade em jornadas criticas de identidade.",
    "A adocao pode ser organizada por frentes como onboarding, validacao documental, biometria, compliance e integracoes, equilibrando experiencia do usuario e controle de risco.",
  ],
  faq_comercial: [
    "Conseguimos estruturar uma entrada gradual, com ganho operacional rapido e governanca desde as primeiras etapas.",
    "Em geral, isso melhora conversao, previsibilidade de analise e rastreabilidade de decisao sem sacrificar seguranca.",
  ],
  suporte_operacional: [
    "Com diagnostico estruturado e observabilidade, sua equipe reduz tempo de resposta e melhora previsibilidade operacional.",
  ],
  integracoes_api: [
    "Uma integracao bem estruturada com API key, idempotencia e request_id reduz risco operacional e facilita auditoria.",
  ],
  onboarding_kyc: [
    "Com fluxo de onboarding e KYC bem desenhado, sua operacao ganha consistencia, evidencia e menor exposicao a fraude.",
  ],
  aml_compliance: [
    "A governanca em AML/compliance fortalece decisao, reduz risco regulatorio e melhora rastreabilidade das analises.",
  ],
  handoff_humano: [
    "A transferencia para especialista preserva continuidade e acelera resolucao em cenarios sensiveis.",
  ],
};

const CTA_LINES: Record<CoreIntent, string> = {
  institucional_comercial:
    "Se quiser, organizo isso para o seu contexto em um plano objetivo por frente: onboarding, KYC, biometria, compliance e integracoes API.",
  faq_comercial:
    "Se preferir, ja te ajudo a estruturar o escopo inicial para uma avaliacao comercial mais precisa.",
  suporte_operacional:
    "Se quiser, descrevo o passo a passo de diagnostico com checklist por prioridade.",
  integracoes_api:
    "Se preferir, monto um roteiro tecnico com autenticacao, payload, erros previsiveis, retry e observabilidade.",
  onboarding_kyc:
    "Se quiser, te entrego esse fluxo em formato de procedimento operacional por etapa.",
  aml_compliance:
    "Se preferir, organizo isso como matriz de risco com gatilhos de revisao humana.",
  handoff_humano:
    "Se desejar, ja deixo resumidos os pontos criticos para agilizar o atendimento especializado.",
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function buildValuePresentation(input: SalesPresentationInput) {
  const lines = VALUE_LINES[input.intent] ?? [];
  if (!lines.length) {
    return "";
  }

  const normalizedMessage = normalizeText(input.userMessage);
  const technicalMode =
    input.intent === "integracoes_api" ||
    input.intent === "suporte_operacional" ||
    normalizedMessage.includes("erro") ||
    normalizedMessage.includes("payload") ||
    normalizedMessage.includes("api");

  if (technicalMode) {
    return lines[0];
  }

  if (input.hasKnowledge && lines.length > 1) {
    return `${lines[0]} ${lines[1]}`;
  }

  return lines[0];
}

export function buildNextStepCta(intent: CoreIntent) {
  return CTA_LINES[intent] ?? "Se quiser, aprofundo essa resposta para o seu cenario especifico.";
}

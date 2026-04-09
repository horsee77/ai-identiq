import "server-only";
import {
  AllowedResponseMode,
  CoreIntent,
  Criticality,
} from "@/lib/ai/core-engine/types";

export type IntentContract = {
  intent: CoreIntent;
  entryRules: {
    keywords: string[];
    regexes: RegExp[];
    minScore: number;
    requiresRag: boolean;
  };
  responseObjective: string;
  responseTone: string;
  responseStructure: string[];
  mandatoryBlocks: string[];
  assertionLimits: string[];
  escalateWhen: string[];
  outputTemplate: string;
  defaultCriticality: Criticality;
  allowedResponseMode: AllowedResponseMode;
  useCommercialPresentation: boolean;
  handoffPolicy: {
    respondNormallyMin: number;
    respondWithCaveatMin: number;
    requestContextMin: number;
  };
  ragPolicy: {
    preferredCategories: string[];
    minScore: number;
    minLexicalScore: number;
    topK: number;
    discardGenericChunks: boolean;
  };
};

const BASE_TEMPLATE = [
  "{{greeting}}",
  "{{main_response}}",
  "{{value_presentation}}",
  "{{limits_section}}",
  "{{knowledge_summary}}",
  "{{next_step}}",
].join("\n\n");

const CONTRACTS: Record<CoreIntent, IntentContract> = {
  institucional_comercial: {
    intent: "institucional_comercial",
    entryRules: {
      keywords: [
        "identiq",
        "quem voces sao",
        "solucao",
        "apresentacao",
        "proposta de valor",
        "demo",
        "plataforma",
        "diferencial",
        "beneficios",
      ],
      regexes: [
        /\bquem e a identiq\b/i,
        /\bo que a identiq faz\b/i,
        /\bquero conhecer a plataforma\b/i,
      ],
      minScore: 1.6,
      requiresRag: true,
    },
    responseObjective:
      "Posicionar a Identiq com clareza executiva, conectar dor com valor e conduzir para proximo passo comercial.",
    responseTone: "Premium, consultivo, seguro e orientado a negocio.",
    responseStructure: [
      "Abertura de alto nivel",
      "Resposta objetiva",
      "Valor aplicado ao contexto do cliente",
      "Convite para proximo passo",
    ],
    mandatoryBlocks: ["intent.institucional_comercial.base", "common.scope.limit"],
    assertionLimits: [
      "Nao prometer condicoes comerciais finais sem validacao de escopo, volume e SLA.",
      "Nao afirmar cobertura regulatoria absoluta sem analise especializada.",
    ],
    escalateWhen: [
      "Quando houver negociacao juridica, contratual ou excecoes fora do catalogo.",
      "Quando for solicitada proposta formal vinculante.",
    ],
    outputTemplate: BASE_TEMPLATE,
    defaultCriticality: "MEDIUM",
    allowedResponseMode: "knowledge_composer",
    useCommercialPresentation: true,
    handoffPolicy: {
      respondNormallyMin: 0.55,
      respondWithCaveatMin: 0.42,
      requestContextMin: 0.32,
    },
    ragPolicy: {
      preferredCategories: ["Vendas", "FAQ Comercial", "FAQ Institucional", "Integracoes"],
      minScore: 0.18,
      minLexicalScore: 0.1,
      topK: 4,
      discardGenericChunks: true,
    },
  },
  faq_comercial: {
    intent: "faq_comercial",
    entryRules: {
      keywords: [
        "preco",
        "plano",
        "quanto custa",
        "contratar",
        "trial",
        "tempo de implantacao",
        "sla",
        "faq",
        "duvida",
      ],
      regexes: [/\bquais planos\b/i, /\bcomo contratar\b/i],
      minScore: 1.5,
      requiresRag: true,
    },
    responseObjective:
      "Responder perguntas comerciais frequentes com objetividade e conduzir a conversa para qualificacao.",
    responseTone: "Objetivo, consultivo e orientado a proximo passo.",
    responseStructure: [
      "Resposta direta",
      "Contexto de valor da plataforma",
      "CTA de qualificacao",
    ],
    mandatoryBlocks: ["intent.faq_comercial.base", "common.scope.limit"],
    assertionLimits: [
      "Nao fechar condicao comercial sem parametros minimos do caso.",
      "Nao prometer prazo fixo sem diagnostico de integracao e compliance.",
    ],
    escalateWhen: [
      "Quando a demanda exigir proposta detalhada, negociacao de SLA ou excecao comercial.",
    ],
    outputTemplate: BASE_TEMPLATE,
    defaultCriticality: "LOW",
    allowedResponseMode: "knowledge_composer",
    useCommercialPresentation: true,
    handoffPolicy: {
      respondNormallyMin: 0.5,
      respondWithCaveatMin: 0.38,
      requestContextMin: 0.28,
    },
    ragPolicy: {
      preferredCategories: ["FAQ Comercial", "Vendas", "FAQ Institucional"],
      minScore: 0.16,
      minLexicalScore: 0.08,
      topK: 3,
      discardGenericChunks: true,
    },
  },
  suporte_operacional: {
    intent: "suporte_operacional",
    entryRules: {
      keywords: [
        "erro",
        "falha",
        "suporte",
        "incidente",
        "nao funciona",
        "timeout",
        "instabilidade",
        "latencia",
      ],
      regexes: [/\bdeu erro\b/i, /\besta fora do ar\b/i],
      minScore: 1.7,
      requiresRag: true,
    },
    responseObjective:
      "Resolver com orientacao acionavel, reduzir ambiguidade tecnica e preservar rastreabilidade operacional.",
    responseTone: "Direto, tecnico e orientado a acao.",
    responseStructure: [
      "Diagnostico inicial",
      "Checklist de validacao",
      "Proximo passo operacional",
    ],
    mandatoryBlocks: ["intent.suporte_operacional.base", "common.scope.limit"],
    assertionLimits: [
      "Nao afirmar causa raiz sem evidencia de logs e correlacao de eventos.",
      "Nao expor dado sensivel ou segredo tecnico na resposta.",
    ],
    escalateWhen: [
      "Quando houver impacto em producao, risco de fraude ou indisponibilidade persistente.",
    ],
    outputTemplate: BASE_TEMPLATE,
    defaultCriticality: "MEDIUM",
    allowedResponseMode: "knowledge_composer",
    useCommercialPresentation: false,
    handoffPolicy: {
      respondNormallyMin: 0.58,
      respondWithCaveatMin: 0.44,
      requestContextMin: 0.33,
    },
    ragPolicy: {
      preferredCategories: ["Suporte", "Fluxos Operacionais", "Integracoes", "FAQ Tecnico"],
      minScore: 0.22,
      minLexicalScore: 0.12,
      topK: 5,
      discardGenericChunks: true,
    },
  },
  integracoes_api: {
    intent: "integracoes_api",
    entryRules: {
      keywords: [
        "api",
        "endpoint",
        "webhook",
        "payload",
        "token",
        "api key",
        "assinatura",
        "retry",
        "idempotencia",
        "request_id",
      ],
      regexes: [/\bchat completions\b/i, /\bstatus code\b/i, /\bautenticacao\b/i],
      minScore: 1.7,
      requiresRag: true,
    },
    responseObjective:
      "Responder como especialista de integracao B2B, com orientacao tecnica precisa e sequencia implementavel.",
    responseTone: "Tecnico, claro e orientado a arquitetura.",
    responseStructure: [
      "Resposta tecnica direta",
      "Boas praticas de implementacao",
      "Tratamento de erro e observabilidade",
      "Proximo passo tecnico",
    ],
    mandatoryBlocks: ["intent.integracoes_api.base", "common.scope.limit"],
    assertionLimits: [
      "Nao expor credenciais, chaves ou segredos.",
      "Nao afirmar compatibilidade total sem validacao do contrato de payload.",
      "Nao prometer disponibilidade ou latencia sem dados de observabilidade.",
    ],
    escalateWhen: [
      "Quando houver falha recorrente de autenticacao, assinatura ou quota fora do esperado.",
      "Quando for necessario ajuste avancado de seguranca no tenant.",
    ],
    outputTemplate: BASE_TEMPLATE,
    defaultCriticality: "MEDIUM",
    allowedResponseMode: "knowledge_composer",
    useCommercialPresentation: false,
    handoffPolicy: {
      respondNormallyMin: 0.6,
      respondWithCaveatMin: 0.46,
      requestContextMin: 0.36,
    },
    ragPolicy: {
      preferredCategories: ["Integracoes", "Suporte", "FAQ Tecnico", "Politicas"],
      minScore: 0.26,
      minLexicalScore: 0.16,
      topK: 5,
      discardGenericChunks: true,
    },
  },
  onboarding_kyc: {
    intent: "onboarding_kyc",
    entryRules: {
      keywords: [
        "onboarding",
        "kyc",
        "cadastro",
        "validacao documental",
        "documento",
        "biometria",
        "face match",
        "liveness",
      ],
      regexes: [/\bfluxo de onboarding\b/i, /\bvalidacao de identidade\b/i],
      minScore: 1.8,
      requiresRag: true,
    },
    responseObjective:
      "Orientar fluxo de onboarding e KYC com foco em consistencia, evidencia, seguranca e trilha auditavel.",
    responseTone: "Profissional, seguro e explicativo.",
    responseStructure: [
      "Resposta por etapas",
      "Criterios de validacao",
      "Pontos de cautela",
      "Proximo passo operacional",
    ],
    mandatoryBlocks: ["intent.onboarding_kyc.base", "common.scope.limit"],
    assertionLimits: [
      "Nao aprovar ou reprovar documento sem base verificavel.",
      "Nao inventar resultado de biometria, face match ou status de analise.",
      "Nao substituir decisao humana final em caso sensivel.",
    ],
    escalateWhen: [
      "Quando houver divergencia documental critica, baixa confianca biometrica ou pedido explicito de humano.",
    ],
    outputTemplate: BASE_TEMPLATE,
    defaultCriticality: "HIGH",
    allowedResponseMode: "knowledge_composer",
    useCommercialPresentation: false,
    handoffPolicy: {
      respondNormallyMin: 0.62,
      respondWithCaveatMin: 0.5,
      requestContextMin: 0.4,
    },
    ragPolicy: {
      preferredCategories: ["Onboarding", "KYC", "Biometria", "Fluxos Operacionais", "Compliance"],
      minScore: 0.28,
      minLexicalScore: 0.18,
      topK: 5,
      discardGenericChunks: true,
    },
  },
  aml_compliance: {
    intent: "aml_compliance",
    entryRules: {
      keywords: [
        "aml",
        "compliance",
        "pep",
        "sancao",
        "risco",
        "regulatorio",
        "conformidade",
        "lgpd",
      ],
      regexes: [/\blavagem de dinheiro\b/i, /\bpolitica de compliance\b/i],
      minScore: 1.8,
      requiresRag: true,
    },
    responseObjective:
      "Responder com cautela regulatoria, limites claros de afirmacao e encaminhamento responsavel quando necessario.",
    responseTone: "Tecnico, conservador e institucional.",
    responseStructure: [
      "Resposta objetiva",
      "Base de politica e risco",
      "Limites de afirmacao",
      "Recomendacao de validacao humana",
    ],
    mandatoryBlocks: ["intent.aml_compliance.base", "common.scope.limit"],
    assertionLimits: [
      "Nao afirmar conformidade legal absoluta sem validacao formal.",
      "Nao emitir score de risco final sem evidencias auditaveis.",
      "Nao substituir analise juridica ou decisao humana de compliance.",
    ],
    escalateWhen: [
      "Quando houver impacto regulatorio sensivel, indicio de fraude relevante ou risco alto.",
    ],
    outputTemplate: BASE_TEMPLATE,
    defaultCriticality: "HIGH",
    allowedResponseMode: "knowledge_composer",
    useCommercialPresentation: false,
    handoffPolicy: {
      respondNormallyMin: 0.64,
      respondWithCaveatMin: 0.54,
      requestContextMin: 0.44,
    },
    ragPolicy: {
      preferredCategories: ["Compliance", "AML", "Politicas", "Operacoes"],
      minScore: 0.3,
      minLexicalScore: 0.2,
      topK: 4,
      discardGenericChunks: true,
    },
  },
  handoff_humano: {
    intent: "handoff_humano",
    entryRules: {
      keywords: ["atendente", "humano", "especialista", "analista", "transferir", "escalar"],
      regexes: [/\bquero falar com humano\b/i, /\bme transfere\b/i],
      minScore: 1,
      requiresRag: false,
    },
    responseObjective:
      "Conduzir escalonamento de forma elegante, sem transmitir falha, mantendo continuidade do atendimento.",
    responseTone: "Cordial, objetivo e tranquilizador.",
    responseStructure: [
      "Confirmacao de continuidade",
      "Resumo do contexto",
      "Proximo passo de transferencia",
    ],
    mandatoryBlocks: ["intent.handoff_humano.base", "common.handoff.notice"],
    assertionLimits: [
      "Nao manter fluxo automatizado quando o usuario solicitar humano.",
      "Nao ocultar motivo de escalonamento em caso critico.",
    ],
    escalateWhen: [
      "Sempre que houver solicitacao explicita de humano ou risco critico.",
    ],
    outputTemplate: BASE_TEMPLATE,
    defaultCriticality: "HIGH",
    allowedResponseMode: "restricted",
    useCommercialPresentation: false,
    handoffPolicy: {
      respondNormallyMin: 1,
      respondWithCaveatMin: 1,
      requestContextMin: 1,
    },
    ragPolicy: {
      preferredCategories: ["Suporte", "Fluxos Operacionais"],
      minScore: 0,
      minLexicalScore: 0,
      topK: 2,
      discardGenericChunks: false,
    },
  },
};

export function getIntentContract(intent: CoreIntent) {
  return CONTRACTS[intent];
}

export function listIntentContracts() {
  return Object.values(CONTRACTS);
}

export const INTENT_CONTRACTS = CONTRACTS;
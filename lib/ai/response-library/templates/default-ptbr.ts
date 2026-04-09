import { CoreIntent } from "@/lib/ai/core-engine/types";

export type ApprovedTemplateBlock = {
  id: string;
  category: CoreIntent | "common";
  subtype: string;
  language: "pt-BR";
  criticality: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  text: string;
  placeholders?: string[];
};

export const COMMON_BLOCKS: ApprovedTemplateBlock[] = [
  {
    id: "common.automation.notice",
    category: "common",
    subtype: "notice",
    language: "pt-BR",
    criticality: "LOW",
    text: "Esta é uma resposta automatizada da Identiq AI Platform, com base em políticas internas.",
  },
  {
    id: "common.handoff.notice",
    category: "common",
    subtype: "handoff",
    language: "pt-BR",
    criticality: "HIGH",
    text: "Para segurança e conformidade, este caso deve seguir para revisão humana especializada.",
  },
  {
    id: "common.scope.limit",
    category: "common",
    subtype: "limitation",
    language: "pt-BR",
    criticality: "MEDIUM",
    text: "Não confirmamos decisões finais de validação documental, biometria, risco ou compliance sem base verificável.",
  },
];

export const INTENT_BLOCKS: Record<CoreIntent, ApprovedTemplateBlock[]> = {
  saudacao: [
    {
      id: "intent.saudacao.base",
      category: "saudacao",
      subtype: "base",
      language: "pt-BR",
      criticality: "LOW",
      text: "Ola. Sou o {{agent_name}} da Identiq. Posso apoiar com onboarding, KYC, compliance, integracoes e operacao segura.",
      placeholders: ["agent_name"],
    },
  ],
  institucional: [
    {
      id: "intent.institucional.base",
      category: "institucional",
      subtype: "base",
      language: "pt-BR",
      criticality: "LOW",
      text: "A Identiq atua com verificação de identidade, KYC, biometria, validação documental, prevenção a fraudes e governança operacional.",
    },
  ],
  comercial: [
    {
      id: "intent.comercial.base",
      category: "comercial",
      subtype: "base",
      language: "pt-BR",
      criticality: "MEDIUM",
      text: "Para avaliação comercial, estruturamos proposta conforme volume, canais, requisitos regulatórios e SLA esperado.",
    },
  ],
  suporte: [
    {
      id: "intent.suporte.base",
      category: "suporte",
      subtype: "base",
      language: "pt-BR",
      criticality: "MEDIUM",
      text: "Vamos tratar seu caso de suporte com foco em diagnóstico, causa provável e próximos passos operacionais.",
    },
  ],
  onboarding: [
    {
      id: "intent.onboarding.base",
      category: "onboarding",
      subtype: "base",
      language: "pt-BR",
      criticality: "MEDIUM",
      text: "No onboarding corporativo, recomendamos fluxo em camadas: coleta, validação documental, biometria e revisão de risco quando aplicável.",
    },
  ],
  kyc: [
    {
      id: "intent.kyc.base",
      category: "kyc",
      subtype: "base",
      language: "pt-BR",
      criticality: "HIGH",
      text: "No contexto de KYC, a resposta deve seguir critérios institucionais e evidências de processo registradas no tenant.",
    },
  ],
  validacao_documental: [
    {
      id: "intent.validacao_documental.base",
      category: "validacao_documental",
      subtype: "base",
      language: "pt-BR",
      criticality: "HIGH",
      text: "Na validação documental, trabalhamos com consistência, legibilidade, autenticidade e trilha de auditoria. Decisão final exige base verificável.",
    },
  ],
  biometria: [
    {
      id: "intent.biometria.base",
      category: "biometria",
      subtype: "base",
      language: "pt-BR",
      criticality: "HIGH",
      text: "Em biometria e face match, respostas devem ser interpretativas e nunca conclusivas sem confirmação operacional do sistema.",
    },
  ],
  compliance: [
    {
      id: "intent.compliance.base",
      category: "compliance",
      subtype: "base",
      language: "pt-BR",
      criticality: "HIGH",
      text: "Em compliance, fornecemos orientação técnica e institucional, sem afirmar conformidade absoluta sem avaliação humana formal.",
    },
  ],
  aml: [
    {
      id: "intent.aml.base",
      category: "aml",
      subtype: "base",
      language: "pt-BR",
      criticality: "HIGH",
      text: "Para AML, recomendamos análise por indícios, contexto transacional e validação por equipe especializada em casos sensíveis.",
    },
  ],
  integracao: [
    {
      id: "intent.integracao.base",
      category: "integracao",
      subtype: "base",
      language: "pt-BR",
      criticality: "MEDIUM",
      text: "Para integração, validamos autenticação, contratos de payload, tratamento de erro e observabilidade ponta a ponta.",
    },
  ],
  faq: [
    {
      id: "intent.faq.base",
      category: "faq",
      subtype: "base",
      language: "pt-BR",
      criticality: "LOW",
      text: "Posso responder com base na base de conhecimento institucional e operacional disponível.",
    },
  ],
  duvida_operacional: [
    {
      id: "intent.duvida_operacional.base",
      category: "duvida_operacional",
      subtype: "base",
      language: "pt-BR",
      criticality: "MEDIUM",
      text: "Para dúvidas operacionais, seguimos playbooks internos e procedimentos aprovados por governança.",
    },
  ],
  caso_critico: [
    {
      id: "intent.caso_critico.base",
      category: "caso_critico",
      subtype: "base",
      language: "pt-BR",
      criticality: "CRITICAL",
      text: "Caso crítico detectado. A recomendação imediata é preservar contexto, registrar evidências e acionar análise humana.",
    },
  ],
  solicitar_humano: [
    {
      id: "intent.solicitar_humano.base",
      category: "solicitar_humano",
      subtype: "base",
      language: "pt-BR",
      criticality: "HIGH",
      text: "Entendido. Vamos encaminhar sua solicitação para atendimento humano.",
    },
  ],
  fora_de_escopo: [
    {
      id: "intent.fora_de_escopo.base",
      category: "fora_de_escopo",
      subtype: "base",
      language: "pt-BR",
      criticality: "LOW",
      text: "Este assunto está fora do escopo operacional da plataforma Identiq. Posso ajudar em KYC, onboarding, compliance, integrações e suporte técnico.",
    },
  ],
};


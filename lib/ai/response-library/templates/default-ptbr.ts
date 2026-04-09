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
    id: "common.handoff.notice",
    category: "common",
    subtype: "handoff",
    language: "pt-BR",
    criticality: "HIGH",
    text: "Para este ponto, o mais adequado e envolver um especialista da operacao para garantir analise correta e rastreavel.",
  },
  {
    id: "common.scope.limit",
    category: "common",
    subtype: "limitation",
    language: "pt-BR",
    criticality: "HIGH",
    text: "A resposta segue limites institucionais: sem aprovacao documental automatica, sem resultado inventado de biometria e sem declaracao de conformidade absoluta sem evidencia.",
  },
  {
    id: "common.context.request",
    category: "common",
    subtype: "context",
    language: "pt-BR",
    criticality: "MEDIUM",
    text: "Com um pouco mais de contexto do seu fluxo, consigo te entregar uma orientacao mais precisa e aplicavel.",
  },
  {
    id: "common.caution.compliance",
    category: "common",
    subtype: "caution",
    language: "pt-BR",
    criticality: "HIGH",
    text: "Este tema exige cautela regulatoria e validacao especializada quando houver risco elevado.",
  },
];

export const INTENT_BLOCKS: Record<CoreIntent, ApprovedTemplateBlock[]> = {
  institucional_comercial: [
    {
      id: "intent.institucional_comercial.base",
      category: "institucional_comercial",
      subtype: "base",
      language: "pt-BR",
      criticality: "MEDIUM",
      text: "A Identiq combina verificacao de identidade, KYC, biometria, validacao documental e prevencao a fraudes para operacoes que exigem seguranca, fluidez e escala.",
    },
  ],
  faq_comercial: [
    {
      id: "intent.faq_comercial.base",
      category: "faq_comercial",
      subtype: "base",
      language: "pt-BR",
      criticality: "LOW",
      text: "Posso te responder de forma objetiva sobre escopo, modelo de contratacao, implantacao e proximos passos comerciais da Identiq.",
    },
  ],
  suporte_operacional: [
    {
      id: "intent.suporte_operacional.base",
      category: "suporte_operacional",
      subtype: "base",
      language: "pt-BR",
      criticality: "MEDIUM",
      text: "Vamos direto ao ponto com triagem tecnica, causa provavel, evidencias necessarias e acao recomendada para estabilizar o fluxo.",
    },
  ],
  integracoes_api: [
    {
      id: "intent.integracoes_api.base",
      category: "integracoes_api",
      subtype: "base",
      language: "pt-BR",
      criticality: "MEDIUM",
      text: "Para integracoes API, a recomendacao e estruturar autenticacao, contrato de payload, idempotencia, retry e observabilidade com request_id de ponta a ponta.",
    },
  ],
  onboarding_kyc: [
    {
      id: "intent.onboarding_kyc.base",
      category: "onboarding_kyc",
      subtype: "base",
      language: "pt-BR",
      criticality: "HIGH",
      text: "No onboarding e KYC, seguimos validacao em camadas com evidencia, consistencia de dados, trilha auditavel e escalonamento quando houver risco.",
    },
  ],
  aml_compliance: [
    {
      id: "intent.aml_compliance.base",
      category: "aml_compliance",
      subtype: "base",
      language: "pt-BR",
      criticality: "HIGH",
      text: "Em AML e compliance, a orientacao e tecnica e cautelosa, sempre respeitando limites regulatórios e necessidade de validacao especializada.",
    },
  ],
  handoff_humano: [
    {
      id: "intent.handoff_humano.base",
      category: "handoff_humano",
      subtype: "base",
      language: "pt-BR",
      criticality: "HIGH",
      text: "Entendi. Vou encaminhar seu caso com contexto consolidado para o especialista humano mais aderente ao tema.",
    },
  ],
};

const BLOCKS_BY_ID = new Map<string, ApprovedTemplateBlock>(
  [...COMMON_BLOCKS, ...Object.values(INTENT_BLOCKS).flat()].map((block) => [block.id, block])
);

export function getApprovedTemplateBlockById(blockId: string) {
  return BLOCKS_BY_ID.get(blockId);
}
import { CoreIntent } from "@/lib/ai/core-engine/types";

type OperationalFlow = {
  id: string;
  intent: CoreIntent;
  trigger: string;
  allowedOutput: string;
  caution: string;
  handoffCriteria: string;
};

const FLOWS: OperationalFlow[] = [
  {
    id: "flow.institucional_comercial.apresentacao",
    intent: "institucional_comercial",
    trigger: "Primeiro contato, apresentacao da solucao ou conversa de valor.",
    allowedOutput: "Apresentar proposta de valor, diferenciais e aplicacao por frente operacional.",
    caution: "Sem compromisso contratual automatico ou promessas sem diagnostico.",
    handoffCriteria: "Negociacao juridica, requisitos fora de catalogo ou proposta formal vinculante.",
  },
  {
    id: "flow.faq_comercial.qualificacao",
    intent: "faq_comercial",
    trigger: "Perguntas frequentes sobre preco, plano, prazo e contratacao.",
    allowedOutput: "Responder objetivamente e conduzir para qualificacao comercial.",
    caution: "Evitar prazo ou condicao fechada sem informacoes minimas do caso.",
    handoffCriteria: "Solicitacao de proposta formal, SLA customizado ou excecao comercial.",
  },
  {
    id: "flow.suporte_operacional.triagem",
    intent: "suporte_operacional",
    trigger: "Erros, incidentes, indisponibilidade ou duvidas de operacao.",
    allowedOutput: "Fornecer checklist de diagnostico e acao imediata orientada a estabilizacao.",
    caution: "Nao cravar causa raiz sem evidencia tecnica.",
    handoffCriteria: "Impacto em producao, risco alto ou falha recorrente.",
  },
  {
    id: "flow.integracoes_api.implementacao",
    intent: "integracoes_api",
    trigger: "Perguntas de API, webhook, autenticacao, payload e erros de integracao.",
    allowedOutput: "Orientar implementacao com autenticacao, payload, retry, idempotencia e observabilidade.",
    caution: "Nao expor credenciais, segredos ou dados sensiveis.",
    handoffCriteria: "Erros persistentes de seguranca, assinatura ou quota fora do esperado.",
  },
  {
    id: "flow.onboarding_kyc.validacao",
    intent: "onboarding_kyc",
    trigger: "Duvidas de onboarding, KYC, validacao documental e biometria.",
    allowedOutput: "Orientar etapas, evidencias e criterios de consistencia do fluxo.",
    caution: "Nao afirmar aprovacao final automatica sem base verificavel.",
    handoffCriteria: "Inconsistencia critica, baixa confianca ou necessidade de decisao humana.",
  },
  {
    id: "flow.aml_compliance.governanca",
    intent: "aml_compliance",
    trigger: "Temas de risco, AML, conformidade e exigencia regulatoria.",
    allowedOutput: "Oferecer orientacao tecnica com limites claros e recomendacao responsavel.",
    caution: "Nao emitir parecer juridico nem conformidade absoluta.",
    handoffCriteria: "Risco regulatorio sensivel, indicio relevante de fraude ou interpretacao legal.",
  },
  {
    id: "flow.handoff_humano.transferencia",
    intent: "handoff_humano",
    trigger: "Pedido explicito de atendente ou caso critico.",
    allowedOutput: "Confirmar transferencia com resumo de contexto e continuidade assistida.",
    caution: "Nao manter atendimento automatizado em caso critico.",
    handoffCriteria: "Aplicacao imediata.",
  },
];

export function resolveOperationalFlow(intent: CoreIntent) {
  return FLOWS.find((flow) => flow.intent === intent) ?? null;
}
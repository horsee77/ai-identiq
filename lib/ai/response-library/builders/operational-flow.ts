import "server-only";
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
    id: "flow.onboarding.corporativo",
    intent: "onboarding",
    trigger: "Dúvidas sobre fluxo de onboarding corporativo",
    allowedOutput: "Orientar etapas de coleta, validação e revisão operacional.",
    caution: "Sem decisão automática final de aprovação.",
    handoffCriteria: "Caso crítico, ausência de evidência ou solicitação de humano.",
  },
  {
    id: "flow.validacao.documental",
    intent: "validacao_documental",
    trigger: "Perguntas sobre validação de documentos",
    allowedOutput: "Orientar critérios de consistência e qualidade documental.",
    caution: "Nunca confirmar aprovação/reprovação sem evidência sistêmica.",
    handoffCriteria: "Inconsistência grave ou risco elevado.",
  },
  {
    id: "flow.compliance.cautela",
    intent: "compliance",
    trigger: "Consultas de conformidade regulatória",
    allowedOutput: "Fornecer orientação técnica e institucional com cautela.",
    caution: "Não declarar conformidade legal absoluta.",
    handoffCriteria: "Tema regulatório sensível ou interpretação jurídica.",
  },
  {
    id: "flow.suporte.triagem",
    intent: "suporte",
    trigger: "Incidentes, falhas e erros técnicos",
    allowedOutput: "Triagem com próximos passos e coleta de evidências.",
    caution: "Não inferir causa raiz sem dados de observabilidade.",
    handoffCriteria: "Impacto crítico, indisponibilidade ou risco de fraude.",
  },
  {
    id: "flow.handoff.humano",
    intent: "solicitar_humano",
    trigger: "Usuário solicitou atendimento humano",
    allowedOutput: "Confirmar encaminhamento e registrar contexto resumido.",
    caution: "Evitar decisões finais automatizadas.",
    handoffCriteria: "Sempre aplicar handoff imediato.",
  },
];

export function resolveOperationalFlow(intent: CoreIntent) {
  return FLOWS.find((flow) => flow.intent === intent) ?? null;
}


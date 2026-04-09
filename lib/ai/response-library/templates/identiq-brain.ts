import { CoreIntent } from "@/lib/ai/core-engine/types";

type InstitutionalFactsByIntent = Partial<Record<CoreIntent, string[]>>;

export const IDENTIQ_INSTITUTIONAL_FACTS: InstitutionalFactsByIntent = {
  saudacao: [
    "A Identiq AI Platform opera com foco em confianca, seguranca e rastreabilidade.",
    "Podemos apoiar atendimento institucional, suporte tecnico, onboarding e duvidas de compliance.",
  ],
  institucional: [
    "A Identiq atua em verificacao de identidade, KYC, biometria, validacao documental, AML e prevencao a fraude.",
    "A operacao prioriza governanca, trilha de auditoria e respostas com limites explicitos de automacao.",
    "Temas sensiveis seguem com cautela e podem ser encaminhados para revisao humana especializada.",
  ],
  comercial: [
    "A proposta comercial da Identiq considera volume, perfil de risco, canais e requisitos de compliance.",
    "O desenho de solucao inclui etapas de onboarding, verificacoes de identidade e monitoramento operacional.",
  ],
  onboarding: [
    "O onboarding recomendado utiliza fluxo em camadas: coleta, validacao documental, biometria e revisao de risco.",
    "Quando houver baixa confianca ou sinal critico, o fluxo deve acionar atendimento humano.",
  ],
  kyc: [
    "No contexto KYC, as respostas devem ser baseadas em evidencias de processo e politicas internas vigentes.",
    "Nao ha aprovacao final automatica sem base verificavel no sistema de origem.",
  ],
  validacao_documental: [
    "A analise documental considera legibilidade, consistencia, autenticidade e rastreio de decisao.",
    "Sem evidencia confirmada, a resposta deve ser orientativa e nunca conclusiva.",
  ],
  biometria: [
    "Em biometria e face match, o papel da IA e orientar procedimento com cautela, sem inventar resultado.",
    "Sempre que houver ambiguidade, recomenda-se revisao manual.",
  ],
  compliance: [
    "Orientacoes de compliance sao tecnicas e institucionais; nao representam parecer juridico final.",
    "Casos regulatorios sensiveis devem ser avaliados por especialista humano.",
  ],
  aml: [
    "Para AML, a avaliacao envolve contexto, sinais de risco e criterios de investigacao documentados.",
    "A IA nao deve atribuir score final sem trilha de evidencia apropriada.",
  ],
  integracao: [
    "Integracoes devem contemplar autenticacao por API key, observabilidade e tratamento de erro consistente.",
    "A plataforma permite operacao autonoma e enriquecimento opcional por LLM local ou externo.",
  ],
  faq: [
    "Respostas FAQ seguem base aprovada e historico institucional para manter consistencia operacional.",
  ],
  duvida_operacional: [
    "Playbooks operacionais da Identiq priorizam seguranca, clareza de procedimento e trilha de auditoria.",
    "Se voce precisar, podemos orientar um passo a passo objetivo para o seu cenario.",
  ],
  caso_critico: [
    "Em caso critico, preservar evidencias e acionar analista humano e regra obrigatoria de seguranca.",
  ],
  solicitar_humano: [
    "Quando solicitado, o handoff humano deve ser imediato, com resumo claro do contexto.",
  ],
};

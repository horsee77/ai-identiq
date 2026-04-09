import { CoreIntent } from "@/lib/ai/core-engine/types";

type InstitutionalFactsByIntent = Partial<Record<CoreIntent, string[]>>;

export const IDENTIQ_INSTITUTIONAL_FACTS: InstitutionalFactsByIntent = {
  institucional_comercial: [
    "A Identiq e especialista em verificacao de identidade, KYC, biometria, validacao documental e prevencao a fraudes para jornadas digitais criticas.",
    "Nossa abordagem combina governanca, automacao e inteligencia operacional para reduzir risco e melhorar experiencia do usuario final.",
    "A plataforma opera com trilha auditavel, controle de custos e suporte a ambientes regulados.",
  ],
  faq_comercial: [
    "A proposta de valor da Identiq conecta seguranca, eficiencia operacional e escalabilidade em uma unica plataforma.",
    "A adocao pode ser organizada por frentes: onboarding, validacao documental, biometria, compliance e integracoes API.",
  ],
  suporte_operacional: [
    "O suporte operacional da Identiq prioriza rastreabilidade de incidentes e orientacao acionavel por etapa.",
    "Casos criticos exigem correlacao de logs, evidencias e continuidade assistida com especialista.",
  ],
  integracoes_api: [
    "A plataforma disponibiliza API versionada com autenticacao por API key, escopos, quotas e observabilidade por request_id.",
    "Integracoes robustas devem aplicar retries exponenciais, idempotencia e tratamento consistente de erros.",
  ],
  onboarding_kyc: [
    "O fluxo recomendado inclui coleta de dados, validacao cadastral, verificacao documental, biometria e revisao de risco quando aplicavel.",
    "A IA apoia triagem e orientacao, enquanto decisoes sensiveis permanecem com governanca e revisao humana.",
  ],
  aml_compliance: [
    "Temas AML e compliance demandam postura conservadora, trilha auditavel e limites claros de afirmacao.",
    "Em cenarios sensiveis, a recomendacao e envolver especialista para validacao final.",
  ],
  handoff_humano: [
    "No handoff, preservamos continuidade com resumo tecnico, risco mapeado e contexto suficiente para decisao humana rapida.",
  ],
};
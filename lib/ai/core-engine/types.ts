export type CoreIntent =
  | "saudacao"
  | "institucional"
  | "comercial"
  | "suporte"
  | "onboarding"
  | "kyc"
  | "validacao_documental"
  | "biometria"
  | "compliance"
  | "aml"
  | "integracao"
  | "faq"
  | "duvida_operacional"
  | "caso_critico"
  | "solicitar_humano"
  | "fora_de_escopo";

export type Criticality = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AgentResponseMode = "STRICT_TEMPLATE_MODE" | "KNOWLEDGE_COMPOSER_MODE" | "ENRICHED_MODE";

export type SafetyLevel = "STRICT" | "BALANCED" | "ELEVATED";

export type ResponseLayer =
  | "L1_INTENT"
  | "L2_POLICY"
  | "L3_KNOWLEDGE"
  | "L4_TEMPLATE"
  | "L5_LOCAL_LLM"
  | "L6_EXTERNAL_LLM";

export type AllowedResponseMode = "template_only" | "knowledge_composer" | "enriched" | "restricted";

export type KnowledgeHit = {
  id: string;
  score: number;
  lexicalScore: number;
  semanticScore: number;
  content: string;
  document: {
    id: string;
    title: string;
    category: string;
  };
};

export type IntentClassification = {
  intent: CoreIntent;
  confidence: number;
  criticality: Criticality;
  requiresHandoff: boolean;
  requiresRag: boolean;
  allowedResponseMode: AllowedResponseMode;
  matchedKeywords: string[];
};

export type PolicyDecision = {
  canRespond: boolean;
  mustHandoff: boolean;
  responseMode: AgentResponseMode;
  requiresKnowledge: boolean;
  safetyNotices: string[];
  restrictionReason?: string;
};

export type RuntimeSwitches = {
  autonomousMode: boolean;
  externalProviderEnabled: boolean;
  localLlmEnabled: boolean;
  localEmbeddingsEnabled: boolean;
  lexicalSearchEnabled: boolean;
  handoffThreshold: number;
  strictTemplatesOnly: boolean;
  allowEnrichment: boolean;
  safetyLevel: SafetyLevel;
  knowledgeRequiredCategories: string[];
  defaultResponseMode: AgentResponseMode;
  localLlmProviderId?: string;
  externalProviderId?: string;
};

export type CoreEngineInput = {
  tenantId: string;
  requestId: string;
  message: string;
  messages: { role: "system" | "user" | "assistant" | "tool"; content: string }[];
  agent?: {
    id: string;
    name: string;
    systemPrompt: string;
    rigidInstructions?: string | null;
    category?: string | null;
  } | null;
  runtime: RuntimeSwitches;
  channel: "API" | "DASHBOARD" | "WEB_CHAT";
};

export type CoreComposedResponse = {
  content: string;
  usedBlocks: string[];
  citedDocuments: { id: string; title: string; category: string }[];
};

export type HandoffDecision = {
  shouldHandoff: boolean;
  reason?: string;
  queueName?: string;
};

export type CoreEngineResult = {
  content: string;
  intent: CoreIntent;
  criticality: Criticality;
  confidence: number;
  responseMode: AgentResponseMode;
  layersUsed: ResponseLayer[];
  usedBlocks: string[];
  knowledge: KnowledgeHit[];
  handoff: HandoffDecision;
  inputTokens: number;
  outputTokens: number;
  localLlmUsed: boolean;
  externalLlmUsed: boolean;
  providerIdUsed?: string;
  modelTechnicalNameUsed?: string;
};

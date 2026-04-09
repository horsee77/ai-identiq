export type CoreIntent =
  | "institucional_comercial"
  | "faq_comercial"
  | "suporte_operacional"
  | "integracoes_api"
  | "onboarding_kyc"
  | "aml_compliance"
  | "handoff_humano";

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

export type HandoffLevel =
  | "RESPONDER_NORMALMENTE"
  | "RESPONDER_COM_RESSALVA"
  | "SOLICITAR_CONTEXTO"
  | "ESCALAR_HUMANO";

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

export type IgnoredKnowledgeChunk = {
  id: string;
  score: number;
  reason: string;
  category: string;
};

export type KnowledgeDebugTrace = {
  retrievalStrategy: "hybrid" | "lexical_only" | "semantic_only";
  minScoreApplied: number;
  minLexicalApplied: number;
  selectedChunkIds: string[];
  ignoredChunks: IgnoredKnowledgeChunk[];
  reranked: boolean;
  categoryBoosts: Record<string, number>;
  criticalTermHits: string[];
};

export type IntentClassification = {
  intent: CoreIntent;
  confidence: number;
  criticality: Criticality;
  requiresHandoff: boolean;
  requiresRag: boolean;
  allowedResponseMode: AllowedResponseMode;
  matchedKeywords: string[];
  matchedPatterns: string[];
  reasoning: string[];
};

export type PolicyDecision = {
  canRespond: boolean;
  mustHandoff: boolean;
  responseMode: AgentResponseMode;
  requiresKnowledge: boolean;
  safetyNotices: string[];
  appliedPolicies: string[];
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
  debugMode: boolean;
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
  responseSections: {
    greeting: string;
    main: string;
    value: string;
    limits?: string;
    nextStep: string;
  };
};

export type HandoffDecision = {
  level: HandoffLevel;
  shouldHandoff: boolean;
  reason?: string;
  queueName?: string;
  contextRequest?: string;
};

export type StageTiming = Partial<Record<ResponseLayer | "TOTAL", number>>;

export type CoreDebugTrace = {
  intentReasoning: string[];
  confidenceReason: string;
  policyBlocks: string[];
  knowledge: KnowledgeDebugTrace;
  handoffReason?: string;
  timingsMs: StageTiming;
  stageCostsUsd: Partial<Record<ResponseLayer, number>>;
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
  debug: CoreDebugTrace;
};
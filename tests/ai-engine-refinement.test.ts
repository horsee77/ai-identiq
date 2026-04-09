import assert from "node:assert/strict";
import { classifyIntentLocally } from "../lib/ai/core-engine/intent-classifier";
import { rankKnowledgeCandidates } from "../lib/knowledge/ranking";
import { composeApprovedResponse } from "../lib/ai/response-library/builders/compose";
import type { HandoffDecision } from "../lib/ai/core-engine/types";

function runtime() {
  return {
    autonomousMode: true,
    externalProviderEnabled: false,
    localLlmEnabled: false,
    localEmbeddingsEnabled: true,
    lexicalSearchEnabled: true,
    handoffThreshold: 0.68,
    strictTemplatesOnly: false,
    allowEnrichment: false,
    safetyLevel: "BALANCED" as const,
    knowledgeRequiredCategories: [],
    defaultResponseMode: "KNOWLEDGE_COMPOSER_MODE" as const,
    debugMode: false,
  };
}

function runIntentTests() {
  const cfg = runtime();

  const faqCurta = classifyIntentLocally("Oi, quais planos e quanto custa para contratar?", cfg);
  assert.equal(faqCurta.intent, "faq_comercial", "faq_comercial deve ser detectada em duvida comercial curta");

  const institucional = classifyIntentLocally("Quem e a Identiq e quais os diferenciais da plataforma?", cfg);
  assert.equal(
    institucional.intent,
    "institucional_comercial",
    "institucional_comercial deve ser detectada em perguntas de apresentacao"
  );

  const integracao = classifyIntentLocally(
    "Preciso integrar via API com webhook, payload assinado, retry e idempotencia.",
    cfg
  );
  assert.equal(integracao.intent, "integracoes_api", "integracoes_api deve ser detectada para contexto tecnico");

  const onboarding = classifyIntentLocally(
    "Como organizar onboarding KYC com validacao documental e biometria?",
    cfg
  );
  assert.equal(onboarding.intent, "onboarding_kyc", "onboarding_kyc deve ser detectada para fluxo KYC");
}

function runRagTests() {
  const vazio = rankKnowledgeCandidates({
    query: "api key e autenticacao",
    candidates: [],
    options: {
      intent: "integracoes_api",
      lexicalSearchEnabled: true,
      localSemanticEnabled: true,
    },
    similarityFns: {
      lexicalSimilarity: () => 0,
      semanticSimilarity: () => 0,
    },
  });

  assert.equal(vazio.hits.length, 0, "cenario de RAG vazio deve retornar hits vazios");

  const faqAderente = rankKnowledgeCandidates({
    query: "quais planos e prazo de implantacao",
    candidates: [
      {
        id: "c1",
        content:
          "Os planos comerciais sao estruturados por volume, SLA e escopo de onboarding, com prazo de implantacao por etapas.",
        document: {
          id: "d1",
          title: "Guia Comercial",
          category: "FAQ Comercial",
        },
      },
      {
        id: "c2",
        content: "Conteudo tecnico de webhook e assinatura de payload.",
        document: {
          id: "d2",
          title: "Integracoes",
          category: "Integracoes",
        },
      },
    ],
    options: {
      intent: "faq_comercial",
      lexicalSearchEnabled: true,
      localSemanticEnabled: true,
      minScore: 0.1,
      minLexicalScore: 0.03,
    },
    similarityFns: {
      lexicalSimilarity: (query, content) => {
        if (content.includes("planos comerciais")) {
          return 0.36;
        }
        return 0.08;
      },
      semanticSimilarity: (query, content) => {
        if (content.includes("planos comerciais")) {
          return 0.42;
        }
        return 0.12;
      },
    },
  });

  assert.ok(faqAderente.hits.length > 0, "faq comercial com contexto aderente deve recuperar chunks");

  const semanticFallback = rankKnowledgeCandidates({
    query: "assinatura webhook retry idempotencia",
    candidates: [
      {
        id: "c3",
        content:
          "Nossa trilha de integracao inclui assinatura de webhook, controle de retry e idempotencia para reduzir duplicidade e falhas em producao com governanca.",
        document: {
          id: "d3",
          title: "Playbook Integracoes",
          category: "Integracoes",
        },
      },
      {
        id: "c4",
        content: "Politica institucional de atendimento comercial.",
        document: {
          id: "d4",
          title: "FAQ Institucional",
          category: "FAQ Institucional",
        },
      },
    ],
    options: {
      intent: "integracoes_api",
      lexicalSearchEnabled: true,
      localSemanticEnabled: true,
      minScore: 0.2,
      minLexicalScore: 0.25,
      topK: 3,
    },
    similarityFns: {
      lexicalSimilarity: (query, content) => {
        if (content.includes("assinatura de webhook")) {
          return 0.12;
        }
        return 0.04;
      },
      semanticSimilarity: (query, content) => {
        if (content.includes("assinatura de webhook")) {
          return 0.44;
        }
        return 0.09;
      },
    },
  });

  assert.ok(semanticFallback.hits.length > 0, "deve aproveitar chunk semantico mesmo com lexical restritivo");
  assert.ok(
    (semanticFallback.debug.semanticFallbackChunkIds ?? []).includes("c3") ||
      semanticFallback.hits.some((hit) => hit.id === "c3" && hit.semanticFallbackUsed),
    "deve sinalizar uso de semantic fallback"
  );
}

function runResponseStyleTests() {
  const handoff: HandoffDecision = {
    level: "RESPONDER_NORMALMENTE",
    shouldHandoff: false,
  };

  const response = composeApprovedResponse({
    intent: "institucional_comercial",
    responseMode: "KNOWLEDGE_COMPOSER_MODE",
    agentName: "Agente Identiq",
    userName: "Lucas",
    userMessage: "Quero entender a plataforma",
    userTurnCount: 1,
    safetyNotices: [],
    handoff,
    knowledge: [
      {
        id: "h1",
        score: 0.62,
        lexicalScore: 0.19,
        semanticScore: 0.54,
        categoryBoost: 0.12,
        content:
          "A plataforma permite estruturar onboarding, validacao documental, biometria e compliance com trilha auditavel.",
        document: {
          id: "doc-1",
          title: "Guia Institucional",
          category: "FAQ Institucional",
        },
      },
    ],
  });

  const bannedLabels = [
    "Direcao recomendada",
    "Acao:",
    "Cautela:",
    "Diretriz Identiq",
    "Cuidados e limites aplicados",
  ];

  for (const label of bannedLabels) {
    assert.equal(
      response.content.includes(label),
      false,
      `saida final nao deve conter label interno: ${label}`
    );
  }

  assert.ok(response.content.includes("Identiq"), "saida final deve manter posicionamento da marca");
}

function main() {
  runIntentTests();
  runRagTests();
  runResponseStyleTests();
  console.log("OK - ai-engine-refinement tests passed");
}

main();

import "server-only";
import { prisma } from "@/lib/db/prisma";
import { createProviderFromDatabase } from "@/lib/ai/providers/factory";
import { searchKnowledgeBaseWithDebug } from "@/lib/knowledge/service";
import { classifyIntentLocally } from "@/lib/ai/core-engine/intent-classifier";
import { evaluatePolicy } from "@/lib/ai/core-engine/policy-engine";
import { buildContext } from "@/lib/ai/core-engine/context-builder";
import { composeCoreResponse } from "@/lib/ai/core-engine/response-composer";
import { calculateResponseConfidence } from "@/lib/ai/core-engine/confidence";
import { decideHandoff } from "@/lib/ai/core-engine/handoff";
import { getIntentContract } from "@/lib/ai/core-engine/intent-contracts";
import { CoreEngineInput, CoreEngineResult } from "@/lib/ai/core-engine/types";

function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

function defaultKnowledgeDebug(runtimeLexical: boolean, runtimeSemantic: boolean): CoreEngineResult["debug"]["knowledge"] {
  return {
    retrievalStrategy: runtimeLexical && runtimeSemantic ? "hybrid" : runtimeLexical ? "lexical_only" : "semantic_only",
    minScoreApplied: 0,
    minLexicalApplied: 0,
    selectedChunkIds: [],
    ignoredChunks: [],
    reranked: false,
    categoryBoosts: {},
    criticalTermHits: [],
  } as const;
}

async function tryEnrichment({
  stage,
  tenantId,
  runtimeProviderId,
  fallbackProviderId,
  modelName,
  baseContent,
  userMessage,
  temperature,
  maxTokens,
}: {
  stage: "local" | "external";
  tenantId: string;
  runtimeProviderId?: string;
  fallbackProviderId?: string;
  modelName?: string;
  baseContent: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
}) {
  const providerId = runtimeProviderId ?? fallbackProviderId;
  if (!providerId) {
    return null;
  }

  try {
    const provider = await createProviderFromDatabase(providerId);

    const model = modelName
      ? await prisma.model.findFirst({
          where: {
            OR: [{ tenantId }, { tenantId: null }],
            technicalName: modelName,
            isActive: true,
          },
        })
      : await prisma.model.findFirst({
          where: {
            OR: [{ tenantId }, { tenantId: null }],
            providerId,
            isActive: true,
            category: { in: ["CHAT", "REASONING"] },
          },
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        });

    if (!model) {
      return null;
    }

    const enrichmentSystemPrompt =
      "Voce e um modulo de enriquecimento textual da Identiq. " +
      "Melhore clareza e objetividade sem alterar fatos, limites de seguranca ou decisoes de handoff.";

    const enrichmentUserPrompt = [
      `Mensagem do usuario: ${userMessage}`,
      "Resposta base controlada:",
      baseContent,
      "Tarefa: aumentar fluidez e organizacao sem criar afirmacoes novas.",
    ].join("\n\n");

    const output = provider.capabilities.responses
      ? await provider.responses({
          model: model.technicalName,
          messages: [
            { role: "system", content: enrichmentSystemPrompt },
            { role: "user", content: enrichmentUserPrompt },
          ],
          temperature: temperature ?? 0.2,
          maxTokens,
        })
      : await provider.chat({
          model: model.technicalName,
          messages: [
            { role: "system", content: enrichmentSystemPrompt },
            { role: "user", content: enrichmentUserPrompt },
          ],
          temperature: temperature ?? 0.2,
          maxTokens,
        });

    const content = output.content?.trim();
    if (!content) {
      return null;
    }

    return {
      stage,
      content,
      providerId: provider.id,
      modelTechnicalName: model.technicalName,
      inputTokens: output.inputTokens,
      outputTokens: output.outputTokens,
    };
  } catch {
    return null;
  }
}

export async function executeCoreEnginePipeline(
  input: CoreEngineInput & {
    providerId?: string;
    modelName?: string;
    temperature?: number;
    maxTokens?: number;
    useRag?: boolean;
  }
): Promise<CoreEngineResult> {
  const totalStart = Date.now();
  const timings: CoreEngineResult["debug"]["timingsMs"] = {};
  const stageCosts: CoreEngineResult["debug"]["stageCostsUsd"] = {
    L1_INTENT: 0,
    L2_POLICY: 0,
    L3_KNOWLEDGE: 0,
    L4_TEMPLATE: 0,
    L5_LOCAL_LLM: 0,
    L6_EXTERNAL_LLM: 0,
  };

  const layersUsed: CoreEngineResult["layersUsed"] = ["L1_INTENT"];

  const context = buildContext({
    message: input.message,
    messages: input.messages,
    agentName: input.agent?.name,
  });

  const intentStart = Date.now();
  const classification = classifyIntentLocally(input.message, input.runtime);
  timings.L1_INTENT = Date.now() - intentStart;

  const policyStart = Date.now();
  const policy = evaluatePolicy({
    message: input.message,
    classification,
    runtime: input.runtime,
  });
  timings.L2_POLICY = Date.now() - policyStart;
  layersUsed.push("L2_POLICY");

  const contract = getIntentContract(classification.intent);
  const shouldRetrieveKnowledge = policy.requiresKnowledge && input.useRag !== false;

  let knowledge = [] as CoreEngineResult["knowledge"];
  let knowledgeDebug = defaultKnowledgeDebug(
    input.runtime.lexicalSearchEnabled,
    input.runtime.localEmbeddingsEnabled
  );

  if (shouldRetrieveKnowledge) {
    const knowledgeStart = Date.now();
    const searchResult = await searchKnowledgeBaseWithDebug(input.tenantId, input.message, contract.ragPolicy.topK, {
      lexicalSearchEnabled: input.runtime.lexicalSearchEnabled,
      localSemanticEnabled: input.runtime.localEmbeddingsEnabled,
      requiredCategories:
        input.runtime.knowledgeRequiredCategories.length > 0
          ? input.runtime.knowledgeRequiredCategories
          : contract.ragPolicy.preferredCategories,
      intent: classification.intent,
      minScore: contract.ragPolicy.minScore,
      minLexicalScore: contract.ragPolicy.minLexicalScore,
      topK: contract.ragPolicy.topK,
    });

    knowledge = searchResult.hits;
    knowledgeDebug = searchResult.debug;
    timings.L3_KNOWLEDGE = Date.now() - knowledgeStart;
    layersUsed.push("L3_KNOWLEDGE");
  }

  const confidenceResult = calculateResponseConfidence({
    classification,
    knowledge,
    policy,
  });

  const handoff = decideHandoff({
    classification,
    policy,
    confidence: confidenceResult.score,
    runtime: input.runtime,
  });

  const templateStart = Date.now();
  const composed = composeCoreResponse({
    classification,
    policy,
    knowledge,
    handoff,
    agentName: context.agentName,
    userName: context.userName,
    message: context.latestUserMessage,
    userTurnCount: context.userTurnCount,
  });
  timings.L4_TEMPLATE = Date.now() - templateStart;
  layersUsed.push("L4_TEMPLATE");

  let finalContent = composed.content;
  let providerIdUsed: string | undefined;
  let modelTechnicalNameUsed: string | undefined;
  let localLlmUsed = false;
  let externalLlmUsed = false;
  let inputTokens = estimateTokens(input.message);
  let outputTokens = estimateTokens(finalContent);

  if (!input.runtime.autonomousMode && input.runtime.allowEnrichment && policy.responseMode === "ENRICHED_MODE") {
    if (input.runtime.localLlmEnabled) {
      const localStart = Date.now();
      const local = await tryEnrichment({
        stage: "local",
        tenantId: input.tenantId,
        runtimeProviderId: input.runtime.localLlmProviderId,
        fallbackProviderId: input.providerId,
        modelName: input.modelName,
        baseContent: finalContent,
        userMessage: input.message,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
      });
      timings.L5_LOCAL_LLM = Date.now() - localStart;

      if (local) {
        finalContent = local.content;
        providerIdUsed = local.providerId;
        modelTechnicalNameUsed = local.modelTechnicalName;
        inputTokens = local.inputTokens;
        outputTokens = local.outputTokens;
        localLlmUsed = true;
        layersUsed.push("L5_LOCAL_LLM");
      }
    }

    if (input.runtime.externalProviderEnabled) {
      const externalStart = Date.now();
      const external = await tryEnrichment({
        stage: "external",
        tenantId: input.tenantId,
        runtimeProviderId: input.runtime.externalProviderId,
        fallbackProviderId: input.providerId,
        modelName: input.modelName,
        baseContent: finalContent,
        userMessage: input.message,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
      });
      timings.L6_EXTERNAL_LLM = Date.now() - externalStart;

      if (external) {
        finalContent = external.content;
        providerIdUsed = external.providerId;
        modelTechnicalNameUsed = external.modelTechnicalName;
        inputTokens = external.inputTokens;
        outputTokens = external.outputTokens;
        externalLlmUsed = true;
        layersUsed.push("L6_EXTERNAL_LLM");
      }
    }
  }

  timings.TOTAL = Date.now() - totalStart;

  return {
    content: finalContent,
    intent: classification.intent,
    criticality: classification.criticality,
    confidence: confidenceResult.score,
    responseMode: policy.responseMode,
    layersUsed,
    usedBlocks: composed.usedBlocks,
    knowledge,
    handoff,
    inputTokens,
    outputTokens,
    localLlmUsed,
    externalLlmUsed,
    providerIdUsed,
    modelTechnicalNameUsed,
    debug: {
      intentReasoning: classification.reasoning,
      confidenceReason: confidenceResult.reason,
      policyBlocks: policy.appliedPolicies,
      knowledge: knowledgeDebug,
      handoffReason: handoff.reason,
      timingsMs: timings,
      stageCostsUsd: stageCosts,
    },
  };
}
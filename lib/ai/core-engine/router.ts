import "server-only";
import { prisma } from "@/lib/db/prisma";
import { createProviderFromDatabase } from "@/lib/ai/providers/factory";
import { searchKnowledgeBase } from "@/lib/knowledge/service";
import { classifyIntentLocally } from "@/lib/ai/core-engine/intent-classifier";
import { evaluatePolicy } from "@/lib/ai/core-engine/policy-engine";
import { buildContext } from "@/lib/ai/core-engine/context-builder";
import { composeCoreResponse } from "@/lib/ai/core-engine/response-composer";
import { calculateResponseConfidence } from "@/lib/ai/core-engine/confidence";
import { decideHandoff } from "@/lib/ai/core-engine/handoff";
import { CoreEngineInput, CoreEngineResult } from "@/lib/ai/core-engine/types";

function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
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
      "Você é um módulo de enriquecimento textual da Identiq. " +
      "Mantenha a resposta factual, institucional e segura. " +
      "Não invente aprovações, biometria, risco ou conformidade absoluta.";

    const enrichmentUserPrompt = [
      `Mensagem do usuário: ${userMessage}`,
      "Resposta base controlada:",
      baseContent,
      "Tarefa: melhorar clareza e organização, mantendo o mesmo conteúdo factual.",
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
  const layersUsed: CoreEngineResult["layersUsed"] = ["L1_INTENT"];
  const context = buildContext({
    message: input.message,
    messages: input.messages,
    agentName: input.agent?.name,
  });

  const classification = classifyIntentLocally(input.message, input.runtime);
  const policy = evaluatePolicy({
    message: input.message,
    classification,
    runtime: input.runtime,
  });
  layersUsed.push("L2_POLICY");

  const shouldRetrieveKnowledge = policy.requiresKnowledge && input.useRag !== false;

  const knowledge = shouldRetrieveKnowledge
    ? await searchKnowledgeBase(input.tenantId, input.message, 5, {
        lexicalSearchEnabled: input.runtime.lexicalSearchEnabled,
        localSemanticEnabled: input.runtime.localEmbeddingsEnabled,
        requiredCategories: input.runtime.knowledgeRequiredCategories,
      })
    : [];

  if (shouldRetrieveKnowledge) {
    layersUsed.push("L3_KNOWLEDGE");
  }

  const composed = composeCoreResponse({
    classification,
    policy,
    knowledge,
    agentName: context.agentName,
    message: context.latestUserMessage,
  });
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

  const confidence = calculateResponseConfidence({
    classification,
    knowledge,
    policy,
  });

  const handoff = decideHandoff({
    classification,
    policy,
    confidence,
    runtime: input.runtime,
  });

  return {
    content: finalContent,
    intent: classification.intent,
    criticality: classification.criticality,
    confidence,
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
  };
}


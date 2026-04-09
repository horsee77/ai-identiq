import "server-only";
import { ApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/db/prisma";
import { executeCoreEnginePipeline } from "@/lib/ai/core-engine/router";
import { getAiRuntimeConfig } from "@/lib/ai/core-engine/config";
import { generateLocalEmbeddings } from "@/lib/ai/embeddings/local-provider";
import { createProviderFromDatabase } from "@/lib/ai/providers/factory";

export type InferenceMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

export type InferenceInput = {
  tenantId: string;
  requestId: string;
  endpoint: string;
  channel?: "WEB_CHAT" | "DASHBOARD" | "API";
  requestMetadata?: Record<string, unknown>;
  message: string;
  messages?: InferenceMessage[];
  model?: string;
  agentId?: string;
  temperature?: number;
  maxTokens?: number;
  useRag?: boolean;
  providerId?: string;
  userId?: string;
  apiKeyId?: string;
};

type ResolvedModel = {
  id?: string;
  technicalName: string;
  inputCostPer1kUsd: number;
  outputCostPer1kUsd: number;
  providerId?: string;
  supportsEmbeddings: boolean;
};

const BUILTIN_CHAT_MODEL = "identiq-core-v1";
const BUILTIN_EMBEDDING_MODEL = "local-embedding-v1";

function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

function calculateCost({
  inputTokens,
  outputTokens,
  inputCostPer1kUsd,
  outputCostPer1kUsd,
}: {
  inputTokens: number;
  outputTokens: number;
  inputCostPer1kUsd: number;
  outputCostPer1kUsd: number;
}) {
  return (inputTokens / 1000) * inputCostPer1kUsd + (outputTokens / 1000) * outputCostPer1kUsd;
}

async function resolveModelForTenant({
  tenantId,
  modelName,
  category,
}: {
  tenantId: string;
  modelName?: string;
  category?: "CHAT" | "REASONING" | "EMBEDDING";
}): Promise<ResolvedModel> {
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
          isActive: true,
          ...(category ? { category } : { category: { in: ["CHAT", "REASONING"] } }),
        },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      });

  if (!model) {
    return {
      technicalName: category === "EMBEDDING" ? BUILTIN_EMBEDDING_MODEL : BUILTIN_CHAT_MODEL,
      inputCostPer1kUsd: 0,
      outputCostPer1kUsd: 0,
      supportsEmbeddings: category === "EMBEDDING",
    };
  }

  return {
    id: model.id,
    technicalName: model.technicalName,
    inputCostPer1kUsd: Number(model.inputCostPer1kUsd),
    outputCostPer1kUsd: Number(model.outputCostPer1kUsd),
    providerId: model.providerId,
    supportsEmbeddings: model.supportsEmbeddings,
  };
}

async function resolveAgentRuntimeData(tenantId: string, agentId?: string) {
  if (!agentId) {
    return null;
  }

  return prisma.agent.findFirst({
    where: {
      id: agentId,
      OR: [{ tenantId }, { tenantId: null }],
      status: { in: ["ACTIVE", "DRAFT"] },
    },
    select: {
      id: true,
      name: true,
      systemPrompt: true,
      rigidInstructions: true,
      category: true,
    },
  });
}

export async function runInference(payload: InferenceInput) {
  const startedAt = Date.now();
  const [runtime, model, agent] = await Promise.all([
    getAiRuntimeConfig({ tenantId: payload.tenantId, agentId: payload.agentId }),
    resolveModelForTenant({ tenantId: payload.tenantId, modelName: payload.model }),
    resolveAgentRuntimeData(payload.tenantId, payload.agentId),
  ]);

  const normalizedMessages: InferenceMessage[] = payload.messages?.length
    ? payload.messages
    : [{ role: "user", content: payload.message }];
  const effectiveChannel =
    payload.channel ?? (payload.endpoint.includes("/internal/") ? "DASHBOARD" : "API");

  const baseProviderId = payload.providerId ?? model.providerId;

  const core = await executeCoreEnginePipeline({
    tenantId: payload.tenantId,
    requestId: payload.requestId,
    message: payload.message,
    messages: normalizedMessages,
    agent,
    runtime,
    providerId: baseProviderId,
    modelName: payload.model ?? model.technicalName,
    temperature: payload.temperature,
    maxTokens: payload.maxTokens,
    useRag: payload.useRag,
    channel: effectiveChannel,
  });

  const templateOnlyResponse =
    !core.modelTechnicalNameUsed && !core.localLlmUsed && !core.externalLlmUsed;

  const resolvedModel = templateOnlyResponse
    ? {
        technicalName: BUILTIN_CHAT_MODEL,
        inputCostPer1kUsd: 0,
        outputCostPer1kUsd: 0,
        supportsEmbeddings: false,
      }
    : core.modelTechnicalNameUsed
      ? await resolveModelForTenant({
          tenantId: payload.tenantId,
          modelName: core.modelTechnicalNameUsed,
        })
      : model;

  const effectiveModelName = core.modelTechnicalNameUsed ?? resolvedModel.technicalName;
  const effectiveProviderId =
    core.providerIdUsed ??
    (core.localLlmUsed || core.externalLlmUsed ? baseProviderId : undefined);
  const latencyMs = Date.now() - startedAt;
  const totalCost = calculateCost({
    inputTokens: core.inputTokens,
    outputTokens: core.outputTokens,
    inputCostPer1kUsd: resolvedModel.inputCostPer1kUsd,
    outputCostPer1kUsd: resolvedModel.outputCostPer1kUsd,
  });

  const safeRequestMetadata = payload.requestMetadata
    ? JSON.parse(JSON.stringify(payload.requestMetadata))
    : undefined;

  const finalStatus = core.handoff.shouldHandoff ? "ESCALATED" : "RESOLVED";

  const stageCostsUsd = {
    ...core.debug.stageCostsUsd,
    ...(core.externalLlmUsed
      ? { L6_EXTERNAL_LLM: totalCost }
      : core.localLlmUsed
        ? { L5_LOCAL_LLM: totalCost }
        : { L4_TEMPLATE: 0 }),
  };

  const debugTrace = {
    ...core.debug,
    stageCostsUsd,
  };

  const conversation = await prisma.conversation.create({
    data: {
      tenantId: payload.tenantId,
      userId: payload.userId,
      apiKeyId: payload.apiKeyId,
      channel: effectiveChannel,
      agentId: agent?.id,
      providerId: effectiveProviderId,
      modelId: resolvedModel.id,
      status: finalStatus,
      effectivePrompt: agent?.systemPrompt ?? null,
      contextPayload: {
        endpoint: payload.endpoint,
        intent: core.intent,
        criticality: core.criticality,
        confidence: core.confidence,
        responseMode: core.responseMode,
        handoffLevel: core.handoff.level,
        runtime,
        debug: runtime.debugMode ? debugTrace : undefined,
        requestMetadata: safeRequestMetadata,
      },
      retrievedDocuments: core.knowledge,
      toolCalls: [],
      latencyMs,
      inputTokens: core.inputTokens,
      outputTokens: core.outputTokens,
      totalCostUsd: totalCost,
      escalatedToHuman: core.handoff.shouldHandoff,
      resolution: core.handoff.shouldHandoff ? "Encaminhado para humano" : "Respondido automaticamente",
      messages: {
        createMany: {
          data: normalizedMessages.map((message, index) => ({
            sequence: index + 1,
            role: message.role.toUpperCase() as "SYSTEM" | "USER" | "ASSISTANT" | "TOOL",
            content: message.content,
            tokenCount: estimateTokens(message.content),
          })),
        },
      },
    },
  });

  await prisma.conversationMessage.create({
    data: {
      conversationId: conversation.id,
      sequence: normalizedMessages.length + 1,
      role: "ASSISTANT",
      content: core.content,
      tokenCount: core.outputTokens,
      costUsd: totalCost,
    },
  });

  if (core.handoff.shouldHandoff) {
    await prisma.handoffRecord.create({
      data: {
        tenantId: payload.tenantId,
        conversationId: conversation.id,
        agentId: agent?.id,
        reason: core.handoff.reason ?? "Regra de seguranca do core engine.",
        riskCategory: core.criticality.toLowerCase(),
        confidence: core.confidence,
        queueName: core.handoff.queueName ?? "analise-humana",
        summary: core.content.slice(0, 1200),
        status: "IN_QUEUE",
      },
    });
  }

  await prisma.apiRequestLog.create({
    data: {
      requestId: payload.requestId,
      tenantId: payload.tenantId,
      apiKeyId: payload.apiKeyId,
      userId: payload.userId,
      providerId: effectiveProviderId,
      modelId: resolvedModel.id,
      agentId: agent?.id,
      conversationId: conversation.id,
      endpoint: payload.endpoint,
      method: "POST",
      channel: effectiveChannel,
      success: true,
      statusCode: 200,
      inputTokens: core.inputTokens,
      outputTokens: core.outputTokens,
      totalCostUsd: totalCost,
      latencyMs,
      fallbackTriggered: false,
      handoffTriggered: core.handoff.shouldHandoff,
      metadata: {
        engine: "core_engine",
        mode: core.responseMode,
        intent: core.intent,
        confidence: core.confidence,
        criticality: core.criticality,
        handoffLevel: core.handoff.level,
        layers: core.layersUsed,
        usedBlocks: core.usedBlocks,
        localLlmUsed: core.localLlmUsed,
        externalLlmUsed: core.externalLlmUsed,
        autonomousMode: runtime.autonomousMode,
        debug: runtime.debugMode ? debugTrace : undefined,
        requestMetadata: safeRequestMetadata,
      },
    },
  });

  await prisma.usageRecord.create({
    data: {
      tenantId: payload.tenantId,
      apiKeyId: payload.apiKeyId,
      userId: payload.userId,
      agentId: agent?.id,
      providerId: effectiveProviderId,
      modelId: resolvedModel.id,
      channel: effectiveChannel,
      metricType: "COST",
      inputTokens: core.inputTokens,
      outputTokens: core.outputTokens,
      totalTokens: core.inputTokens + core.outputTokens,
      requests: 1,
      costUsd: totalCost,
      periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      periodEnd: new Date(),
      metadata: {
        endpoint: payload.endpoint,
        intent: core.intent,
        handoffLevel: core.handoff.level,
        requestMetadata: safeRequestMetadata,
      },
    },
  });

  const exposeDebug = runtime.debugMode || payload.endpoint.includes("/internal/");

  return {
    model: {
      id: resolvedModel.id,
      technicalName: effectiveModelName,
    },
    provider: {
      id: effectiveProviderId,
    },
    content: core.content,
    inputTokens: core.inputTokens,
    outputTokens: core.outputTokens,
    totalCost,
    latencyMs,
    conversationId: conversation.id,
    ragResults: core.knowledge,
    fallbackTriggered: false,
    handoff: core.handoff,
    engine: {
      intent: core.intent,
      confidence: core.confidence,
      criticality: core.criticality,
      mode: core.responseMode,
      layers: core.layersUsed,
      usedBlocks: core.usedBlocks,
      localLlmUsed: core.localLlmUsed,
      externalLlmUsed: core.externalLlmUsed,
      handoffLevel: core.handoff.level,
      ...(exposeDebug ? { debug: debugTrace } : {}),
    },
  };
}

export async function runEmbeddings({
  tenantId,
  requestId,
  endpoint,
  modelName,
  input,
  apiKeyId,
}: {
  tenantId: string;
  requestId: string;
  endpoint: string;
  modelName?: string;
  input: string[];
  apiKeyId?: string;
}) {
  const runtime = await getAiRuntimeConfig({ tenantId });
  const model = await resolveModelForTenant({
    tenantId,
    modelName,
    category: "EMBEDDING",
  });

  const shouldUseLocalEmbeddings =
    runtime.autonomousMode ||
    runtime.localEmbeddingsEnabled ||
    !model.supportsEmbeddings ||
    !model.providerId;

  const startedAt = Date.now();
  let vectors = generateLocalEmbeddings(input);
  let source: "local" | "remote" = "local";

  if (!shouldUseLocalEmbeddings && model.providerId) {
    try {
      const provider = await createProviderFromDatabase(model.providerId);
      const remote = await provider.embeddings({
        model: model.technicalName,
        input,
      });
      vectors = remote.vectors;
      source = "remote";
    } catch {
      vectors = generateLocalEmbeddings(input);
      source = "local";
    }
  }

  const latencyMs = Date.now() - startedAt;

  await prisma.apiRequestLog.create({
    data: {
      requestId,
      tenantId,
      apiKeyId,
      providerId: source === "remote" ? model.providerId : null,
      modelId: model.id,
      endpoint,
      method: "POST",
      channel: "API",
      success: true,
      statusCode: 200,
      latencyMs,
      metadata: {
        embeddings: true,
        items: input.length,
        source,
        autonomousMode: runtime.autonomousMode,
      },
    },
  });

  return {
    model: {
      id: model.id,
      technicalName: source === "remote" ? model.technicalName : BUILTIN_EMBEDDING_MODEL,
    },
    vectors,
    latencyMs,
    source,
  };
}

export async function assertEmbeddingsModelAvailable(tenantId: string, modelName?: string) {
  const model = await resolveModelForTenant({
    tenantId,
    modelName,
    category: "EMBEDDING",
  });

  if (model.id && !model.supportsEmbeddings) {
    throw new ApiError("model_not_embedding", "O modelo informado nao suporta embeddings.", 422);
  }
}
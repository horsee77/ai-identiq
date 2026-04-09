import { prisma } from "@/lib/db/prisma";
import { chunkText } from "@/lib/knowledge/chunking";
import { generateEmbeddings, saveEmbeddingChunks } from "@/lib/ai/embeddings/service";
import { cosineSimilarity, generateLocalEmbedding } from "@/lib/ai/embeddings/local-provider";
import { ApiError } from "@/lib/api/errors";
import {
  type KnowledgeCandidate,
  type KnowledgeSearchOptions,
  type KnowledgeSearchResult,
  rankKnowledgeCandidatesWithDefaults,
} from "@/lib/knowledge/ranking";
import type { KnowledgeHit } from "@/lib/ai/core-engine/types";

export type { KnowledgeCandidate, KnowledgeSearchOptions, KnowledgeSearchResult } from "@/lib/knowledge/ranking";

export async function processDocumentEmbeddingJob({
  documentId,
  providerId,
  embeddingModel,
  chunkSize,
  overlap,
}: {
  documentId: string;
  providerId?: string;
  embeddingModel: string;
  chunkSize: number;
  overlap: number;
}) {
  const document = await prisma.knowledgeDocument.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    throw new ApiError("document_not_found", "Documento nao encontrado.", 404);
  }

  const text = document.processedContent ?? document.rawContent ?? "";
  const chunks = chunkText(text, { chunkSize, overlap });

  if (!chunks.length) {
    throw new ApiError("empty_document", "Documento sem conteudo indexavel.", 422);
  }

  const embeddings = await generateEmbeddings({
    providerId,
    model: embeddingModel,
    input: chunks,
    preferLocal: !providerId,
  });

  await saveEmbeddingChunks({
    tenantId: document.tenantId ?? undefined,
    documentId,
    chunks,
    embeddings,
  });

  await prisma.knowledgeDocument.update({
    where: { id: documentId },
    data: {
      status: "INDEXED",
      indexedAt: new Date(),
    },
  });

  return {
    chunks: chunks.length,
    embeddingModel,
    strategy: providerId ? "remote_embeddings" : "local_embeddings",
  };
}

export async function searchKnowledgeBaseWithDebug(
  tenantId: string,
  query: string,
  topK = 5,
  options: KnowledgeSearchOptions = {}
): Promise<KnowledgeSearchResult> {
  const includeGlobal = options.includeGlobalScope ?? true;

  const chunks = await prisma.knowledgeChunk.findMany({
    where: {
      OR: includeGlobal ? [{ tenantId }, { tenantId: null }] : [{ tenantId }],
      document: {
        status: "INDEXED",
        approved: true,
      },
    },
    include: {
      document: true,
    },
    take: 260,
  });

  const candidates: KnowledgeCandidate[] = chunks.map((chunk) => ({
    id: chunk.id,
    content: chunk.content,
    document: {
      id: chunk.document.id,
      title: chunk.document.title,
      category: chunk.document.category,
    },
  }));

  return rankKnowledgeCandidatesWithDefaults({
    query,
    candidates,
    options: {
      ...options,
      topK,
    },
    semanticSimilarity: (message, content) =>
      cosineSimilarity(generateLocalEmbedding(message), generateLocalEmbedding(content)),
  });
}

export async function searchKnowledgeBase(
  tenantId: string,
  query: string,
  topK = 5,
  options: KnowledgeSearchOptions = {}
): Promise<KnowledgeHit[]> {
  const result = await searchKnowledgeBaseWithDebug(tenantId, query, topK, options);
  return result.hits;
}
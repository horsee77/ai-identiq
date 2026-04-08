import "server-only";
import { prisma } from "@/lib/db/prisma";
import { chunkText } from "@/lib/knowledge/chunking";
import { generateEmbeddings, saveEmbeddingChunks } from "@/lib/ai/embeddings/service";
import { cosineSimilarity, generateLocalEmbedding } from "@/lib/ai/embeddings/local-provider";
import { ApiError } from "@/lib/api/errors";
import { KnowledgeHit } from "@/lib/ai/core-engine/types";

type KnowledgeSearchOptions = {
  lexicalSearchEnabled?: boolean;
  localSemanticEnabled?: boolean;
  requiredCategories?: string[];
  includeGlobalScope?: boolean;
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function lexicalSimilarity(query: string, content: string) {
  const queryTokens = tokenize(query);
  const contentTokens = tokenize(content);
  if (!queryTokens.length || !contentTokens.length) {
    return 0;
  }

  const querySet = new Set(queryTokens);
  const contentSet = new Set(contentTokens);

  let overlap = 0;
  for (const token of querySet) {
    if (contentSet.has(token)) {
      overlap += 1;
    }
  }

  const jaccard = overlap / (querySet.size + contentSet.size - overlap || 1);
  const phraseBoost = normalizeText(content).includes(normalizeText(query)) ? 0.25 : 0;
  return Math.min(1, jaccard + phraseBoost);
}

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
    throw new ApiError("document_not_found", "Documento não encontrado.", 404);
  }

  const text = document.processedContent ?? document.rawContent ?? "";
  const chunks = chunkText(text, { chunkSize, overlap });

  if (!chunks.length) {
    throw new ApiError("empty_document", "Documento sem conteúdo indexável.", 422);
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

export async function searchKnowledgeBase(
  tenantId: string,
  query: string,
  topK = 5,
  options: KnowledgeSearchOptions = {}
): Promise<KnowledgeHit[]> {
  const lexicalEnabled = options.lexicalSearchEnabled ?? true;
  const localSemanticEnabled = options.localSemanticEnabled ?? true;
  const effectiveLexicalEnabled = lexicalEnabled || !localSemanticEnabled;
  const includeGlobal = options.includeGlobalScope ?? true;
  const requiredCategories = options.requiredCategories?.filter(Boolean) ?? [];

  const chunks = await prisma.knowledgeChunk.findMany({
    where: {
      OR: includeGlobal ? [{ tenantId }, { tenantId: null }] : [{ tenantId }],
      document: {
        status: "INDEXED",
        approved: true,
        ...(requiredCategories.length
          ? {
              category: {
                in: requiredCategories,
              },
            }
          : {}),
      },
    },
    include: {
      document: true,
    },
    take: 250,
  });

  if (!chunks.length) {
    return [];
  }

  const queryVector = localSemanticEnabled ? generateLocalEmbedding(query) : [];

  const scored = chunks.map((chunk) => {
    const lexicalScore = effectiveLexicalEnabled ? lexicalSimilarity(query, chunk.content) : 0;
    const semanticScore = localSemanticEnabled
      ? cosineSimilarity(queryVector, generateLocalEmbedding(chunk.content))
      : 0;

    const score =
      effectiveLexicalEnabled && localSemanticEnabled
        ? 0.45 * lexicalScore + 0.55 * semanticScore
        : effectiveLexicalEnabled
          ? lexicalScore
          : semanticScore;

    return {
      id: chunk.id,
      score: Number(score.toFixed(6)),
      lexicalScore: Number(lexicalScore.toFixed(6)),
      semanticScore: Number(semanticScore.toFixed(6)),
      content: chunk.content,
      document: {
        id: chunk.document.id,
        title: chunk.document.title,
        category: chunk.document.category,
      },
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}


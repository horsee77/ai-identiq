import "server-only";
import { prisma } from "@/lib/db/prisma";
import { chunkText } from "@/lib/knowledge/chunking";
import { generateEmbeddings, saveEmbeddingChunks } from "@/lib/ai/embeddings/service";
import { cosineSimilarity, generateLocalEmbedding } from "@/lib/ai/embeddings/local-provider";
import { ApiError } from "@/lib/api/errors";
import {
  CoreIntent,
  IgnoredKnowledgeChunk,
  KnowledgeDebugTrace,
  KnowledgeHit,
} from "@/lib/ai/core-engine/types";

type KnowledgeSearchOptions = {
  lexicalSearchEnabled?: boolean;
  localSemanticEnabled?: boolean;
  requiredCategories?: string[];
  includeGlobalScope?: boolean;
  intent?: CoreIntent;
  minScore?: number;
  minLexicalScore?: number;
  topK?: number;
};

type RankedChunk = KnowledgeHit & {
  categoryBoost: number;
  lexicalBoost: number;
  genericPenalty: number;
  criticalTermHits: string[];
};

export type KnowledgeSearchResult = {
  hits: KnowledgeHit[];
  debug: KnowledgeDebugTrace;
};

const GENERIC_CONTENT_PATTERNS = [
  "a identiq e uma plataforma",
  "nossa plataforma",
  "seguranca e eficiencia",
  "solucao completa",
];

const CRITICAL_TERMS = [
  "kyc",
  "aml",
  "biometria",
  "face",
  "documento",
  "webhook",
  "payload",
  "api",
  "auth",
  "token",
  "quota",
  "request_id",
  "retry",
  "idempotencia",
  "compliance",
  "lgpd",
  "sancao",
  "pep",
];

const INTENT_CATEGORY_PRIORITIES: Record<CoreIntent, string[]> = {
  institucional_comercial: ["vendas", "faq comercial", "faq institucional", "integracoes"],
  faq_comercial: ["faq comercial", "vendas", "faq institucional"],
  suporte_operacional: ["suporte", "fluxos operacionais", "faq tecnico", "integracoes"],
  integracoes_api: ["integracoes", "faq tecnico", "suporte", "politicas"],
  onboarding_kyc: ["onboarding", "kyc", "biometria", "compliance", "operacoes"],
  aml_compliance: ["aml", "compliance", "politicas", "operacoes"],
  handoff_humano: ["suporte", "fluxos operacionais"],
};

const INTENT_MIN_SCORE: Record<CoreIntent, number> = {
  institucional_comercial: 0.18,
  faq_comercial: 0.16,
  suporte_operacional: 0.22,
  integracoes_api: 0.26,
  onboarding_kyc: 0.28,
  aml_compliance: 0.3,
  handoff_humano: 0,
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s_]/gu, " ")
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
  const phraseBoost = normalizeText(content).includes(normalizeText(query)) ? 0.22 : 0;
  return Math.min(1, jaccard + phraseBoost);
}

function extractCriticalTerms(query: string) {
  const normalized = normalizeText(query);
  return CRITICAL_TERMS.filter((term) => normalized.includes(term));
}

function resolveCategoryBoost(intent: CoreIntent | undefined, category: string) {
  if (!intent) {
    return 0;
  }

  const priorities = INTENT_CATEGORY_PRIORITIES[intent] ?? [];
  if (!priorities.length) {
    return 0;
  }

  const normalizedCategory = normalizeText(category);
  const idx = priorities.findIndex((entry) => normalizedCategory.includes(entry));

  if (idx === -1) {
    return 0;
  }

  const boost = 0.12 - idx * 0.02;
  return Math.max(0.02, Number(boost.toFixed(3)));
}

function detectGenericChunk(content: string) {
  const normalized = normalizeText(content);
  return GENERIC_CONTENT_PATTERNS.some((pattern) => normalized.includes(pattern));
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
  const lexicalEnabled = options.lexicalSearchEnabled ?? true;
  const localSemanticEnabled = options.localSemanticEnabled ?? true;
  const includeGlobal = options.includeGlobalScope ?? true;
  const requiredCategories = options.requiredCategories?.filter(Boolean) ?? [];
  const intent = options.intent;
  const effectiveTopK = Math.max(1, Math.min(8, options.topK ?? topK));

  const defaultMinScore = intent ? INTENT_MIN_SCORE[intent] : 0.18;
  const minScore = options.minScore ?? defaultMinScore;
  const minLexicalScore = options.minLexicalScore ?? 0.08;

  const retrievalStrategy: KnowledgeDebugTrace["retrievalStrategy"] =
    lexicalEnabled && localSemanticEnabled
      ? "hybrid"
      : lexicalEnabled
        ? "lexical_only"
        : "semantic_only";

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
    take: 260,
  });

  if (!chunks.length) {
    return {
      hits: [],
      debug: {
        retrievalStrategy,
        minScoreApplied: minScore,
        minLexicalApplied: minLexicalScore,
        selectedChunkIds: [],
        ignoredChunks: [],
        reranked: false,
        categoryBoosts: {},
        criticalTermHits: [],
      },
    };
  }

  const criticalTerms = extractCriticalTerms(query);
  const queryVector = localSemanticEnabled ? generateLocalEmbedding(query) : [];

  const ranked: RankedChunk[] = chunks.map((chunk) => {
    const lexicalScore = lexicalEnabled ? lexicalSimilarity(query, chunk.content) : 0;
    const semanticScore = localSemanticEnabled
      ? cosineSimilarity(queryVector, generateLocalEmbedding(chunk.content))
      : 0;

    const normalizedContent = normalizeText(chunk.content);
    const criticalTermHits = criticalTerms.filter((term) => normalizedContent.includes(term));
    const lexicalBoost = criticalTermHits.length ? Math.min(0.12, criticalTermHits.length * 0.03) : 0;
    const categoryBoost = resolveCategoryBoost(intent, chunk.document.category);

    const isGeneric = detectGenericChunk(chunk.content);
    const genericPenalty = isGeneric && criticalTerms.length > 0 && criticalTermHits.length === 0 ? 0.08 : 0;

    const baseScore =
      retrievalStrategy === "hybrid"
        ? 0.5 * lexicalScore + 0.5 * semanticScore
        : retrievalStrategy === "lexical_only"
          ? lexicalScore
          : semanticScore;

    const rerankScore = Math.max(0, Math.min(1, baseScore + lexicalBoost + categoryBoost - genericPenalty));

    return {
      id: chunk.id,
      score: Number(rerankScore.toFixed(6)),
      lexicalScore: Number(lexicalScore.toFixed(6)),
      semanticScore: Number(semanticScore.toFixed(6)),
      content: chunk.content,
      document: {
        id: chunk.document.id,
        title: chunk.document.title,
        category: chunk.document.category,
      },
      categoryBoost,
      lexicalBoost,
      genericPenalty,
      criticalTermHits,
    };
  });

  const sorted = ranked.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    if (b.lexicalScore !== a.lexicalScore) {
      return b.lexicalScore - a.lexicalScore;
    }

    return b.semanticScore - a.semanticScore;
  });

  const ignoredChunks: IgnoredKnowledgeChunk[] = [];

  for (const item of sorted) {
    if (item.score < minScore) {
      ignoredChunks.push({
        id: item.id,
        score: item.score,
        reason: `score_below_threshold:${item.score.toFixed(3)}<${minScore.toFixed(3)}`,
        category: item.document.category,
      });
      continue;
    }

    if (lexicalEnabled && item.lexicalScore < minLexicalScore && retrievalStrategy !== "semantic_only") {
      ignoredChunks.push({
        id: item.id,
        score: item.score,
        reason: `lexical_below_threshold:${item.lexicalScore.toFixed(3)}<${minLexicalScore.toFixed(3)}`,
        category: item.document.category,
      });
      continue;
    }

    if (item.genericPenalty > 0 && options.intent && options.intent !== "faq_comercial") {
      ignoredChunks.push({
        id: item.id,
        score: item.score,
        reason: "generic_chunk_penalty",
        category: item.document.category,
      });
      continue;
    }
  }

  const filtered = sorted.filter(
    (item) =>
      item.score >= minScore &&
      (retrievalStrategy === "semantic_only" || item.lexicalScore >= minLexicalScore) &&
      !(item.genericPenalty > 0 && options.intent && options.intent !== "faq_comercial")
  );

  const hits = filtered.slice(0, effectiveTopK).map((item) => ({
    id: item.id,
    score: item.score,
    lexicalScore: item.lexicalScore,
    semanticScore: item.semanticScore,
    content: item.content,
    document: item.document,
  }));

  const categoryBoosts = filtered.slice(0, effectiveTopK).reduce<Record<string, number>>((acc, hit) => {
    const rankedHit = ranked.find((entry) => entry.id === hit.id);
    if (rankedHit) {
      acc[hit.id] = rankedHit.categoryBoost;
    }
    return acc;
  }, {});

  return {
    hits,
    debug: {
      retrievalStrategy,
      minScoreApplied: minScore,
      minLexicalApplied: minLexicalScore,
      selectedChunkIds: hits.map((hit) => hit.id),
      ignoredChunks: ignoredChunks.slice(0, 80),
      reranked: true,
      categoryBoosts,
      criticalTermHits: criticalTerms,
    },
  };
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
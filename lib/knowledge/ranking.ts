import {
  CoreIntent,
  IgnoredKnowledgeChunk,
  KnowledgeDebugTrace,
  KnowledgeHit,
} from "@/lib/ai/core-engine/types";

export type KnowledgeSearchOptions = {
  lexicalSearchEnabled?: boolean;
  localSemanticEnabled?: boolean;
  requiredCategories?: string[];
  includeGlobalScope?: boolean;
  intent?: CoreIntent;
  minScore?: number;
  minLexicalScore?: number;
  topK?: number;
};

export type KnowledgeCandidate = {
  id: string;
  content: string;
  document: {
    id: string;
    title: string;
    category: string;
  };
};

type RankedChunk = KnowledgeHit & {
  categoryBoost: number;
  lexicalBoost: number;
  genericPenalty: number;
  semanticFallbackUsed: boolean;
  criticalTermHits: string[];
};

export type KnowledgeSearchResult = {
  hits: KnowledgeHit[];
  debug: KnowledgeDebugTrace;
};

type SimilarityFns = {
  lexicalSimilarity: (query: string, content: string) => number;
  semanticSimilarity: (query: string, content: string) => number;
};

const GENERIC_CONTENT_PATTERNS = [
  "a identiq e uma plataforma",
  "nossa plataforma",
  "seguranca e eficiencia",
  "solucao completa",
  "atendimento premium",
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
  institucional_comercial: 0.12,
  faq_comercial: 0.1,
  suporte_operacional: 0.2,
  integracoes_api: 0.22,
  onboarding_kyc: 0.24,
  aml_compliance: 0.26,
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

function defaultLexicalSimilarity(query: string, content: string) {
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

function isCommercialIntent(intent: CoreIntent | undefined) {
  return intent === "faq_comercial" || intent === "institucional_comercial";
}

function matchesRequiredCategory(requiredCategories: string[], category: string) {
  if (!requiredCategories.length) {
    return true;
  }

  const normalizedCategory = normalizeText(category);
  return requiredCategories.some((required) => normalizedCategory.includes(normalizeText(required)));
}

function classifyIgnoredReason({
  score,
  minScore,
  lexicalScore,
  minLexicalScore,
  lexicalRequired,
  semanticFallbackAllowed,
  genericPenalty,
}: {
  score: number;
  minScore: number;
  lexicalScore: number;
  minLexicalScore: number;
  lexicalRequired: boolean;
  semanticFallbackAllowed: boolean;
  genericPenalty: number;
}) {
  if (score < minScore) {
    return `score_below_threshold:${score.toFixed(3)}<${minScore.toFixed(3)}`;
  }

  if (lexicalRequired && lexicalScore < minLexicalScore && !semanticFallbackAllowed) {
    return `lexical_below_threshold:${lexicalScore.toFixed(3)}<${minLexicalScore.toFixed(3)}`;
  }

  if (genericPenalty > 0) {
    return "generic_chunk_penalty";
  }

  return "filtered";
}

function passesFilters({
  item,
  minScore,
  minLexicalScore,
  retrievalStrategy,
  semanticFloor,
  categoryBoostFloor,
  enforceCategoryMatch,
}: {
  item: RankedChunk;
  minScore: number;
  minLexicalScore: number;
  retrievalStrategy: KnowledgeDebugTrace["retrievalStrategy"];
  semanticFloor: number;
  categoryBoostFloor: number;
  enforceCategoryMatch: boolean;
}) {
  if (item.score < minScore) {
    return false;
  }

  if (enforceCategoryMatch && item.categoryBoost <= 0) {
    return false;
  }

  const lexicalRequired = retrievalStrategy !== "semantic_only";
  const lexicalEnough = item.lexicalScore >= minLexicalScore;
  const semanticFallbackAllowed =
    retrievalStrategy !== "lexical_only" &&
    item.semanticScore >= semanticFloor &&
    item.categoryBoost >= categoryBoostFloor;

  if (lexicalRequired && !lexicalEnough && !semanticFallbackAllowed) {
    return false;
  }

  if (item.genericPenalty > 0) {
    return false;
  }

  return true;
}

export function rankKnowledgeCandidates({
  query,
  candidates,
  options,
  similarityFns,
}: {
  query: string;
  candidates: KnowledgeCandidate[];
  options: KnowledgeSearchOptions;
  similarityFns: SimilarityFns;
}): KnowledgeSearchResult {
  const lexicalEnabled = options.lexicalSearchEnabled ?? true;
  const localSemanticEnabled = options.localSemanticEnabled ?? true;
  const intent = options.intent;
  const requiredCategories = options.requiredCategories?.filter(Boolean) ?? [];
  const effectiveTopK = Math.max(1, Math.min(8, options.topK ?? 5));
  const commercialIntent = isCommercialIntent(intent);

  const defaultMinScore = intent ? INTENT_MIN_SCORE[intent] : 0.18;
  const minScore = options.minScore ?? defaultMinScore;
  const minLexicalScore = options.minLexicalScore ?? (commercialIntent ? 0.03 : 0.08);

  const retrievalStrategy: KnowledgeDebugTrace["retrievalStrategy"] =
    lexicalEnabled && localSemanticEnabled
      ? "hybrid"
      : lexicalEnabled
        ? "lexical_only"
        : "semantic_only";

  if (!candidates.length) {
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
        semanticFallbackChunkIds: [],
      },
    };
  }

  const criticalTerms = extractCriticalTerms(query);

  const ranked: RankedChunk[] = candidates.map((chunk) => {
    const lexicalScore = lexicalEnabled ? similarityFns.lexicalSimilarity(query, chunk.content) : 0;
    const semanticScore = localSemanticEnabled ? similarityFns.semanticSimilarity(query, chunk.content) : 0;

    const normalizedContent = normalizeText(chunk.content);
    const criticalTermHits = criticalTerms.filter((term) => normalizedContent.includes(term));
    const lexicalBoost = criticalTermHits.length ? Math.min(0.12, criticalTermHits.length * 0.03) : 0;
    const categoryBoost = resolveCategoryBoost(intent, chunk.document.category);

    const isGeneric = detectGenericChunk(chunk.content);
    const genericPenalty = isGeneric && criticalTerms.length > 0 && criticalTermHits.length === 0 ? 0.06 : 0;

    const baseScore =
      retrievalStrategy === "hybrid"
        ? 0.42 * lexicalScore + 0.58 * semanticScore
        : retrievalStrategy === "lexical_only"
          ? lexicalScore
          : semanticScore;

    const rerankScore = Math.max(0, Math.min(1, baseScore + lexicalBoost + categoryBoost - genericPenalty));

    return {
      id: chunk.id,
      score: Number(rerankScore.toFixed(6)),
      lexicalScore: Number(lexicalScore.toFixed(6)),
      semanticScore: Number(semanticScore.toFixed(6)),
      categoryBoost: Number(categoryBoost.toFixed(6)),
      semanticFallbackUsed: false,
      content: chunk.content,
      document: chunk.document,
      lexicalBoost,
      genericPenalty,
      criticalTermHits,
    };
  });

  const sorted = ranked.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (b.semanticScore !== a.semanticScore) {
      return b.semanticScore - a.semanticScore;
    }
    return b.lexicalScore - a.lexicalScore;
  });

  const ignoredChunks: IgnoredKnowledgeChunk[] = [];

  const pass1 = sorted.filter((item) => {
    const enforceCategoryMatch =
      requiredCategories.length > 0 && !matchesRequiredCategory(requiredCategories, item.document.category);
    const semanticFloor = commercialIntent ? 0.14 : 0.18;
    const categoryBoostFloor = commercialIntent ? 0.02 : 0.04;

    const lexicalRequired = retrievalStrategy !== "semantic_only";
    const lexicalEnough = item.lexicalScore >= minLexicalScore;
    const semanticFallbackAllowed =
      retrievalStrategy !== "lexical_only" &&
      item.semanticScore >= semanticFloor &&
      (commercialIntent || item.categoryBoost >= categoryBoostFloor);

    const accepted = passesFilters({
      item,
      minScore,
      minLexicalScore,
      retrievalStrategy,
      semanticFloor,
      categoryBoostFloor,
      enforceCategoryMatch,
    });

    if (!accepted) {
      ignoredChunks.push({
        id: item.id,
        score: item.score,
        reason: enforceCategoryMatch
          ? "category_mismatch"
          : classifyIgnoredReason({
              score: item.score,
              minScore,
              lexicalScore: item.lexicalScore,
              minLexicalScore,
              lexicalRequired,
              semanticFallbackAllowed,
              genericPenalty: item.genericPenalty,
            }),
        category: item.document.category,
      });
      return false;
    }

    if (lexicalRequired && !lexicalEnough && semanticFallbackAllowed) {
      item.semanticFallbackUsed = true;
    }

    return true;
  });

  let selected = pass1;
  let relaxedThresholdsApplied = false;
  let fallbackReason: string | undefined;

  if (!selected.length) {
    relaxedThresholdsApplied = true;
    const relaxedMinScore = commercialIntent ? minScore * 0.7 : minScore * 0.82;
    const relaxedMinLexical = commercialIntent ? minLexicalScore * 0.35 : minLexicalScore * 0.65;
    const semanticFloorRelaxed = commercialIntent ? 0.12 : 0.16;

    selected = sorted.filter((item) => {
      const enforceCategoryMatch =
        requiredCategories.length > 0 && !matchesRequiredCategory(requiredCategories, item.document.category);
      const accepted = passesFilters({
        item,
        minScore: relaxedMinScore,
        minLexicalScore: relaxedMinLexical,
        retrievalStrategy,
        semanticFloor: semanticFloorRelaxed,
        categoryBoostFloor: 0,
        enforceCategoryMatch,
      });

      if (accepted && retrievalStrategy !== "semantic_only" && item.lexicalScore < relaxedMinLexical) {
        item.semanticFallbackUsed = true;
      }

      return accepted;
    });

    fallbackReason = selected.length
      ? "thresholds_relaxed_to_preserve_useful_context"
      : "no_relevant_chunks_after_relaxation";
  }

  const hits = selected.slice(0, effectiveTopK).map((item) => ({
    id: item.id,
    score: item.score,
    lexicalScore: item.lexicalScore,
    semanticScore: item.semanticScore,
    categoryBoost: item.categoryBoost,
    semanticFallbackUsed: item.semanticFallbackUsed,
    content: item.content,
    document: item.document,
  }));

  const categoryBoosts = hits.reduce<Record<string, number>>((acc, hit) => {
    acc[hit.id] = hit.categoryBoost ?? 0;
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
      semanticFallbackChunkIds: hits.filter((hit) => hit.semanticFallbackUsed).map((hit) => hit.id),
      relaxedThresholdsApplied,
      fallbackReason,
    },
  };
}

export function rankKnowledgeCandidatesWithDefaults({
  query,
  candidates,
  options,
  semanticSimilarity,
}: {
  query: string;
  candidates: KnowledgeCandidate[];
  options: KnowledgeSearchOptions;
  semanticSimilarity: (query: string, content: string) => number;
}) {
  return rankKnowledgeCandidates({
    query,
    candidates,
    options,
    similarityFns: {
      lexicalSimilarity: defaultLexicalSimilarity,
      semanticSimilarity,
    },
  });
}
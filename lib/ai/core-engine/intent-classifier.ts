import "server-only";
import { getIntentContract, listIntentContracts } from "@/lib/ai/core-engine/intent-contracts";
import { CoreIntent, IntentClassification, RuntimeSwitches } from "@/lib/ai/core-engine/types";

type ScoredIntent = {
  intent: CoreIntent;
  score: number;
  matchedKeywords: string[];
  matchedPatterns: string[];
};

const OUT_OF_SCOPE_SIGNALS = [
  "horoscopo",
  "fofoca",
  "futebol",
  "loteria",
  "celebridade",
  "jogo de azar",
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferOutOfScope(text: string) {
  return OUT_OF_SCOPE_SIGNALS.some((signal) => text.includes(signal));
}

function scoreIntent(text: string, intent: CoreIntent): ScoredIntent | null {
  const contract = getIntentContract(intent);
  const matchedKeywords = new Set<string>();
  const matchedPatterns = new Set<string>();
  let score = 0;

  for (const keyword of contract.entryRules.keywords) {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword || !text.includes(normalizedKeyword)) {
      continue;
    }

    matchedKeywords.add(keyword);
    score += normalizedKeyword.includes(" ") ? 1.4 : 1;
  }

  for (const regex of contract.entryRules.regexes) {
    if (!regex.test(text)) {
      continue;
    }

    matchedPatterns.add(regex.source);
    score += 2.1;
  }

  if (score < contract.entryRules.minScore) {
    return null;
  }

  return {
    intent,
    score,
    matchedKeywords: [...matchedKeywords],
    matchedPatterns: [...matchedPatterns],
  };
}

function classifyAsFallback(runtime: RuntimeSwitches, confidence: number): IntentClassification {
  const contract = getIntentContract("faq_comercial");

  return {
    intent: "faq_comercial",
    confidence,
    criticality: contract.defaultCriticality,
    requiresHandoff: false,
    requiresRag: contract.entryRules.requiresRag,
    allowedResponseMode: runtime.strictTemplatesOnly ? "template_only" : contract.allowedResponseMode,
    matchedKeywords: [],
    matchedPatterns: [],
    reasoning: ["Fallback aplicado por baixa evidência de intenção específica."],
  };
}

export function classifyIntentLocally(input: string, runtime: RuntimeSwitches): IntentClassification {
  const text = normalizeText(input);

  if (!text) {
    return classifyAsFallback(runtime, 0.74);
  }

  if (inferOutOfScope(text)) {
    return {
      ...classifyAsFallback(runtime, 0.55),
      reasoning: ["Sinais fora de escopo detectados; resposta institucional neutra aplicada."],
    };
  }

  const scored = listIntentContracts()
    .map((contract) => scoreIntent(text, contract.intent))
    .filter((entry): entry is ScoredIntent => entry !== null)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) {
    return classifyAsFallback(runtime, 0.72);
  }

  const best = scored[0];
  const second = scored[1];
  const secondScore = second?.score ?? 0;
  const gap = Math.max(0, best.score - secondScore);
  const confidence = Number(Math.min(0.97, 0.45 + best.score / 11 + gap / 18).toFixed(2));

  const contract = getIntentContract(best.intent);
  const requiresHandoff =
    best.intent === "handoff_humano" ||
    (contract.defaultCriticality !== "LOW" && confidence < contract.handoffPolicy.requestContextMin);

  const reasoning = [
    `Intent detectada por score combinado: ${best.score.toFixed(2)}.`,
    `Gap competitivo: ${gap.toFixed(2)} contra segunda melhor hipótese.`,
  ];

  if (best.matchedKeywords.length) {
    reasoning.push(`Palavras-chave: ${best.matchedKeywords.join(", ")}.`);
  }

  if (best.matchedPatterns.length) {
    reasoning.push(`Padroes regex: ${best.matchedPatterns.join(", ")}.`);
  }

  return {
    intent: best.intent,
    confidence,
    criticality: contract.defaultCriticality,
    requiresHandoff,
    requiresRag: contract.entryRules.requiresRag,
    allowedResponseMode: runtime.strictTemplatesOnly ? "template_only" : contract.allowedResponseMode,
    matchedKeywords: best.matchedKeywords,
    matchedPatterns: best.matchedPatterns,
    reasoning,
  };
}
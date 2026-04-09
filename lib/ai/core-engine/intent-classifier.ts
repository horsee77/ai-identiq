import "server-only";
import { CoreIntent, IntentClassification, RuntimeSwitches } from "@/lib/ai/core-engine/types";

type IntentRule = {
  intent: CoreIntent;
  keywords: string[];
  weight: number;
  criticality: IntentClassification["criticality"];
  requiresRag: boolean;
  requiresHandoff?: boolean;
  allowedResponseMode: IntentClassification["allowedResponseMode"];
};

const INTENT_RULES: IntentRule[] = [
  {
    intent: "solicitar_humano",
    keywords: [
      "atendente",
      "humano",
      "especialista",
      "analista",
      "falar com pessoa",
      "falar com atendente",
      "quero falar com humano",
      "transferir atendimento",
      "me transfere",
    ],
    weight: 6,
    criticality: "HIGH",
    requiresRag: false,
    requiresHandoff: true,
    allowedResponseMode: "restricted",
  },
  {
    intent: "caso_critico",
    keywords: [
      "fraude",
      "urgente",
      "risco alto",
      "vazamento",
      "incidente",
      "suspeita grave",
      "vazou dado",
      "conta comprometida",
    ],
    weight: 6,
    criticality: "CRITICAL",
    requiresRag: true,
    requiresHandoff: true,
    allowedResponseMode: "restricted",
  },
  {
    intent: "validacao_documental",
    keywords: ["documento", "documental", "aprovar documento", "reprovar documento", "documentoscopia"],
    weight: 5,
    criticality: "HIGH",
    requiresRag: true,
    allowedResponseMode: "knowledge_composer",
  },
  {
    intent: "biometria",
    keywords: ["biometria", "face match", "selfie", "liveness", "prova de vida"],
    weight: 5,
    criticality: "HIGH",
    requiresRag: true,
    allowedResponseMode: "knowledge_composer",
  },
  {
    intent: "compliance",
    keywords: ["compliance", "regulatorio", "conformidade", "norma", "governanca", "lgpd"],
    weight: 5,
    criticality: "HIGH",
    requiresRag: true,
    allowedResponseMode: "knowledge_composer",
  },
  {
    intent: "aml",
    keywords: ["aml", "lavagem de dinheiro", "pep", "sancoes", "lista restritiva"],
    weight: 5,
    criticality: "HIGH",
    requiresRag: true,
    allowedResponseMode: "knowledge_composer",
  },
  {
    intent: "kyc",
    keywords: ["kyc", "conheca seu cliente", "know your customer"],
    weight: 4,
    criticality: "MEDIUM",
    requiresRag: true,
    allowedResponseMode: "knowledge_composer",
  },
  {
    intent: "onboarding",
    keywords: ["onboarding", "cadastro", "abertura de conta", "ativacao", "entrada de cliente"],
    weight: 4,
    criticality: "MEDIUM",
    requiresRag: true,
    allowedResponseMode: "knowledge_composer",
  },
  {
    intent: "suporte",
    keywords: ["erro", "bug", "suporte", "falha", "nao funciona", "instavel", "indisponivel"],
    weight: 4,
    criticality: "MEDIUM",
    requiresRag: true,
    allowedResponseMode: "knowledge_composer",
  },
  {
    intent: "integracao",
    keywords: ["api", "integracao", "webhook", "sdk", "endpoint", "payload", "token"],
    weight: 4,
    criticality: "MEDIUM",
    requiresRag: true,
    allowedResponseMode: "knowledge_composer",
  },
  {
    intent: "comercial",
    keywords: ["preco", "plano", "proposta", "comercial", "contrato", "cotacao", "orcamento"],
    weight: 3,
    criticality: "MEDIUM",
    requiresRag: false,
    allowedResponseMode: "template_only",
  },
  {
    intent: "institucional",
    keywords: [
      "identiq",
      "empresa",
      "institucional",
      "sobre voces",
      "sobre a identiq",
      "quem e a identiq",
      "o que a identiq faz",
      "conhece a identiq",
      "quem sao voces",
    ],
    weight: 3,
    criticality: "LOW",
    requiresRag: false,
    allowedResponseMode: "template_only",
  },
  {
    intent: "faq",
    keywords: ["faq", "pergunta frequente", "duvida comum", "como funciona"],
    weight: 2,
    criticality: "LOW",
    requiresRag: true,
    allowedResponseMode: "knowledge_composer",
  },
  {
    intent: "duvida_operacional",
    keywords: [
      "procedimento",
      "passo a passo",
      "operacional",
      "fluxo interno",
      "playbook",
      "treinar ia",
      "alimentar ia",
      "base de conhecimento",
      "upload de arquivo",
      "subir pdf",
      "subir foto",
      "documentacao interna",
    ],
    weight: 3,
    criticality: "MEDIUM",
    requiresRag: true,
    allowedResponseMode: "knowledge_composer",
  },
  {
    intent: "saudacao",
    keywords: ["ola", "bom dia", "boa tarde", "boa noite", "oi", "hello", "e ai"],
    weight: 2,
    criticality: "LOW",
    requiresRag: false,
    allowedResponseMode: "template_only",
  },
];

const GREETING_SIGNALS = ["ola", "oi", "bom dia", "boa tarde", "boa noite", "hello", "e ai"];
const INTRO_SIGNALS = ["me chamo", "meu nome e", "sou o", "sou a", "sou "];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function evaluateCriticality(intent: CoreIntent, confidence: number): IntentClassification["criticality"] {
  if (intent === "caso_critico") return "CRITICAL";
  if (intent === "solicitar_humano") return "HIGH";
  if (confidence >= 0.78) return "MEDIUM";
  return "LOW";
}

function inferOutOfScope(text: string) {
  const nonScopeSignals = ["loteria", "futebol", "piada", "fofoca", "celebridade", "horoscopo"];
  return nonScopeSignals.some((signal) => text.includes(signal));
}

function inferGreetingOrIntroduction(text: string) {
  const isGreeting = GREETING_SIGNALS.some((signal) => text.includes(signal));
  const hasIntro = INTRO_SIGNALS.some((signal) => text.includes(signal));
  const wordCount = text.split(" ").filter(Boolean).length;
  return (isGreeting || hasIntro) && wordCount <= 14;
}

export function classifyIntentLocally(
  input: string,
  runtime: RuntimeSwitches
): IntentClassification {
  const text = normalizeText(input);
  const matches: { intent: CoreIntent; score: number; keyword: string; rule: IntentRule }[] = [];

  for (const rule of INTENT_RULES) {
    for (const keyword of rule.keywords) {
      const normalizedKeyword = normalizeText(keyword);
      if (!normalizedKeyword) continue;
      if (text.includes(normalizedKeyword)) {
        const keywordWeight = normalizedKeyword.split(" ").length > 1 ? 1.4 : 1;
        matches.push({
          intent: rule.intent,
          score: rule.weight * keywordWeight,
          keyword,
          rule,
        });
      }
    }
  }

  if (inferOutOfScope(text)) {
    return {
      intent: "fora_de_escopo",
      confidence: 0.84,
      criticality: "LOW",
      requiresHandoff: false,
      requiresRag: false,
      allowedResponseMode: "restricted",
      matchedKeywords: [],
    };
  }

  if (!matches.length && inferGreetingOrIntroduction(text)) {
    return {
      intent: "saudacao",
      confidence: 0.86,
      criticality: "LOW",
      requiresHandoff: false,
      requiresRag: false,
      allowedResponseMode: "template_only",
      matchedKeywords: [],
    };
  }

  if (!matches.length) {
    return {
      intent: "faq",
      confidence: 0.5,
      criticality: "LOW",
      requiresHandoff: false,
      requiresRag: true,
      allowedResponseMode: runtime.strictTemplatesOnly ? "template_only" : "knowledge_composer",
      matchedKeywords: [],
    };
  }

  const grouped = new Map<CoreIntent, { score: number; rule: IntentRule; matchedKeywords: string[] }>();
  for (const entry of matches) {
    const current = grouped.get(entry.intent);
    if (!current) {
      grouped.set(entry.intent, {
        score: entry.score,
        rule: entry.rule,
        matchedKeywords: [entry.keyword],
      });
      continue;
    }

    current.score += entry.score;
    if (!current.matchedKeywords.includes(entry.keyword)) {
      current.matchedKeywords.push(entry.keyword);
    }
  }

  const ranked = [...grouped.entries()].sort((a, b) => b[1].score - a[1].score);
  const [bestIntent, bestData] = ranked[0];
  const secondScore = ranked[1]?.[1].score ?? 0;
  const relativeGap = Math.max(0, bestData.score - secondScore);
  const baseConfidence = Math.min(0.95, 0.45 + bestData.score / 15 + relativeGap / 20);
  const confidence = Number(baseConfidence.toFixed(2));

  const criticality =
    bestData.rule.criticality === "LOW"
      ? evaluateCriticality(bestIntent, confidence)
      : bestData.rule.criticality;

  return {
    intent: bestIntent,
    confidence,
    criticality,
    requiresHandoff:
      Boolean(bestData.rule.requiresHandoff) || confidence < 0.45 || bestIntent === "caso_critico",
    requiresRag: bestData.rule.requiresRag,
    allowedResponseMode: bestData.rule.allowedResponseMode,
    matchedKeywords: bestData.matchedKeywords,
  };
}

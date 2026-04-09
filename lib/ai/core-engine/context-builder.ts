import "server-only";

type BuildContextInput = {
  message: string;
  messages: { role: "system" | "user" | "assistant" | "tool"; content: string }[];
  agentName?: string;
};

export type BuiltContext = {
  latestUserMessage: string;
  conversationSummary: string;
  agentName: string;
  userName?: string;
};

const INTRO_PATTERNS = [
  /\bme chamo\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'\-]{1,29}(?:\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'\-]{1,29})?)/i,
  /\bmeu nome e\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'\-]{1,29}(?:\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'\-]{1,29})?)/i,
  /\bsou\s+o\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'\-]{1,29}(?:\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'\-]{1,29})?)/i,
  /\bsou\s+a\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'\-]{1,29}(?:\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'\-]{1,29})?)/i,
  /\bsou\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'\-]{1,29}(?:\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'\-]{1,29})?)/i,
];

const NAME_STOPWORDS = new Set([
  "analista",
  "cliente",
  "usuario",
  "visitante",
  "teste",
  "equipe",
  "identiq",
]);

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function toDisplayName(value: string) {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function sanitizeExtractedName(value: string) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return undefined;
  }

  const tokens = normalized
    .split(" ")
    .map((token) => token.replace(/[^A-Za-zÀ-ÿ'\-]/g, ""))
    .filter((token) => token.length >= 2 && token.length <= 24)
    .filter((token) => !NAME_STOPWORDS.has(token.toLowerCase()));

  if (!tokens.length) {
    return undefined;
  }

  return toDisplayName(tokens.slice(0, 2).join(" "));
}

function extractNameFromText(text: string) {
  for (const pattern of INTRO_PATTERNS) {
    const match = text.match(pattern);
    if (!match?.[1]) {
      continue;
    }
    const extracted = sanitizeExtractedName(match[1]);
    if (extracted) {
      return extracted;
    }
  }

  return undefined;
}

function extractUserName(input: BuildContextInput) {
  const direct = extractNameFromText(input.message);
  if (direct) {
    return direct;
  }

  const latestUserMessages = input.messages
    .filter((entry) => entry.role === "user")
    .map((entry) => entry.content)
    .slice(-5)
    .reverse();

  for (const message of latestUserMessages) {
    const extracted = extractNameFromText(message);
    if (extracted) {
      return extracted;
    }
  }

  return undefined;
}

function summarizeConversation(messages: { role: string; content: string }[]) {
  if (!messages.length) {
    return "";
  }

  const relevant = messages.slice(-4);
  return relevant
    .map((entry, index) => `${index + 1}. [${entry.role}] ${entry.content.slice(0, 220)}`)
    .join("\n");
}

export function buildContext(input: BuildContextInput): BuiltContext {
  return {
    latestUserMessage: input.message,
    conversationSummary: summarizeConversation(input.messages),
    agentName: input.agentName ?? "Agente Identiq",
    userName: extractUserName(input),
  };
}

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
};

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
  };
}

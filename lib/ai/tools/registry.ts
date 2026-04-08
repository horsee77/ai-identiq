import "server-only";
import { z } from "zod";
import { searchKnowledgeBase } from "@/lib/knowledge/service";
import { AI_RUNTIME_DEFAULTS } from "@/lib/ai/core-engine/config";
import { classifyIntentLocally } from "@/lib/ai/core-engine/intent-classifier";

const toolRegistry = {
  buscar_base_conhecimento: {
    description: "Busca local na base de conhecimento (lexical + semântica local).",
    inputSchema: z.object({
      query: z.string().min(2),
      tenantId: z.string().cuid(),
      topK: z.coerce.number().int().min(1).max(10).default(5),
    }),
    execute: async (input: { query: string; tenantId: string; topK: number }) => {
      return searchKnowledgeBase(input.tenantId, input.query, input.topK, {
        lexicalSearchEnabled: true,
        localSemanticEnabled: true,
      });
    },
  },
  classificar_intencao: {
    description: "Classificação local de intenção com taxonomia Identiq.",
    inputSchema: z.object({
      text: z.string().min(2),
    }),
    execute: async (input: { text: string }) => {
      const classification = classifyIntentLocally(input.text, AI_RUNTIME_DEFAULTS);
      return {
        intent: classification.intent,
        confidence: classification.confidence,
        criticality: classification.criticality,
        requires_handoff: classification.requiresHandoff,
        requires_rag: classification.requiresRag,
      };
    },
  },
} as const;

export type ToolName = keyof typeof toolRegistry;

export function getToolDefinition<TName extends ToolName>(name: TName) {
  return toolRegistry[name];
}


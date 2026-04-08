import "server-only";
import { prisma } from "@/lib/db/prisma";
import { createProviderFromDatabase } from "@/lib/ai/providers/factory";
import { generateLocalEmbeddings } from "@/lib/ai/embeddings/local-provider";

function normalizeVector(values: number[]): number[] {
  const magnitude = Math.sqrt(values.reduce((acc, value) => acc + value * value, 0));
  if (!magnitude) {
    return values;
  }
  return values.map((value) => value / magnitude);
}

export async function generateEmbeddings({
  providerId,
  model,
  input,
  preferLocal = false,
}: {
  providerId?: string;
  model?: string;
  input: string[];
  preferLocal?: boolean;
}) {
  if (preferLocal || !providerId) {
    return generateLocalEmbeddings(input);
  }

  const provider = await createProviderFromDatabase(providerId);
  if (!model) {
    throw new Error("Modelo de embedding ausente para provider remoto.");
  }
  const response = await provider.embeddings({ model, input });
  return response.vectors.map(normalizeVector);
}

export async function saveEmbeddingChunks({
  tenantId,
  documentId,
  chunks,
  embeddings,
}: {
  tenantId?: string;
  documentId: string;
  chunks: string[];
  embeddings: number[][];
}) {
  await prisma.$transaction(async (tx) => {
    await tx.knowledgeChunk.deleteMany({ where: { documentId } });

    for (const [index, chunk] of chunks.entries()) {
      await tx.knowledgeChunk.create({
        data: {
          tenantId,
          documentId,
          chunkIndex: index,
          content: chunk,
          tokenCount: chunk.split(/\s+/g).length,
          embedding: embeddings[index] ?? [],
        },
      });
    }
  });
}

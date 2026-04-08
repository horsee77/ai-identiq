import "server-only";
import { env } from "@/lib/env";

const DEFAULT_DIMENSIONS = env.AI_LOCAL_EMBEDDING_DIMENSIONS;

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fnv1a32(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function normalizeVector(vector: number[]) {
  const magnitude = Math.sqrt(vector.reduce((acc, value) => acc + value * value, 0));
  if (!magnitude) {
    return vector;
  }
  return vector.map((value) => value / magnitude);
}

export function generateLocalEmbedding(text: string, dimensions = DEFAULT_DIMENSIONS) {
  const vector = Array.from({ length: dimensions }, () => 0);
  const normalized = normalizeText(text);
  const tokens = normalized.split(" ").filter((token) => token.length > 1);

  for (const token of tokens) {
    const hash = fnv1a32(token);
    const index = hash % dimensions;
    const sign = (hash & 1) === 0 ? 1 : -1;
    const weight = 1 + Math.log10(token.length + 1);
    vector[index] += sign * weight;
  }

  return normalizeVector(vector);
}

export function generateLocalEmbeddings(input: string[], dimensions = DEFAULT_DIMENSIONS) {
  return input.map((text) => generateLocalEmbedding(text, dimensions));
}

export function cosineSimilarity(a: number[], b: number[]) {
  if (!a.length || !b.length || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    magnitudeA += a[index] * a[index];
    magnitudeB += b[index] * b[index];
  }

  if (!magnitudeA || !magnitudeB) {
    return 0;
  }

  return dot / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

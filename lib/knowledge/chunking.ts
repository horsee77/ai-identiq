export type ChunkOptions = {
  chunkSize: number;
  overlap: number;
};

export function chunkText(text: string, options: ChunkOptions): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!normalized) {
    return [];
  }

  const paragraphs = normalized.split(/\n\n+/g);
  const chunks: string[] = [];

  let currentChunk = "";

  for (const paragraph of paragraphs) {
    if ((currentChunk + "\n\n" + paragraph).length <= options.chunkSize) {
      currentChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;
      continue;
    }

    if (currentChunk) {
      chunks.push(currentChunk);
      const overlapSlice = currentChunk.slice(Math.max(0, currentChunk.length - options.overlap));
      currentChunk = overlapSlice ? `${overlapSlice}\n\n${paragraph}` : paragraph;
      continue;
    }

    const words = paragraph.split(/\s+/g);
    let sentenceChunk = "";

    for (const word of words) {
      if ((sentenceChunk + " " + word).length <= options.chunkSize) {
        sentenceChunk = sentenceChunk ? `${sentenceChunk} ${word}` : word;
      } else {
        chunks.push(sentenceChunk);
        const overlapSlice = sentenceChunk.slice(Math.max(0, sentenceChunk.length - options.overlap));
        sentenceChunk = overlapSlice ? `${overlapSlice} ${word}`.trim() : word;
      }
    }

    if (sentenceChunk) {
      chunks.push(sentenceChunk);
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.filter((chunk) => chunk.trim().length > 0);
}

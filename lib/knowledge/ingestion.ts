import "server-only";
import mammoth from "mammoth";

export async function extractTextFromBuffer(fileType: string, buffer: Buffer): Promise<string> {
  if (fileType.startsWith("image/")) {
    // OCR local pode ser acoplado no futuro; por enquanto imagens dependem de contexto manual complementar.
    return "";
  }

  if (fileType === "application/pdf") {
    const pdfModule = await import("pdf-parse");
    const parser = (pdfModule as unknown as { default?: (value: Buffer) => Promise<{ text: string }> }).default ??
      (pdfModule as unknown as (value: Buffer) => Promise<{ text: string }>);
    const result = await parser(buffer);
    return result.text;
  }

  if (
    fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileType === "application/msword"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  return buffer.toString("utf8");
}

export function normalizeExtractedText(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

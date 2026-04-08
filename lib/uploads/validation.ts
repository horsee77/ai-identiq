import { ApiError } from "@/lib/api/errors";

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const maxFileSizeBytes = 25 * 1024 * 1024;

export function validateUpload(file: File) {
  if (!allowedMimeTypes.has(file.type)) {
    throw new ApiError(
      "invalid_file_type",
      "Tipo de arquivo não permitido. Use PDF, DOCX, TXT, JPG, PNG ou WEBP.",
      422
    );
  }

  if (file.size > maxFileSizeBytes) {
    throw new ApiError("file_too_large", "Arquivo excede o limite de 25MB.", 422);
  }
}


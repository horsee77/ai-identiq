import { createHash } from "crypto";
import { z } from "zod";
import { type DataSensitivity, type DocumentVisibility } from "@prisma/client";
import { withApiHandler } from "@/lib/api/handler";
import { ok, fail } from "@/lib/api/response";
import { requireInternalPermission } from "@/lib/api/internal-auth";
import { prisma } from "@/lib/db/prisma";
import { knowledgeDocumentSchema } from "@/lib/schemas/knowledge";
import { extractTextFromBuffer, normalizeExtractedText } from "@/lib/knowledge/ingestion";
import { processDocumentEmbeddingJob } from "@/lib/knowledge/service";
import { persistUpload } from "@/lib/uploads/storage";
import { validateUpload } from "@/lib/uploads/validation";
import { writeAuditLog } from "@/lib/audit/service";

const knowledgeActionSchema = z.object({
  documentId: z.string().cuid(),
  action: z.enum(["APPROVE", "ARCHIVE", "INDEX"]),
  chunkSize: z.coerce.number().int().min(200).max(3000).default(800),
  overlap: z.coerce.number().int().min(0).max(600).default(120),
  providerId: z.string().cuid().optional(),
  embeddingModel: z.string().optional(),
  useLocal: z.boolean().default(true),
});

const allowedVisibility = new Set<DocumentVisibility>(["GLOBAL", "TENANT", "PRIVATE"]);
const allowedSensitivity = new Set<DataSensitivity>(["PUBLIC", "INTERNAL", "PII", "SENSITIVE", "BIOMETRIC"]);

function hasPermission(
  context: Awaited<ReturnType<typeof requireInternalPermission>>,
  permission: string
) {
  return context.isMasterAdmin || context.permissions.has(permission);
}

function toBoolean(value: FormDataEntryValue | null, fallback = false) {
  if (value === null) {
    return fallback;
  }
  const normalized = value.toString().trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "on" || normalized === "yes") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "off" || normalized === "no") {
    return false;
  }
  return fallback;
}

function toInteger(value: FormDataEntryValue | null, fallback: number) {
  if (value === null) {
    return fallback;
  }
  const parsed = Number(value.toString());
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.trunc(parsed);
}

function toVisibility(value: FormDataEntryValue | null): DocumentVisibility {
  const normalized = value?.toString() ?? "TENANT";
  return allowedVisibility.has(normalized as DocumentVisibility)
    ? (normalized as DocumentVisibility)
    : "TENANT";
}

function toSensitivity(value: FormDataEntryValue | null): DataSensitivity {
  const normalized = value?.toString() ?? "INTERNAL";
  return allowedSensitivity.has(normalized as DataSensitivity)
    ? (normalized as DataSensitivity)
    : "INTERNAL";
}

function parseTags(value: FormDataEntryValue | null) {
  if (!value) {
    return [];
  }
  return value
    .toString()
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function toSlug(value: string) {
  const normalized = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.length > 0 ? normalized : "documento";
}

async function runIndexing({
  context,
  documentId,
  providerId,
  embeddingModel,
  chunkSize,
  overlap,
}: {
  context: Awaited<ReturnType<typeof requireInternalPermission>>;
  documentId: string;
  providerId?: string;
  embeddingModel: string;
  chunkSize: number;
  overlap: number;
}) {
  await prisma.knowledgeDocument.update({
    where: { id: documentId },
    data: {
      status: "INDEXING",
    },
  });

  const job = await prisma.embeddingJob.create({
    data: {
      tenantId: context.tenantId,
      documentId,
      status: "PROCESSING",
      chunkSize,
      overlap,
      embeddingModel,
      strategy: providerId ? "provider_embeddings" : "local_embeddings",
      startedAt: new Date(),
    },
  });

  try {
    const result = await processDocumentEmbeddingJob({
      documentId,
      providerId,
      embeddingModel,
      chunkSize,
      overlap,
    });

    await prisma.embeddingJob.update({
      where: { id: job.id },
      data: {
        status: "INDEXED",
        finishedAt: new Date(),
      },
    });

    await writeAuditLog({
      tenantId: context.tenantId,
      userId: context.userId,
      action: "embedding.indexed",
      entityType: "EmbeddingJob",
      entityId: job.id,
      severity: "MEDIUM",
      message: `Documento indexado com ${result.chunks} chunks (${result.strategy}).`,
      metadata: {
        documentId,
        embeddingModel,
        chunkSize,
        overlap,
      },
    });

    return {
      success: true as const,
      jobId: job.id,
      chunks: result.chunks,
      strategy: result.strategy,
      embeddingModel,
    };
  } catch (error) {
    await prisma.embeddingJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Erro inesperado na indexação.",
        finishedAt: new Date(),
      },
    });

    await prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: {
        status: "FAILED",
      },
    });

    return {
      success: false as const,
      jobId: job.id,
      errorMessage: error instanceof Error ? error.message : "Erro inesperado na indexação.",
      embeddingModel,
    };
  }
}

export const GET = withApiHandler(async (_request, requestId) => {
  const context = await requireInternalPermission("knowledge.view");

  const documents = await prisma.knowledgeDocument.findMany({
    where: {
      OR: [{ tenantId: context.tenantId }, { tenantId: null }],
    },
    include: {
      embeddingJobs: {
        orderBy: { createdAt: "desc" },
        take: 3,
      },
      _count: {
        select: { chunks: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return ok(requestId, documents);
});

export const POST = withApiHandler(async (request, requestId) => {
  const context = await requireInternalPermission("knowledge.upload");
  const canApprove = hasPermission(context, "knowledge.approve");
  const canReindex =
    hasPermission(context, "knowledge.reindex") || hasPermission(context, "embeddings.manage");

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const title = formData.get("title")?.toString() ?? "Documento sem Título";
    const category = formData.get("category")?.toString() ?? "Operações";
    const description = formData.get("description")?.toString() ?? undefined;
    const language = formData.get("language")?.toString() ?? "pt-BR";
    const visibility = toVisibility(formData.get("visibility"));
    const sensitivity = toSensitivity(formData.get("sensitivity"));
    const source = formData.get("source")?.toString() ?? "upload";
    const tags = parseTags(formData.get("tags"));
    const supplementalContext = normalizeExtractedText(
      formData.get("supplementalContext")?.toString() ?? ""
    );
    const autoApprove = toBoolean(formData.get("autoApprove"), false);
    const autoIndex = toBoolean(formData.get("autoIndex"), false);
    const chunkSize = Math.max(200, Math.min(3000, toInteger(formData.get("chunkSize"), 800)));
    const overlap = Math.max(0, Math.min(600, toInteger(formData.get("overlap"), 120)));
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return fail(requestId, "invalid_file", "Arquivo não enviado.", 422);
    }

    if (autoApprove && !canApprove) {
      return fail(requestId, "forbidden", "Você não possui permissão para aprovar documentos.", 403);
    }

    if (autoIndex && !canReindex) {
      return fail(requestId, "forbidden", "Você não possui permissão para indexar documentos.", 403);
    }

    if (autoIndex && !autoApprove) {
      return fail(
        requestId,
        "invalid_workflow",
        "Para indexação automática, aprove o documento no mesmo envio.",
        422
      );
    }

    validateUpload(file);

    const buffer = Buffer.from(await file.arrayBuffer());
    const extracted = await extractTextFromBuffer(file.type, buffer);
    const normalized = normalizeExtractedText([extracted, supplementalContext].filter(Boolean).join("\n\n"));

    if (file.type.startsWith("image/") && normalized.length < 20) {
      return fail(
        requestId,
        "insufficient_image_context",
        "Para fotos, informe um contexto complementar com pelo menos 20 caracteres.",
        422
      );
    }

    const storagePath = await persistUpload(file.name, buffer);
    const hash = createHash("sha256").update(buffer).digest("hex");

    const document = await prisma.knowledgeDocument.create({
      data: {
        tenantId: context.tenantId,
        title,
        slug: `${toSlug(title)}-${Date.now()}`,
        category,
        description,
        tags,
        fileType: file.type,
        fileSize: file.size,
        language,
        visibility,
        sensitivity,
        status: autoApprove ? "APPROVED" : "PENDING_APPROVAL",
        approved: autoApprove,
        rawContent: extracted,
        processedContent: normalized,
        storagePath,
        fileHash: hash,
        uploadedById: context.userId,
        source,
        publishedAt: autoApprove ? new Date() : null,
        metadata: {
          supplementalContextProvided: supplementalContext.length > 0,
          uploadName: file.name,
        },
      },
    });

    let indexing:
      | {
          success: true;
          jobId: string;
          chunks: number;
          strategy: string;
          embeddingModel: string;
        }
      | {
          success: false;
          jobId: string;
          errorMessage: string;
          embeddingModel: string;
        }
      | null = null;

    if (autoIndex) {
      indexing = await runIndexing({
        context,
        documentId: document.id,
        providerId: undefined,
        embeddingModel: "local-embedding-v1",
        chunkSize,
        overlap,
      });
    }

    await writeAuditLog({
      tenantId: context.tenantId,
      userId: context.userId,
      action: "knowledge.uploaded",
      entityType: "KnowledgeDocument",
      entityId: document.id,
      severity: "HIGH",
      message: `Documento ${document.title} enviado para a central de treinamento.`,
      metadata: {
        autoApprove,
        autoIndex,
        tags,
        visibility,
        sensitivity,
      },
    });

    return ok(
      requestId,
      {
        document,
        indexing,
      },
      201
    );
  }

  const parsed = knowledgeDocumentSchema.safeParse(await request.json());
  if (!parsed.success) {
    return fail(requestId, "invalid_payload", "Dados de documento inválidos.", 422, parsed.error.flatten());
  }

  const payload = parsed.data;
  const autoApprove = payload.autoApprove ?? false;
  const autoIndex = payload.autoIndex ?? false;
  const chunkSize = payload.chunkSize ?? 800;
  const overlap = payload.overlap ?? 120;

  if (autoApprove && !canApprove) {
    return fail(requestId, "forbidden", "Você não possui permissão para aprovar documentos.", 403);
  }

  if (autoIndex && !canReindex) {
    return fail(requestId, "forbidden", "Você não possui permissão para indexar documentos.", 403);
  }

  if (autoIndex && !autoApprove) {
    return fail(
      requestId,
      "invalid_workflow",
      "Para indexação automática, aprove o documento no mesmo envio.",
      422
    );
  }

  const document = await prisma.knowledgeDocument.create({
    data: {
      tenantId: context.tenantId,
      title: payload.title,
      slug: payload.slug,
      category: payload.category,
      description: payload.description,
      tags: payload.tags ?? [],
      fileType: "text/manual",
      fileSize: payload.content.length,
      language: payload.language,
      visibility: payload.visibility,
      sensitivity: payload.sensitivity,
      status: autoApprove ? "APPROVED" : "PENDING_APPROVAL",
      approved: autoApprove,
      rawContent: payload.content,
      processedContent: payload.content,
      uploadedById: context.userId,
      source: payload.source ?? "manual",
      publishedAt: autoApprove ? new Date() : null,
    },
  });

  let indexing:
    | {
        success: true;
        jobId: string;
        chunks: number;
        strategy: string;
        embeddingModel: string;
      }
    | {
        success: false;
        jobId: string;
        errorMessage: string;
        embeddingModel: string;
      }
    | null = null;

  if (autoIndex) {
    indexing = await runIndexing({
      context,
      documentId: document.id,
      providerId: undefined,
      embeddingModel: "local-embedding-v1",
      chunkSize,
      overlap,
    });
  }

  await writeAuditLog({
    tenantId: context.tenantId,
    userId: context.userId,
    action: "knowledge.created",
    entityType: "KnowledgeDocument",
    entityId: document.id,
    severity: "HIGH",
    message: `Documento manual ${document.title} criado.`,
    metadata: {
      autoApprove,
      autoIndex,
      tags: payload.tags ?? [],
      visibility: payload.visibility,
      sensitivity: payload.sensitivity,
    },
  });

  return ok(
    requestId,
    {
      document,
      indexing,
    },
    201
  );
});

export const PATCH = withApiHandler(async (request, requestId) => {
  const parsed = knowledgeActionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return fail(requestId, "invalid_payload", "Dados de ação inválidos para documento.", 422, parsed.error.flatten());
  }

  const payload = parsed.data;
  const context = await requireInternalPermission("knowledge.view");

  const document = await prisma.knowledgeDocument.findFirst({
    where: {
      id: payload.documentId,
      OR: [{ tenantId: context.tenantId }, { tenantId: null }],
    },
  });

  if (!document) {
    return fail(requestId, "not_found", "Documento não encontrado no escopo do tenant.", 404);
  }

  if (payload.action === "APPROVE") {
    if (!hasPermission(context, "knowledge.approve")) {
      return fail(requestId, "forbidden", "Você não possui permissão para aprovar documentos.", 403);
    }

    const updated = await prisma.knowledgeDocument.update({
      where: { id: payload.documentId },
      data: {
        approved: true,
        status: "APPROVED",
        publishedAt: new Date(),
      },
    });

    await writeAuditLog({
      tenantId: context.tenantId,
      userId: context.userId,
      action: "knowledge.approved",
      entityType: "KnowledgeDocument",
      entityId: updated.id,
      severity: "HIGH",
      message: `Documento ${updated.title} aprovado para uso.`,
    });

    return ok(requestId, updated);
  }

  if (payload.action === "ARCHIVE") {
    if (!hasPermission(context, "knowledge.approve")) {
      return fail(requestId, "forbidden", "Você não possui permissão para arquivar documentos.", 403);
    }

    const updated = await prisma.knowledgeDocument.update({
      where: { id: payload.documentId },
      data: {
        status: "ARCHIVED",
        deletedAt: new Date(),
      },
    });

    await writeAuditLog({
      tenantId: context.tenantId,
      userId: context.userId,
      action: "knowledge.archived",
      entityType: "KnowledgeDocument",
      entityId: updated.id,
      severity: "HIGH",
      message: `Documento ${updated.title} arquivado.`,
    });

    return ok(requestId, updated);
  }

  if (!hasPermission(context, "knowledge.reindex") && !hasPermission(context, "embeddings.manage")) {
    return fail(requestId, "forbidden", "Você não possui permissão para indexar documentos.", 403);
  }

  if (!document.approved) {
    return fail(
      requestId,
      "document_not_approved",
      "Aprovação obrigatória antes de indexar. Aprove o documento e tente novamente.",
      422
    );
  }

  const embeddingModel = payload.embeddingModel ?? "local-embedding-v1";
  const providerId = payload.useLocal ? undefined : payload.providerId;

  const indexing = await runIndexing({
    context,
    documentId: payload.documentId,
    providerId,
    embeddingModel,
    chunkSize: payload.chunkSize,
    overlap: payload.overlap,
  });

  return ok(requestId, indexing);
});

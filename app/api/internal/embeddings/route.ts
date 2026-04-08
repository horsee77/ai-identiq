import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { ok, fail } from "@/lib/api/response";
import { requireInternalPermission } from "@/lib/api/internal-auth";
import { prisma } from "@/lib/db/prisma";
import { processDocumentEmbeddingJob } from "@/lib/knowledge/service";
import { writeAuditLog } from "@/lib/audit/service";

const embeddingRunSchema = z.object({
  documentId: z.string().cuid(),
  chunkSize: z.coerce.number().int().min(200).max(3000).default(800),
  overlap: z.coerce.number().int().min(0).max(600).default(120),
  providerId: z.string().cuid().optional(),
  embeddingModel: z.string().optional(),
  useLocal: z.boolean().optional(),
});

export const GET = withApiHandler(async (_request, requestId) => {
  const context = await requireInternalPermission("embeddings.view");

  const jobs = await prisma.embeddingJob.findMany({
    where: {
      OR: [{ tenantId: context.tenantId }, { tenantId: null }],
    },
    include: {
      document: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return ok(requestId, jobs);
});

export const POST = withApiHandler(async (request, requestId) => {
  const context = await requireInternalPermission("embeddings.manage");
  const parsed = embeddingRunSchema.safeParse(await request.json());

  if (!parsed.success) {
    return fail(requestId, "invalid_payload", "Dados inválidos para indexação.", 422, parsed.error.flatten());
  }

  const payload = parsed.data;

  const provider = payload.useLocal
    ? null
    : payload.providerId
      ? await prisma.provider.findUnique({ where: { id: payload.providerId } })
      : await prisma.provider.findFirst({
          where: {
            OR: [{ tenantId: context.tenantId }, { tenantId: null }],
            supportsEmbeddings: true,
            status: "ACTIVE",
          },
          orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        });

  const remoteModel = payload.embeddingModel
    ? payload.embeddingModel
    : (
        await prisma.model.findFirst({
          where: {
            providerId: provider?.id,
            supportsEmbeddings: true,
            isActive: true,
          },
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        })
      )?.technicalName;

  const useLocalEmbeddings = payload.useLocal || !provider || !remoteModel;
  const embeddingModel = useLocalEmbeddings ? "local-embedding-v1" : remoteModel ?? "local-embedding-v1";

  const job = await prisma.embeddingJob.create({
    data: {
      tenantId: context.tenantId,
      documentId: payload.documentId,
      status: "PROCESSING",
      chunkSize: payload.chunkSize,
      overlap: payload.overlap,
      embeddingModel,
      startedAt: new Date(),
    },
  });

  try {
    const result = await processDocumentEmbeddingJob({
      documentId: payload.documentId,
      providerId: useLocalEmbeddings ? undefined : provider?.id,
      embeddingModel,
      chunkSize: payload.chunkSize,
      overlap: payload.overlap,
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
    });

    return ok(requestId, {
      jobId: job.id,
      ...result,
    });
  } catch (error) {
    await prisma.embeddingJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Erro inesperado",
        finishedAt: new Date(),
      },
    });

    throw error;
  }
});


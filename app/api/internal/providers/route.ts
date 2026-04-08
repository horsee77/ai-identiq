import { withApiHandler } from "@/lib/api/handler";
import { ok, fail } from "@/lib/api/response";
import { requireInternalPermission } from "@/lib/api/internal-auth";
import { prisma } from "@/lib/db/prisma";
import { providerSchema } from "@/lib/schemas/providers";
import { encryptSecret } from "@/lib/security/encryption";
import { writeAuditLog } from "@/lib/audit/service";

export const GET = withApiHandler(async (_request, requestId) => {
  const context = await requireInternalPermission("providers.view");
  const providers = await prisma.provider.findMany({
    where: {
      OR: [{ tenantId: context.tenantId }, { tenantId: null }],
    },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });

  return ok(requestId, providers);
});

export const POST = withApiHandler(async (request, requestId) => {
  const context = await requireInternalPermission("providers.manage");
  const parsed = providerSchema.safeParse(await request.json());

  if (!parsed.success) {
    return fail(requestId, "invalid_payload", "Dados de provider inválidos.", 422, parsed.error.flatten());
  }

  const payload = parsed.data;

  const provider = await prisma.provider.create({
    data: {
      tenantId: context.tenantId,
      name: payload.name,
      slug: payload.slug,
      baseUrl: payload.baseUrl,
      type: payload.type,
      apiKeyEncrypted: encryptSecret(payload.apiKey),
      apiKeyHint: `****${payload.apiKey.slice(-4)}`,
      timeoutMs: payload.timeoutMs,
      supportsEmbeddings: true,
      supportsChat: true,
      supportsResponses: true,
      supportsTools: true,
      supportsStreaming: true,
    },
  });

  await writeAuditLog({
    tenantId: context.tenantId,
    userId: context.userId,
    action: "provider.created",
    entityType: "Provider",
    entityId: provider.id,
    severity: "HIGH",
    message: `Provider ${provider.name} cadastrado.`,
  });

  return ok(requestId, provider, 201);
});


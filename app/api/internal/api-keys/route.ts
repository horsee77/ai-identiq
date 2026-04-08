import { randomBytes } from "crypto";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { ok, fail } from "@/lib/api/response";
import { requireInternalPermission } from "@/lib/api/internal-auth";
import { prisma } from "@/lib/db/prisma";
import { apiKeyCreateSchema } from "@/lib/schemas/api-keys";
import { hashApiKey, maskApiKey } from "@/lib/security/api-key";
import { writeAuditLog } from "@/lib/audit/service";

const revokeSchema = z.object({
  apiKeyId: z.string().cuid(),
});

export const GET = withApiHandler(async (_request, requestId) => {
  const context = await requireInternalPermission("apikeys.view");

  const apiKeys = await prisma.apiKey.findMany({
    where: { tenantId: context.tenantId },
    orderBy: { createdAt: "desc" },
  });

  return ok(
    requestId,
    apiKeys.map((entry) => ({
      ...entry,
      keyHash: undefined,
      masked: `${entry.prefix}...`,
    }))
  );
});

export const POST = withApiHandler(async (request, requestId) => {
  const context = await requireInternalPermission("apikeys.create");
  const parsed = apiKeyCreateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return fail(requestId, "invalid_payload", "Dados inválidos para criação da API key.", 422, parsed.error.flatten());
  }

  const rawSecret = `idq_${randomBytes(24).toString("base64url")}`;
  const prefix = rawSecret.slice(0, 10);
  const keyHash = hashApiKey(rawSecret);

  const apiKey = await prisma.apiKey.create({
    data: {
      tenantId: context.tenantId,
      name: parsed.data.name,
      prefix,
      keyHash,
      scopes: parsed.data.scopes,
      environment: parsed.data.environment,
      monthlyRequestLimit: parsed.data.monthlyRequestLimit,
      monthlyCostLimitUsd: parsed.data.monthlyCostLimitUsd,
      notes: parsed.data.notes,
      status: "ACTIVE",
    },
  });

  await writeAuditLog({
    tenantId: context.tenantId,
    userId: context.userId,
    action: "api_key.created",
    entityType: "ApiKey",
    entityId: apiKey.id,
    severity: "HIGH",
    message: `Nova API key criada (${apiKey.name}).`,
  });

  return ok(
    requestId,
    {
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      key: rawSecret,
      masked: maskApiKey(rawSecret),
      createdAt: apiKey.createdAt,
    },
    201
  );
});

export const DELETE = withApiHandler(async (request, requestId) => {
  const context = await requireInternalPermission("apikeys.revoke");
  const parsed = revokeSchema.safeParse(await request.json());

  if (!parsed.success) {
    return fail(requestId, "invalid_payload", "ID da API key inválido.", 422, parsed.error.flatten());
  }

  const apiKey = await prisma.apiKey.findFirst({
    where: {
      id: parsed.data.apiKeyId,
      tenantId: context.tenantId,
    },
  });

  if (!apiKey) {
    return fail(requestId, "not_found", "API key não encontrada para o tenant informado.", 404);
  }

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
    },
  });

  await writeAuditLog({
    tenantId: context.tenantId,
    userId: context.userId,
    action: "api_key.revoked",
    entityType: "ApiKey",
    entityId: apiKey.id,
    severity: "HIGH",
    message: `API key ${apiKey.name} revogada.`,
  });

  return ok(requestId, { revoked: true, id: apiKey.id });
});


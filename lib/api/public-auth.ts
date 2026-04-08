import "server-only";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/api/errors";
import { hashApiKey } from "@/lib/security/api-key";

export type PublicApiContext = {
  tenantId: string;
  apiKeyId: string;
  scopes: string[];
  environment: "development" | "staging" | "production";
  apiKeyName: string;
  apiKeyPrefix: string;
};

export function extractApiKeyFromRequest(request: NextRequest) {
  const bearer = request.headers.get("authorization");
  if (bearer?.startsWith("Bearer ")) {
    return bearer.replace("Bearer ", "").trim();
  }

  const rawHeader = request.headers.get("x-api-key");
  if (rawHeader?.trim()) {
    return rawHeader.trim();
  }

  return null;
}

export async function authenticatePublicApiRequest(request: NextRequest): Promise<PublicApiContext> {
  const rawApiKey = extractApiKeyFromRequest(request);
  if (!rawApiKey) {
    throw new ApiError(
      "api_key_required",
      "Informe sua API key em Authorization: Bearer <key> ou no header x-api-key.",
      401,
      {
        acceptedHeaders: ["Authorization", "x-api-key"],
      }
    );
  }

  if (rawApiKey.length < 16) {
    throw new ApiError("invalid_api_key_format", "Formato de API key inválido.", 401);
  }

  const keyHash = hashApiKey(rawApiKey);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { tenant: true },
  });

  if (!apiKey || apiKey.status !== "ACTIVE") {
    throw new ApiError("forbidden", "A chave de API foi revogada ou não existe.", 403);
  }

  if (apiKey.tenant.status !== "ACTIVE") {
    throw new ApiError("tenant_blocked", "O tenant está bloqueado para consumo de API.", 403);
  }

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    tenantId: apiKey.tenantId,
    apiKeyId: apiKey.id,
    environment: (apiKey.environment as "development" | "staging" | "production") ?? "production",
    apiKeyName: apiKey.name,
    apiKeyPrefix: apiKey.prefix,
    scopes: Array.isArray(apiKey.scopes)
      ? apiKey.scopes.filter((scope: unknown): scope is string => typeof scope === "string")
      : [],
  };
}

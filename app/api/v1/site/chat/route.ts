import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { ok, fail } from "@/lib/api/response";
import { ApiError, isApiError } from "@/lib/api/errors";
import { getOrCreateRequestId } from "@/lib/api/request-id";
import { withCorsHeaders, createPreflightResponse } from "@/lib/api/cors";
import {
  authenticatePublicApiRequest,
  extractApiKeyFromRequest,
  type PublicApiContext,
} from "@/lib/api/public-auth";
import { assertQuota, assertRateLimit } from "@/lib/api/public-usage";
import { getSiteWidgetSettings, isOriginAllowed } from "@/lib/settings/site-widget";
import { runInference } from "@/lib/ai/runtime";
import { prisma } from "@/lib/db/prisma";

const siteChatSchema = z.object({
  session_id: z.string().min(6).max(120).optional(),
  message: z.string().min(1).max(8000),
  agent_id: z.string().cuid().optional(),
  model: z.string().optional(),
  temperature: z.coerce.number().min(0).max(2).optional(),
  max_tokens: z.coerce.number().int().positive().max(4000).optional(),
  use_rag: z.boolean().optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  visitor: z
    .object({
      id: z.string().max(120).optional(),
      name: z.string().max(200).optional(),
      email: z.string().email().optional(),
    })
    .optional(),
});

function hasAnyScope(scopes: string[], requiredScopes: string[]) {
  return requiredScopes.some((scope) => scopes.includes(scope)) || scopes.includes("*") || scopes.includes("all");
}

function isLocalOrigin(origin: string | null) {
  if (!origin) {
    return false;
  }

  try {
    const url = new URL(origin);
    return ["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function assertApiKeyEnvironmentCompatibility({
  apiContext,
  origin,
}: {
  apiContext: PublicApiContext;
  origin: string | null;
}) {
  if (!origin) {
    return;
  }

  if (apiContext.environment === "production" && isLocalOrigin(origin)) {
    throw new ApiError(
      "api_key_environment_mismatch",
      "Esta API key está em produção e não pode ser usada em origem local.",
      403
    );
  }

  if (apiContext.environment === "development" && !isLocalOrigin(origin)) {
    throw new ApiError(
      "api_key_environment_mismatch",
      "Esta API key de desenvolvimento só pode ser usada em origem local.",
      403
    );
  }
}

function withReflectedCors(response: NextResponse, origin: string | null) {
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }
  response.headers.set("Vary", "Origin");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-API-Key, X-Client-Session");
  response.headers.set("Access-Control-Max-Age", "600");
  return response;
}

function buildApiKeyRequiredResponse({
  requestId,
  origin,
}: {
  requestId: string;
  origin: string | null;
}) {
  const response = fail(
    requestId,
    "api_key_required",
    "Para usar o chat do site, informe uma API key em Authorization: Bearer <key> ou x-api-key.",
    401,
    {
      required: true,
      acceptedHeaders: ["Authorization", "x-api-key"],
    }
  );
  response.headers.set("WWW-Authenticate", 'Bearer realm="Identiq API", charset="UTF-8"');
  return withReflectedCors(response, origin);
}

export const OPTIONS = async (request: NextRequest) => {
  return createPreflightResponse(request.headers.get("origin"));
};

export async function POST(request: NextRequest) {
  const requestId = getOrCreateRequestId(request);
  const origin = request.headers.get("origin");

  try {
    if (!extractApiKeyFromRequest(request)) {
      return buildApiKeyRequiredResponse({ requestId, origin });
    }

    const apiContext = await authenticatePublicApiRequest(request);
    const settings = await getSiteWidgetSettings(apiContext.tenantId);
    const applyKnownCors = (response: NextResponse) =>
      withCorsHeaders({ response, origin, allowedOrigins: settings.allowedOrigins });

    if (!settings.enabled) {
      return applyKnownCors(
        fail(
          requestId,
          "site_widget_disabled",
          "O motor de resposta do site está desabilitado para este tenant.",
          403
        )
      );
    }

    if (!isOriginAllowed(origin, settings.allowedOrigins)) {
      return applyKnownCors(
        fail(
          requestId,
          "origin_not_allowed",
          "Origem não autorizada para consumo do motor de resposta do site.",
          403
        )
      );
    }

    assertApiKeyEnvironmentCompatibility({ apiContext, origin });

    if (!hasAnyScope(apiContext.scopes, ["site:chat", "chat:completions", "responses:create"])) {
      return applyKnownCors(
        fail(
          requestId,
          "forbidden_scope",
          "A chave não possui escopo para chat do site. Use site:chat, chat:completions ou responses:create.",
          403
        )
      );
    }

    const parsed = siteChatSchema.safeParse(await request.json());
    if (!parsed.success) {
      return applyKnownCors(
        fail(requestId, "invalid_payload", "Payload inválido para /site/chat.", 422, parsed.error.flatten())
      );
    }

    const payload = parsed.data;
    const sessionId =
      payload.session_id ??
      request.headers.get("x-client-session")?.trim() ??
      `site_${nanoid(18)}`;

    assertRateLimit(`site:${apiContext.apiKeyId}:${sessionId}`);
    await assertQuota(apiContext.tenantId, apiContext.apiKeyId);

    if (!settings.allowAnonymous && !payload.visitor?.id && !payload.visitor?.email) {
      return applyKnownCors(
        fail(
          requestId,
          "visitor_identity_required",
          "Este tenant exige identificação do visitante para responder no site.",
          422
        )
      );
    }

    let resolvedAgentId = payload.agent_id ?? settings.defaultAgentId;

    if (!resolvedAgentId) {
      const fallbackAgent = await prisma.agent.findFirst({
        where: {
          OR: [{ tenantId: apiContext.tenantId }, { tenantId: null }],
          status: "ACTIVE",
        },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });
      resolvedAgentId = fallbackAgent?.id;
    }

    const result = await runInference({
      tenantId: apiContext.tenantId,
      requestId,
      endpoint: "/api/v1/site/chat",
      channel: "WEB_CHAT",
      requestMetadata: {
        siteSessionId: sessionId,
        origin,
        referer: request.headers.get("referer"),
        userAgent: request.headers.get("user-agent"),
        visitor: payload.visitor,
        metadata: payload.metadata,
      },
      message: payload.message,
      messages: [{ role: "user", content: payload.message }],
      model: payload.model,
      agentId: resolvedAgentId,
      temperature: payload.temperature,
      maxTokens: payload.max_tokens,
      useRag: payload.use_rag ?? true,
      apiKeyId: apiContext.apiKeyId,
    });

    return applyKnownCors(
      ok(requestId, {
        session_id: sessionId,
        conversation_id: result.conversationId,
        message: {
          role: "assistant",
          content: result.content,
        },
        handoff: {
          triggered: result.handoff.shouldHandoff,
          reason: result.handoff.reason,
          queue: result.handoff.queueName,
        },
        usage: {
          input_tokens: result.inputTokens,
          output_tokens: result.outputTokens,
          total_tokens: result.inputTokens + result.outputTokens,
          latency_ms: result.latencyMs,
          cost_usd: result.totalCost,
        },
        auth: {
          api_key_prefix: apiContext.apiKeyPrefix,
          environment: apiContext.environment,
        },
        engine: result.engine,
      })
    );
  } catch (error) {
    if (isApiError(error)) {
      return withReflectedCors(
        fail(requestId, error.code, error.message, error.status, error.details),
        origin
      );
    }

    const message = error instanceof Error ? error.message : "Erro interno inesperado.";
    return withReflectedCors(fail(requestId, "internal_error", message, 500), origin);
  }
}

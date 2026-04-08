import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { loginSchema } from "@/lib/schemas/auth";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { ok, fail } from "@/lib/api/response";
import { getOrCreateRequestId } from "@/lib/api/request-id";
import { rateLimit } from "@/lib/api/rate-limit";
import { env } from "@/lib/env";
import { writeAuditLog } from "@/lib/audit/service";

export async function POST(request: NextRequest) {
  const requestId = getOrCreateRequestId(request);
  const ipAddress = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "local";

  const limiter = rateLimit(`auth:login:${ipAddress}`, 8, env.RATE_LIMIT_WINDOW_SECONDS);
  if (!limiter.allowed) {
    return fail(requestId, "too_many_requests", "Muitas tentativas. Aguarde e tente novamente.", 429);
  }

  const parsedBody = loginSchema.safeParse(await request.json());
  if (!parsedBody.success) {
    return fail(requestId, "invalid_payload", "Dados de autenticação inválidos.", 422, parsedBody.error.flatten());
  }

  const { email, password } = parsedBody.data;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        include: {
          tenant: true,
          role: true,
        },
      },
    },
  });

  if (!user) {
    return fail(requestId, "invalid_credentials", "Email ou senha inválidos.", 401);
  }

  if (user.status !== "ACTIVE") {
    await writeAuditLog({
      userId: user.id,
      action: "auth.login_denied",
      entityType: "User",
      entityId: user.id,
      severity: "HIGH",
      message: "Tentativa de login em conta inativa.",
      ipAddress,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return fail(requestId, "user_inactive", "Sua conta está inativa. Contate o administrador.", 403);
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: { increment: 1 },
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "auth.login_failed",
      entityType: "User",
      entityId: user.id,
      severity: "MEDIUM",
      message: "Falha de autenticação por senha inválida.",
      ipAddress,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return fail(requestId, "invalid_credentials", "Email ou senha inválidos.", 401);
  }

  await createSession(user.id, ipAddress, request.headers.get("user-agent") ?? undefined);

  const preferredMembership =
    user.memberships.find((membership) => membership.isDefault) ?? user.memberships[0] ?? null;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lastLoginAt: new Date(),
    },
  });

  await writeAuditLog({
    userId: user.id,
    tenantId: preferredMembership?.tenantId,
    action: "auth.login_success",
    entityType: "User",
    entityId: user.id,
    severity: "LOW",
    message: "Login realizado com sucesso.",
    ipAddress,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return ok(requestId, {
    user: {
      id: user.id,
      email: user.email,
      name: user.fullName,
    },
    tenant: preferredMembership
      ? {
          id: preferredMembership.tenantId,
          name: preferredMembership.tenant.name,
          role: preferredMembership.role.code,
        }
      : null,
  });
}


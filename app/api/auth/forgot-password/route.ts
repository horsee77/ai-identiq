import { addMinutes, isBefore } from "date-fns";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/schemas/auth";
import { getOrCreateRequestId } from "@/lib/api/request-id";
import { ok, fail } from "@/lib/api/response";
import { env } from "@/lib/env";
import { hashToken, randomToken } from "@/lib/security/token";
import { hashPassword } from "@/lib/auth/password";
import { validatePasswordPolicy } from "@/lib/security/password-policy";
import { writeAuditLog } from "@/lib/audit/service";

export async function POST(request: NextRequest) {
  const requestId = getOrCreateRequestId(request);
  const parsedBody = forgotPasswordSchema.safeParse(await request.json());

  if (!parsedBody.success) {
    return fail(requestId, "invalid_payload", "Email inválido.", 422, parsedBody.error.flatten());
  }

  const email = parsedBody.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.status !== "ACTIVE") {
    return ok(requestId, { accepted: true });
  }

  const rawToken = randomToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = addMinutes(new Date(), env.PASSWORD_RESET_TTL_MINUTES);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "auth.password_reset_requested",
    entityType: "PasswordResetToken",
    severity: "MEDIUM",
    message: "Solicitação de redefinição de senha criada.",
    metadata: {
      expiresAt,
      debugResetUrl: `${env.APP_URL}/redefinir-senha?token=${rawToken}`,
    },
  });

  return ok(requestId, {
    accepted: true,
    message: "Solicitação processada.",
  });
}

export async function PATCH(request: NextRequest) {
  const requestId = getOrCreateRequestId(request);
  const parsedBody = resetPasswordSchema.safeParse(await request.json());

  if (!parsedBody.success) {
    return fail(requestId, "invalid_payload", "Dados inválidos para redefinição.", 422, parsedBody.error.flatten());
  }

  const { token, password } = parsedBody.data;
  const policy = validatePasswordPolicy(password);
  if (!policy.valid) {
    return fail(requestId, "password_policy_failed", policy.message ?? "Senha inválida.", 422);
  }

  const tokenHash = hashToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!resetToken || resetToken.usedAt || isBefore(resetToken.expiresAt, new Date())) {
    return fail(requestId, "invalid_token", "Token inválido ou expirado.", 410);
  }

  const nextPasswordHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash: nextPasswordHash,
        lastPasswordChangeAt: new Date(),
      },
    });

    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: {
        usedAt: new Date(),
      },
    });

    await tx.session.updateMany({
      where: { userId: resetToken.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });

  await writeAuditLog({
    userId: resetToken.userId,
    action: "auth.password_reset_completed",
    entityType: "User",
    entityId: resetToken.userId,
    severity: "MEDIUM",
    message: "Senha redefinida com sucesso.",
  });

  return ok(requestId, {
    message: "Senha redefinida com sucesso.",
  });
}


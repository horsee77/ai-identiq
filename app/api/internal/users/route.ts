import { withApiHandler } from "@/lib/api/handler";
import { ok, fail } from "@/lib/api/response";
import { requireInternalPermission } from "@/lib/api/internal-auth";
import { prisma } from "@/lib/db/prisma";
import { userCreateSchema } from "@/lib/schemas/users";
import { hashPassword } from "@/lib/auth/password";
import { validatePasswordPolicy } from "@/lib/security/password-policy";
import { writeAuditLog } from "@/lib/audit/service";

export const GET = withApiHandler(async (_request, requestId) => {
  const context = await requireInternalPermission("users.view");

  const users = await prisma.user.findMany({
    where: {
      memberships: {
        some: {
          tenantId: context.tenantId,
        },
      },
    },
    include: {
      memberships: {
        where: { tenantId: context.tenantId },
        include: {
          role: true,
          tenant: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(requestId, users);
});

export const POST = withApiHandler(async (request, requestId) => {
  const context = await requireInternalPermission("users.create");
  const parsed = userCreateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return fail(requestId, "invalid_payload", "Dados inválidos para criação de usuário.", 422, parsed.error.flatten());
  }

  const policy = validatePasswordPolicy(parsed.data.password);
  if (!policy.valid) {
    return fail(requestId, "password_policy_failed", policy.message ?? "Senha inválida.", 422);
  }

  const tenantId = parsed.data.tenantId ?? context.tenantId;
  const passwordHash = await hashPassword(parsed.data.password);

  const user = await prisma.user.create({
    data: {
      fullName: parsed.data.fullName,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      status: parsed.data.status,
      memberships: {
        create: {
          tenantId,
          roleId: parsed.data.roleId,
          status: "ACTIVE",
        },
      },
    },
  });

  await writeAuditLog({
    userId: context.userId,
    tenantId,
    action: "user.created",
    entityType: "User",
    entityId: user.id,
    severity: "HIGH",
    message: `Usuário ${user.email} criado por ${context.name}.`,
  });

  return ok(requestId, user, 201);
});


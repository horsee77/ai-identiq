import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionContext, setActiveTenant } from "@/lib/auth/access";
import { getOrCreateRequestId } from "@/lib/api/request-id";
import { ok, fail } from "@/lib/api/response";

const sessionPatchSchema = z.object({
  tenantId: z.string().cuid(),
});

export async function GET(request: NextRequest) {
  const requestId = getOrCreateRequestId(request);
  const context = await getSessionContext();

  if (!context) {
    return fail(requestId, "unauthorized", "Sessão expirada.", 401);
  }

  return ok(requestId, {
    user: {
      id: context.userId,
      name: context.name,
      email: context.email,
      role: context.role,
    },
    tenantId: context.tenantId,
    memberships: context.memberships,
  });
}

export async function PATCH(request: NextRequest) {
  const requestId = getOrCreateRequestId(request);
  const context = await getSessionContext();

  if (!context) {
    return fail(requestId, "unauthorized", "Sessão expirada.", 401);
  }

  const parsed = sessionPatchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return fail(requestId, "invalid_payload", "Tenant inválido.", 422, parsed.error.flatten());
  }

  const allowed = context.memberships.some((membership) => membership.tenantId === parsed.data.tenantId);
  if (!allowed) {
    return fail(requestId, "forbidden", "Você não possui vínculo com esse tenant.", 403);
  }

  await setActiveTenant(parsed.data.tenantId);

  return ok(requestId, { tenantId: parsed.data.tenantId });
}


import { NextRequest } from "next/server";
import { getOrCreateRequestId } from "@/lib/api/request-id";
import { ok, fail } from "@/lib/api/response";
import { destroySession, getSessionFromCookie } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/service";

export async function POST(request: NextRequest) {
  const requestId = getOrCreateRequestId(request);
  const session = await getSessionFromCookie();

  if (!session) {
    return fail(requestId, "invalid_session", "Nenhuma Sessão ativa encontrada.", 401);
  }

  await destroySession();

  await writeAuditLog({
    userId: session.userId,
    action: "auth.logout",
    entityType: "Session",
    entityId: session.id,
    severity: "LOW",
    message: "Logout executado com sucesso.",
    tenantId: session.user.memberships[0]?.tenantId,
    ipAddress: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "local",
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return ok(requestId, { message: "Sessão encerrada com sucesso." });
}


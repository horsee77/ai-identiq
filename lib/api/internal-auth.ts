import "server-only";
import { ApiError } from "@/lib/api/errors";
import { getSessionContext } from "@/lib/auth/access";

export async function requireInternalPermission(permission: string) {
  const context = await getSessionContext();
  if (!context) {
    throw new ApiError("unauthorized", "Sessão inválida ou expirada.", 401);
  }

  if (!context.isMasterAdmin && !context.permissions.has(permission)) {
    throw new ApiError("forbidden", "Você não possui permissão para esta operação.", 403);
  }

  return context;
}


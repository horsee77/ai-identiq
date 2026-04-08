import { NextRequest, NextResponse } from "next/server";
import { isApiError } from "@/lib/api/errors";
import { fail } from "@/lib/api/response";
import { getOrCreateRequestId } from "@/lib/api/request-id";

type Handler = (request: NextRequest, requestId: string) => Promise<NextResponse>;

export function withApiHandler(handler: Handler) {
  return async (request: NextRequest) => {
    const requestId = getOrCreateRequestId(request);

    try {
      return await handler(request, requestId);
    } catch (error) {
      if (isApiError(error)) {
        return fail(requestId, error.code, error.message, error.status, error.details);
      }

      const message = error instanceof Error ? error.message : "Erro interno inesperado.";
      return fail(requestId, "internal_error", message, 500);
    }
  };
}

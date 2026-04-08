import { randomUUID } from "crypto";
import { NextRequest } from "next/server";

export function getOrCreateRequestId(request: NextRequest) {
  return request.headers.get("x-request-id") ?? randomUUID();
}

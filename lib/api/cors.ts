import { NextResponse } from "next/server";

export function withCorsHeaders({
  response,
  origin,
  allowedOrigins,
}: {
  response: NextResponse;
  origin: string | null;
  allowedOrigins: string[];
}) {
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }
  response.headers.set("Vary", "Origin");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, X-API-Key, X-Client-Session"
  );
  response.headers.set("Access-Control-Max-Age", "600");
  return response;
}

export function createPreflightResponse(origin: string | null) {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set("Access-Control-Allow-Origin", origin ?? "*");
  response.headers.set("Vary", "Origin");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, X-API-Key, X-Client-Session"
  );
  response.headers.set("Access-Control-Max-Age", "600");
  return response;
}

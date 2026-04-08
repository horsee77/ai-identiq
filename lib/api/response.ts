import { NextResponse } from "next/server";

type SuccessPayload<T> = {
  ok: true;
  data: T;
  requestId: string;
};

type ErrorPayload = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
};

export function ok<T>(requestId: string, data: T, status = 200) {
  const payload: SuccessPayload<T> = {
    ok: true,
    data,
    requestId,
  };
  return NextResponse.json(payload, { status });
}

export function fail(requestId: string, code: string, message: string, status = 400, details?: unknown) {
  const payload: ErrorPayload = {
    ok: false,
    error: {
      code,
      message,
      details,
    },
    requestId,
  };
  return NextResponse.json(payload, { status });
}

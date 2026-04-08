import { NextRequest, NextResponse } from "next/server";

const sessionCookieName = process.env.SESSION_COOKIE_NAME ?? "identiq_session";

function isProtectedPath(pathname: string) {
  return (
    pathname.startsWith("/plataforma") ||
    pathname.startsWith("/api/internal") ||
    pathname === "/integracoes" ||
    pathname === "/api-keys"
  );
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const sessionCookie = request.cookies.get(sessionCookieName)?.value;

  // A home precisa permanecer pública e nunca deve ser bloqueada aqui.
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Aliases comuns para evitar 404 em links antigos.
  if (pathname === "/dashboard") {
    return redirectTo(request, "/plataforma/dashboard");
  }

  if (pathname === "/login") {
    return redirectTo(request, "/entrar");
  }

  if (isProtectedPath(pathname) && !sessionCookie) {
    if (pathname.startsWith("/api/internal")) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "unauthorized",
            message: "Sessão expirada.",
          },
        },
        { status: 401 }
      );
    }

    return redirectTo(request, "/entrar");
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard",
    "/login",
    "/integracoes",
    "/api-keys",
    "/plataforma/:path*",
    "/api/internal/:path*",
    "/entrar",
    "/esqueci-senha",
    "/redefinir-senha",
  ],
};

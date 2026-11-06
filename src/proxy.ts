import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  isSameOriginRefreshRequest,
  rotateRefreshToken,
  setAuthCookies,
  verifyAccessToken,
} from "@/core/security";

const PROTECTED_PREFIXES = ["/tracks", "/practice", "/progress", "/revision", "/admin", "/profile"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function buildCsp(nonce: string) {
  const isProd = process.env.NODE_ENV === "production";

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isProd ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  if (isProtectedPath(request.nextUrl.pathname) && request.method === "GET") {
    const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
    const session = token ? await verifyAccessToken(token) : null;

    if (!session) {
      const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
      const canRefresh = isSameOriginRefreshRequest(request.headers, "GET");

      if (refreshToken && canRefresh) {
        const rotated = await rotateRefreshToken(refreshToken);
        if (rotated) {
          const response = NextResponse.redirect(request.nextUrl);
          setAuthCookies(response.cookies, rotated, rotated.user.username);
          return response;
        }
      }

      const response = NextResponse.redirect(new URL("/auth/login", request.url));
      if (canRefresh) clearAuthCookies(response.cookies);
      return response;
    }

    // Testando página de erro padrão, controle de acesso sendo feito direto na página do admin
    // if (
    //   request.nextUrl.pathname.startsWith("/admin") &&
    //   session.role !== "admin"
    // ) {
    //   return NextResponse.redirect(new URL("/tracks", request.url));
    // }
  }

  // Nonce novo a cada requisição; o Next lê o nonce do cabeçalho CSP da requisição
  // e o aplica aos scripts que ele mesmo injeta.
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
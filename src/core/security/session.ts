import { cookies, headers } from "next/headers";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  verifyAccessToken,
  type SessionPayload,
} from "./jwt";
import { rotateRefreshToken } from "./token-session";
import { isSameOriginRefreshRequest } from "./csrf";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

type CookieWriter = {
  set(
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: "lax";
      path: string;
      maxAge: number;
    },
  ): unknown;
  delete(name: string): unknown;
};

type CookieDeleter = { delete(name: string): unknown };

function authCookieOptions(maxAge: number, httpOnly = true) {
  return {
    httpOnly,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function setAuthCookies(
  cookieWriter: CookieWriter,
  tokens: {
    accessToken: string;
    refreshToken: string;
    refreshTokenExpiresAt: Date;
  },
  username: string,
): void {
  const refreshTokenMaxAge = Math.max(
    0,
    Math.ceil((tokens.refreshTokenExpiresAt.getTime() - Date.now()) / 1000),
  );
  cookieWriter.delete("token");
  cookieWriter.set(
    ACCESS_TOKEN_COOKIE,
    tokens.accessToken,
    authCookieOptions(ACCESS_TOKEN_TTL_SECONDS),
  );
  cookieWriter.set(
    REFRESH_TOKEN_COOKIE,
    tokens.refreshToken,
    authCookieOptions(refreshTokenMaxAge),
  );
  cookieWriter.set(
    "username",
    username,
    authCookieOptions(refreshTokenMaxAge),
  );
}

export function clearAuthCookies(cookieDeleter: CookieDeleter): void {
  cookieDeleter.delete(ACCESS_TOKEN_COOKIE);
  cookieDeleter.delete(REFRESH_TOKEN_COOKIE);
  cookieDeleter.delete("username");
  cookieDeleter.delete("token");
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyAccessToken(token);
}

export async function getSessionWithRefresh(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const session = accessToken ? await verifyAccessToken(accessToken) : null;
  if (session) return session;

  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) return null;

  const requestHeaders = await headers();
  if (!isSameOriginRefreshRequest(requestHeaders, "POST")) return null;

  const rotated = await rotateRefreshToken(refreshToken);
  if (!rotated) {
    clearAuthCookies(cookieStore);
    return null;
  }

  setAuthCookies(cookieStore, rotated, rotated.user.username);
  return verifyAccessToken(rotated.accessToken);
}
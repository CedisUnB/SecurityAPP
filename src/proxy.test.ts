/** @jest-environment node */

import { NextRequest } from "next/server";
import {
  clearAuthCookies,
  isSameOriginRefreshRequest,
  rotateRefreshToken,
  setAuthCookies,
  verifyAccessToken,
} from "@/core/security";
import { proxy } from "./proxy";

jest.mock("@/core/security", () => ({
  ACCESS_TOKEN_COOKIE: "access_token",
  REFRESH_TOKEN_COOKIE: "refresh_token",
  clearAuthCookies: jest.fn(),
  isSameOriginRefreshRequest: jest.fn(),
  rotateRefreshToken: jest.fn(),
  setAuthCookies: jest.fn(),
  verifyAccessToken: jest.fn(),
}));

const mockedSameOriginCheck = isSameOriginRefreshRequest as jest.MockedFunction<
  typeof isSameOriginRefreshRequest
>;
const mockedRotate = rotateRefreshToken as jest.MockedFunction<typeof rotateRefreshToken>;
const mockedVerifyAccess = verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>;
const mockedSetCookies = setAuthCookies as jest.MockedFunction<typeof setAuthCookies>;
const mockedClearCookies = clearAuthCookies as jest.MockedFunction<typeof clearAuthCookies>;

beforeEach(() => {
  jest.clearAllMocks();
  mockedVerifyAccess.mockResolvedValue(null);
  mockedSameOriginCheck.mockReturnValue(false);
  mockedRotate.mockResolvedValue(null);
});

it("rotates tokens and retries a protected same-origin navigation", async () => {
  const request = new NextRequest("https://app.example.edu/tracks", {
    headers: {
      host: "app.example.edu",
      origin: "https://app.example.edu",
      "sec-fetch-site": "same-origin",
    },
  });
  request.cookies.set("refresh_token", "old-refresh-token");
  mockedSameOriginCheck.mockReturnValue(true);
  const rotated = {
    accessToken: "new-access",
    refreshToken: "new-refresh",
    refreshTokenExpiresAt: new Date(Date.now() + 2592000 * 1000),
    user: { id: "user-id", username: "student", role: "student" as const },
  };
  mockedRotate.mockResolvedValue(rotated);

  const response = await proxy(request);

  expect(mockedRotate).toHaveBeenCalledWith("old-refresh-token");
  expect(mockedSetCookies).toHaveBeenCalledWith(
    response.cookies,
    rotated,
    "student",
  );
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe("https://app.example.edu/tracks");
});

it("renews sessions on the profile route", async () => {
  const request = new NextRequest("https://app.example.edu/profile", {
    headers: {
      host: "app.example.edu",
      origin: "https://app.example.edu",
      "sec-fetch-site": "same-origin",
    },
  });
  request.cookies.set("refresh_token", "old-refresh-token");
  mockedSameOriginCheck.mockReturnValue(true);
  mockedRotate.mockResolvedValue({
    accessToken: "new-access",
    refreshToken: "new-refresh",
    refreshTokenExpiresAt: new Date(Date.now() + 2592000 * 1000),
    user: { id: "user-id", username: "student", role: "student" },
  });

  const response = await proxy(request);

  expect(mockedRotate).toHaveBeenCalledWith("old-refresh-token");
  expect(response.headers.get("location")).toBe("https://app.example.edu/profile");
});

it("does not use a refresh token for a cross-origin navigation", async () => {
  const request = new NextRequest("https://app.example.edu/tracks", {
    headers: {
      host: "app.example.edu",
      origin: "https://attacker.example",
      "sec-fetch-site": "cross-site",
    },
  });
  request.cookies.set("refresh_token", "refresh-token");
  mockedSameOriginCheck.mockReturnValue(false);

  const response = await proxy(request);

  expect(mockedRotate).not.toHaveBeenCalled();
  expect(response.headers.get("location")).toBe("https://app.example.edu/auth/login");
});

it("clears cookies when a same-origin refresh fails", async () => {
  const request = new NextRequest("https://app.example.edu/tracks", {
    headers: {
      host: "app.example.edu",
      origin: "https://app.example.edu",
      "sec-fetch-site": "same-origin",
    },
  });
  request.cookies.set("refresh_token", "expired-refresh-token");
  mockedSameOriginCheck.mockReturnValue(true);

  const response = await proxy(request);

  expect(mockedRotate).toHaveBeenCalledWith("expired-refresh-token");
  expect(mockedClearCookies).toHaveBeenCalledWith(response.cookies);
  expect(response.headers.get("location")).toBe("https://app.example.edu/auth/login");
});

it("does not try to refresh without a refresh cookie", async () => {
  const request = new NextRequest("https://app.example.edu/tracks", {
    headers: { host: "app.example.edu", "sec-fetch-site": "same-origin" },
  });
  mockedSameOriginCheck.mockReturnValue(true);

  const response = await proxy(request);

  expect(mockedRotate).not.toHaveBeenCalled();
  expect(mockedClearCookies).toHaveBeenCalledWith(response.cookies);
});

it("continues protected requests with a valid access token", async () => {
  const request = new NextRequest("https://app.example.edu/tracks");
  request.cookies.set("access_token", "valid-access-token");
  mockedVerifyAccess.mockResolvedValue({
    sub: "user-id",
    role: "student",
    tokenUse: "access",
  });

  const response = await proxy(request);

  expect(mockedVerifyAccess).toHaveBeenCalledWith("valid-access-token");
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Security-Policy")).toContain("default-src 'self'");
});

it.each([
  ["an unprotected route", "https://app.example.edu/privacy", "GET"],
  ["a non-GET protected request", "https://app.example.edu/tracks", "POST"],
])("applies CSP to %s without verifying an access token", async (_label, url, method) => {
  const request = new NextRequest(url, { method });

  const response = await proxy(request);

  expect(mockedVerifyAccess).not.toHaveBeenCalled();
  expect(response.headers.get("Content-Security-Policy")).toContain("default-src 'self'");
});

it("omits unsafe-eval from the production CSP", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  Reflect.set(process.env, "NODE_ENV", "production");

  try {
    const response = await proxy(new NextRequest("https://app.example.edu/privacy"));
    const csp = response.headers.get("Content-Security-Policy");

    expect(csp).toContain("'strict-dynamic'");
    expect(csp).not.toContain("'unsafe-eval'");
  } finally {
    Reflect.set(process.env, "NODE_ENV", previousNodeEnv);
  }
});

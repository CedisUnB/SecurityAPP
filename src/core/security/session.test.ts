import { cookies, headers } from "next/headers";
import { getSessionWithRefresh, setAuthCookies, clearAuthCookies } from "./session";
import { rotateRefreshToken } from "./token-session";
import { verifyAccessToken } from "./jwt";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
  headers: jest.fn(),
}));

jest.mock("./jwt", () => ({
  ACCESS_TOKEN_TTL_SECONDS: 600,
  verifyAccessToken: jest.fn(),
}));

jest.mock("./token-session", () => ({
  rotateRefreshToken: jest.fn(),
}));

const mockedCookies = cookies as jest.MockedFunction<typeof cookies>;
const mockedHeaders = headers as jest.MockedFunction<typeof headers>;
const mockedVerifyAccessToken = verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>;
const mockedRotateRefreshToken = rotateRefreshToken as jest.MockedFunction<typeof rotateRefreshToken>;

const cookieStore = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
};

const user = {
  id: "user-id",
  username: "student",
  role: "student" as const,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedCookies.mockResolvedValue(cookieStore as unknown as Awaited<ReturnType<typeof cookies>>);
  mockedHeaders.mockResolvedValue(
    new Headers({
      host: "app.example.edu",
      origin: "https://app.example.edu",
    }) as Awaited<ReturnType<typeof headers>>,
  );
});

it("sets access and refresh cookies with HttpOnly, SameSite and Secure in production", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  Reflect.set(process.env, "NODE_ENV", "production");

  setAuthCookies(cookieStore, {
    accessToken: "access",
    refreshToken: "refresh",
    refreshTokenExpiresAt: new Date(Date.now() + 2592000 * 1000),
  }, user.username);

  Reflect.set(process.env, "NODE_ENV", previousNodeEnv);

  expect(cookieStore.set).toHaveBeenCalledWith("access_token", "access", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  expect(cookieStore.set).toHaveBeenCalledWith("refresh_token", "refresh", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 2592000,
  });
  expect(cookieStore.set).toHaveBeenCalledWith("username", "student", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 2592000,
  });
});

it("renews an expired access token from a same-origin server action", async () => {
  const session = { sub: user.id, role: user.role, tokenUse: "access" as const };
  mockedVerifyAccessToken.mockResolvedValueOnce(null).mockResolvedValueOnce(session);
  mockedRotateRefreshToken.mockResolvedValue({
    accessToken: "new-access",
    refreshToken: "new-refresh",
    refreshTokenExpiresAt: new Date(Date.now() + 2592000 * 1000),
    user,
  });
  cookieStore.get.mockImplementation((name: string) => {
    if (name === "access_token") return { value: "expired-access" };
    if (name === "refresh_token") return { value: "old-refresh" };
    return undefined;
  });

  await expect(getSessionWithRefresh()).resolves.toEqual(session);

  expect(mockedRotateRefreshToken).toHaveBeenCalledWith("old-refresh");
  expect(cookieStore.set).toHaveBeenCalledWith(
    "access_token",
    "new-access",
    expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
  );
  expect(cookieStore.set).toHaveBeenCalledWith(
    "refresh_token",
    "new-refresh",
    expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
  );
});

it("rejects a failed refresh and clears every session cookie", async () => {
  mockedVerifyAccessToken.mockResolvedValue(null);
  mockedRotateRefreshToken.mockResolvedValue(null);
  cookieStore.get.mockImplementation((name: string) => {
    if (name === "refresh_token") return { value: "revoked-refresh" };
    return undefined;
  });

  await expect(getSessionWithRefresh()).resolves.toBeNull();
  expect(cookieStore.delete).toHaveBeenCalledWith("access_token");
  expect(cookieStore.delete).toHaveBeenCalledWith("refresh_token");
  expect(cookieStore.delete).toHaveBeenCalledWith("username");
});

it("does not rotate tokens for a cross-origin request", async () => {
  mockedVerifyAccessToken.mockResolvedValue(null);
  cookieStore.get.mockImplementation((name: string) => (
    name === "refresh_token" ? { value: "refresh" } : undefined
  ));
  mockedHeaders.mockResolvedValue(
    new Headers({
      host: "app.example.edu",
      origin: "https://attacker.example",
      "sec-fetch-site": "cross-site",
    }) as Awaited<ReturnType<typeof headers>>,
  );

  await expect(getSessionWithRefresh()).resolves.toBeNull();
  expect(mockedRotateRefreshToken).not.toHaveBeenCalled();
});

it("clears legacy token, access, refresh and username cookies", () => {
  clearAuthCookies(cookieStore);

  expect(cookieStore.delete).toHaveBeenCalledWith("token");
  expect(cookieStore.delete).toHaveBeenCalledWith("access_token");
  expect(cookieStore.delete).toHaveBeenCalledWith("refresh_token");
  expect(cookieStore.delete).toHaveBeenCalledWith("username");
});

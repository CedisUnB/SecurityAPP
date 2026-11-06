/** @jest-environment node */

import { SignJWT, jwtVerify } from "jose";
import { Role } from "@generated/prisma/enums";
import { signAccessToken, verifyAccessToken } from "./jwt";

jest.mock("jose", () => ({
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue("signed-jwt"),
  })),
  jwtVerify: jest.fn(),
}));

const mockedJwtVerify = jwtVerify as jest.MockedFunction<typeof jwtVerify>;

beforeEach(() => {
  jest.clearAllMocks();
});

it("signs a JWT access token with a 10-minute expiration and access-only purpose", async () => {
  await expect(
    signAccessToken({ sub: "user-id", role: Role.student }),
  ).resolves.toBe("signed-jwt");

  expect(SignJWT).toHaveBeenCalledWith({
    sub: "user-id",
    role: Role.student,
    tokenUse: "access",
  });
  const builder = (SignJWT as jest.Mock).mock.results[0].value;
  expect(builder.setExpirationTime).toHaveBeenCalledWith("10m");
});

it("accepts only well-formed access-token claims", async () => {
  mockedJwtVerify.mockResolvedValue({
    payload: { sub: "user-id", role: Role.admin, tokenUse: "access" },
  } as never);

  await expect(verifyAccessToken("token")).resolves.toMatchObject({
    sub: "user-id",
    role: Role.admin,
    tokenUse: "access",
  });

  mockedJwtVerify.mockResolvedValue({
    payload: { sub: "user-id", role: Role.admin, tokenUse: "refresh" },
  } as never);
  await expect(verifyAccessToken("wrong-purpose-token")).resolves.toBeNull();
});

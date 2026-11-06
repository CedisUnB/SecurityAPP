import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Role } from "@generated/prisma/enums";
import { signAccessToken } from "./jwt";
import { refreshTokenRepository } from "./refresh-token.repository";

export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: Role;
}

function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function newRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createTokenSession(
  user: AuthenticatedUser,
): Promise<AuthTokenPair> {
  const refreshToken = newRefreshToken();
  const refreshTokenExpiresAt = new Date(
    Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000,
  );

  await refreshTokenRepository.create({
    familyId: randomUUID(),
    userId: user.id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: refreshTokenExpiresAt,
  });

  return {
    accessToken: await signAccessToken({ sub: user.id, role: user.role }),
    refreshToken,
    refreshTokenExpiresAt,
  };
}

export async function rotateRefreshToken(
  token: string,
): Promise<(AuthTokenPair & { user: AuthenticatedUser }) | null> {
  const nextRefreshToken = newRefreshToken();
  const now = new Date();
  const rotated = await refreshTokenRepository.rotate(
    hashRefreshToken(token),
    hashRefreshToken(nextRefreshToken),
    now,
  );

  if (!rotated) return null;

  return {
    accessToken: await signAccessToken({
      sub: rotated.user.id,
      role: rotated.user.role,
    }),
    refreshToken: nextRefreshToken,
    refreshTokenExpiresAt: rotated.expiresAt,
    user: rotated.user,
  };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await refreshTokenRepository.revoke(hashRefreshToken(token), new Date());
}

export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await refreshTokenRepository.revokeAllForUser(userId, new Date());
}

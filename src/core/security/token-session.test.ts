import { createHash } from "node:crypto";
import type { Role } from "@generated/prisma/enums";
import {
  createTokenSession,
  revokeAllRefreshTokens,
  revokeRefreshToken,
  rotateRefreshToken,
  REFRESH_TOKEN_TTL_SECONDS,
} from "./token-session";
import { refreshTokenRepository } from "./refresh-token.repository";

jest.mock("./refresh-token.repository", () => ({
  refreshTokenRepository: {
    create: jest.fn(),
    rotate: jest.fn(),
    revoke: jest.fn(),
    revokeAllForUser: jest.fn(),
  },
}));

jest.mock("./jwt", () => ({
  signAccessToken: jest.fn().mockResolvedValue("signed-access-token"),
}));

const mockedRepository = refreshTokenRepository as jest.Mocked<typeof refreshTokenRepository>;

const user = {
  id: "98c70071-3cdb-4fcf-b167-c7ff54644d49",
  username: "student",
  role: "student" as Role,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("createTokenSession", () => {
  it("cria access curto e persiste apenas o hash do refresh token", async () => {
    const now = Date.now();
    const tokens = await createTokenSession(user);

    expect(tokens.refreshToken).toHaveLength(43);
    expect(tokens.refreshTokenExpiresAt.getTime()).toBeGreaterThanOrEqual(
      now + REFRESH_TOKEN_TTL_SECONDS * 1000,
    );
    expect(mockedRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: user.id,
        tokenHash: createHash("sha256").update(tokens.refreshToken).digest("hex"),
        expiresAt: tokens.refreshTokenExpiresAt,
      }),
    );
    expect(mockedRepository.create.mock.calls[0][0].tokenHash).not.toBe(
      tokens.refreshToken,
    );

    expect(tokens.accessToken).toBe("signed-access-token");
  });
});

describe("rotateRefreshToken", () => {
  it("rotaciona um refresh válido e gera um access token novo", async () => {
    mockedRepository.rotate.mockResolvedValue({
      familyId: "session-family",
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      user,
    });

    const tokens = await rotateRefreshToken("old-refresh-token");

    expect(tokens).not.toBeNull();
    expect(tokens!.refreshToken).not.toBe("old-refresh-token");
    expect(mockedRepository.rotate).toHaveBeenCalledWith(
      createHash("sha256").update("old-refresh-token").digest("hex"),
      expect.any(String),
      expect.any(Date),
    );
    expect(mockedRepository.rotate.mock.calls[0][1]).toBe(
      createHash("sha256").update(tokens!.refreshToken).digest("hex"),
    );
    expect(tokens!.accessToken).toBe("signed-access-token");
  });

  it.each(["expired", "revoked", "replayed"])(
    "rejeita refresh %s",
    async () => {
      mockedRepository.rotate.mockResolvedValue(null);

      await expect(rotateRefreshToken("invalid-refresh-token")).resolves.toBeNull();
    },
  );
});

it("encaminha revogações para o armazenamento de sessões", async () => {
  await revokeRefreshToken("refresh-to-revoke");
  await revokeAllRefreshTokens(user.id);

  expect(mockedRepository.revoke).toHaveBeenCalledWith(
    createHash("sha256").update("refresh-to-revoke").digest("hex"),
    expect.any(Date),
  );
  expect(mockedRepository.revokeAllForUser).toHaveBeenCalledWith(
    user.id,
    expect.any(Date),
  );
});

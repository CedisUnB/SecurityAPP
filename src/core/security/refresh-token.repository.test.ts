import { prisma } from "@/core/database/prisma";
import type { Role } from "@generated/prisma/enums";
import { RefreshTokenRepository } from "./refresh-token.repository";

jest.mock("@/core/database/prisma", () => ({
  prisma: {
    refreshToken: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockedPrisma = prisma as unknown as {
  refreshToken: {
    deleteMany: jest.Mock;
    create: jest.Mock;
    updateMany: jest.Mock;
  };
  $transaction: jest.Mock;
};

const transaction = {
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
};

const repository = new RefreshTokenRepository();
const now = new Date("2026-11-03T12:00:00.000Z");
const newToken = {
  familyId: "new-family",
  userId: "user-id",
  tokenHash: "new-token-hash",
  expiresAt: new Date("2026-12-03T12:00:00.000Z"),
};
const activeToken = {
  id: "token-row-id",
  familyId: "session-family",
  userId: "user-id",
  expiresAt: new Date("2026-12-03T12:00:00.000Z"),
  revokedAt: null,
  username: "student",
  role: "student" as Role,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
  mockedPrisma.refreshToken.create.mockResolvedValue({});
  mockedPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
  transaction.$queryRaw.mockResolvedValue([activeToken]);
  transaction.$executeRaw.mockResolvedValue(1);
  mockedPrisma.$transaction.mockImplementation(
    async (callback: (tx: typeof transaction) => unknown) => callback(transaction),
  );
});

it("cleans up expired rows before storing a new session", async () => {
  await repository.create(newToken);

  expect(mockedPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
    where: { expiresAt: { lte: expect.any(Date) } },
  });
  expect(mockedPrisma.refreshToken.create).toHaveBeenCalledWith({
    data: expect.objectContaining(newToken),
  });
});

it("consome o token atual e cria o próximo dentro da mesma transação", async () => {
  const result = await repository.rotate(
    "old-hash",
    "new-hash",
    now,
  );

  expect(result).toEqual({
    familyId: activeToken.familyId,
    expiresAt: activeToken.expiresAt,
    user: { id: activeToken.userId, username: activeToken.username, role: "student" },
  });
  expect(transaction.$queryRaw).toHaveBeenCalledTimes(1);
  expect(transaction.$executeRaw).toHaveBeenCalledTimes(2);
  expect(transaction.$executeRaw.mock.calls[0][0]).toBeDefined();
  expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(1);
});

it.each([
  ["expired", { ...activeToken, expiresAt: new Date("2026-11-03T11:59:59.000Z") }],
  ["revoked", { ...activeToken, revokedAt: now }],
])("rejects a %s token and revokes its active family", async (_state, record) => {
  transaction.$queryRaw.mockResolvedValue([record]);

  await expect(
    repository.rotate("old-hash", "new-hash", now),
  ).resolves.toBeNull();

  expect(transaction.$executeRaw).toHaveBeenCalledTimes(1);
});

it("revokes the family when a rotated token is replayed during a concurrent rotation", async () => {
  transaction.$executeRaw.mockResolvedValueOnce(0).mockResolvedValueOnce(1);

  await expect(
    repository.rotate("old-hash", "new-hash", now),
  ).resolves.toBeNull();

  expect(transaction.$executeRaw).toHaveBeenCalledTimes(2);
});

it("rejects unknown refresh tokens without changing any session", async () => {
  transaction.$queryRaw.mockResolvedValue([]);

  await expect(
    repository.rotate("unknown-hash", "new-hash", now),
  ).resolves.toBeNull();
  expect(transaction.$executeRaw).not.toHaveBeenCalled();
});

it("revokes every active token in the family on logout", async () => {
  await repository.revoke("refresh-hash", now);

  expect(transaction.$queryRaw).toHaveBeenCalledTimes(1);
  expect(transaction.$executeRaw).toHaveBeenCalledTimes(1);
});

it("revokes all active sessions for a user after a sensitive account change", async () => {
  await repository.revokeAllForUser("user-id", now);

  expect(mockedPrisma.refreshToken.updateMany).toHaveBeenCalledTimes(1);
});

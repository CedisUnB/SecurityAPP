import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/core/database/prisma";
import type { Role } from "@generated/prisma/enums";

export interface RefreshTokenUser {
  id: string;
  username: string;
  role: Role;
}

export interface RotatedRefreshToken {
  familyId: string;
  expiresAt: Date;
  user: RefreshTokenUser;
}

export class RefreshTokenRepository {
  async create(data: {
    familyId: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
    await prisma.refreshToken.create({
      data: { id: randomUUID(), ...data },
    });
  }

  async rotate(
    tokenHash: string,
    nextTokenHash: string,
    now: Date,
  ): Promise<RotatedRefreshToken | null> {
    return prisma.$transaction(async (transaction) => {
      const [current] = await transaction.$queryRaw<
        Array<{
          id: string;
          familyId: string;
          userId: string;
          expiresAt: Date;
          revokedAt: Date | null;
          username: string;
          role: Role;
        }>
      >`
        SELECT rt.id, rt.family_id AS familyId, rt.fk_user_id AS userId,
               rt.expires_at AS expiresAt, rt.revoked_at AS revokedAt,
               u.username, u.role
        FROM refresh_tokens rt
        INNER JOIN users u ON u.id = rt.fk_user_id
        WHERE rt.token_hash = ${tokenHash}
        FOR UPDATE
      `;

      if (!current) return null;

      if (current.revokedAt || current.expiresAt <= now) {
        await transaction.$executeRaw`
          UPDATE refresh_tokens
          SET revoked_at = ${now}
          WHERE family_id = ${current.familyId} AND revoked_at IS NULL
        `;
        return null;
      }

      const consumed = await transaction.$executeRaw`
        UPDATE refresh_tokens
        SET revoked_at = ${now}
        WHERE id = ${current.id} AND revoked_at IS NULL AND expires_at > ${now}
      `;

      if (consumed !== 1) {
        await transaction.$executeRaw`
          UPDATE refresh_tokens
          SET revoked_at = ${now}
          WHERE family_id = ${current.familyId} AND revoked_at IS NULL
        `;
        return null;
      }

      await transaction.$executeRaw`
        INSERT INTO refresh_tokens
          (id, family_id, fk_user_id, token_hash, expires_at, created_at)
        VALUES
          (${randomUUID()}, ${current.familyId}, ${current.userId},
           ${nextTokenHash}, ${current.expiresAt}, ${now})
      `;

      return {
        familyId: current.familyId,
        expiresAt: current.expiresAt,
        user: { id: current.userId, username: current.username, role: current.role },
      };
    });
  }

  async revoke(tokenHash: string, now: Date): Promise<void> {
    await prisma.$transaction(async (transaction) => {
      const [token] = await transaction.$queryRaw<Array<{ familyId: string }>>`
        SELECT family_id AS familyId
        FROM refresh_tokens
        WHERE token_hash = ${tokenHash}
        FOR UPDATE
      `;
      if (!token) return;

      await transaction.$executeRaw`
        UPDATE refresh_tokens
        SET revoked_at = ${now}
        WHERE family_id = ${token.familyId} AND revoked_at IS NULL
      `;
    });
  }

  async revokeAllForUser(userId: string, now: Date): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();

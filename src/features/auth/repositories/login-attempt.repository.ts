import { prisma } from "@/core/database/prisma";

export const loginAttemptRepository = {
  async create(emailHash: string, createdAt: Date) {
    return prisma.loginAttempt.create({
      data: { emailHash, createdAt },
      select: { id: true },
    });
  },

  async countSince(emailHash: string, since: Date) {
    return prisma.loginAttempt.count({
      where: { emailHash, createdAt: { gte: since } },
    });
  },

  async findOldestSince(emailHash: string, since: Date) {
    return prisma.loginAttempt.findFirst({
      where: { emailHash, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
  },

  async deleteById(id: number) {
    await prisma.loginAttempt.delete({ where: { id } });
  },

  async deleteByEmailHash(emailHash: string) {
    await prisma.loginAttempt.deleteMany({ where: { emailHash } });
  },

  async deleteOlderThan(date: Date) {
    await prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: date } } });
  },
};
import { prisma } from "@/core/database/prisma";
import { UserProfile } from "../types";
import "server-only";

export class AuthRepository {
  async createUser(data: { email: string; username: string; password: string }) {
    return prisma.user.create({ data });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }
  
  async findById(id: string): Promise<UserProfile | null> {
    return prisma.user.findUnique({
      where: {id},
      select: {
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    })
  }

  async findPasswordHashById(id: string): Promise<{ password: string } | null> {
    return prisma.user.findUnique({
      where: { id },
      select: {
        password: true,
      },
    });
  }

  async updateUser(
    id: string,
    data: {
      username: string,
      email: string,
      password?: string
    }
  ): Promise<UserProfile> {
    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  async softDeleteAndAnonymize(userId: string) {
    const anonymizedEmail = `deleted_${userId}@anonymized.local`;
    const anonymizedUsername = `usuario_deletado_${userId.slice(0, 8)}`;

    return prisma.user.update({
      where: { id: userId },
      data: {
        email: anonymizedEmail,
        username: anonymizedUsername,
        password: "",
      },
    });
  }
}

export const authRepository = new AuthRepository();
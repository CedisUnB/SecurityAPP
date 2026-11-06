import { expect, test } from "@playwright/test";
import { prisma } from "@/core/database/prisma";
import {
  cleanup,
  createStudent,
  createTestPrefix,
} from "../helpers/track-fixtures";

const PREFIX = createTestPrefix();

test.describe("track-fixtures smoke test", () => {
  test.afterAll(async () => {
    try {
      await cleanup(PREFIX);
    } finally {
      await prisma.$disconnect();
    }
  });

  test("creates and cleans up a student in the configured database", async () => {
    const student = await createStudent(PREFIX);
    const persisted = await prisma.user.findUnique({
      where: { id: student.id },
      select: { email: true },
    });

    expect(persisted?.email).toBe(student.email);

    await cleanup(PREFIX);

    await expect(
      prisma.user.findUnique({ where: { id: student.id } }),
    ).resolves.toBeNull();
  });
});

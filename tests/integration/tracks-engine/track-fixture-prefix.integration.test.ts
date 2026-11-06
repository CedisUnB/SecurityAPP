/**
 * @jest-environment node
 */
import { prisma } from "@/core/database/prisma";
import {
  cleanup,
  createStudent,
  createTestPrefix,
  createTrack,
} from "../../helpers/track-fixtures";

const PREFIX = createTestPrefix();

jest.setTimeout(30000);

describe("Isolamento de prefixos das fixtures", () => {
  afterAll(async () => {
    try {
      await cleanup(PREFIX);
    } finally {
      await prisma.$disconnect();
    }
  }, 30000);

  it("rejeita prefixos vazios ou não autorizados sem apagar dados válidos", async () => {
    const student = await createStudent(PREFIX);
    const track = await createTrack(PREFIX, {
      lessons: 1,
      withFinalTest: false,
    });
    const unauthorizedPrefixes = [
      "",
      "__test_",
      "__test_ffffffff__",
      "unrelated-prefix",
    ];

    for (const prefix of unauthorizedPrefixes) {
      await expect(cleanup(prefix)).rejects.toThrow(
        "prefix was not created by createTestPrefix()",
      );
    }

    await expect(createStudent("")).rejects.toThrow(
      "prefix was not created by createTestPrefix()",
    );
    await expect(
      createTrack("unauthorized-prefix", {
        lessons: 1,
        withFinalTest: false,
      }),
    ).rejects.toThrow("prefix was not created by createTestPrefix()");

    await expect(
      prisma.user.findUnique({ where: { id: student.id } }),
    ).resolves.toMatchObject({ email: student.email });
    await expect(
      prisma.track.findUnique({ where: { id: track.id } }),
    ).resolves.toMatchObject({ theme: track.theme });
  });
});

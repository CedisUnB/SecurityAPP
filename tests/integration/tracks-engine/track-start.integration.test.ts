/**
 * @jest-environment node
 */
import { redirect } from "next/navigation";
import { prisma } from "@/core/database/prisma";
import { getSessionWithRefresh } from "@/core/security";
import { startTrackAction } from "@/features/tracks-engine/actions";
import {
  cleanup,
  createStudent,
  createTestPrefix,
  createTrack,
} from "../../helpers/track-fixtures";

jest.mock("next/navigation", () => ({
  redirect: jest.fn((path: string) => {
    throw new Error(`Redirected to ${path}`);
  }),
}));

jest.mock("@/core/security", () => ({
  getSessionWithRefresh: jest.fn(),
}));

const PREFIX = createTestPrefix();
const mockedGetSession = jest.mocked(getSessionWithRefresh);
const mockedRedirect = jest.mocked(redirect);

jest.setTimeout(30000);

describe("Action de início de trilha", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    try {
      await cleanup(PREFIX);
    } finally {
      await prisma.$disconnect();
    }
  }, 30000);

  it("cria um registro in_progress para o usuário autenticado", async () => {
    const student = await createStudent(PREFIX);
    const track = await createTrack(PREFIX, {
      lessons: 1,
      withFinalTest: false,
    });
    mockedGetSession.mockResolvedValue({
      sub: student.id,
      role: "student",
      tokenUse: "access",
    });

    await expect(
      startTrackAction({ trackId: String(track.id) }),
    ).resolves.toBeUndefined();

    await expect(
      prisma.takes.findUnique({
        where: { userId_trackId: { userId: student.id, trackId: track.id } },
      }),
    ).resolves.toMatchObject({
      userId: student.id,
      trackId: track.id,
      status: "in_progress",
      completedAt: null,
    });
  });

  it("mantém o estado existente ao iniciar novamente a trilha", async () => {
    const student = await createStudent(PREFIX);
    const track = await createTrack(PREFIX, {
      lessons: 1,
      withFinalTest: false,
    });
    const completedAt = new Date("2025-01-01T00:00:00.000Z");
    await prisma.takes.create({
      data: {
        userId: student.id,
        trackId: track.id,
        status: "completed",
        completedAt,
      },
    });
    mockedGetSession.mockResolvedValue({
      sub: student.id,
      role: "student",
      tokenUse: "access",
    });

    await startTrackAction({ trackId: String(track.id) });

    await expect(
      prisma.takes.findUnique({
        where: { userId_trackId: { userId: student.id, trackId: track.id } },
      }),
    ).resolves.toMatchObject({
      status: "completed",
      completedAt,
    });
  });

  it("redireciona para login quando não há sessão", async () => {
    mockedGetSession.mockResolvedValue(null);

    await expect(startTrackAction({ trackId: "1" })).rejects.toThrow(
      "Redirected to /auth/login",
    );

    expect(mockedRedirect).toHaveBeenCalledWith("/auth/login");
  });

  it.each(["0", "-1", "1.5", "2147483648", "not-a-number", ""])(
    "rejeita o id inválido %s",
    async (trackId) => {
      mockedGetSession.mockResolvedValue({
        sub: "session-user",
        role: "student",
        tokenUse: "access",
      });

      await expect(startTrackAction({ trackId })).rejects.toThrow();
    },
  );
});

import { prisma } from "@/core/database/prisma";
import {
  listTrackCatalogData,
  startTrack,
  upsertNodeProgress,
  updateTakesStatus,
} from "./tracks.repository";

jest.mock("server-only", () => ({}));
jest.mock("@/core/database/prisma", () => ({
  prisma: {
    track: {
      findMany: jest.fn(),
    },
    progress: {
      upsert: jest.fn(),
    },
    takes: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockedFindMany = prisma.track
  .findMany as jest.MockedFunction<typeof prisma.track.findMany>;
const mockedTakesUpsert = prisma.takes
  .upsert as jest.MockedFunction<typeof prisma.takes.upsert>;
const mockedTakesUpdate = prisma.takes
  .update as jest.MockedFunction<typeof prisma.takes.update>;
const mockedProgressUpsert = prisma.progress
  .upsert as jest.MockedFunction<typeof prisma.progress.upsert>;

describe("upsertNodeProgress", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates failed progress as incomplete and preserves completion on updates", async () => {
    await upsertNodeProgress("user-123", 43, {
      isCompleted: false,
      score: 79,
    });

    expect(mockedProgressUpsert).toHaveBeenCalledWith({
      where: { userId_trackNodeId: { userId: "user-123", trackNodeId: 43 } },
      create: {
        userId: "user-123",
        trackNodeId: 43,
        isCompleted: false,
        score: 79,
      },
      update: {
        isCompleted: undefined,
        score: 79,
      },
    });
  });
});

describe("updateTakesStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("marks the user's track record as completed", async () => {
    await updateTakesStatus("user-123", 11);

    expect(mockedTakesUpdate).toHaveBeenCalledWith({
      where: { userId_trackId: { userId: "user-123", trackId: 11 } },
      data: expect.objectContaining({
        status: "completed",
        completedAt: expect.any(Date),
      }),
    });
  });
});

describe("startTrack", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates an in-progress record and leaves an existing take unchanged", async () => {
    await startTrack("user-123", 11);

    expect(mockedTakesUpsert).toHaveBeenCalledWith({
      where: { userId_trackId: { userId: "user-123", trackId: 11 } },
      create: { userId: "user-123", trackId: 11, status: "in_progress" },
      update: {},
    });
  });
});

describe("listTrackCatalogData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads node and progress counts filtered to the authenticated user", async () => {
    mockedFindMany.mockResolvedValueOnce([
      {
        id: 11,
        theme: "Segurança Web",
        description: "Descrição de Segurança Web.",
        _count: { trackNode: 3 },
        takes: [{ status: "in_progress" }],
        trackNode: [
          { progress: [{ isCompleted: true }] },
          { progress: [] },
          { progress: [{ isCompleted: true }] },
        ],
      },
    ] as never);

    await expect(listTrackCatalogData("user-123")).resolves.toEqual([
      {
        id: 11,
        theme: "Segurança Web",
        description: "Descrição de Segurança Web.",
        totalNodes: 3,
        completedNodes: 2,
        isStarted: true,
      },
    ]);
    expect(mockedFindMany).toHaveBeenCalledWith({
      orderBy: { theme: "asc" },
      select: {
        id: true,
        theme: true,
        description: true,
        _count: { select: { trackNode: true } },
        takes: {
          where: { userId: "user-123" },
          select: { status: true },
        },
        trackNode: {
          select: {
            progress: {
              where: { userId: "user-123", isCompleted: true },
              select: { isCompleted: true },
            },
          },
        },
      },
    });
  });

  it("loads only public track information when there is no authenticated user", async () => {
    mockedFindMany.mockResolvedValueOnce([
      {
        id: 12,
        theme: "Proteção de Dados",
        description: "Descrição de Proteção de Dados.",
        _count: { trackNode: 5 },
      },
    ] as never);

    await expect(listTrackCatalogData()).resolves.toEqual([
      {
        id: 12,
        theme: "Proteção de Dados",
        description: "Descrição de Proteção de Dados.",
        totalNodes: 5,
        completedNodes: 0,
        isStarted: false,
      },
    ]);
    expect(mockedFindMany).toHaveBeenCalledWith({
      orderBy: { theme: "asc" },
      select: {
        id: true,
        theme: true,
        description: true,
        _count: { select: { trackNode: true } },
      },
    });
  });
});

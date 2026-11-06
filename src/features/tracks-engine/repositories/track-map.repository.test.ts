import { prisma } from "@/core/database/prisma";
import {
  findTrackMapData,
  findTrackNodeData,
} from "./track-map.repository";

jest.mock("server-only", () => ({}));
jest.mock("@/core/database/prisma", () => ({
  prisma: {
    track: { findUnique: jest.fn() },
    trackNode: { findFirst: jest.fn() },
  },
}));

const mockedTrackFindUnique = prisma.track
  .findUnique as jest.MockedFunction<typeof prisma.track.findUnique>;
const mockedNodeFindFirst = prisma.trackNode
  .findFirst as jest.MockedFunction<typeof prisma.trackNode.findFirst>;

describe("track map repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("queries ordered nodes and scopes progress to the authenticated user", async () => {
    mockedTrackFindUnique.mockResolvedValueOnce(null);

    await findTrackMapData(12, "user-123");

    expect(mockedTrackFindUnique).toHaveBeenCalledWith({
      where: { id: 12 },
      select: {
        id: true,
        theme: true,
        trackNode: {
          orderBy: { orderIndex: "asc" },
          select: {
            id: true,
            orderIndex: true,
            nodeType: true,
            lesson: { select: { title: true } },
            exercises: { select: { type: true } },
            progress: {
              where: { userId: "user-123", isCompleted: true },
              select: { isCompleted: true },
            },
          },
        },
      },
    });
  });

  it("requires both track and node IDs when locating node content", async () => {
    mockedNodeFindFirst.mockResolvedValueOnce(null);

    await findTrackNodeData(12, 42);

    expect(mockedNodeFindFirst).toHaveBeenCalledWith({
      where: { id: 42, trackId: 12 },
      select: {
        id: true,
        trackId: true,
        nodeType: true,
        lesson: { select: { title: true } },
        exercises: { select: { type: true } },
      },
    });
  });
});

import { prisma } from "@/core/database/prisma";
import { TrackNodeRepository } from "./track-node.repository";

jest.mock("@/core/database/prisma", () => ({
  prisma: {
    trackNode: { findUnique: jest.fn(), findFirst: jest.fn() },
    lesson: { findUnique: jest.fn() },
    exercise: { findMany: jest.fn() },
  },
}));

const db = prisma as unknown as {
  trackNode: { findUnique: jest.Mock; findFirst: jest.Mock };
  lesson: { findUnique: jest.Mock };
  exercise: { findMany: jest.Mock };
};

describe("TrackNodeRepository", () => {
  const repository = new TrackNodeRepository();
  beforeEach(() => jest.clearAllMocks());

  it("queries track nodes, lessons, exercises, and neighboring nodes", async () => {
    await repository.findById(3);
    expect(db.trackNode.findUnique).toHaveBeenCalledWith({
      where: { id: 3 },
      include: { track: true, lesson: true, exercises: true },
    });
    await repository.findPreviousNodeInTrack(8, 4);
    expect(db.trackNode.findFirst).toHaveBeenLastCalledWith({
      where: { trackId: 8, orderIndex: { lt: 4 } },
      orderBy: { orderIndex: "desc" },
    });
    await repository.findNextNodeInTrack(8, 4);
    expect(db.trackNode.findFirst).toHaveBeenLastCalledWith({
      where: { trackId: 8, orderIndex: { gt: 4 } },
      orderBy: { orderIndex: "asc" },
    });
    db.trackNode.findFirst.mockResolvedValueOnce({ id: 5 });
    await expect(repository.isLastNodeOfTrack(8, 4)).resolves.toBe(false);
    db.trackNode.findFirst.mockResolvedValueOnce(null);
    await expect(repository.isLastNodeOfTrack(8, 4)).resolves.toBe(true);
    expect(db.trackNode.findFirst).toHaveBeenLastCalledWith({
      where: { trackId: 8, orderIndex: { gt: 4 } },
      select: { id: true },
    });
    await repository.findLessonByNodeId(3);
    expect(db.lesson.findUnique).toHaveBeenCalledWith({ where: { trackNodeId: 3 } });
    await repository.findExercisesByNodeId(3);
    expect(db.exercise.findMany).toHaveBeenCalledWith({ where: { trackNodeId: 3 }, orderBy: { id: "asc" } });
  });
});

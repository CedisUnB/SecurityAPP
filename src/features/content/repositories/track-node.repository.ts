import { prisma } from "@/core/database/prisma";

export class TrackNodeRepository {
  async findById(trackNodeId: number) {
    return prisma.trackNode.findUnique({
      where: { id: trackNodeId },
      include: {
        track: true,
        lesson: true,
        exercises: true,
      },
    });
  }

  async findPreviousNodeInTrack(trackId: number, currentOrderIndex: number) {
    return prisma.trackNode.findFirst({
      where: {
        trackId,
        orderIndex: {
          lt: currentOrderIndex,
        },
      },
      orderBy: {
        orderIndex: "desc",
      },
    });
  }

  async findNextNodeInTrack(trackId: number, currentOrderIndex: number) {
    return prisma.trackNode.findFirst({
      where: {
        trackId,
        orderIndex: {
          gt: currentOrderIndex,
        },
      },
      orderBy: {
        orderIndex: "asc",
      },
    });
  }

  async isLastNodeOfTrack(trackId: number, currentOrderIndex: number): Promise<boolean> {
    const nextNode = await prisma.trackNode.findFirst({
        where: {
        trackId,
        orderIndex: {
            gt: currentOrderIndex,
        },
        },
        select: { id: true },
    });
    return nextNode === null;
}

  async findLessonByNodeId(trackNodeId: number) {
    return prisma.lesson.findUnique({
      where: { trackNodeId },
    });
  }

  async findExercisesByNodeId(trackNodeId: number) {
    return prisma.exercise.findMany({
      where: { trackNodeId },
      orderBy: { id: "asc" },
    });
  }
}
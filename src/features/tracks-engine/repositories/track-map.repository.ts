import "server-only";
import { prisma } from "@/core/database/prisma";

export async function findTrackMapData(trackId: number, userId: string) {
  return prisma.track.findUnique({
    where: { id: trackId },
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
            where: { userId, isCompleted: true },
            select: { isCompleted: true },
          },
        },
      },
    },
  });
}

export async function findTrackNodeData(trackId: number, nodeId: number) {
  return prisma.trackNode.findFirst({
    where: { id: nodeId, trackId },
    select: {
      id: true,
      trackId: true,
      nodeType: true,
      lesson: { select: { title: true } },
      exercises: { select: { type: true } },
    },
  });
}

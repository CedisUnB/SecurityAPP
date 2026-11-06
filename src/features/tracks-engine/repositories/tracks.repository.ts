import "server-only";
import { prisma } from "@/core/database/prisma";
import type { TrackCatalogEntry } from "../types";

export async function listTrackCatalogData(
  userId?: string,
): Promise<TrackCatalogEntry[]> {
  if (!userId) {
    const tracks = await prisma.track.findMany({
      orderBy: { theme: "asc" },
      select: {
        id: true,
        theme: true,
        description: true,
        _count: { select: { trackNode: true } },
      },
    });

    return tracks.map((track) => ({
      id: track.id,
      theme: track.theme,
      description: track.description,
      totalNodes: track._count.trackNode,
      completedNodes: 0,
      isStarted: false,
    }));
  }

  const tracks = await prisma.track.findMany({
    orderBy: { theme: "asc" },
    select: {
      id: true,
      theme: true,
      description: true,
      _count: { select: { trackNode: true } },
      takes: {
        where: { userId },
        select: { status: true },
      },
      trackNode: {
        select: {
          progress: {
            where: { userId, isCompleted: true },
            select: { isCompleted: true },
          },
        },
      },
    },
  });

  return tracks.map((track) => ({
    id: track.id,
    theme: track.theme,
    description: track.description,
    totalNodes: track._count.trackNode,
    completedNodes: track.trackNode.filter(
      (node) => node.progress.length > 0,
    ).length,
    isStarted: track.takes.some(({ status }) => status !== "not_started"),
  }));
}

export async function upsertNodeProgress(
  userId: string,
  trackNodeId: number,
  data: { isCompleted: boolean; score: number },
) {
  return prisma.progress.upsert({
    where: { userId_trackNodeId: { userId, trackNodeId } },
    create: { userId, trackNodeId, ...data },
    update: {
      ...data,
      isCompleted: data.isCompleted ? true : undefined,
    },
  });
}

export async function startTrack(userId: string, trackId: number) {
  return prisma.takes.upsert({
    where: { userId_trackId: { userId, trackId } },
    create: { userId, trackId, status: "in_progress" },
    update: {},
  });
}

export async function updateTakesStatus(userId: string, trackId: number) {
  const completedAt = new Date();

  return prisma.takes.update({
    where: { userId_trackId: { userId, trackId } },
    data: { status: "completed", completedAt },
  });
}
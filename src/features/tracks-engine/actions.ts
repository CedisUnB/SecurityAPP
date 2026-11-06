"use server";

import { redirect } from "next/navigation";
import { getSessionWithRefresh } from "@/core/security";
import { getTrackMap, getTrackNode, listTracks, startTrack } from "./services";
import {
  trackMapRouteParamsSchema,
  trackNodeRouteParamsSchema,
} from "./types";
import type { TrackCatalogEntry } from "./types";
import type { TrackMapDTO, TrackNodeContentDTO } from "./types";
import { TrackEngineError } from "./errors";

async function requireSession() {
  const session = await getSessionWithRefresh();

  if (!session?.sub) {
    redirect("/auth/login");
  }

  return session;
}

async function requireUserId(): Promise<string> {
  const session = await requireSession();
  return session.sub;
}

export async function getCatalogAction(): Promise<TrackCatalogEntry[]> {
  const userId = await requireUserId();
  return listTracks(userId);
}

export async function startTrackAction(params: {trackId: string}): Promise<void> {
  const userId = await requireUserId();

  const parsed = trackMapRouteParamsSchema.safeParse(params);
  if (!parsed.success) {
      throw new TrackEngineError("Identificador de trilha inválido.");
  }

  await startTrack(userId, parsed.data.trackId);
}

export async function getTrackMapAction(
  params: { trackId: string; focus?: string },
): Promise<TrackMapDTO | null> {
  const userId = await requireUserId();

  const parsed = trackMapRouteParamsSchema.safeParse(params);
  if (!parsed.success) {
    return null;
  }

  return getTrackMap(parsed.data.trackId, parsed.data.focus, userId);
}

export async function getTrackNodeAction(
  params: { trackId: string; nodeId: string },
): Promise<TrackNodeContentDTO | null> {
  const userId = await requireUserId();

  const parsed = trackNodeRouteParamsSchema.safeParse(params);
  if (!parsed.success) {
    return null;
  }

  return getTrackNode(parsed.data.trackId, parsed.data.nodeId, userId);
}

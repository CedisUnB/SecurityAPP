import { listTrackCatalogData, startTrack as startTrackRecord } from "../repositories";
import { toTrackEngineError } from "../errors";
import type { TrackCatalogEntry } from "../types";

export async function listTracks(userId?: string): Promise<TrackCatalogEntry[]> {
  try {
    return await listTrackCatalogData(userId);
  } catch (error) {
    throw toTrackEngineError(
      error,
      "tracks-engine:listTracks",
      "Não foi possível carregar o catálogo de trilhas.",
    );
  }
}

export async function startTrack(userId: string, trackId: number): Promise<void> {
  try {
    await startTrackRecord(userId, trackId);
  } catch (error) {
    throw toTrackEngineError(
      error,
      "tracks-engine:startTrack",
      "Não foi possível iniciar a trilha.",
    );
  }
}
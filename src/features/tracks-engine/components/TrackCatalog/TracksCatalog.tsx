"use client";

import { useState } from "react";
import { TrackDetailsDialog } from "./TrackDetailsDialog";
import { TrackCard } from "./TrackCard";
import type { TrackCatalogEntry } from "../../types";

interface TracksCatalogProps {
  tracks: TrackCatalogEntry[];
}

export function TracksCatalog({ tracks }: TracksCatalogProps) {
  const [selectedTrack, setSelectedTrack] = useState<TrackCatalogEntry | null>(
    null,
  );

  if (tracks.length === 0) {
    return (
      <p className="text-sm text-foreground-muted">
        Nenhuma trilha está disponível no momento.
      </p>
    );
  }

  const orbitPositions = [0, 2, 3, 5, 6, 8, 1, 7];
  const orbitSlots: (TrackCatalogEntry | null)[] = Array(9).fill(null);
  tracks.slice(0, orbitPositions.length).forEach((track, index) => {
    orbitSlots[orbitPositions[index]] = track;
  });
  const additionalTracks = tracks.slice(orbitPositions.length);

  return (
    <>
      <section
        aria-label="Mapa de trilhas"
        className="mx-auto w-full max-w-5xl rounded-3xl border border-border bg-surface p-4 text-foreground shadow-sm shadow-foreground/10 sm:p-8 lg:p-10"
      >
        <div className="md:hidden">
          <div
            aria-label="Você está aqui no mapa de trilhas"
            className="mb-5 flex items-center justify-center gap-3 rounded-2xl bg-surface-alt px-4 py-3 text-sm font-semibold text-foreground"
          >
            <span aria-hidden="true" className="text-3xl">
              🧭
            </span>
            <span>Escolha uma trilha para explorar</span>
          </div>
          <ul
            aria-label="Trilhas disponíveis"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {tracks.map((track) => (
              <li key={track.id} className="min-w-0">
                <TrackCard
                  track={track}
                  onSelect={setSelectedTrack}
                  variant="list"
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="hidden md:block">
          <ul
            aria-label="Trilhas ao redor da bússola"
            className="mx-auto grid w-full max-w-xl grid-cols-3 gap-3 lg:gap-4"
          >
            {orbitSlots.map((track, index) =>
              track ? (
                <li key={track.id} className="flex min-w-0">
                  <TrackCard
                    track={track}
                    onSelect={setSelectedTrack}
                    variant="orbit"
                  />
                </li>
              ) : index === 4 ? (
                <li
                  key="map-center"
                  aria-label="Você está aqui no mapa de trilhas"
                  className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl bg-surface-alt px-2 text-center text-foreground"
                >
                  <span
                    aria-hidden="true"
                    className="select-none text-5xl drop-shadow-sm lg:text-6xl"
                  >
                    🧭
                  </span>
                  <span className="text-[0.625rem] font-semibold leading-tight text-foreground-muted sm:text-xs">
                    Escolha uma trilha para explorar
                  </span>
                </li>
              ) : (
                <li
                  key={`map-empty-${index}`}
                  aria-hidden="true"
                  className="aspect-square"
                />
              ),
            )}
          </ul>

          {additionalTracks.length > 0 && (
            <div className="mx-auto mt-10 max-w-4xl border-t border-border pt-7">
              <h2 className="mb-4 text-lg font-bold text-foreground">
                Mais trilhas
                <span className="ml-2 text-sm font-medium text-foreground-muted">
                  ({additionalTracks.length})
                </span>
              </h2>
              <ul
                aria-label="Mais trilhas"
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
              >
                {additionalTracks.map((track) => (
                  <li key={track.id} className="flex min-w-0">
                    <TrackCard
                      track={track}
                      onSelect={setSelectedTrack}
                      variant="orbit"
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <TrackDetailsDialog
        track={selectedTrack}
        onClose={() => setSelectedTrack(null)}
      />
    </>
  );
}
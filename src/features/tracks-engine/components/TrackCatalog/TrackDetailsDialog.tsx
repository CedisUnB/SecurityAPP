"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { startTrackAction } from "../../actions";
import type { TrackCatalogEntry } from "../../types";

interface TrackDetailsDialogProps {
  track: TrackCatalogEntry | null;
  onClose: () => void;
}

export function TrackDetailsDialog({
  track,
  onClose,
}: TrackDetailsDialogProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (track && !dialog.open) {
      dialog.showModal();
    } else if (!track && dialog.open) {
      dialog.close();
    }
  }, [track]);

  const handleStartTrack = () => {
    if (!track) return;

    const trackId = track.id;
    setError(null);
    startTransition(async () => {
      try {
        await startTrackAction({trackId: trackId.toString()});
        router.push(`/tracks/${trackId}`);
      } catch {
        setError("Não foi possível iniciar a trilha. Tente novamente.");
      }
    });
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="track-dialog-title"
      onCancel={onClose}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-border bg-surface p-0 text-foreground shadow-2xl shadow-foreground/20 backdrop:bg-overlay"
    >
      {track && (
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">
                Detalhes da trilha
              </p>
              <h2 id="track-dialog-title" className="mt-2 text-2xl font-bold">
                {track.theme}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar detalhes da trilha"
              className="cursor-pointer rounded-full px-3 py-1 text-2xl leading-none text-foreground-muted hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand-secondary"
            >
              ×
            </button>
          </div>

          <p className="mt-5 text-sm leading-6 text-foreground">
            {track.description}
          </p>
          <p className="mt-4 text-sm font-medium text-foreground-muted">
            {track.totalNodes}{" "}
            {track.totalNodes === 1 ? "etapa" : "etapas"}
            {track.isStarted && ` · ${track.completedNodes} concluídas`}
          </p>

          <div className="mt-7 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg px-4 py-3 text-sm font-semibold text-foreground-muted hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand-secondary"
            >
              Voltar ao mapa
            </button>
            <button
              type="button"
              onClick={handleStartTrack}
              disabled={isPending}
              className="cursor-pointer rounded-lg bg-accent flex items-center px-6 py-3 text-sm font-semibold text-accent-foreground transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary disabled:cursor-wait disabled:opacity-60"
            >
              {isPending
                ? "Iniciando..."
                : track.isStarted
                  ? "Continuar trilha"
                  : "Começar"}
              <span aria-hidden="true" className="ml-3">
                →
              </span>
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-right text-sm text-rose-500">
              {error}
            </p>
          )}
        </div>
      )}
    </dialog>
  );
}

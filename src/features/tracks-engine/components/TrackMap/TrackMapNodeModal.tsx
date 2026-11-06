"use client";

import { useRef } from "react";
import Link from "next/link";
import type { TrackMapDTO } from "../../types";

interface TrackMapNodeModalProps {
  trackId: number;
  node: TrackMapDTO["nodes"][number];
  children: React.ReactNode;
}

export function TrackMapNodeModal({ trackId, node, children }: TrackMapNodeModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isLocked = !node.isUnlocked;

  function handleOpen() {
    if (isLocked) {
      return;
    }
    dialogRef.current?.showModal();
  }

  return (
    <>
      <button
        type="button"
        disabled={isLocked}
        aria-current={node.isCurrent ? "step" : undefined}
        aria-label={`${node.kindLabel}: ${node.title}${
          isLocked ? ", bloqueado até concluir as etapas anteriores" : ""
        }${node.isCompleted ? ", concluído" : ""}${
          node.isMostAdvanced ? ", etapa mais avançada alcançada" : ""
        }`}
        onClick={handleOpen}
        className={`focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-secondary ${
          isLocked ? "cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        {children}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={`track-node-title-${node.id}`}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-border bg-surface p-6 text-foreground shadow-xl backdrop:bg-black/40"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
          {node.kindLabel}
        </p>
        <h2 id={`track-node-title-${node.id}`} className="mt-1 text-lg font-bold">
          {node.title}
        </h2>

        {(node.isCurrent || node.isMostAdvanced) && (
          <p className="mt-2 text-xs font-semibold text-accent">
            {node.isMostAdvanced ? "Etapa mais avançada alcançada" : "Etapa selecionada"}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-foreground-muted hover:text-foreground"
          >
            Fechar
          </button>
          <Link
            href={`/tracks/${trackId}/nodes/${node.id}`}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          >
            {node.isCompleted ? "Revisar" : "Começar"}
          </Link>
        </div>
      </dialog>
    </>
  );
}
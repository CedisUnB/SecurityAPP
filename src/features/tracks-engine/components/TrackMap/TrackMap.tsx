import type { TrackMapDTO } from "../../types";
import { TrackMapFocus } from "./TrackMapFocus";
import { TrackMapNode } from "./TrackMapNode";
import { TrackMapConnectors } from "./TrackMapConnectors";
import { calculateProgress } from "../../utils/progress";

interface TrackMapProps {
  track: TrackMapDTO;
}

export function TrackMap({ track }: TrackMapProps) {
  if (track.nodes.length === 0) {
    return (
      <section
        aria-label={`Mapa da trilha ${track.theme}`}
        className="w-full max-w-3xl rounded-3xl border border-border bg-surface p-8 text-center text-foreground shadow-sm"
      >
        <p className="text-foreground-muted">
          Esta trilha ainda não possui etapas disponíveis.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label={`Mapa da trilha ${track.theme}`}
      className="w-full max-w-3xl rounded-3xl border border-border bg-surface p-6 text-foreground shadow-sm sm:p-10"
    >
      <h1 className="mb-8 text-center text-2xl font-bold">{track.theme}</h1>

      <p className="mb-6 text-center text-sm font-semibold text-foreground-muted">
        {track.completedNodes} de {track.totalNodes} etapas concluídas
        {track.totalNodes > 0 && ` · ${calculateProgress(track.completedNodes, track.totalNodes)}%`}
      </p>

      <div className="relative mx-auto max-w-lg">
        <TrackMapConnectors nodes={track.nodes} />

        <ol
          aria-label="Etapas da trilha em sequência"
          className="relative z-10 flex flex-col items-center gap-10"
        >
          {track.nodes.map((node, index) => (
            <TrackMapNode
              key={node.id}
              node={node}
              trackId={track.id}
              index={index}
              isLeft={index % 2 === 0}
            />
          ))}
        </ol>
      </div>

      <TrackMapFocus nodeId={track.focusNodeId} />
    </section>
  );
}
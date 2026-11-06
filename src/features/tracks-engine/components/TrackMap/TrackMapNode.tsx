import type { TrackMapDTO } from "@/features/tracks-engine/types";
import { TrackMapNodeBubble } from "./TrackMapNodeBubble";
import { TrackMapNodeModal } from "./TrackMapNodeModal";

interface TrackMapNodeProps {
  node: TrackMapDTO["nodes"][number];
  trackId: number;
  index: number;
  isLeft: boolean;
}

export function TrackMapNode({ node, trackId, index, isLeft }: TrackMapNodeProps) {
  const statusLabelClassName = [
    "mt-2 block text-center text-xs font-semibold",
    node.isCompleted ? "text-confirm" : "text-foreground-muted",
  ].join(" ");

  const wrapperClassName = [
    "flex w-24 flex-col items-center",
    node.isFinalTest ? "" : isLeft ? "ml-[18%]" : "mr-[18%]",
  ].join(" ");

  return (
    <li
      id={`node-${node.id}`}
      className={`flex w-full ${
        node.isFinalTest ? "justify-center" : isLeft ? "justify-start" : "justify-end"
      }`}
    >
      <div className={wrapperClassName}>
        <TrackMapNodeModal trackId={trackId} node={node}>
          <TrackMapNodeBubble node={node} />
        </TrackMapNodeModal>
        <span className={statusLabelClassName}>
          Etapa {index + 1}
          {node.isCompleted && " · Concluída"}
        </span>
      </div>
    </li>
  );
}
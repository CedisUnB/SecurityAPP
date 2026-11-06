import type { TrackMapDTO } from "../../types";
import { NodeStatusIcon } from "./NodeStatusIcon";

interface TrackMapNodeBubbleProps {
  node: TrackMapDTO["nodes"][number];
}

const LOCKED_TONE = "border-border bg-surface-hover text-foreground-muted";

export function TrackMapNodeBubble({ node }: TrackMapNodeBubbleProps) {
  const isLocked = !node.isUnlocked;

  const interactionClassName = isLocked
    ? "cursor-not-allowed"
    : "hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:border-b-2";

  if (node.isFinalTest) {
    const finalTestClassName = [
      "flex h-16 w-28 items-center justify-center gap-2 rounded-xl border-b-4 px-3 shadow-md transition",
      interactionClassName,
      isLocked ? LOCKED_TONE : "border-alert bg-alert text-alert-foreground",
    ].join(" ");

    return (
      <span className={finalTestClassName}>
        <NodeStatusIcon node={node} />
        <span className="text-center text-xs font-bold uppercase leading-tight tracking-wide">
          {isLocked ? "Teste Final Bloqueado" : "Teste final"}
        </span>
      </span>
    );
  }

  const toneClassName = isLocked
    ? LOCKED_TONE
    : node.isCompleted
      ? "border-accent-border bg-accent text-accent-foreground"
      : "border-current-border bg-current-surface text-current-foreground";

  const bubbleClassName = [
    "flex h-16 w-16 items-center justify-center rounded-full border-b-4 shadow-md transition",
    interactionClassName,
    toneClassName,
  ].join(" ");

  return (
    <span className={bubbleClassName}>
      <NodeStatusIcon node={node} />
    </span>
  );
}
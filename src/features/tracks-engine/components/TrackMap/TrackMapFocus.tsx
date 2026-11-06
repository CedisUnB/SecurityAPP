"use client";

import { useEffect } from "react";

interface TrackMapFocusProps {
  nodeId: number | null;
}

export function TrackMapFocus({ nodeId }: TrackMapFocusProps) {
  useEffect(() => {
    if (nodeId === null) {
      return;
    }

    document
      .getElementById(`node-${nodeId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [nodeId]);

  return null;
}

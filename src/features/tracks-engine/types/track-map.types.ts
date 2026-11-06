import { z } from "zod";
import type { NodeType } from "@generated/prisma/client";

const numericRouteParamSchema = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .refine(
    (value) => Number.isSafeInteger(value) && value <= 2_147_483_647,
  );

export const trackMapRouteParamsSchema = z.object({
  trackId: numericRouteParamSchema,
  focus: numericRouteParamSchema.optional(),
});

export const trackNodeRouteParamsSchema = z.object({
  trackId: numericRouteParamSchema,
  nodeId: numericRouteParamSchema,
});

export interface TrackMapNodeDTO {
  id: number;
  orderIndex: number;
  nodeType: NodeType;
  title: string;
  kindLabel: string;
  isCompleted: boolean;
  isCurrent: boolean;
  isMostAdvanced: boolean;
  isFinalTest: boolean;
  isNextUp: boolean;
  isUnlocked: boolean;
}

export interface TrackMapDTO {
  id: number;
  theme: string;
  focusNodeId: number | null;
  totalNodes: number;
  completedNodes: number;
  nodes: TrackMapNodeDTO[];
}

export interface TrackNodeContentDTO {
  id: number;
  trackId: number;
  nodeType: NodeType;
  title: string;
  isFinalTest: boolean;
}

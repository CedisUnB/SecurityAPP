import { NodeType } from "@generated/prisma/enums";
import { toTrackEngineError } from "../errors";
import {
  findTrackMapData,
  findTrackNodeData,
  upsertNodeProgress,
  updateTakesStatus,
} from "../repositories";
import type {
  TrackMapDTO,
  TrackNodeContentDTO,
} from "../types";

function resolveNodeMeta(node: {
  nodeType: NodeType;
  id: number;
  lesson: { title: string } | null;
  exercises: { type: string }[];
}, lastNodeId: number | undefined) {
  const isFinalTest = node.id === lastNodeId && node.nodeType === "exercise";
  const title = node.lesson?.title ?? (isFinalTest ? "Teste final" : "Exercícios práticos");

  return { title, isFinalTest };
}

export async function getTrackMap(
  trackId: number,
  focusNodeId: number | undefined,
  userId: string,
): Promise<TrackMapDTO | null> {
  try {
    const track = await findTrackMapData(trackId, userId);

    if (!track) {
      return null;
    }

    if (
      focusNodeId !== undefined &&
      !track.trackNode.some(({ id }) => id === focusNodeId)
    ) {
      return null;
    }

    const mostAdvancedNode = track.trackNode
      .filter(({ progress }) => progress.length > 0)
      .at(-1);

    const currentNodeId =
      focusNodeId ?? mostAdvancedNode?.id ?? track.trackNode[0]?.id ?? null;

    const totalNodes = track.trackNode.length;
    const completedNodes = track.trackNode.filter(
      ({ progress }) => progress.length > 0,
    ).length;

    const nextUpNode = track.trackNode.find(({ progress }) => progress.length === 0);

    const lastNodeId = track.trackNode.at(-1)?.id;

      return {
      id: track.id,
      theme: track.theme,
      focusNodeId: currentNodeId,
      totalNodes: totalNodes,
      completedNodes: completedNodes,
      nodes: track.trackNode.map((node) => {
        const { title, isFinalTest } = resolveNodeMeta(node, lastNodeId);
        const isCompleted = node.progress.length > 0;
        const isNextUp = node.id === nextUpNode?.id;
        const isMostAdvanced =
          mostAdvancedNode !== undefined && node.id === mostAdvancedNode.id;

      return {
          id: node.id,
          orderIndex: node.orderIndex,
          nodeType: node.nodeType,
          title,
          kindLabel: isFinalTest
            ? "Teste final"
            : node.nodeType === "lesson"
              ? "Teoria"
              : "Exercícios práticos",
          isCompleted,
          isCurrent: node.id === currentNodeId,
          isMostAdvanced,
          isFinalTest,
          isNextUp,
          isUnlocked: isCompleted || isNextUp,
        };
      }),
    };
   } catch (error) {
    throw toTrackEngineError(
      error,
      "tracks-engine:getTrackMap",
      "Não foi possível carregar o mapa da trilha.",
    );
  }
}

export async function getTrackNode(
  trackId: number,
  nodeId: number,
  userId: string,
): Promise<TrackNodeContentDTO | null> {
  try {
    const node = await findTrackNodeData(trackId, nodeId);
    
    if (!node) {
      return null;
    }

    const track = await findTrackMapData(trackId, userId);
    
    if (!track) {
      return null;
    }
    
    const lastNodeId = track.trackNode.at(-1)?.id;

    const { title, isFinalTest } = resolveNodeMeta(node, lastNodeId);
    return {
      id: node.id,
      trackId: node.trackId,
      nodeType: node.nodeType,
      title,
      isFinalTest,
    };
    } catch (error) {
    throw toTrackEngineError(
      error,
      "tracks-engine:getTrackNode",
      "Não foi possível carregar o conteúdo da etapa.",
    );
  }
}

export async function completeTrackIfPassed(
  userId: string,
  trackId: number,
  trackNodeId: number,
  score: number,
): Promise<{ passed: boolean }> {
  try {
    const passed = score >= 80;

    await upsertNodeProgress(userId, trackNodeId, {
      isCompleted: passed,
      score,
    });

    if (passed) {
      await updateTakesStatus(userId, trackId);
    }

    return { passed };
    } catch (error) {
    throw toTrackEngineError(
      error,
      "tracks-engine:completeTrackIfPassed",
      "Não foi possível registrar o resultado do teste final.",
    );
  }
}
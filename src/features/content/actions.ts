"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { ContentDeliveryService } from "./services/content-delivery";
import { ProgressTrackingService } from "./services/progress-tracking";
import {
  submissionSchema,
  LessonContent,
  ExercisesContent,
  Result,
} from "./types/content.types";
import { getSessionWithRefresh } from "@/core/security";
import { redirect } from "next/navigation";
import { getContentFailure } from "./errors";

const contentDeliveryService = new ContentDeliveryService();
const progressTrackingService = new ProgressTrackingService();
const entityIdSchema = z.number().int().safe().min(1).max(2_147_483_647);

async function getAuthenticatedUserId(): Promise<string> {
  const session = await getSessionWithRefresh();
  if (!session?.sub) redirect("/auth/login");
  return session.sub;
}

type ActionResponse<T> =
  | { success: true; statusCode: number; data: T }
  | { success: false; statusCode: number; error: string };

export async function getLessonContentAction(
  trackNodeId: number
): Promise<ActionResponse<LessonContent>> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!entityIdSchema.safeParse(trackNodeId).success) {
      return { success: false, statusCode: 400, error: "Dados inválidos." };
    }
    const data = await contentDeliveryService.getLessonContent(userId, trackNodeId);
    return { success: true, statusCode: 200, data };
  } catch (err) {
    return getContentFailure(err, "content:getLessonContent", "Erro ao carregar o conteúdo da lição.");
  }
}

export async function getExercisesContentAction(
  trackNodeId: number
): Promise<ActionResponse<ExercisesContent>> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!entityIdSchema.safeParse(trackNodeId).success) {
      return { success: false, statusCode: 400, error: "Dados inválidos." };
    }
    const data = await contentDeliveryService.getExercisesContent(userId, trackNodeId);
    return { success: true, statusCode: 200, data };
  } catch (err) {
    return getContentFailure(err, "content:getExercises", "Erro ao carregar os exercícios.");
  }
}

export async function completeLessonAction(
  trackNodeId: number,
  trackId: number
): Promise<ActionResponse<{ message: string }>> {
  try {
    const userId = await getAuthenticatedUserId();
    if (
      !entityIdSchema.safeParse(trackNodeId).success ||
      !entityIdSchema.safeParse(trackId).success
    ) {
      return { success: false, statusCode: 400, error: "Dados inválidos." };
    }
    await progressTrackingService.completeLesson(userId, trackNodeId);

    // Revalida a rota da trilha para atualizar os nós acessíveis
    revalidatePath(`/tracks/${trackId}`);

    return {
      success: true,
      statusCode: 200,
      data: { message: "Leitura concluída com sucesso." },
    };
  } catch (err) {
    return getContentFailure(err, "content:completeLesson", "Erro ao concluir a leitura da lição.");
  }
}

export async function submitExercisesAction(
  trackId: number,
  rawPayload: unknown
): Promise<ActionResponse<Result>> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!entityIdSchema.safeParse(trackId).success) {
      return { success: false, statusCode: 400, error: "Dados inválidos." };
    }
    // Validação estrita dos dados recebidos com o Zod
    const parsedSubmission = submissionSchema.safeParse(rawPayload);
    if (!parsedSubmission.success) {
      return { success: false, statusCode: 400, error: "Dados inválidos." };
    }

    // Executa a correção (corte de 60% ou 80%) e persistência
    const result = await progressTrackingService.submitExercises(
      userId,
      parsedSubmission.data
    );

    // Se o nó foi superado com sucesso, revalida a interface da trilha
    if (result.isNodeCompleted) {
      revalidatePath(`/tracks/${trackId}`);
    }

    return { success: true, statusCode: 200, data: result };
  } catch (err) {
    return getContentFailure(err, "content:submitExercises", "Erro ao processar as respostas dos exercícios.");
  }
}

export async function getNodeTypeAction(
  trackNodeId: number
): Promise<ActionResponse<{ nodeType: "lesson" | "exercise" }>> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!entityIdSchema.safeParse(trackNodeId).success) {
      return { success: false, statusCode: 400, error: "Dados inválidos." };
    }
    const node = await contentDeliveryService.validateNodeAccess(userId, trackNodeId);

    return {
      success: true,
      statusCode: 200,
      data: { nodeType: node.nodeType },
    };
  } catch (err) {
    return getContentFailure(err, "content:getNodeType", "Erro ao carregar as informações do nó.");
  }
}
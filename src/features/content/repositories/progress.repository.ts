import { prisma } from "@/core/database/prisma";

export interface ExerciseAnswerUpdateInput {
  exerciseId: number;
  isCorrect: boolean;
}

export interface SaveExercisesProgressInput {
  userId: string;
  trackNodeId: number;
  trackId: number;
  score: number;
  isNodeCompleted: boolean;
  isLastTrackNode: boolean;
  exerciseEvaluations: ExerciseAnswerUpdateInput[];
}

export class ProgressRepository {

  async findUserNodeProgress(userId: string, trackNodeId: number) {
    return prisma.progress.findUnique({
      where: {
        userId_trackNodeId: {
          userId,
          trackNodeId,
        },
      },
    });
  }

  async isNodeCompletedByUser(userId: string, trackNodeId: number): Promise<boolean> {
    const progress = await this.findUserNodeProgress(userId, trackNodeId);
    return progress?.isCompleted ?? false;
  }


  async completeLessonNode(userId: string, trackNodeId: number, trackId: number, isLastNode: boolean) {
    return prisma.$transaction(async (tx) => {
      const progress = await tx.progress.upsert({
        where: {
          userId_trackNodeId: {
            userId,
            trackNodeId,
          },
        },
        create: {
          userId,
          trackNodeId,
          isCompleted: true,
          score: 100,
          attemptsCount: 1,
          completedAt: new Date(),
          unlockedAt: new Date(),
        },
        update: {
          isCompleted: true,
          score: 100,
          completedAt: new Date(),
        },
      });

      if (isLastNode) {
        await tx.takes.update({
          where: {
            userId_trackId: {
              userId,
              trackId,
            },
          },
          data: {
            status: "completed",
            completedAt: new Date(),
          },
        });
      }

      return progress;
    });
  }

  async saveExerciseSubmissionTransaction(data: SaveExercisesProgressInput) {
    return prisma.$transaction(async (tx) => {
      const now = new Date();

      // 1. Atualiza os contadores de cada exercício individualmente em Answers
      for (const item of data.exerciseEvaluations) {
        await tx.answers.upsert({
          where: {
            exerciseId_userId: {
              exerciseId: item.exerciseId,
              userId: data.userId,
            },
          },
          create: {
            exerciseId: item.exerciseId,
            userId: data.userId,
            isCompleted: item.isCorrect,
            attemptsCount: 1,
            correctCount: item.isCorrect ? 1 : 0,
            incorrectCount: item.isCorrect ? 0 : 1,
            lastAnsweredAt: now,
          },
          update: {
            attemptsCount: { increment: 1 },
            correctCount: item.isCorrect ? { increment: 1 } : undefined,
            incorrectCount: !item.isCorrect ? { increment: 1 } : undefined,
            isCompleted: item.isCorrect ? true : undefined, // Mantém true se já tiver acertado antes
            lastAnsweredAt: now,
          },
        });
      }

      // 2. Busca o progresso atual do nó para não retroceder pontuações
      const currentProgress = await tx.progress.findUnique({
        where: {
          userId_trackNodeId: {
            userId: data.userId,
            trackNodeId: data.trackNodeId,
          },
        },
      });

      const previouslyCompleted = currentProgress?.isCompleted ?? false;
      const willBeCompleted = previouslyCompleted || data.isNodeCompleted;
      const bestScore = Math.max(currentProgress?.score ?? 0, data.score);

      const progress = await tx.progress.upsert({
        where: {
          userId_trackNodeId: {
            userId: data.userId,
            trackNodeId: data.trackNodeId,
          },
        },
        create: {
          userId: data.userId,
          trackNodeId: data.trackNodeId,
          isCompleted: data.isNodeCompleted,
          score: data.score,
          attemptsCount: 1,
          completedAt: data.isNodeCompleted ? now : null,
          unlockedAt: now,
        },
        update: {
          attemptsCount: { increment: 1 },
          score: bestScore,
          isCompleted: willBeCompleted,
          completedAt: willBeCompleted && !currentProgress?.completedAt ? now : currentProgress?.completedAt,
        },
      });

      // 3. Se for o último nó da trilha (ex: teste final) e foi superado, conclui em Takes
      if (data.isLastTrackNode && willBeCompleted) {
        await tx.takes.update({
          where: {
            userId_trackId: {
              userId: data.userId,
              trackId: data.trackId,
            },
          },
          data: {
            status: "completed",
            completedAt: now,
          },
        });
      }

      return progress;
    });
  }
}
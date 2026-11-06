import { Exercise } from "@generated/prisma/client";
import {
  Submission,
  Result,
  exerciseInternalJsonSchema,
  AnswerValue,
} from "../types/content.types";
import { ExerciseAnswerUpdateInput } from "../repositories/progress.repository";
import { ContentError } from "../errors";

export interface EvaluationOutcome {
  result: Result;
  exerciseEvaluations: ExerciseAnswerUpdateInput[];
  isNodeCompleted: boolean;
  score: number;
}

export class ExerciseEvaluationService {
  private checkAnswer(submitted: AnswerValue, correct: AnswerValue): boolean {
    if (Array.isArray(submitted) && Array.isArray(correct)) {
      if (submitted.length !== correct.length) return false;
      return submitted.every((val, index) => val === correct[index]);
    }

    if (typeof submitted === "string" && typeof correct === "string") {
      return submitted.trim().toLowerCase() === correct.trim().toLowerCase();
    }

    return submitted === correct;
  }

  evaluateSubmission(
    submission: Submission,
    exercisesFromDb: Exercise[],
    isFinalTest: boolean
  ): EvaluationOutcome {
    const submittedExerciseIds = submission.exercises.map(({ id }) => id);
    if (
      submission.exercises.length !== exercisesFromDb.length ||
      new Set(submittedExerciseIds).size !== submittedExerciseIds.length
    ) {
      throw new ContentError("Todas as questões do nó devem ser respondidas.", 400);  
    }

    const exerciseMap = new Map(exercisesFromDb.map((ex) => [ex.id, ex]));
    const evaluationsForRepo: ExerciseAnswerUpdateInput[] = [];
    const feedbackList = [];
    let correctAnswersCount = 0;

    for (const submissionItem of submission.exercises) {
      const exercise = exerciseMap.get(submissionItem.id);
      if (!exercise) {
        throw new ContentError(`Exercício ID ${submissionItem.id} não pertence a este nó.`, 400);  
      }

      const internalData = exerciseInternalJsonSchema.parse(exercise.json);
      const isCorrect = this.checkAnswer(submissionItem.value, internalData.correctAnswer);

      if (isCorrect) {
        correctAnswersCount++;
      }

      evaluationsForRepo.push({
        exerciseId: exercise.id,
        isCorrect,
      });

      feedbackList.push({
        id: exercise.id,
        isCorrect,
        feedback: internalData.explanation,
      });
    }

    const totalExercises = exercisesFromDb.length;
    const score = Math.round((correctAnswersCount / totalExercises) * 100);

    // Regra da nota de corte dinâmica
    const passingScore = isFinalTest ? 80 : 60;
    const isNodeCompleted = score >= passingScore;

    const result: Result = {
      trackNodeId: submission.trackNodeId,
      isNodeCompleted,
      score,
      passingScore,
      isFinalTest,
      exercises: feedbackList,
    };

    return {
      result,
      exerciseEvaluations: evaluationsForRepo,
      isNodeCompleted,
      score,
    };
  }
}
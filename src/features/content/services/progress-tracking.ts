import { TrackNodeRepository } from "../repositories/track-node.repository";
import { ProgressRepository } from "../repositories/progress.repository";
import { ExerciseEvaluationService } from "./exercise-evaluation";
import { ContentDeliveryService } from "./content-delivery";
import { Submission, Result } from "../types/content.types";
import { ContentError } from "../errors";

export class ProgressTrackingService {
  constructor(
    private readonly trackNodeRepo: TrackNodeRepository = new TrackNodeRepository(),
    private readonly progressRepo: ProgressRepository = new ProgressRepository(),
    private readonly evaluationService: ExerciseEvaluationService = new ExerciseEvaluationService(),
    private readonly contentDeliveryService: ContentDeliveryService = new ContentDeliveryService()
  ) {}

  async completeLesson(userId: string, trackNodeId: number) {
    const node = await this.contentDeliveryService.validateNodeAccess(userId, trackNodeId);
    if (node.nodeType !== "lesson") {
      throw new ContentError("Nó inválido ou não corresponde a uma lição.", 400);  
    }
    const isLastNode = await this.trackNodeRepo.isLastNodeOfTrack(node.trackId, node.orderIndex);

    return this.progressRepo.completeLessonNode(userId, node.id, node.trackId, isLastNode);
  }

  async submitExercises(userId: string, submission: Submission): Promise<Result> {
    const node = await this.contentDeliveryService.validateNodeAccess(
      userId,
      submission.trackNodeId
    );
    if (node.nodeType !== "exercise") {
        throw new ContentError("Nó inválido ou não corresponde a uma bateria de exercícios.", 400);
    }

    const exercisesFromDb = await this.trackNodeRepo.findExercisesByNodeId(node.id);
    if (!exercisesFromDb || exercisesFromDb.length === 0) {
        throw new ContentError("Não existem exercícios cadastrados para este nó.", 404);  
    }

    const isFinalTest = await this.trackNodeRepo.isLastNodeOfTrack(node.trackId, node.orderIndex);

    // Executa a correção aplicando a nota de corte adequada (80% se isFinalTest, 60% se regular)
    const evaluation = this.evaluationService.evaluateSubmission(
        submission,
        exercisesFromDb,
        isFinalTest
    );

    await this.progressRepo.saveExerciseSubmissionTransaction({
        userId,
        trackNodeId: node.id,
        trackId: node.trackId,
        score: evaluation.score,
        isNodeCompleted: evaluation.isNodeCompleted,
        isLastTrackNode: isFinalTest,
        exerciseEvaluations: evaluation.exerciseEvaluations,
    });

    return evaluation.result;
    }
}
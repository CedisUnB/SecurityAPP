import { ProgressTrackingService } from "./progress-tracking";
import { ContentError } from "../errors";

jest.mock("../repositories/track-node.repository", () => ({
  TrackNodeRepository: jest.fn(),
}));
jest.mock("../repositories/progress.repository", () => ({
  ProgressRepository: jest.fn(),
}));
async function expectContentError(
  promise: Promise<unknown>,
  message: string,
  statusCode: 400 | 403 | 404,
) {
  const error = await promise.then(() => null, (rejection: unknown) => rejection);

  expect(error).toBeInstanceOf(ContentError);
  expect(error).toMatchObject({
    message: expect.stringContaining(message),
    statusCode,
  });
} 

describe("ProgressTrackingService", () => {
  it("completes lessons with the last-node flag and rejects invalid nodes", async () => {
    const nodes = { isLastNodeOfTrack: jest.fn() };
    const progress = { completeLessonNode: jest.fn().mockResolvedValue({ id: 4 }) };
    const delivery = { validateNodeAccess: jest.fn() };
    const service = new ProgressTrackingService(
      nodes as never,
      progress as never,
      {} as never,
      delivery as never,
    );
    delivery.validateNodeAccess.mockResolvedValue({ id: 4, trackId: 7, orderIndex: 2, nodeType: "lesson" });
    nodes.isLastNodeOfTrack.mockResolvedValue(true);
    await expect(service.completeLesson("u", 4)).resolves.toEqual({ id: 4 });
    expect(delivery.validateNodeAccess).toHaveBeenCalledWith("u", 4);
    expect(progress.completeLessonNode).toHaveBeenCalledWith("u", 4, 7, true);
    delivery.validateNodeAccess.mockResolvedValue({ id: 4, nodeType: "exercise" });
    await expectContentError(service.completeLesson("u", 4), "Nó inválido", 400);

    const blockedError = new ContentError("Acesso bloqueado: conclua o nó anterior da trilha para continuar.", 403);
    delivery.validateNodeAccess.mockRejectedValueOnce(blockedError);
    await expect(service.completeLesson("u", 4)).rejects.toBe(blockedError);
    expect(progress.completeLessonNode).toHaveBeenCalledTimes(1);
  });

  it("evaluates exercise submissions and persists the full transaction payload", async () => {
    const nodes = { findExercisesByNodeId: jest.fn(), isLastNodeOfTrack: jest.fn() };
    const progress = { saveExerciseSubmissionTransaction: jest.fn().mockResolvedValue(undefined) };
    const delivery = { validateNodeAccess: jest.fn() };
    const evaluation = {
      evaluateSubmission: jest.fn().mockReturnValue({
        score: 80,
        isNodeCompleted: true,
        result: { trackNodeId: 4, score: 80, isNodeCompleted: true },
        exerciseEvaluations: [{ exerciseId: 10, isCorrect: true }],
      }),
    };
    const service = new ProgressTrackingService(
      nodes as never,
      progress as never,
      evaluation as never,
      delivery as never,
    );
    delivery.validateNodeAccess.mockResolvedValue({ id: 4, trackId: 7, orderIndex: 3, nodeType: "exercise" });
    nodes.findExercisesByNodeId.mockResolvedValue([{ id: 10 }]);
    nodes.isLastNodeOfTrack.mockResolvedValue(true);
    const submission = { trackNodeId: 4, exercises: [{ id: 10, value: 1 }] };
    await expect(service.submitExercises("u", submission)).resolves.toEqual({ trackNodeId: 4, score: 80, isNodeCompleted: true });
    expect(delivery.validateNodeAccess).toHaveBeenCalledWith("u", 4);
    expect(evaluation.evaluateSubmission).toHaveBeenCalledWith(submission, [{ id: 10 }], true);
    expect(progress.saveExerciseSubmissionTransaction).toHaveBeenCalledWith({
      userId: "u",
      trackNodeId: 4,
      trackId: 7,
      score: 80,
      isNodeCompleted: true,
      isLastTrackNode: true,
      exerciseEvaluations: [{ exerciseId: 10, isCorrect: true }],
    });
  });

  it("rejects missing/wrong nodes and nodes without exercises", async () => {
    const nodes = { findExercisesByNodeId: jest.fn() };
    const progress = { saveExerciseSubmissionTransaction: jest.fn() };
    const delivery = { validateNodeAccess: jest.fn() };
    const service = new ProgressTrackingService(
      nodes as never,
      progress as never,
      {} as never,
      delivery as never,
    );
    const notFoundError = new ContentError("Nó da trilha não encontrado.", 404);
    delivery.validateNodeAccess.mockRejectedValue(notFoundError);
    await expect(service.submitExercises("u", { trackNodeId: 4, exercises: [] })).rejects.toBe(notFoundError);

    delivery.validateNodeAccess.mockResolvedValue({ id: 4, nodeType: "lesson" });
    await expectContentError(service.submitExercises("u", { trackNodeId: 4, exercises: [] }), "Nó inválido", 400);

    delivery.validateNodeAccess.mockResolvedValue({ id: 4, nodeType: "exercise" });
    nodes.findExercisesByNodeId.mockResolvedValue(null);
    await expectContentError(service.submitExercises("u", { trackNodeId: 4, exercises: [] }), "Não existem exercícios", 404);

    nodes.findExercisesByNodeId.mockResolvedValue([]);
    await expectContentError(service.submitExercises("u", { trackNodeId: 4, exercises: [] }), "Não existem exercícios", 404);

    const blockedError = new ContentError("Acesso bloqueado: conclua o nó anterior da trilha para continuar.", 403);
    delivery.validateNodeAccess.mockRejectedValueOnce(blockedError);
    await expect(service.submitExercises("u", { trackNodeId: 4, exercises: [] })).rejects.toBe(blockedError);
    expect(progress.saveExerciseSubmissionTransaction).not.toHaveBeenCalled();
  });
});

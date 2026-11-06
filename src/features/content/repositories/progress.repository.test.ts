import { prisma } from "@/core/database/prisma";
import { ProgressRepository, SaveExercisesProgressInput } from "./progress.repository";

jest.mock("@/core/database/prisma", () => ({
  prisma: { progress: { findUnique: jest.fn(), upsert: jest.fn() }, takes: { update: jest.fn() }, answers: { upsert: jest.fn() }, $transaction: jest.fn() },
}));

const db = prisma as unknown as {
  progress: { findUnique: jest.Mock; upsert: jest.Mock };
  takes: { update: jest.Mock };
  answers: { upsert: jest.Mock };
  $transaction: jest.Mock;
};
const repository = new ProgressRepository();

function setupTransaction(tx: Record<string, unknown>) {
  db.$transaction.mockImplementation(async (callback: (transaction: unknown) => unknown) => callback(tx));
}

describe("ProgressRepository", () => {
  beforeEach(() => jest.clearAllMocks());

  it("finds progress and treats absent records as incomplete", async () => {
    db.progress.findUnique.mockResolvedValueOnce({ score: 80 }).mockResolvedValueOnce(null);
    await repository.findUserNodeProgress("u", 5);
    expect(db.progress.findUnique).toHaveBeenCalledWith({ where: { userId_trackNodeId: { userId: "u", trackNodeId: 5 } } });
    await expect(repository.isNodeCompletedByUser("u", 5)).resolves.toBe(false);
    db.progress.findUnique.mockResolvedValue({ isCompleted: true });
    await expect(repository.isNodeCompletedByUser("u", 5)).resolves.toBe(true);
  });

  it("upserts lesson progress and completes the track only for its last node", async () => {
    const progress = { id: 1 };
    const tx = { progress: { upsert: jest.fn().mockResolvedValue(progress) }, takes: { update: jest.fn() } };
    setupTransaction(tx);
    await expect(repository.completeLessonNode("u", 5, 9, false)).resolves.toEqual(progress);
    expect(tx.progress.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_trackNodeId: { userId: "u", trackNodeId: 5 } },
      create: expect.objectContaining({ userId: "u", trackNodeId: 5, isCompleted: true, score: 100, attemptsCount: 1 }),
      update: expect.objectContaining({ isCompleted: true, score: 100 }),
    }));
    expect(tx.takes.update).not.toHaveBeenCalled();
    await repository.completeLessonNode("u", 5, 9, true);
    expect(tx.takes.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_trackId: { userId: "u", trackId: 9 } },
      data: expect.objectContaining({ status: "completed" }),
    }));
  });

  it("persists answer counters, best scores, completion and final-track status", async () => {
    const tx = {
      answers: { upsert: jest.fn() },
      progress: {
        findUnique: jest.fn().mockResolvedValue({ isCompleted: false, score: 50, completedAt: null }),
        upsert: jest.fn().mockResolvedValue({ id: 2 }),
      },
      takes: { update: jest.fn() },
    };
    setupTransaction(tx);
    const input: SaveExercisesProgressInput = {
      userId: "u", trackNodeId: 5, trackId: 9, score: 80, isNodeCompleted: true, isLastTrackNode: true,
      exerciseEvaluations: [{ exerciseId: 1, isCorrect: true }, { exerciseId: 2, isCorrect: false }],
    };
    await expect(repository.saveExerciseSubmissionTransaction(input)).resolves.toEqual({ id: 2 });
    expect(tx.answers.upsert).toHaveBeenCalledTimes(2);
    expect(tx.answers.upsert).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { exerciseId_userId: { exerciseId: 1, userId: "u" } },
      create: expect.objectContaining({ isCompleted: true, correctCount: 1, incorrectCount: 0 }),
      update: expect.objectContaining({ correctCount: { increment: 1 }, isCompleted: true }),
    }));
    expect(tx.answers.upsert).toHaveBeenNthCalledWith(2, expect.objectContaining({
      create: expect.objectContaining({ isCompleted: false, correctCount: 0, incorrectCount: 1 }),
      update: expect.objectContaining({ correctCount: undefined, incorrectCount: { increment: 1 }, isCompleted: undefined }),
    }));
    expect(tx.progress.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ isCompleted: true, score: 80 }),
      update: expect.objectContaining({ score: 80, isCompleted: true, completedAt: expect.any(Date) }),
    }));
    expect(tx.takes.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_trackId: { userId: "u", trackId: 9 } },
      data: expect.objectContaining({ status: "completed" }),
    }));
  });

  it("preserves prior completion and score and skips final-track completion on failure", async () => {
    const completedAt = new Date("2025-01-01T00:00:00Z");
    const tx = {
      answers: { upsert: jest.fn() },
      progress: {
        findUnique: jest.fn().mockResolvedValue({ isCompleted: true, score: 95, completedAt }),
        upsert: jest.fn(),
      },
      takes: { update: jest.fn() },
    };
    setupTransaction(tx);
    await repository.saveExerciseSubmissionTransaction({
      userId: "u", trackNodeId: 5, trackId: 9, score: 40, isNodeCompleted: false, isLastTrackNode: true, exerciseEvaluations: [],
    });
    expect(tx.progress.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ score: 95, isCompleted: true, completedAt }),
    }));
    expect(tx.takes.update).toHaveBeenCalled();
    tx.progress.findUnique.mockResolvedValue(null);
    tx.takes.update.mockClear();
    await repository.saveExerciseSubmissionTransaction({
      userId: "u", trackNodeId: 5, trackId: 9, score: 40, isNodeCompleted: false, isLastTrackNode: true, exerciseEvaluations: [],
    });
    expect(tx.progress.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ isCompleted: false, completedAt: null }),
      update: expect.objectContaining({ score: 40, isCompleted: false, completedAt: undefined }),
    }));
    expect(tx.takes.update).not.toHaveBeenCalled();
  });
});

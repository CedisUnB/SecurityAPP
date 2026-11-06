import { ExerciseEvaluationService } from "./exercise-evaluation";
import { Submission } from "../types/content.types";
import { ContentError } from "../errors";

function exercise(id: number, correctAnswer: unknown, questionType = "fill_in_the_blank") {
  return {
    id,
    type: "revision",
    trackNodeId: 4,
    json: { questionType, prompt: "Pergunta", options: [], correctAnswer, explanation: `Dica ${id}` },
  };
}

function expectContentError(action: () => unknown, message: string, statusCode: 400 | 403 | 404) {
  let error: unknown = null;

  try {
    action();
  } catch (thrown) {
    error = thrown;
  }

  expect(error).toBeInstanceOf(ContentError);
  expect(error).toMatchObject({ message, statusCode });
}

describe("ExerciseEvaluationService", () => {
  const service = new ExerciseEvaluationService();

  it("compares arrays by order, strings ignoring case/space, and scalar values", () => {
    const submission: Submission = {
      trackNodeId: 4,
      exercises: [
        { id: 1, value: ["a", 2] },
        { id: 2, value: "  SIM " },
        { id: 3, value: 3 },
        { id: 4, value: ["b", "a"] },
      ],
    };
    const result = service.evaluateSubmission(submission, [
      exercise(1, ["a", 2], "ordering"),
      exercise(2, "sim"),
      exercise(3, 3),
      exercise(4, ["a", "b"], "ordering"),
    ] as never, false);

    expect(result.score).toBe(75);
    expect(result.result.exercises.map(({ isCorrect }) => isCorrect)).toEqual([true, true, true, false]);
    expect(result.exerciseEvaluations).toEqual([
      { exerciseId: 1, isCorrect: true },
      { exerciseId: 2, isCorrect: true },
      { exerciseId: 3, isCorrect: true },
      { exerciseId: 4, isCorrect: false },
    ]);
    expect(result.result.exercises[0].feedback).toBe("Dica 1");
  });

  it("applies regular and final-test pass thresholds", () => {
    const items = [exercise(1, 1), exercise(2, 2), exercise(3, 3), exercise(4, 4), exercise(5, 5)] as never;
    const regular = service.evaluateSubmission({
      trackNodeId: 4,
      exercises: [{ id: 1, value: 1 }, { id: 2, value: 0 }, { id: 3, value: 3 }, { id: 4, value: 0 }, { id: 5, value: 5 }],
    }, items, false);
    expect(regular.result.passingScore).toBe(60);
    expect(regular.isNodeCompleted).toBe(true);
    const finalTest = service.evaluateSubmission({
      trackNodeId: 4,
      exercises: [{ id: 1, value: 1 }, { id: 2, value: 0 }, { id: 3, value: 0 }, { id: 4, value: 0 }, { id: 5, value: 5 }],
    }, items, true);
    expect(finalTest.result.passingScore).toBe(80);
    expect(finalTest.isNodeCompleted).toBe(false);
    expect(finalTest.result.isFinalTest).toBe(true);
  });

    it("rejects missing answers, IDs from other nodes, and malformed stored answers", () => {
    expectContentError(
      () => service.evaluateSubmission({ trackNodeId: 4, exercises: [] }, [exercise(1, 1)] as never, false),
      "Todas as questões do nó devem ser respondidas.",
      400,
    );

    expectContentError(
      () => service.evaluateSubmission({
        trackNodeId: 4,
        exercises: [{ id: 1, value: 1 }, { id: 1, value: 1 }],
      }, [exercise(1, 1), exercise(2, 2)] as never, false),
      "Todas as questões do nó devem ser respondidas.",
      400,
    );

    expectContentError(
      () => service.evaluateSubmission({ trackNodeId: 4, exercises: [{ id: 9, value: 1 }] }, [exercise(1, 1)] as never, false),
      "Exercício ID 9 não pertence a este nó.",
      400,
    );

    // Resposta gabarito corrompida no banco é falha interna: deve lançar, mas NÃO ser ContentError
    // (assim a action devolve a mensagem genérica e registra no log, sem expor o problema).
    let storedAnswerError: unknown = null;
    try {
      service.evaluateSubmission({ trackNodeId: 4, exercises: [{ id: 1, value: 1 }] }, [exercise(1, {})] as never, false);
    } catch (thrown) {
      storedAnswerError = thrown;
    }
    expect(storedAnswerError).toBeInstanceOf(Error);
    expect(storedAnswerError).not.toBeInstanceOf(ContentError);
  });
});

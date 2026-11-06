import {
  AnswerValue,
  ExerciseInternalJson,
  answerValueSchema,
  exerciseInternalJsonSchema,
  exercisePublicJsonSchema,
  exercisesSchema,
  lessonSchema,
  resultSchema,
  submissionSchema,
} from "./content.types";

describe("content schemas", () => {
  it("validates lesson content and rejects malformed slides", () => {
    const lesson = {
      id: 1,
      orderIndex: 0,
      nodeType: "lesson",
      trackId: 5,
      title: "Introdução",
      json: { slides: [{ tag: "Base", body: "Texto", title: "Slide", source: null }] },
    };

    expect(lessonSchema.parse(lesson)).toEqual(lesson);
    expect(() => lessonSchema.parse({ ...lesson, json: { slides: [{ ...lesson.json.slides[0], source: 4 }] } })).toThrow();
  });

  it("accepts supported answers and rejects invalid answer values", () => {
    const answers: AnswerValue[] = [2, "resposta", [1, "dois"]];
    for (const answer of answers) expect(answerValueSchema.parse(answer)).toEqual(answer);
    expect(() => answerValueSchema.parse([true])).toThrow();
  });

  it("defaults options and preserves optional exercise explanations", () => {
    const internal = exerciseInternalJsonSchema.parse({
      questionType: "multiple_choice",
      prompt: "Escolha",
      correctAnswer: 0,
      explanation: "Porque sim",
    });
    expect(internal.options).toEqual([]);
    expect(internal.explanation).toBe("Porque sim");
    expect(exerciseInternalJsonSchema.parse({
      questionType: "custom-format",
      prompt: "Pergunta",
      options: ["A"],
      correctAnswer: "A",
    }).questionType).toBe("custom-format");
    expect(() => exerciseInternalJsonSchema.parse({
      questionType: "ordering",
      prompt: "Pergunta",
      correctAnswer: {},
    })).toThrow();
  });

  it("removes answers and explanations from the public exercise schema", () => {
    const internal: ExerciseInternalJson = {
      questionType: "true_false",
      prompt: "É verdadeiro?",
      options: ["Sim"],
      correctAnswer: 0,
      explanation: "Detalhes internos",
    };
    expect(exercisePublicJsonSchema.parse(internal)).toEqual({
      questionType: "true_false",
      prompt: "É verdadeiro?",
      options: ["Sim"],
    });
  });

  it("validates exercise nodes and non-empty submissions", () => {
    const node = {
      id: 2,
      orderIndex: 1,
      nodeType: "exercise",
      exercises: [{
        id: 10,
        type: "revision",
        json: { questionType: "fill_in_the_blank", prompt: "Complete", options: [] },
      }],
    };
    expect(exercisesSchema.parse(node)).toEqual(node);
    expect(() => exercisesSchema.parse({ ...node, exercises: [{ ...node.exercises[0], type: "quiz" }] })).toThrow();
    expect(submissionSchema.parse({ trackNodeId: 2, exercises: [{ id: 10, value: ["a", 1] }] })).toEqual({
      trackNodeId: 2,
      exercises: [{ id: 10, value: ["a", 1] }],
    });
    expect(() => submissionSchema.parse({ trackNodeId: 2, exercises: [] })).toThrow();
    expect(() => submissionSchema.parse({
      trackNodeId: 2,
      exercises: [{ id: 10, value: 1 }, { id: 10, value: 1 }],
    })).toThrow("Cada questão deve ser respondida apenas uma vez.");
  });

  it("rejects oversized or out-of-range submission values", () => {
    expect(submissionSchema.safeParse({
      trackNodeId: 2,
      exercises: [{ id: 10, value: "x".repeat(2_001) }],
    }).success).toBe(false);
    expect(submissionSchema.safeParse({
      trackNodeId: 0,
      exercises: [{ id: 10, value: 1 }],
    }).success).toBe(false);
    expect(submissionSchema.safeParse({
      trackNodeId: 2,
      exercises: [{ id: 10, value: 1, unexpected: true }],
    }).success).toBe(false);
  });

  it("validates exercise results and score bounds", () => {
    const result = {
      trackNodeId: 2,
      isNodeCompleted: false,
      score: 60,
      passingScore: 80,
      isFinalTest: true,
      exercises: [{ id: 10, isCorrect: false, feedback: "Tente novamente" }],
    };
    expect(resultSchema.parse(result)).toEqual(result);
    expect(() => resultSchema.parse({ ...result, score: 101 })).toThrow();
    expect(() => resultSchema.parse({ ...result, exercises: [{ id: 10, isCorrect: true, feedback: 1 }] })).toThrow();
  });
});

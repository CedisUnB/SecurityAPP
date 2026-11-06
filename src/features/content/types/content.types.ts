import { z } from "zod";

export const NodeTypeSchema = z.enum(["lesson", "exercise"])

export const ExerciseTypeSchema = z.enum(["revision", "test"])

export const QuestionFormatSchema = z.enum([
  "multiple_choice",
  "true_false",
  "fill_in_the_blank",
  "ordering",
]);

const positiveIdSchema = z.number().int().safe().min(1).max(2_147_483_647);
const answerTextSchema = z.string().max(2_000);
const answerArraySchema = z.array(z.union([z.number().int().safe(), answerTextSchema])).max(100);

export const lessonSchema = z.object({
    id: positiveIdSchema,
    orderIndex: z.number().int().safe().min(0).max(2_147_483_647),
    nodeType: NodeTypeSchema,
    trackId: positiveIdSchema,
    title: z.string().max(500),
    json: z.object({
        slides: z.array(
            z.object({
                tag: z.string().max(100),
                body: z.string().max(20_000),
                title: z.string().max(500),
                source: z.string().max(2_000).nullable(),
            }).strict()
        ).max(100),
    }).strict(),
}).strict()

export const answerValueSchema = z.union([
  z.number().int().safe(),
  answerTextSchema,
  answerArraySchema,
]);

export const exerciseInternalJsonSchema = z.object({
  questionType: QuestionFormatSchema.or(z.string().max(100)),
  prompt: z.string().max(20_000),
  options: z.array(z.string().max(2_000)).max(100).default([]),
  correctAnswer: answerValueSchema,
  explanation: z.string().max(20_000).optional(),
});

export const exercisePublicJsonSchema = exerciseInternalJsonSchema.omit({
  correctAnswer: true,
  explanation: true,
});

export const exercisesSchema = z.object({
  id: positiveIdSchema,
  orderIndex: z.number().int().safe().min(0).max(2_147_483_647),
  nodeType: NodeTypeSchema,
  exercises: z.array(
    z.object({
      id: positiveIdSchema,
      type: ExerciseTypeSchema,
      json: exercisePublicJsonSchema,
    }).strict()
  ).max(100),
}).strict();

export const submissionSchema = z.object({
    trackNodeId: positiveIdSchema,
    exercises: z.array(
        z.object({
            id: positiveIdSchema,
            value: answerValueSchema,
        }).strict()
    ).min(1).max(100),
}).strict().superRefine((submission, context) => {
  const exerciseIds = submission.exercises.map(({ id }) => id);
  if (new Set(exerciseIds).size !== exerciseIds.length) {
    context.addIssue({
      code: "custom",
      path: ["exercises"],
      message: "Cada questão deve ser respondida apenas uma vez.",
    });
  }
});

export const resultSchema = z.object({
    trackNodeId: z.number().int(),
    isNodeCompleted: z.boolean(),
    score: z.number().int().min(0).max(100),
    passingScore: z.number().int(), // 80 se for teste final, 60 se for revisão regular
    isFinalTest: z.boolean(),
    exercises: z.array(
        z.object({
            id: z.number().int(),
            isCorrect: z.boolean(),
            feedback: z.string().optional(),
    })
  ),
});

export type AnswerValue = z.infer<typeof answerValueSchema>;
export type LessonContent = z.infer<typeof lessonSchema>;
export type ExerciseInternalJson = z.infer<typeof exerciseInternalJsonSchema>;
export type ExercisePublicJson = z.infer<typeof exercisePublicJsonSchema>;
export type ExercisesContent = z.infer<typeof exercisesSchema>;
export type Submission = z.infer<typeof submissionSchema>;
export type Result = z.infer<typeof resultSchema>;
import { readFileSync } from "node:fs";
import { ExerciseType, NodeType } from "../generated/prisma/client";
import { prisma } from "../src/core/database/prisma";

type SeedSlide = {
  tag: string;
  title: string;
  body: string;
  source: string | null;
};

type SeedLesson = {
  title: string;
  slides: SeedSlide[];
};

type SeedQuestion = {
  questionType: string;
  prompt: string;
  options: string[];
  correctAnswer: number | string | Array<number | string>;
  explanation: string;
};

type SeedTrack = {
  theme: string;
  description: string;
  lessons: SeedLesson[];
  revisionExercises: SeedQuestion[][];
  finalExercises: SeedQuestion[];
};

type SeedData = { tracks: SeedTrack[] };

const seedData = JSON.parse(
  readFileSync(new URL("./seed-data.json", import.meta.url), "utf8"),
) as SeedData;

function validateSeedData(data: SeedData): void {
  if (!Array.isArray(data.tracks) || data.tracks.length === 0) {
    throw new Error("O arquivo seed-data.json não contém trilhas.");
  }

  for (const track of data.tracks) {
    if (
      !track.theme ||
      !track.description ||
      track.lessons.length === 0 ||
      track.lessons.length !== track.revisionExercises.length ||
      track.finalExercises.length === 0
    ) {
      throw new Error(`Dados incompletos para a trilha "${track.theme}".`);
    }

    for (const [index, lesson] of track.lessons.entries()) {
      const slides = lesson.slides;
      if (
        !lesson.title.startsWith("Lição ") ||
        slides.length < 2 ||
        slides[0].tag !== "Por que isso importa" ||
        slides.at(-1)?.tag !== "Resumo" ||
        slides.at(-1)?.source == null ||
        slides.slice(0, -1).some((slide) => slide.source !== null) ||
        track.revisionExercises[index].length === 0
      ) {
        throw new Error(
          `Lição ou exercícios inválidos na trilha "${track.theme}", posição ${index + 1}.`,
        );
      }
    }
  }
}

async function seedTrack(trackData: SeedTrack): Promise<boolean> {
  return prisma.$transaction(
    async (transaction) => {
      const existingTrack = await transaction.track.findFirst({
        where: { theme: trackData.theme },
        select: { id: true },
      });

      if (existingTrack) {
        return false;
      }

      const track = await transaction.track.create({
        data: {
          theme: trackData.theme,
          description: trackData.description,
        },
      });

      for (const [index, lesson] of trackData.lessons.entries()) {
        const lessonOrder = index * 2 + 1;
        const lessonNode = await transaction.trackNode.create({
          data: {
            trackId: track.id,
            nodeType: NodeType.lesson,
            orderIndex: lessonOrder,
          },
        });

        await transaction.lesson.create({
          data: {
            trackNodeId: lessonNode.id,
            title: lesson.title,
            json: { slides: lesson.slides },
          },
        });

        const revisionNode = await transaction.trackNode.create({
          data: {
            trackId: track.id,
            nodeType: NodeType.exercise,
            orderIndex: lessonOrder + 1,
          },
        });

        await transaction.exercise.createMany({
          data: trackData.revisionExercises[index].map((json) => ({
            trackNodeId: revisionNode.id,
            type: ExerciseType.revision,
            json,
          })),
        });
      }

      const finalTestNode = await transaction.trackNode.create({
        data: {
          trackId: track.id,
          nodeType: NodeType.exercise,
          orderIndex: trackData.lessons.length * 2 + 1,
        },
      });

      await transaction.exercise.createMany({
        data: trackData.finalExercises.map((json) => ({
          trackNodeId: finalTestNode.id,
          type: ExerciseType.test,
          json,
        })),
      });

      return true;
    },
    { maxWait: 10_000, timeout: 30_000 },
  );
}

async function runProductionSeed(): Promise<void> {
  validateSeedData(seedData);

  for (const track of seedData.tracks) {
    const created = await seedTrack(track);
    console.info(
      created
        ? `Trilha criada: ${track.theme}`
        : `Trilha já existente; mantendo os dados: ${track.theme}`,
    );
  }

  console.info("Seed de produção concluído.");
}

runProductionSeed()
  .catch((error: unknown) => {
    console.error("Falha ao executar o seed de produção:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

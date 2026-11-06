import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { ExerciseType, NodeType } from "@generated/prisma/client";
import { prisma } from "@/core/database/prisma";

export const TEST_PASSWORD = "SenhaTeste123!";

const authorizedPrefixes = new Set<string>();
const databaseHost = process.env.DATABASE_HOST ?? "127.0.0.1";
const localDatabaseHosts = new Set(["127.0.0.1", "localhost", "db"]);

if (!localDatabaseHosts.has(databaseHost)) {
  throw new Error(
    `track-fixtures: refusing to run against non-local database host "${databaseHost}".`,
  );
}

export function createTestPrefix(): string {
  const prefix = `__test_${randomUUID().slice(0, 8)}__`;
  authorizedPrefixes.add(prefix);
  return prefix;
}

function assertAuthorizedPrefix(prefix: string): void {
  if (!authorizedPrefixes.has(prefix)) {
    throw new Error(
      "track-fixtures: prefix was not created by createTestPrefix().",
    );
  }
}

export async function createStudent(
  prefix: string,
): Promise<{ id: string; email: string }> {
  assertAuthorizedPrefix(prefix);

  const email = `${prefix}${randomUUID()}@example.test`;
  const password = await bcrypt.hash(TEST_PASSWORD, 4);

  const student = await prisma.user.create({
    data: {
      email,
      username: `${prefix}student`,
      password,
      role: "student",
    },
    select: { id: true, email: true },
  });

  return student;
}

export async function createTrack(
  prefix: string,
  opts: { lessons: number; withFinalTest: boolean },
): Promise<{
  id: number;
  theme: string;
  contentNodeIds: number[];
  finalTestNodeId: number | null;
}> {
  assertAuthorizedPrefix(prefix);

  if (!Number.isInteger(opts.lessons) || opts.lessons < 1) {
    throw new Error("createTrack requires at least one lesson.");
  }

  const theme = `${prefix}track-${randomUUID()}`;
  const track = await prisma.track.create({
    data: {
      theme,
      description: `Trilha de integração ${theme}`,
    },
    select: { id: true, theme: true },
  });

  const contentNodeIds: number[] = [];
  let finalTestNodeId: number | null = null;

  for (let index = 0; index < opts.lessons; index += 1) {
    const lessonTitle = `${theme} lesson ${index + 1}`;
    const lessonNode = await prisma.trackNode.create({
      data: {
        trackId: track.id,
        nodeType: NodeType.lesson,
        orderIndex: index * 2 + 1,
        lesson: {
          create: {
            title: lessonTitle,
            json: {
              slides: [
                {
                  tag: "Integração",
                  title: lessonTitle,
                  body: "<p>Conteúdo para testes de integração.</p>",
                  source: null,
                },
              ],
            },
          },
        },
      },
      select: { id: true },
    });
    contentNodeIds.push(lessonNode.id);

    const isFinalTest = opts.withFinalTest && index === opts.lessons - 1;
    const exerciseNode = await prisma.trackNode.create({
      data: {
        trackId: track.id,
        nodeType: NodeType.exercise,
        orderIndex: index * 2 + 2,
        exercises: {
          create: {
            type: isFinalTest ? ExerciseType.test : ExerciseType.revision,
            json: {
              type: "multiple_choice",
              prompt: "Pergunta para testes de integração.",
              options: ["Opção A", "Opção B", "Opção C"],
              correctOption: 0,
              feedback: "Feedback para testes de integração.",
            },
          },
        },
      },
      select: { id: true },
    });

    if (isFinalTest) {
      finalTestNodeId = exerciseNode.id;
    } else {
      contentNodeIds.push(exerciseNode.id);
    }
  }

  return {
    id: track.id,
    theme: track.theme,
    contentNodeIds,
    finalTestNodeId,
  };
}

export async function startTrack(userId: string, trackId: number): Promise<void> {
  await prisma.takes.upsert({
    where: { userId_trackId: { userId, trackId } },
    create: { userId, trackId, status: "in_progress" },
    update: {},
  });
}

export async function completeNodes(
  userId: string,
  nodeIds: number[],
): Promise<void> {
  const completedAt = new Date();

  await Promise.all(
    nodeIds.map((trackNodeId) =>
      prisma.progress.upsert({
        where: { userId_trackNodeId: { userId, trackNodeId } },
        create: { userId, trackNodeId, isCompleted: true, completedAt },
        update: { isCompleted: true, completedAt },
      }),
    ),
  );
}

export async function markTrackCompleted(
  userId: string,
  trackId: number,
): Promise<void> {
  const completedAt = new Date();

  await prisma.takes.upsert({
    where: { userId_trackId: { userId, trackId } },
    create: { userId, trackId, status: "completed", completedAt },
    update: { status: "completed", completedAt },
  });
}

export async function cleanup(prefix: string): Promise<void> {
  assertAuthorizedPrefix(prefix);

  await prisma.track.deleteMany({
    where: { theme: { startsWith: prefix } },
  });
  await prisma.user.deleteMany({
    where: { email: { startsWith: prefix } },
  });
}

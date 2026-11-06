/**
 * @jest-environment node
 */
import { prisma } from "@/core/database/prisma";
import {
  cleanup,
  completeNodes,
  createStudent,
  createTestPrefix,
  createTrack,
  startTrack,
} from "../../helpers/track-fixtures";
import { listTracks } from "@/features/tracks-engine/services/tracks";

const PREFIX = createTestPrefix();

jest.setTimeout(30000);

describe("Catálogo de trilhas (US06)", () => {
  afterAll(async () => {
    try {
      await cleanup(PREFIX);
    } finally {
      await prisma.$disconnect();
    }
  }, 30000);

  it("retorna a quantidade total e nenhum progresso para uma trilha sem atividade", async () => {
    const student = await createStudent(PREFIX);
    const track = await createTrack(PREFIX, {
      lessons: 2,
      withFinalTest: false,
    });

    const catalog = await listTracks(student.id);
    const entry = catalog.find(({ id }) => id === track.id);

    expect(entry).toMatchObject({
      totalNodes: 4,
      completedNodes: 0,
      isStarted: false,
    });
  });

  it("mostra dois de quatro nós concluídos em uma trilha iniciada", async () => {
    const student = await createStudent(PREFIX);
    const track = await createTrack(PREFIX, {
      lessons: 2,
      withFinalTest: false,
    });
    await startTrack(student.id, track.id);
    await completeNodes(student.id, track.contentNodeIds.slice(0, 2));

    const catalog = await listTracks(student.id);
    const entry = catalog.find(({ id }) => id === track.id);

    expect(entry).toMatchObject({
      totalNodes: 4,
      completedNodes: 2,
      isStarted: true,
    });
  });

  it("contabiliza todos os nós quando a trilha está 100% concluída", async () => {
    const student = await createStudent(PREFIX);
    const track = await createTrack(PREFIX, {
      lessons: 2,
      withFinalTest: false,
    });
    await completeNodes(student.id, track.contentNodeIds);

    const catalog = await listTracks(student.id);
    const entry = catalog.find(({ id }) => id === track.id);

    expect(entry?.completedNodes).toBe(entry?.totalNodes);
    expect(entry?.totalNodes).toBe(4);
  });

  it("retorna a descrição persistida na trilha", async () => {
    const student = await createStudent(PREFIX);
    const track = await createTrack(PREFIX, {
      lessons: 1,
      withFinalTest: false,
    });

    const catalog = await listTracks(student.id);
    const entry = catalog.find(({ id }) => id === track.id);

    expect(entry?.description).toBe(`Trilha de integração ${track.theme}`);
  });
});

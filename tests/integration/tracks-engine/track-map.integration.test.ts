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
} from "../../helpers/track-fixtures";
import {
  getTrackMap,
  getTrackNode,
} from "@/features/tracks-engine/services/track-map";

const PREFIX = createTestPrefix();

jest.setTimeout(30000);

describe("Mapa e progresso da trilha (US07/US08)", () => {
  afterAll(async () => {
    try {
      await cleanup(PREFIX);
    } finally {
      await prisma.$disconnect();
    }
  }, 30000);

  it("ordena os nós e apresenta o rótulo correspondente a cada tipo", async () => {
    const student = await createStudent(PREFIX);
    const track = await createTrack(PREFIX, {
      lessons: 2,
      withFinalTest: true,
    });

    const map = await getTrackMap(track.id, undefined, student.id);

    expect(map?.nodes.map(({ orderIndex, kindLabel }) => [orderIndex, kindLabel])).toEqual([
      [1, "Teoria"],
      [2, "Exercícios práticos"],
      [3, "Teoria"],
      [4, "Teste final"],
    ]);
  });

  it("marca o progresso por nó e destaca somente o último nó concluído", async () => {
    const student = await createStudent(PREFIX);
    const track = await createTrack(PREFIX, {
      lessons: 2,
      withFinalTest: false,
    });
    await completeNodes(student.id, [track.contentNodeIds[0], track.contentNodeIds[2]]);

    const map = await getTrackMap(track.id, undefined, student.id);

    expect(map?.nodes.map(({ isCompleted }) => isCompleted)).toEqual([
      true,
      false,
      true,
      false,
    ]);
    expect(map?.nodes.map(({ isMostAdvanced }) => isMostAdvanced)).toEqual([
      false,
      false,
      true,
      false,
    ]);
    expect(map?.nodes.map(({ isUnlocked }) => isUnlocked)).toEqual([
      true,
      true,
      true,
      false,
    ]);
  });

  it("desbloqueia somente o próximo nó incompleto e os nós já concluídos", async () => {
    const student = await createStudent(PREFIX);
    const track = await createTrack(PREFIX, {
      lessons: 2,
      withFinalTest: false,
    });

    const initialMap = await getTrackMap(track.id, undefined, student.id);

    expect(initialMap?.nodes.map(({ isUnlocked }) => isUnlocked)).toEqual([
      true,
      false,
      false,
      false,
    ]);

    await completeNodes(student.id, [track.contentNodeIds[0]]);
    const afterFirstNodeMap = await getTrackMap(track.id, undefined, student.id);

    expect(afterFirstNodeMap?.nodes.map(({ isUnlocked }) => isUnlocked)).toEqual([
      true,
      true,
      false,
      false,
    ]);
  });

  it("não destaca um nó mais avançado quando não há progresso", async () => {
    const student = await createStudent(PREFIX);
    const track = await createTrack(PREFIX, {
      lessons: 1,
      withFinalTest: false,
    });

    const map = await getTrackMap(track.id, undefined, student.id);

    expect(map?.nodes.every(({ isMostAdvanced }) => !isMostAdvanced)).toBe(true);
  });

  it("respeita o foco em um nó pertencente à mesma trilha", async () => {
    const student = await createStudent(PREFIX);
    const track = await createTrack(PREFIX, {
      lessons: 2,
      withFinalTest: false,
    });
    const focusNodeId = track.contentNodeIds[2];

    const map = await getTrackMap(track.id, focusNodeId, student.id);

    expect(map?.focusNodeId).toBe(focusNodeId);
    expect(map?.nodes.find(({ id }) => id === focusNodeId)?.isCurrent).toBe(true);
  });

  it("rejeita foco em nó de outra trilha ou em nó inexistente", async () => {
    const student = await createStudent(PREFIX);
    const track = await createTrack(PREFIX, {
      lessons: 1,
      withFinalTest: false,
    });
    const otherTrack = await createTrack(PREFIX, {
      lessons: 1,
      withFinalTest: false,
    });
    const otherTrackNodeId = otherTrack.contentNodeIds[0];

    await expect(
      getTrackMap(track.id, otherTrackNodeId, student.id),
    ).resolves.toBeNull();
    await expect(
      getTrackMap(track.id, Number.MAX_SAFE_INTEGER, student.id),
    ).resolves.toBeNull();
  });

  it("contabiliza o teste final no total e no progresso da trilha", async () => {
    const student = await createStudent(PREFIX);
    const track = await createTrack(PREFIX, {
      lessons: 2,
      withFinalTest: true,
    });
    await completeNodes(student.id, track.contentNodeIds);

    const contentCompleteMap = await getTrackMap(track.id, undefined, student.id);

    expect(contentCompleteMap).toMatchObject({
      totalNodes: 4,
      completedNodes: 3,
    });

    if (track.finalTestNodeId === null) {
      throw new Error("A trilha deveria conter o teste final.");
    }
    await completeNodes(student.id, [track.finalTestNodeId]);
    const allCompleteMap = await getTrackMap(track.id, undefined, student.id);

    expect(allCompleteMap).toMatchObject({
      totalNodes: 4,
      completedNodes: 4,
    });
  });

  it("não retorna um nó pertencente a outra trilha", async () => {
    const student = await createStudent(PREFIX);
    const track = await createTrack(PREFIX, {
      lessons: 1,
      withFinalTest: false,
    });
    const otherTrack = await createTrack(PREFIX, {
      lessons: 1,
      withFinalTest: false,
    });

    await expect(
      getTrackNode(track.id, otherTrack.contentNodeIds[0], student.id),
    ).resolves.toBeNull();
  });

    it("libera o teste final somente quando todo o conteúdo anterior está concluído", async () => {
    const student = await createStudent(PREFIX);
    const track = await createTrack(PREFIX, { lessons: 2, withFinalTest: true });

    await completeNodes(student.id, track.contentNodeIds.slice(0, -1));
    const before = await getTrackMap(track.id, undefined, student.id);
    expect(before?.nodes.find(({ isFinalTest }) => isFinalTest)?.isUnlocked).toBe(false);

    await completeNodes(student.id, track.contentNodeIds.slice(-1));
    const after = await getTrackMap(track.id, undefined, student.id);
    expect(after?.nodes.find(({ isFinalTest }) => isFinalTest)).toMatchObject({
      isNextUp: true,
      isUnlocked: true,
    });
  });
});

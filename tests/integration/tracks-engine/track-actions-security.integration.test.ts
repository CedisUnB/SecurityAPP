/**
 * @jest-environment node
 */
import { redirect } from "next/navigation";
import { prisma } from "@/core/database/prisma";
import { getSessionWithRefresh } from "@/core/security";
import {
  getCatalogAction,
  getTrackMapAction,
  getTrackNodeAction,
} from "@/features/tracks-engine/actions";
import { getTrackMap } from "@/features/tracks-engine/services/track-map";
import {
  cleanup,
  completeNodes,
  createStudent,
  createTestPrefix,
  createTrack,
} from "../../helpers/track-fixtures";
import { findTrackMapData, findTrackNodeData } from "@/features/tracks-engine/repositories";

jest.mock("next/navigation", () => ({
  redirect: jest.fn((path: string) => {
    throw new Error(`Redirected to ${path}`);
  }),
}));

jest.mock("@/core/security", () => ({
  getSessionWithRefresh: jest.fn(),
}));

jest.mock("@/features/tracks-engine/repositories", () => {
  const actual = jest.requireActual("@/features/tracks-engine/repositories");
  return {
    ...actual,
    findTrackMapData: jest.fn(actual.findTrackMapData),
    findTrackNodeData: jest.fn(actual.findTrackNodeData),
  };
});

const PREFIX = createTestPrefix();
const mockedGetSession = jest.mocked(getSessionWithRefresh);
const mockedRedirect = jest.mocked(redirect);

jest.setTimeout(30000);

describe("Isolamento e validação das actions de trilhas (A01)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    try {
      await cleanup(PREFIX);
    } finally {
      await prisma.$disconnect();
    }
  }, 30000);

  it("não expõe o progresso de um usuário para outro na mesma trilha", async () => {
    const owner = await createStudent(PREFIX);
    const otherStudent = await createStudent(PREFIX);
    const track = await createTrack(PREFIX, {
      lessons: 2,
      withFinalTest: false,
    });
    await completeNodes(owner.id, track.contentNodeIds);

    const map = await getTrackMap(track.id, undefined, otherStudent.id);

    expect(map?.completedNodes).toBe(0);
    expect(map?.nodes.every(({ isCompleted }) => !isCompleted)).toBe(true);
  });

  it("redireciona todas as actions para login quando não há sessão", async () => {
    mockedGetSession.mockResolvedValue(null);

    await expect(getCatalogAction()).rejects.toThrow(
      "Redirected to /auth/login",
    );
    await expect(getTrackMapAction({ trackId: "1" })).rejects.toThrow(
      "Redirected to /auth/login",
    );
    await expect(
      getTrackNodeAction({ trackId: "1", nodeId: "1" }),
    ).rejects.toThrow("Redirected to /auth/login");

    expect(mockedRedirect).toHaveBeenCalledTimes(3);
    expect(mockedRedirect).toHaveBeenNthCalledWith(1, "/auth/login");
    expect(mockedRedirect).toHaveBeenNthCalledWith(2, "/auth/login");
    expect(mockedRedirect).toHaveBeenNthCalledWith(3, "/auth/login");
  });

  it("rejeita parâmetros de rota não numéricos, negativos ou zero", async () => {
    mockedGetSession.mockResolvedValue({
      sub: "session-user",
      role: "student",
      tokenUse: "access",
    });

    for (const invalidId of ["not-a-number", "-1", "0"]) {
      await expect(
        getTrackMapAction({ trackId: invalidId }),
      ).resolves.toBeNull();
      await expect(
        getTrackNodeAction({ trackId: invalidId, nodeId: "1" }),
      ).resolves.toBeNull();
      await expect(
        getTrackNodeAction({ trackId: "1", nodeId: invalidId }),
      ).resolves.toBeNull();
    }

    expect(findTrackMapData).not.toHaveBeenCalled();
    expect(findTrackNodeData).not.toHaveBeenCalled();
  });

  it("ignora um userId injetado no input e usa sempre o da sessão", async () => {
    const owner = await createStudent(PREFIX);
    const attacker = await createStudent(PREFIX);
    const track = await createTrack(PREFIX, { lessons: 2, withFinalTest: false });
    await completeNodes(owner.id, track.contentNodeIds);

    mockedGetSession.mockResolvedValue({
      sub: attacker.id,
      role: "student",
      tokenUse: "access",
    });

    const map = await getTrackMapAction({
      trackId: String(track.id),
      userId: owner.id,
    } as unknown as Parameters<typeof getTrackMapAction>[0]);

    expect(map?.completedNodes).not.toBe(track.contentNodeIds.length);
  });
});

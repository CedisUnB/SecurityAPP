import {
  findTrackMapData,
  findTrackNodeData,
  upsertNodeProgress,
  updateTakesStatus,
} from "../repositories";
import {
  completeTrackIfPassed,
  getTrackMap,
  getTrackNode,
} from "./track-map";
import { logServerError } from "@/core/logging/log-server-error";

jest.mock("../repositories", () => ({
  findTrackMapData: jest.fn(),
  findTrackNodeData: jest.fn(),
  upsertNodeProgress: jest.fn(),
  updateTakesStatus: jest.fn(),
}));

jest.mock("@/core/logging/log-server-error", () => ({
  logServerError: jest.fn(),
}));

const mockedFindTrackMapData =
  findTrackMapData as jest.MockedFunction<typeof findTrackMapData>;
const mockedFindTrackNodeData =
  findTrackNodeData as jest.MockedFunction<typeof findTrackNodeData>;
const mockedUpsertNodeProgress =
  upsertNodeProgress as jest.MockedFunction<typeof upsertNodeProgress>;
const mockedUpdateTakesStatus =
  updateTakesStatus as jest.MockedFunction<typeof updateTakesStatus>;
const mockedLogServerError =
  logServerError as jest.MockedFunction<typeof logServerError>;

function trackNode(
  id: number,
  {
    nodeType = "lesson",
    completed = false,
    finalTest = false,
  }: {
    nodeType?: "lesson" | "exercise";
    completed?: boolean;
    finalTest?: boolean;
  } = {},
) {
  return {
    id,
    orderIndex: id,
    nodeType,
    lesson: nodeType === "lesson" ? { title: `Lição ${id}` } : null,
    exercises:
      nodeType === "exercise"
        ? [{ type: finalTest ? "test" : "revision" }]
        : [],
    progress: completed ? [{ isCompleted: true }] : [],
  };
}

function unlockStates(track: Awaited<ReturnType<typeof getTrackMap>>) {
  return track?.nodes.map(({ id, isUnlocked, isNextUp }) => ({
    id,
    isUnlocked,
    isNextUp,
  }));
}

describe("getTrackMap", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates ordered node DTOs with completed, next-up and locked states", async () => {
    mockedFindTrackMapData.mockResolvedValueOnce({
      id: 12,
      theme: "Segurança Web",
      trackNode: [
        {
          id: 41,
          orderIndex: 0,
          nodeType: "lesson",
          lesson: { title: "Introdução" },
          exercises: [],
          progress: [{ isCompleted: true }],
        },
        {
          id: 42,
          orderIndex: 1,
          nodeType: "exercise",
          lesson: null,
          exercises: [{ type: "revision" }],
          progress: [],
        },
        {
          id: 43,
          orderIndex: 2,
          nodeType: "exercise",
          lesson: null,
          exercises: [{ type: "test" }],
          progress: [],
        },
      ],
    } as never);

    await expect(getTrackMap(12, undefined, "user-123")).resolves.toEqual({
      id: 12,
      theme: "Segurança Web",
      focusNodeId: 41,
      totalNodes: 3,
      completedNodes: 1,
      nodes: [
        {
          id: 41,
          orderIndex: 0,
          nodeType: "lesson",
          title: "Introdução",
          kindLabel: "Teoria",
          isCompleted: true,
          isCurrent: true,
          isMostAdvanced: true,
          isFinalTest: false,
          isNextUp: false,
          isUnlocked: true,
        },
        {
          id: 42,
          orderIndex: 1,
          nodeType: "exercise",
          title: "Exercícios práticos",
          kindLabel: "Exercícios práticos",
          isCompleted: false,
          isCurrent: false,
          isMostAdvanced: false,
          isFinalTest: false,
          isNextUp: true,
          isUnlocked: true,
        },
        {
          id: 43,
          orderIndex: 2,
          nodeType: "exercise",
          title: "Teste final",
          kindLabel: "Teste final",
          isCompleted: false,
          isCurrent: false,
          isMostAdvanced: false,
          isFinalTest: true,
          isNextUp: false,
          isUnlocked: false,
        },
      ],
    });
    expect(mockedFindTrackMapData).toHaveBeenCalledWith(12, "user-123");
  });

  it("uses the first node as the initial focus when there is no completed progress", async () => {
    mockedFindTrackMapData.mockResolvedValueOnce({
      id: 12,
      theme: "Segurança Web",
      trackNode: [
        {
          id: 41,
          orderIndex: 0,
          nodeType: "lesson",
          lesson: { title: "Introdução" },
          exercises: [],
          progress: [],
        },
      ],
    } as never);

    const track = await getTrackMap(12, undefined, "user-123");

    expect(track?.focusNodeId).toBe(41);
    expect(track).toMatchObject({
      totalNodes: 1,
      completedNodes: 0,
    });
    expect(track?.nodes[0]).toMatchObject({
      isCurrent: true,
      isMostAdvanced: false,
      isCompleted: false,
      kindLabel: "Teoria",
      isNextUp: true,
      isUnlocked: true,
    });
  });

  it("keeps every node after the next-up one locked", async () => {
    mockedFindTrackMapData.mockResolvedValueOnce({
      id: 12,
      theme: "Segurança Web",
      trackNode: [
        trackNode(41, { completed: true }),
        trackNode(42, { nodeType: "exercise", completed: true }),
        trackNode(43),
        trackNode(44, { nodeType: "exercise" }),
        trackNode(45, { nodeType: "exercise", finalTest: true }),
      ],
    } as never);

    const track = await getTrackMap(12, undefined, "user-123");

    expect(unlockStates(track)).toEqual([
      { id: 41, isUnlocked: true, isNextUp: false },
      { id: 42, isUnlocked: true, isNextUp: false },
      { id: 43, isUnlocked: true, isNextUp: true },
      { id: 44, isUnlocked: false, isNextUp: false },
      { id: 45, isUnlocked: false, isNextUp: false },
    ]);
  });

  it("unlocks only the first node when there is no progress", async () => {
    mockedFindTrackMapData.mockResolvedValueOnce({
      id: 12,
      theme: "Segurança Web",
      trackNode: [
        trackNode(41),
        trackNode(42, { nodeType: "exercise" }),
        trackNode(43, { nodeType: "exercise", finalTest: true }),
      ],
    } as never);

    const track = await getTrackMap(12, undefined, "user-123");

    expect(unlockStates(track)).toEqual([
      { id: 41, isUnlocked: true, isNextUp: true },
      { id: 42, isUnlocked: false, isNextUp: false },
      { id: 43, isUnlocked: false, isNextUp: false },
    ]);
  });

  it("unlocks the final test only after every content node is completed", async () => {
    mockedFindTrackMapData.mockResolvedValueOnce({
      id: 12,
      theme: "Segurança Web",
      trackNode: [
        trackNode(41, { completed: true }),
        trackNode(42, { nodeType: "exercise", completed: true }),
        trackNode(43, { nodeType: "exercise", finalTest: true }),
      ],
    } as never);

    const track = await getTrackMap(12, undefined, "user-123");

    expect(track?.nodes[2]).toMatchObject({
      isFinalTest: true,
      isCompleted: false,
      isNextUp: true,
      isUnlocked: true,
    });
  });

  it("keeps every node unlocked for review when the whole track is completed", async () => {
    mockedFindTrackMapData.mockResolvedValueOnce({
      id: 12,
      theme: "Segurança Web",
      trackNode: [
        trackNode(41, { completed: true }),
        trackNode(42, { nodeType: "exercise", completed: true }),
        trackNode(43, { nodeType: "exercise", finalTest: true, completed: true }),
      ],
    } as never);

    const track = await getTrackMap(12, undefined, "user-123");

    expect(unlockStates(track)).toEqual([
      { id: 41, isUnlocked: true, isNextUp: false },
      { id: 42, isUnlocked: true, isNextUp: false },
      { id: 43, isUnlocked: true, isNextUp: false },
    ]);
  });

  it("does not move the next-up node when a focus node is requested", async () => {
    mockedFindTrackMapData.mockResolvedValueOnce({
      id: 12,
      theme: "Segurança Web",
      trackNode: [
        trackNode(41, { completed: true }),
        trackNode(42, { nodeType: "exercise", completed: true }),
        trackNode(43),
      ],
    } as never);

    const track = await getTrackMap(12, 41, "user-123");

    expect(track?.focusNodeId).toBe(41);
    expect(track?.nodes.find(({ id }) => id === 41)?.isCurrent).toBe(true);
    expect(track?.nodes.find(({ id }) => id === 43)).toMatchObject({
      isNextUp: true,
      isUnlocked: true,
      isCurrent: false,
    });
  });

  it("rejects a focus node that is not in the requested track", async () => {
    mockedFindTrackMapData.mockResolvedValueOnce({
      id: 12,
      theme: "Segurança Web",
      trackNode: [],
    } as never);

    await expect(getTrackMap(12, 99, "user-123")).resolves.toBeNull();
  });

  it("returns null when the requested track does not exist", async () => {
    mockedFindTrackMapData.mockResolvedValueOnce(null);

    await expect(getTrackMap(404, undefined, "user-123")).resolves.toBeNull();
  });

    it("logs repository errors and throws a generic error", async () => {
    const repositoryError = new Error("database connection details");
    mockedFindTrackMapData.mockRejectedValueOnce(repositoryError);

    await expect(getTrackMap(12, undefined, "user-123")).rejects.toHaveProperty(
      "message",
      "Não foi possível carregar o mapa da trilha.",
    );
    expect(mockedLogServerError).toHaveBeenCalledWith(
      "tracks-engine:getTrackMap",
      repositoryError,
    );
  });
});

describe("getTrackNode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns node metadata only when the node belongs to the requested track", async () => {
    mockedFindTrackNodeData.mockResolvedValueOnce(null);

    await expect(getTrackNode(12, 99, "user-123")).resolves.toBeNull();
    expect(mockedFindTrackNodeData).toHaveBeenCalledWith(12, 99);
  });

    it("logs node lookup errors and throws a generic error", async () => {
    const repositoryError = new Error("database connection details");
    mockedFindTrackNodeData.mockRejectedValueOnce(repositoryError);

    await expect(getTrackNode(12, 99, "user-123")).rejects.toHaveProperty(
      "message",
      "Não foi possível carregar o conteúdo da etapa.",
    );
    expect(mockedLogServerError).toHaveBeenCalledWith(
      "tracks-engine:getTrackNode",
      repositoryError,
    );
  });

  it("logs track lookup errors after the node is found and throws a generic error", async () => {
    const repositoryError = new Error("database connection details");
    mockedFindTrackNodeData.mockResolvedValueOnce(trackNode(99) as never);
    mockedFindTrackMapData.mockRejectedValueOnce(repositoryError);

    await expect(getTrackNode(12, 99, "user-123")).rejects.toHaveProperty(
      "message",
      "Não foi possível carregar o conteúdo da etapa.",
    );
    expect(mockedLogServerError).toHaveBeenCalledWith(
      "tracks-engine:getTrackNode",
      repositoryError,
    );
  });
});

describe("completeTrackIfPassed", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("records the score and completes the track when the passing score is reached", async () => {
    mockedUpsertNodeProgress.mockResolvedValueOnce({} as never);
    mockedUpdateTakesStatus.mockResolvedValueOnce({} as never);

    await expect(
      completeTrackIfPassed("user-123", 12, 43, 80),
    ).resolves.toEqual({ passed: true });

    expect(mockedUpsertNodeProgress).toHaveBeenCalledWith(
      "user-123",
      43,
      { isCompleted: true, score: 80 },
    );
    expect(mockedUpdateTakesStatus).toHaveBeenCalledWith("user-123", 12);
  });

  it("records a failing score without completing the track", async () => {
    mockedUpsertNodeProgress.mockResolvedValueOnce({} as never);

    await expect(
      completeTrackIfPassed("user-123", 12, 43, 79),
    ).resolves.toEqual({ passed: false });

    expect(mockedUpsertNodeProgress).toHaveBeenCalledWith(
      "user-123",
      43,
      { isCompleted: false, score: 79 },
    );
    expect(mockedUpdateTakesStatus).not.toHaveBeenCalled();
  });

    it("logs progress persistence errors and throws a generic error", async () => {
    const repositoryError = new Error("database connection details");
    mockedUpsertNodeProgress.mockRejectedValueOnce(repositoryError);

    await expect(
      completeTrackIfPassed("user-123", 12, 43, 80),
    ).rejects.toHaveProperty(
      "message",
      "Não foi possível registrar o resultado do teste final.",
    );
    expect(mockedLogServerError).toHaveBeenCalledWith(
      "tracks-engine:completeTrackIfPassed",
      repositoryError,
    );
    expect(mockedUpdateTakesStatus).not.toHaveBeenCalled();
  });

  it("logs track status errors and throws a generic error", async () => {
    const repositoryError = new Error("database connection details");
    mockedUpsertNodeProgress.mockResolvedValueOnce({} as never);
    mockedUpdateTakesStatus.mockRejectedValueOnce(repositoryError);

    await expect(
      completeTrackIfPassed("user-123", 12, 43, 80),
    ).rejects.toHaveProperty(
      "message",
      "Não foi possível registrar o resultado do teste final.",
    );
    expect(mockedLogServerError).toHaveBeenCalledWith(
      "tracks-engine:completeTrackIfPassed",
      repositoryError,
    );
  });
});

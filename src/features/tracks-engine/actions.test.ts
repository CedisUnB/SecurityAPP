import { redirect } from "next/navigation";
import { getSessionWithRefresh } from "@/core/security";
import { getTrackMap, getTrackNode, listTracks, startTrack } from "./services";
import {
  getCatalogAction,
  getTrackMapAction,
  getTrackNodeAction,
  startTrackAction,
} from "./actions";
import type { TrackCatalogEntry } from "./types";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("@/core/security", () => ({
  getSessionWithRefresh: jest.fn(),
}));

jest.mock("./services", () => ({
  getTrackMap: jest.fn(),
  getTrackNode: jest.fn(),
  listTracks: jest.fn(),
  startTrack: jest.fn(),
}));

const mockedRedirect = redirect as jest.MockedFunction<typeof redirect>;
const mockedGetSession = getSessionWithRefresh as jest.MockedFunction<typeof getSessionWithRefresh>;
const mockedGetTrackMap = getTrackMap as jest.MockedFunction<typeof getTrackMap>;
const mockedGetTrackNode = getTrackNode as jest.MockedFunction<typeof getTrackNode>;
const mockedListTracks = listTracks as jest.MockedFunction<typeof listTracks>;
const mockedStartTrack = startTrack as jest.MockedFunction<typeof startTrack>;

const USER_ID = "user-123";

const authenticatedActions = [
  ["getCatalogAction", () => getCatalogAction()],
  ["startTrackAction", () => startTrackAction({ trackId: "12" })],
  ["getTrackMapAction", () => getTrackMapAction({ trackId: "12" })],
  ["getTrackNodeAction", () => getTrackNodeAction({ trackId: "12", nodeId: "41" })],
] as const;

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetSession.mockResolvedValue({ sub: USER_ID, role: "student" } as never);
});

describe("session requirement", () => {
  it.each(authenticatedActions)(
    "%s redirects to the login page when there is no session",
    async (_name, call) => {
      mockedGetSession.mockResolvedValueOnce(null);
      mockedRedirect.mockImplementationOnce(() => {
        throw new Error("NEXT_REDIRECT");
      });

      await expect(call()).rejects.toHaveProperty("message", "NEXT_REDIRECT");

      expect(mockedRedirect).toHaveBeenCalledWith("/auth/login");
      expect(mockedListTracks).not.toHaveBeenCalled();
      expect(mockedStartTrack).not.toHaveBeenCalled();
      expect(mockedGetTrackMap).not.toHaveBeenCalled();
      expect(mockedGetTrackNode).not.toHaveBeenCalled();
    },
  );

  it.each(authenticatedActions)(
    "%s redirects to the login page when the session has no subject",
    async (_name, call) => {
      mockedGetSession.mockResolvedValueOnce({ role: "student" } as never);
      mockedRedirect.mockImplementationOnce(() => {
        throw new Error("NEXT_REDIRECT");
      });

      await expect(call()).rejects.toHaveProperty("message", "NEXT_REDIRECT");

      expect(mockedRedirect).toHaveBeenCalledWith("/auth/login");
    },
  );
});

describe("getCatalogAction", () => {
  it("returns the catalog of the authenticated user", async () => {
    const catalog: TrackCatalogEntry[] = [
      {
        id: 11,
        theme: "Shift-Left Security",
        description: "Descrição salva no banco.",
        totalNodes: 4,
        completedNodes: 2,
        isStarted: true,
      },
    ];
    mockedListTracks.mockResolvedValueOnce(catalog);

    await expect(getCatalogAction()).resolves.toBe(catalog);
    expect(mockedListTracks).toHaveBeenCalledWith(USER_ID);
  });

  it("propagates the generic service error unchanged", async () => {
    const serviceError = new Error("Não foi possível carregar o catálogo de trilhas.");
    mockedListTracks.mockRejectedValueOnce(serviceError);

    await expect(getCatalogAction()).rejects.toBe(serviceError);
  });
});

describe("startTrackAction", () => {
  it("starts the requested track for the authenticated user", async () => {
    mockedStartTrack.mockResolvedValueOnce(undefined);

    await expect(startTrackAction({ trackId: "12" })).resolves.toBeUndefined();

    expect(mockedStartTrack).toHaveBeenCalledWith(USER_ID, 12);
  });

  it("rejects an invalid track id with a fixed message and does not start the track", async () => {
    await expect(startTrackAction({ trackId: "abc" })).rejects.toHaveProperty(
      "message",
      "Identificador de trilha inválido.",
    );

    expect(mockedStartTrack).not.toHaveBeenCalled();
  });

  it("propagates the generic service error unchanged", async () => {
    const serviceError = new Error("Não foi possível iniciar a trilha.");
    mockedStartTrack.mockRejectedValueOnce(serviceError);

    await expect(startTrackAction({ trackId: "12" })).rejects.toBe(serviceError);
  });
});

describe("getTrackMapAction", () => {
  const trackMap = { id: 12, theme: "Segurança Web", nodes: [] } as never;

  it("returns the track map without a focus node", async () => {
    mockedGetTrackMap.mockResolvedValueOnce(trackMap);

    await expect(getTrackMapAction({ trackId: "12" })).resolves.toBe(trackMap);

    expect(mockedGetTrackMap).toHaveBeenCalledWith(12, undefined, USER_ID);
  });

  it("passes the parsed focus node to the service", async () => {
    mockedGetTrackMap.mockResolvedValueOnce(trackMap);

    await getTrackMapAction({ trackId: "12", focus: "41" });

    expect(mockedGetTrackMap).toHaveBeenCalledWith(12, 41, USER_ID);
  });

  it("returns null for an invalid track id without querying the service", async () => {
    await expect(getTrackMapAction({ trackId: "abc" })).resolves.toBeNull();

    expect(mockedGetTrackMap).not.toHaveBeenCalled();
  });

  it("returns null for an invalid focus node without querying the service", async () => {
    await expect(
      getTrackMapAction({ trackId: "12", focus: "abc" }),
    ).resolves.toBeNull();

    expect(mockedGetTrackMap).not.toHaveBeenCalled();
  });

  it("returns null when the service does not find the track", async () => {
    mockedGetTrackMap.mockResolvedValueOnce(null);

    await expect(getTrackMapAction({ trackId: "404" })).resolves.toBeNull();
  });

  it("propagates the generic service error unchanged", async () => {
    const serviceError = new Error("Não foi possível carregar o mapa da trilha.");
    mockedGetTrackMap.mockRejectedValueOnce(serviceError);

    await expect(getTrackMapAction({ trackId: "12" })).rejects.toBe(serviceError);
  });
});

describe("getTrackNodeAction", () => {
  const node = { id: 41, trackId: 12, nodeType: "lesson" } as never;

  it("returns the node content for the authenticated user", async () => {
    mockedGetTrackNode.mockResolvedValueOnce(node);

    await expect(
      getTrackNodeAction({ trackId: "12", nodeId: "41" }),
    ).resolves.toBe(node);

    expect(mockedGetTrackNode).toHaveBeenCalledWith(12, 41, USER_ID);
  });

  it("returns null for an invalid track id without querying the service", async () => {
    await expect(
      getTrackNodeAction({ trackId: "abc", nodeId: "41" }),
    ).resolves.toBeNull();

    expect(mockedGetTrackNode).not.toHaveBeenCalled();
  });

  it("returns null for an invalid node id without querying the service", async () => {
    await expect(
      getTrackNodeAction({ trackId: "12", nodeId: "abc" }),
    ).resolves.toBeNull();

    expect(mockedGetTrackNode).not.toHaveBeenCalled();
  });

  it("returns null when the service does not find the node", async () => {
    mockedGetTrackNode.mockResolvedValueOnce(null);

    await expect(
      getTrackNodeAction({ trackId: "12", nodeId: "99" }),
    ).resolves.toBeNull();
  });

  it("propagates the generic service error unchanged", async () => {
    const serviceError = new Error("Não foi possível carregar o conteúdo da etapa.");
    mockedGetTrackNode.mockRejectedValueOnce(serviceError);

    await expect(
      getTrackNodeAction({ trackId: "12", nodeId: "41" }),
    ).rejects.toBe(serviceError);
  });
});
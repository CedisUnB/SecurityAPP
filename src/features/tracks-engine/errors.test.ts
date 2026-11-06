import { logServerError } from "@/core/logging/log-server-error";
import { TrackEngineError, toTrackEngineError } from "./errors";

jest.mock("@/core/logging/log-server-error", () => ({
  logServerError: jest.fn(),
}));

const mockedLogServerError = jest.mocked(logServerError);

describe("toTrackEngineError", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("troca erros inesperados pela mensagem segura e registra o original", () => {
    const internalError = new Error("connect ECONNREFUSED 10.0.0.5:3306 password=abc123");

    const result = toTrackEngineError(
      internalError,
      "tracks-engine:listTracks",
      "Não foi possível carregar o catálogo de trilhas.",
    );

    expect(result).toBeInstanceOf(TrackEngineError);
    expect(result).toHaveProperty("message", "Não foi possível carregar o catálogo de trilhas.");
    expect(result.message).not.toContain("ECONNREFUSED");
    expect(result.message).not.toContain("abc123");
    expect(mockedLogServerError).toHaveBeenCalledWith("tracks-engine:listTracks", internalError);
  });

  it("mantém um TrackEngineError conhecido sem reembrulhar nem registrar log", () => {
    const knownError = new TrackEngineError("Identificador de trilha inválido.");

    const result = toTrackEngineError(knownError, "tracks-engine:startTrack", "Fallback");

    expect(result).toBe(knownError);
    expect(mockedLogServerError).not.toHaveBeenCalled();
  });

  it("trata valores lançados que não são Error", () => {
    const result = toTrackEngineError("falha solta", "tracks-engine:startTrack", "Não foi possível iniciar a trilha.");

    expect(result).toHaveProperty("message", "Não foi possível iniciar a trilha.");
    expect(mockedLogServerError).toHaveBeenCalledWith("tracks-engine:startTrack", "falha solta");
  });
});
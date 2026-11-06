import { logServerError } from "@/core/logging/log-server-error";

/**
 * Único tipo de erro da feature cuja mensagem é segura para o cliente.
 * Qualquer outro erro (Prisma, rede, bug) deve passar por toTrackEngineError.
 */
export class TrackEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrackEngineError";
  }
}

/**
 * Converte qualquer erro capturado em um TrackEngineError seguro.
 * - TrackEngineError já conhecido: devolvido como está, sem novo log.
 * - Qualquer outro: registrado no log do servidor e substituído por `fallbackMessage`.
 *
 * `context` é só o rótulo do log (ex.: "tracks-engine:listTracks"); use sempre um literal.
 */
export function toTrackEngineError(
  error: unknown,
  context: string,
  fallbackMessage: string,
): TrackEngineError {
  if (error instanceof TrackEngineError) {
    return error;
  }

  logServerError(context, error);
  return new TrackEngineError(fallbackMessage);
}
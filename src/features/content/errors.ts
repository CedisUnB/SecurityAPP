import { unstable_rethrow } from "next/navigation";
import { logServerError } from "@/core/logging/log-server-error";

export type ContentErrorStatus = 400 | 403 | 404;

/**
 * Erro de regra de negócio do módulo de conteúdo. A mensagem é escrita para
 * o usuário e pode ser exibida. Qualquer outro erro é tratado como inesperado.
 */
export class ContentError extends Error {
  readonly statusCode: ContentErrorStatus;

  constructor(message: string, statusCode: ContentErrorStatus = 400) {
    super(message);
    this.name = "ContentError";
    this.statusCode = statusCode;
  }
}

export interface ContentFailure {
  success: false;
  statusCode: number;
  error: string;
}

/**
 * Traduz um erro capturado em uma Server Action de conteúdo para a resposta
 * de falha. Relança redirect/notFound do Next. Só `ContentError` expõe a
 * própria mensagem. O resto vira `fallbackMessage` (500), com os detalhes
 * técnicos registrados apenas no servidor.
 */
export function getContentFailure(
  error: unknown,
  context: string,
  fallbackMessage: string,
): ContentFailure {
  unstable_rethrow(error);

  if (error instanceof ContentError) {
    return { success: false, statusCode: error.statusCode, error: error.message };
  }

  logServerError(context, error);

  return { success: false, statusCode: 500, error: fallbackMessage };
}
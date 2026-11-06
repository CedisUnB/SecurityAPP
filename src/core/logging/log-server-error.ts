const MAX_DETAIL_LENGTH = 2000;

const REDACTIONS: Array<[RegExp, string]> = [
  // hash bcrypt
  [/\$2[abxy]\$\d{2}\$[./A-Za-z0-9]{53}/g, "[REDACTED_HASH]"],
  // JWT
  [/eyJ[\w-]+\.[\w-]+\.[\w-]*/g, "[REDACTED_JWT]"],
  // pares chave/valor sensíveis: password: "x", "token":"x", senha=x
  [
    /((?:password|senha|token|secret|authorization|cookie)["']?\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,}]+)/gi,
    "$1[REDACTED]",
  ],
];

export function redactSecrets(text: string): string {
  return REDACTIONS.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);
}

/**
 * Registra no servidor os detalhes técnicos de um erro inesperado.
 * Nunca devolva esses detalhes ao cliente.
 */
export function logServerError(context: string, error: unknown): void {
  const code = (error as { code?: unknown } | null)?.code;

  const payload =
    error instanceof Error
      ? {
          name: error.name,
          code: typeof code === "string" ? code : undefined,
          detail: error.stack ?? error.message,
        }
      : { name: typeof error, code: undefined, detail: String(error) };

  console.error(`[${context}] erro inesperado`, {
    ...payload,
    detail: redactSecrets(payload.detail).slice(0, MAX_DETAIL_LENGTH),
  });
}
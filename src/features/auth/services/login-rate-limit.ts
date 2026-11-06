import { createHash } from "node:crypto";
import { loginAttemptRepository as attempts } from "../repositories/login-attempt.repository";

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export class TooManyAttemptsError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Muitas tentativas de login. Tente novamente em alguns minutos.");
    this.name = "TooManyAttemptsError";
  }
}

const hashEmail = (email: string) =>
  createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

// Registra a tentativa ANTES de verificar a senha; se passou do limite, desfaz e bloqueia.
export async function beginLoginAttempt(email: string, now: Date = new Date()) {
  const emailHash = hashEmail(email);
  const windowStart = new Date(now.getTime() - LOGIN_WINDOW_MS);

  await attempts.deleteOlderThan(windowStart);

  const row = await attempts.create(emailHash, now);
  const count = await attempts.countSince(emailHash, windowStart);

  if (count > MAX_LOGIN_ATTEMPTS) {
    await attempts.deleteById(row.id); // tentativa bloqueada não prolonga o bloqueio

    const oldest = await attempts.findOldestSince(emailHash, windowStart);
    const retryAfterMs = oldest
      ? oldest.createdAt.getTime() + LOGIN_WINDOW_MS - now.getTime()
      : LOGIN_WINDOW_MS;

    throw new TooManyAttemptsError(Math.max(1, Math.ceil(retryAfterMs / 1000)));
  }

  return emailHash;
}

// Login bem-sucedido: zera o contador desse e-mail.
export async function clearLoginAttempts(emailHash: string) {
  await attempts.deleteByEmailHash(emailHash);
}
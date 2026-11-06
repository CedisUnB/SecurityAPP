import { createHash } from "node:crypto";
import { loginAttemptRepository } from "../repositories/login-attempt.repository";
import {
  beginLoginAttempt,
  clearLoginAttempts,
  LOGIN_WINDOW_MS,
  MAX_LOGIN_ATTEMPTS,
  TooManyAttemptsError,
} from "./login-rate-limit";

jest.mock("../repositories/login-attempt.repository", () => ({
  loginAttemptRepository: {
    create: jest.fn(),
    countSince: jest.fn(),
    findOldestSince: jest.fn(),
    deleteById: jest.fn(),
    deleteByEmailHash: jest.fn(),
    deleteOlderThan: jest.fn(),
  },
}));

const mockedRepo = loginAttemptRepository as jest.Mocked<typeof loginAttemptRepository>;

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

const EMAIL = "user@example.com";
const EMAIL_HASH = sha256(EMAIL);
const NOW = new Date("2026-11-02T10:00:00.000Z");
const WINDOW_START = new Date(NOW.getTime() - LOGIN_WINDOW_MS);

describe("TooManyAttemptsError", () => {
  it("instancia o erro com nome, mensagem genérica e tempo de espera", () => {
    const error = new TooManyAttemptsError(120);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("TooManyAttemptsError");
    expect(error.message).toBe("Muitas tentativas de login. Tente novamente em alguns minutos.");
    expect(error.retryAfterSeconds).toBe(120);
  });
});

describe("beginLoginAttempt", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRepo.deleteOlderThan.mockResolvedValue(undefined as never);
    mockedRepo.create.mockResolvedValue({ id: 1 } as never);
    mockedRepo.countSince.mockResolvedValue(1 as never);
    mockedRepo.findOldestSince.mockResolvedValue(null as never);
    mockedRepo.deleteById.mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("registra a tentativa e retorna o hash do e-mail quando está abaixo do limite", async () => {
    const result = await beginLoginAttempt(EMAIL, NOW);

    expect(result).toBe(EMAIL_HASH);
    expect(mockedRepo.create).toHaveBeenCalledWith(EMAIL_HASH, NOW);
    expect(mockedRepo.deleteById).not.toHaveBeenCalled();
  });

  it("não usa o e-mail em texto: o identificador é um hash SHA-256", async () => {
    const result = await beginLoginAttempt(EMAIL, NOW);

    expect(result).toMatch(/^[a-f0-9]{64}$/);
    expect(result).not.toContain("user");
  });

  it("normaliza espaços e maiúsculas do e-mail antes de gerar o hash", async () => {
    const result = await beginLoginAttempt("  User@Example.COM ", NOW);

    expect(result).toBe(EMAIL_HASH);
    expect(mockedRepo.create).toHaveBeenCalledWith(EMAIL_HASH, NOW);
  });

  it("usa contadores independentes para e-mails diferentes", async () => {
    const first = await beginLoginAttempt("a@example.com", NOW);
    const second = await beginLoginAttempt("b@example.com", NOW);

    expect(first).not.toBe(second);
    expect(mockedRepo.countSince).toHaveBeenNthCalledWith(1, first, WINDOW_START);
    expect(mockedRepo.countSince).toHaveBeenNthCalledWith(2, second, WINDOW_START);
  });

  it("limpa as tentativas fora da janela antes de registrar a nova", async () => {
    await beginLoginAttempt(EMAIL, NOW);

    expect(mockedRepo.deleteOlderThan).toHaveBeenCalledWith(WINDOW_START);
    expect(mockedRepo.deleteOlderThan.mock.invocationCallOrder[0]).toBeLessThan(
      mockedRepo.create.mock.invocationCallOrder[0]
    );
  });

  it("registra a tentativa antes de contar (proteção contra rajadas)", async () => {
    await beginLoginAttempt(EMAIL, NOW);

    expect(mockedRepo.create.mock.invocationCallOrder[0]).toBeLessThan(
      mockedRepo.countSince.mock.invocationCallOrder[0]
    );
  });

  it("conta apenas as tentativas dentro da janela de 15 minutos", async () => {
    await beginLoginAttempt(EMAIL, NOW);

    expect(mockedRepo.countSince).toHaveBeenCalledWith(EMAIL_HASH, WINDOW_START);
  });

  it("permite a tentativa que atinge exatamente o limite", async () => {
    mockedRepo.countSince.mockResolvedValue(MAX_LOGIN_ATTEMPTS as never);

    await expect(beginLoginAttempt(EMAIL, NOW)).resolves.toBe(EMAIL_HASH);
    expect(mockedRepo.deleteById).not.toHaveBeenCalled();
  });

  it("lança TooManyAttemptsError quando a contagem ultrapassa o limite", async () => {
    mockedRepo.countSince.mockResolvedValue((MAX_LOGIN_ATTEMPTS + 1) as never);

    await expect(beginLoginAttempt(EMAIL, NOW)).rejects.toBeInstanceOf(TooManyAttemptsError);
  });

  it("desfaz o registro da tentativa bloqueada para não prolongar o bloqueio", async () => {
    mockedRepo.create.mockResolvedValue({ id: 42 } as never);
    mockedRepo.countSince.mockResolvedValue((MAX_LOGIN_ATTEMPTS + 1) as never);

    await expect(beginLoginAttempt(EMAIL, NOW)).rejects.toBeInstanceOf(TooManyAttemptsError);

    expect(mockedRepo.deleteById).toHaveBeenCalledWith(42);
  });

  it("calcula o tempo de espera a partir da tentativa mais antiga da janela", async () => {
    mockedRepo.countSince.mockResolvedValue((MAX_LOGIN_ATTEMPTS + 1) as never);
    mockedRepo.findOldestSince.mockResolvedValue({
      createdAt: new Date(NOW.getTime() - 10 * 60 * 1000),
    } as never);

    const error = await beginLoginAttempt(EMAIL, NOW).catch((e) => e);

    expect(mockedRepo.findOldestSince).toHaveBeenCalledWith(EMAIL_HASH, WINDOW_START);
    expect(error).toBeInstanceOf(TooManyAttemptsError);
    expect(error.retryAfterSeconds).toBe(5 * 60);
  });

  it("garante ao menos 1 segundo de espera", async () => {
    mockedRepo.countSince.mockResolvedValue((MAX_LOGIN_ATTEMPTS + 1) as never);
    mockedRepo.findOldestSince.mockResolvedValue({
      createdAt: new Date(NOW.getTime() - LOGIN_WINDOW_MS),
    } as never);

    const error = await beginLoginAttempt(EMAIL, NOW).catch((e) => e);

    expect(error.retryAfterSeconds).toBe(1);
  });

  it("usa a janela inteira como espera se não encontrar tentativa anterior", async () => {
    mockedRepo.countSince.mockResolvedValue((MAX_LOGIN_ATTEMPTS + 1) as never);
    mockedRepo.findOldestSince.mockResolvedValue(null as never);

    const error = await beginLoginAttempt(EMAIL, NOW).catch((e) => e);

    expect(error.retryAfterSeconds).toBe(LOGIN_WINDOW_MS / 1000);
  });

  it("libera o login depois que a janela expira", async () => {
    mockedRepo.countSince.mockResolvedValueOnce((MAX_LOGIN_ATTEMPTS + 1) as never);
    await expect(beginLoginAttempt(EMAIL, NOW)).rejects.toBeInstanceOf(TooManyAttemptsError);

    const later = new Date(NOW.getTime() + LOGIN_WINDOW_MS + 1000);
    mockedRepo.countSince.mockResolvedValueOnce(0 as never);

    await expect(beginLoginAttempt(EMAIL, later)).resolves.toBe(EMAIL_HASH);
    expect(mockedRepo.countSince).toHaveBeenLastCalledWith(
      EMAIL_HASH,
      new Date(later.getTime() - LOGIN_WINDOW_MS)
    );
  });

  it("usa a data atual quando nenhuma é informada", async () => {
    jest.useFakeTimers().setSystemTime(NOW);

    await beginLoginAttempt(EMAIL);

    expect(mockedRepo.create).toHaveBeenCalledWith(EMAIL_HASH, NOW);
    expect(mockedRepo.deleteOlderThan).toHaveBeenCalledWith(WINDOW_START);
  });

  it("repassa erros do repositório", async () => {
    mockedRepo.create.mockRejectedValue(new Error("Database connection dropped"));

    await expect(beginLoginAttempt(EMAIL, NOW)).rejects.toThrow("Database connection dropped");
  });
});

describe("clearLoginAttempts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("apaga as tentativas do e-mail informado", async () => {
    mockedRepo.deleteByEmailHash.mockResolvedValue(undefined as never);

    await clearLoginAttempts(EMAIL_HASH);

    expect(mockedRepo.deleteByEmailHash).toHaveBeenCalledWith(EMAIL_HASH);
  });

  it("repassa erros do repositório", async () => {
    mockedRepo.deleteByEmailHash.mockRejectedValue(new Error("Unexpected DB failure"));

    await expect(clearLoginAttempts(EMAIL_HASH)).rejects.toThrow("Unexpected DB failure");
  });
});
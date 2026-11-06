import { logServerError, redactSecrets } from "./log-server-error";

const BCRYPT_HASH = `$2b$10$${"a".repeat(53)}`;
const JWT = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.assinatura123";

describe("redactSecrets", () => {
  it("mascara hashes bcrypt", () => {
    const result = redactSecrets(`data: { password: "${BCRYPT_HASH}" }`);

    expect(result).not.toContain(BCRYPT_HASH);
  });

  it("mascara tokens JWT", () => {
    const result = redactSecrets(`falha ao validar ${JWT}`);

    expect(result).not.toContain(JWT);
    expect(result).toContain("[REDACTED_JWT]");
  });

  it.each([
    ['password: "Senha@123"', "Senha@123"],
    ['{"token":"abc123"}', "abc123"],
    ["senha=Segredo!9", "Segredo!9"],
    ["secret: valor-secreto", "valor-secreto"],
  ])("mascara o valor em %s", (input, secret) => {
    const result = redactSecrets(input);

    expect(result).not.toContain(secret);
    expect(result).toContain("[REDACTED]");
  });

  it("preserva textos sem segredos", () => {
    expect(redactSecrets("Can't reach database server")).toBe("Can't reach database server");
  });
});

describe("logServerError", () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("registra contexto, nome, código e detalhe do erro", () => {
    const error = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });

    logServerError("auth:updateProfile", error);

    const [label, payload] = consoleSpy.mock.calls[0];
    expect(label).toBe("[auth:updateProfile] erro inesperado");
    expect(payload).toEqual({
      name: "Error",
      code: "P2002",
      detail: expect.stringContaining("Unique constraint failed"),
    });
  });

  it("não registra segredos presentes na mensagem do erro", () => {
    logServerError(
      "auth:register",
      new Error(`Invalid invocation: password: "${BCRYPT_HASH}" token ${JWT}`),
    );

    const logged = JSON.stringify(consoleSpy.mock.calls[0]);
    expect(logged).not.toContain(BCRYPT_HASH);
    expect(logged).not.toContain(JWT);
  });

  it("limita o tamanho do detalhe registrado", () => {
    logServerError("auth", new Error("x".repeat(10_000)));

    const [, payload] = consoleSpy.mock.calls[0];
    expect(payload.detail.length).toBeLessThanOrEqual(2000);
  });

  it("aceita valores lançados que não são Error", () => {
    logServerError("auth", "falha textual");

    const [, payload] = consoleSpy.mock.calls[0];
    expect(payload).toEqual({ name: "string", code: undefined, detail: "falha textual" });
  });

  it("ignora um code que não seja string", () => {
    logServerError("auth", Object.assign(new Error("x"), { code: 500 }));

    const [, payload] = consoleSpy.mock.calls[0];
    expect(payload.code).toBeUndefined();
  });

  it("usa a mensagem quando o erro não tem stack", () => {
    const error = new Error("erro sem stack");
    error.stack = undefined;

    logServerError("auth", error);

    const [, payload] = consoleSpy.mock.calls[0];
    expect(payload.detail).toBe("erro sem stack");
  });

  it.each([null, undefined])("aceita erros não-Error %s", (error) => {
    logServerError("auth", error);

    const [, payload] = consoleSpy.mock.calls.at(-1)!;
    expect(payload).toEqual({
      name: typeof error,
      code: undefined,
      detail: String(error),
    });
  });
});
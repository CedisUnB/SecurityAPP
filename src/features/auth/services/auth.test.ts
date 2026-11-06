import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  clearAuthCookies,
  getSessionWithRefresh,
  setAuthCookies,
  verifyToken,
} from "@/core/security";
import { authRepository } from "../repositories/auth.repository";
import { TooManyAttemptsError } from "./login-rate-limit";
import { logServerError } from "@/core/logging/log-server-error";
import {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  ForbiddenError,
  UserNotFoundError,
  loginUser,
  registerUser,
  getUserProfile,
  updateUserProfile,
  deleteUserAccount,
  getAdminProfile,
} from "./auth";
import {
  logoutAction,
  signInAction,
  signUpAction,
  getProfileUserAction,
  updateProfileUserAction,
  deleteAccountAction,
  getAdminProfileAction,
  type SignInState,
  type SignUpState,
} from "../actions";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("@/core/security", () => ({
  ACCESS_TOKEN_COOKIE: "access_token",
  REFRESH_TOKEN_COOKIE: "refresh_token",
  verifyToken: jest.fn(),
  getSessionWithRefresh: jest.fn(),
  setAuthCookies: jest.fn(),
  clearAuthCookies: jest.fn(),
  revokeRefreshToken: jest.fn(),
  revokeAllRefreshTokens: jest.fn(),
}));

jest.mock("../repositories/auth.repository", () => ({
  authRepository: {
    findById: jest.fn(),
  },
}));

jest.mock("./login-rate-limit", () => {
  class MockTooManyAttemptsError extends Error {
    retryAfterSeconds: number;

    constructor(retryAfterSeconds = 60) {
      super("Muitas tentativas de login. Tente novamente em alguns minutos.");
      this.name = "TooManyAttemptsError";
      this.retryAfterSeconds = retryAfterSeconds;
    }
  }

  return {
    TooManyAttemptsError: MockTooManyAttemptsError,
  };
});

jest.mock("@/core/logging/log-server-error", () => ({
  logServerError: jest.fn(),
}));

jest.mock("./auth", () => {
  class MockEmailAlreadyExistsError extends Error {
    constructor() {
      super("Este e-mail já foi cadastrado.");
      this.name = "EmailAlreadyExistsError";
    }
  }

  class MockInvalidCredentialsError extends Error {
    constructor() {
      super("E-mail ou senha inválidos.");
      this.name = "InvalidCredentialsError";
    }
  }

  class MockUserNotFoundError extends Error {
    constructor() {
      super("Usuário não encontrado.");
      this.name = "UserNotFoundError";
    }
  }

  class MockForbiddenError extends Error {
    constructor(message = "Acesso restrito a administradores.") {
      super(message);
      this.name = "ForbiddenError";
    }
  }

  return {
    EmailAlreadyExistsError: MockEmailAlreadyExistsError,
    InvalidCredentialsError: MockInvalidCredentialsError,
    UserNotFoundError: MockUserNotFoundError,
    ForbiddenError: MockForbiddenError,
    loginUser: jest.fn(),
    registerUser: jest.fn(),
    getUserProfile: jest.fn(),
    updateUserProfile: jest.fn(),
    deleteUserAccount: jest.fn(),
    getAdminProfile: jest.fn(),
  };
});

const mockedCookies = cookies as jest.MockedFunction<typeof cookies>;
const mockedRedirect = redirect as jest.MockedFunction<typeof redirect>;
const mockedVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;
const mockedGetSessionWithRefresh = getSessionWithRefresh as jest.MockedFunction<typeof getSessionWithRefresh>;
const mockedSetAuthCookies = setAuthCookies as jest.MockedFunction<typeof setAuthCookies>;
const mockedClearAuthCookies = clearAuthCookies as jest.MockedFunction<typeof clearAuthCookies>;
const mockedAuthRepo = authRepository as jest.Mocked<typeof authRepository>;
const mockedLogServerError = logServerError as jest.MockedFunction<typeof logServerError>;

const mockedLoginUser = loginUser as jest.MockedFunction<typeof loginUser>;
const mockedRegisterUser = registerUser as jest.MockedFunction<typeof registerUser>;
const mockedGetUserProfile = getUserProfile as jest.MockedFunction<typeof getUserProfile>;
const mockedUpdateUserProfile = updateUserProfile as jest.MockedFunction<typeof updateUserProfile>;
const mockedDeleteUserAccount = deleteUserAccount as jest.MockedFunction<typeof deleteUserAccount>;
const mockedGetAdminProfile = getAdminProfile as jest.MockedFunction<typeof getAdminProfile>;

const mockCookieStore = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
};

const VALID_USER_ID = "98c70071-3cdb-4fcf-b167-c7ff54644d49";

const INTERNAL_ERROR_MESSAGE =
  "Invalid `prisma.user.findUnique()` invocation: Can't reach database server at `db:3306` (table `sec-app_db`.`users`)";

const validFields = {
  username: "student",
  email: "student@example.com",
  password: "Senha@123",
  confirmPassword: "Senha@123",
};

function createFormData(
  fields: Partial<typeof validFields> & Pick<typeof validFields, "email" | "password"> = validFields
) {
  const formData = new FormData();

  if (fields.username !== undefined) {
    formData.set("username", fields.username);
  }

  formData.set("email", fields.email);
  formData.set("password", fields.password);
  formData.set("confirmPassword", fields.confirmPassword ?? fields.password);
  return formData;
}

function expectNoInternalDetails(result: unknown) {
  const serialized = JSON.stringify(result);

  expect(serialized).not.toContain("prisma");
  expect(serialized).not.toContain("sec-app_db");
  expect(serialized).not.toContain("db:3306");
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedCookies.mockResolvedValue(mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>);
  mockedGetSessionWithRefresh.mockImplementation(async () => {
    const token = (await mockedCookies()).get("access_token")?.value;
    return token ? mockedVerifyToken(token) : null;
  });
  mockedSetAuthCookies.mockImplementation((cookieStore, tokens, username) => {
    cookieStore.delete("token");
    cookieStore.set("access_token", tokens.accessToken, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600,
    });
    cookieStore.set("refresh_token", tokens.refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 2592000,
    });
    cookieStore.set("username", username, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 2592000,
    });
  });
  mockedClearAuthCookies.mockImplementation((cookieStore) => {
    cookieStore.delete("access_token");
    cookieStore.delete("refresh_token");
    cookieStore.delete("username");
    cookieStore.delete("token");
  });
});

describe("logoutAction", () => {
  it("remove os cookies de token e username e redireciona para a raiz", async () => {
    await logoutAction();

    expect(mockCookieStore.delete).toHaveBeenCalledWith("token");
    expect(mockCookieStore.delete).toHaveBeenCalledWith("username");
    expect(mockedRedirect).toHaveBeenCalledWith("/");
  });
});

describe("signInAction", () => {
  const initialSignInState: SignInState = {
    error: null,
    fieldErrors: {},
    fieldValues: { email: "" },
    resetKey: "initial-reset-key",
  };

  it("trata fallback quando o campo email não é enviado no FormData (linha 46: formData.get(email) ?? '')", async () => {
    const emptyFormData = new FormData();
    // email ausente aciona o ?? ""
    emptyFormData.set("password", "short");

    const result = await signInAction(initialSignInState, emptyFormData);

    expect(result.fieldValues.email).toBe("");
    expect(result.fieldErrors.email).toBeDefined();
  });

  it("retorna erros de validação sem chamar o serviço", async () => {
    const result = await signInAction(
      initialSignInState,
      createFormData({
        email: "invalid-email",
        password: "Senha@123",
      })
    );

    expect(result).toEqual({
      error: null,
      fieldErrors: { email: expect.any(String) },
      fieldValues: { email: "invalid-email" },
      resetKey: expect.any(String),
    });
    expect(mockedLoginUser).not.toHaveBeenCalled();
    expect(mockCookieStore.set).not.toHaveBeenCalled();
  });

  it("ignora o segundo erro de validação para o mesmo campo (linha 60: !fieldErrors[field] branch false)", async () => {
    // Envia uma senha vazia ou inválida que dispara múltiplos issues no schema Zod
    const formData = new FormData();
    formData.set("email", "student@example.com");
    formData.set("password", "");

    const result = await signInAction(initialSignInState, formData);

    expect(result.fieldErrors.password).toBeDefined();
  });

  it("retorna erro de autenticação quando as credenciais são inválidas", async () => {
    mockedLoginUser.mockRejectedValue(new InvalidCredentialsError());

    const result = await signInAction(initialSignInState, createFormData());

    expect(result.error).toBe("E-mail ou senha inválidos.");
    expect(result.fieldValues).toEqual({ email: "student@example.com" });
    expect(mockCookieStore.set).not.toHaveBeenCalled();
    expect(mockedRedirect).not.toHaveBeenCalled();
    expect(mockedLogServerError).not.toHaveBeenCalled();
  });

  it("define cookies de token e username e redireciona no login com sucesso", async () => {
    mockedLoginUser.mockResolvedValue({
      user: "student",
      accessToken: "signed-access-token",
      refreshToken: "signed-refresh-token",
      refreshTokenExpiresAt: new Date(),
    });

    await signInAction(initialSignInState, createFormData());

    expect(mockedLoginUser).toHaveBeenCalledWith({
      email: "student@example.com",
      password: "Senha@123",
    });
    expect(mockCookieStore.set).toHaveBeenCalledWith("access_token", "signed-access-token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    expect(mockCookieStore.set).toHaveBeenCalledWith("refresh_token", "signed-refresh-token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 2592000,
    });
    expect(mockCookieStore.set).toHaveBeenCalledWith("username", "student", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 2592000,
    });
    expect(mockedRedirect).toHaveBeenCalledWith("/tracks");
  });

  it("retorna a mensagem de bloqueio quando o limite de tentativas é excedido", async () => {
    mockedLoginUser.mockRejectedValue(new TooManyAttemptsError(300));

    const result = await signInAction(initialSignInState, createFormData());

    expect(result).toEqual({
      error: "Muitas tentativas de login. Tente novamente em alguns minutos.",
      fieldErrors: {},
      fieldValues: { email: "student@example.com" },
      resetKey: expect.any(String),
    });
    expect(mockCookieStore.set).not.toHaveBeenCalled();
    expect(mockedRedirect).not.toHaveBeenCalled();
    expect(mockedLogServerError).not.toHaveBeenCalled();
  });

  it("não expõe o tempo de espera na mensagem de bloqueio", async () => {
    mockedLoginUser.mockRejectedValue(new TooManyAttemptsError(300));

    const result = await signInAction(initialSignInState, createFormData());

    expect(result.error).not.toContain("300");
  });

  it("retorna erro genérico e registra no servidor quando o login lança exceção desconhecida", async () => {
    const unexpected = new Error("Database offline");
    mockedLoginUser.mockRejectedValue(unexpected);

    const result = await signInAction(initialSignInState, createFormData());

    expect(result.error).toBe("Não foi possível logar a conta. Tente novamente.");
    expect(result.error).not.toBe("Muitas tentativas de login. Tente novamente em alguns minutos.");
    expect(JSON.stringify(result)).not.toContain("Database offline");
    expect(mockedLogServerError).toHaveBeenCalledWith("auth", unexpected);
    expect(mockCookieStore.set).not.toHaveBeenCalled();
    expect(mockedRedirect).not.toHaveBeenCalled();
  });
});

describe("signUpAction", () => {
  const initialSignUpState: SignUpState = {
    error: null,
    fieldErrors: {},
    fieldValues: { username: "", email: "" },
    resetKey: "initial-reset-key",
  };

  it("trata fallback quando username e email são nulos no FormData (linhas 106-107: ?? '')", async () => {
    const emptyFormData = new FormData();
    // Campos omitidos ativam o fallback ?? ""

    const result = await signUpAction(initialSignUpState, emptyFormData);

    expect(result.fieldValues).toEqual({ username: "", email: "" });
    expect(result.fieldErrors.username).toBeDefined();
    expect(result.fieldErrors.email).toBeDefined();
  });

  it("retorna erros de validação sem chamar o serviço", async () => {
    const formData = createFormData({
      ...validFields,
      email: "invalid-email",
    });

    const result = await signUpAction(initialSignUpState, formData);

    expect(result.error).toBeNull();
    expect(result.fieldErrors.email).toBeDefined();
    expect(mockedRegisterUser).not.toHaveBeenCalled();
    expect(mockCookieStore.set).not.toHaveBeenCalled();
  });

  it("não sobrescreve o primeiro erro se houver múltiplos erros para o mesmo campo (linha 124: branch false)", async () => {
    const formData = new FormData();
    formData.set("username", "ab"); // muito curto ou inválido
    formData.set("email", "student@example.com");
    formData.set("password", "123"); // falha em múltiplos critérios (tamanho, caracteres)
    formData.set("confirmPassword", "123");

    const result = await signUpAction(initialSignUpState, formData);

    expect(result.fieldErrors.password).toBeDefined();
  });

  it("retorna erro de e-mail duplicado", async () => {
    mockedRegisterUser.mockRejectedValue(new EmailAlreadyExistsError());

    const result = await signUpAction(initialSignUpState, createFormData());

    expect(result.error).toBe("Este e-mail já foi cadastrado.");
    expect(result.fieldErrors.email).toBe("Este e-mail já foi cadastrado.");
    expect(mockCookieStore.set).not.toHaveBeenCalled();
    expect(mockedRedirect).not.toHaveBeenCalled();
    expect(mockedLogServerError).not.toHaveBeenCalled();
  });

  it("retorna erro genérico e registra no servidor quando o serviço lança exceção desconhecida", async () => {
    const unexpected = new Error("Database offline");
    mockedRegisterUser.mockRejectedValue(unexpected);

    const result = await signUpAction(initialSignUpState, createFormData());

    expect(result.error).toBe("Não foi possível criar a conta. Tente novamente.");
    expect(JSON.stringify(result)).not.toContain("Database offline");
    expect(mockedLogServerError).toHaveBeenCalledWith("auth", unexpected);
    expect(mockCookieStore.set).not.toHaveBeenCalled();
    expect(mockedRedirect).not.toHaveBeenCalled();
  });

  it("define cookies e redireciona após cadastro realizado com sucesso", async () => {
    mockedRegisterUser.mockResolvedValue({
      user: "student",
      accessToken: "signed-access-token",
      refreshToken: "signed-refresh-token",
      refreshTokenExpiresAt: new Date(),
    });

    await signUpAction(initialSignUpState, createFormData());

    expect(mockedRegisterUser).toHaveBeenCalledWith({
      username: validFields.username,
      email: validFields.email,
      password: validFields.password,
      confirmPassword: validFields.confirmPassword,
    });
    expect(mockCookieStore.set).toHaveBeenCalledWith("access_token", "signed-access-token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    expect(mockCookieStore.set).toHaveBeenCalledWith("refresh_token", "signed-refresh-token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 2592000,
    });
    expect(mockCookieStore.set).toHaveBeenCalledWith("username", "student", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 2592000,
    });
    expect(mockedRedirect).toHaveBeenCalledWith("/tracks");
  });
});

describe("getProfileUserAction", () => {
  it("retorna 401 se não houver token no cookie", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const result = await getProfileUserAction();

    expect(result).toEqual({ success: false, error: "Não autorizado", statusCode: 401 });
  });

  it("retorna 401 se a sessão for nula", async () => {
    mockCookieStore.get.mockReturnValue({ value: "invalid-token" });
    mockedVerifyToken.mockResolvedValue(null as never);

    const result = await getProfileUserAction();

    expect(result).toEqual({ success: false, error: "Sessão inválida ou expirada", statusCode: 401 });
  });

  it("retorna 401 se session existir mas não tiver sub (linha 194: branch !session.sub)", async () => {
    mockCookieStore.get.mockReturnValue({ value: "valid-token" });
    mockedVerifyToken.mockResolvedValue({} as never);

    const result = await getProfileUserAction();

    expect(result).toEqual({ success: false, error: "Sessão inválida ou expirada", statusCode: 401 });
  });

  it("retorna os dados do perfil com sucesso", async () => {
    mockCookieStore.get.mockReturnValue({ value: "valid-token" });
    mockedVerifyToken.mockResolvedValue({ sub: VALID_USER_ID, role: "student" } as never);
    const mockProfile = {
      id: VALID_USER_ID,
      email: "user@example.com",
      username: "user1",
      role: "student" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockedGetUserProfile.mockResolvedValue(mockProfile as never);

    const result = await getProfileUserAction();

    expect(mockedGetUserProfile).toHaveBeenCalledWith(VALID_USER_ID);
    expect(result).toEqual({
      success: true,
      data: mockProfile,
      requiresReauth: false,
      statusCode: 200,
    });
  });

  it("retorna mensagem genérica e registra no servidor quando ocorre um erro inesperado", async () => {
    mockCookieStore.get.mockReturnValue({ value: "valid-token" });
    mockedVerifyToken.mockResolvedValue({ sub: VALID_USER_ID, role: "student" } as never);
    const internalError = new Error(INTERNAL_ERROR_MESSAGE);
    mockedGetUserProfile.mockRejectedValue(internalError);

    const result = await getProfileUserAction();

    expect(result).toEqual({ success: false, error: "Erro ao carregar perfil", statusCode: 500 });
    expectNoInternalDetails(result);
    expect(mockedLogServerError).toHaveBeenCalledWith("auth:getProfile", internalError);
  });

  it("retorna mensagem genérica quando o erro inesperado não possui message", async () => {
    mockCookieStore.get.mockReturnValue({ value: "valid-token" });
    mockedVerifyToken.mockResolvedValue({ sub: VALID_USER_ID, role: "student" } as never);
    mockedGetUserProfile.mockRejectedValue(new Error(""));

    const result = await getProfileUserAction();

    expect(result).toEqual({ success: false, error: "Erro ao carregar perfil", statusCode: 500 });
  });

  it("retorna 404 com a mensagem do domínio quando o usuário não é encontrado", async () => {
    mockCookieStore.get.mockReturnValue({ value: "valid-token" });
    mockedVerifyToken.mockResolvedValue({ sub: VALID_USER_ID, role: "student" } as never);
    mockedGetUserProfile.mockRejectedValue(new UserNotFoundError());

    const result = await getProfileUserAction();

    expect(result).toEqual({ success: false, error: "Usuário não encontrado.", statusCode: 404 });
    expect(mockedLogServerError).not.toHaveBeenCalled();
  });
});

describe("updateProfileUserAction", () => {
  const updateInput = {
    username: "updatedUser",
    email: "updated@example.com",
  };

  const currentUser = {
    id: VALID_USER_ID,
    username: "oldUser",
    email: "old@example.com",
  };

  it("retorna 401 se não houver token", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const result = await updateProfileUserAction(updateInput);

    expect(result).toEqual({ success: false, error: "Não autorizado", statusCode: 401 });
  });

  it("retorna 401 se a sessão for nula ou não possuir sub", async () => {
    mockCookieStore.get.mockReturnValue({ value: "token" });
    mockedVerifyToken.mockResolvedValue({} as never);

    const result = await updateProfileUserAction(updateInput);

    expect(result).toEqual({ success: false, error: "Sessão inválida ou expirada", statusCode: 401 });
  });

  it("retorna 400 com fieldErrors se o payload falhar no schema", async () => {
    mockCookieStore.get.mockReturnValue({ value: "token" });
    mockedVerifyToken.mockResolvedValue({ sub: VALID_USER_ID } as never);

    const result = await updateProfileUserAction({
      username: "",
      email: "invalid-email",
    });

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    if (!result.success) {
      expect(result.fieldErrors).toBeDefined();
    }
  });

  it("retorna 404 se o usuário não for encontrado no banco", async () => {
    mockCookieStore.get.mockReturnValue({ value: "token" });
    mockedVerifyToken.mockResolvedValue({ sub: VALID_USER_ID } as never);
    mockedAuthRepo.findById.mockResolvedValue(null);

    const result = await updateProfileUserAction(updateInput);

    expect(result).toEqual({ success: false, error: "Usuário não encontrado", statusCode: 404 });
  });

  it("exige reautenticação e limpa cookies se o e-mail for alterado", async () => {
    mockCookieStore.get.mockReturnValue({ value: "token" });
    mockedVerifyToken.mockResolvedValue({ sub: VALID_USER_ID } as never);
    mockedAuthRepo.findById.mockResolvedValue(currentUser as never);

    const updated = { ...currentUser, email: updateInput.email, username: updateInput.username };
    mockedUpdateUserProfile.mockResolvedValue(updated as never);

    const result = await updateProfileUserAction(updateInput);

    expect(mockCookieStore.delete).toHaveBeenCalledWith("token");
    expect(mockCookieStore.delete).toHaveBeenCalledWith("username");
    expect(result).toEqual({
      success: true,
      data: updated,
      requiresReauth: true,
      statusCode: 200,
    });
  });

  it("exige reautenticação se a senha for alterada", async () => {
    mockCookieStore.get.mockReturnValue({ value: "token" });
    mockedVerifyToken.mockResolvedValue({ sub: VALID_USER_ID } as never);
    mockedAuthRepo.findById.mockResolvedValue(currentUser as never);

    const updated = { ...currentUser };
    mockedUpdateUserProfile.mockResolvedValue(updated as never);

    const result = await updateProfileUserAction({
      username: currentUser.username,
      email: currentUser.email,
      password: "NewPassword@123",
      confirmPassword: "NewPassword@123",
    });

    expect(mockCookieStore.delete).toHaveBeenCalledWith("token");
    expect(mockCookieStore.delete).toHaveBeenCalledWith("username");
    expect(result).toEqual({
      success: true,
      data: updated,
      requiresReauth: true,
      statusCode: 200,
    });
  });

  it("atualiza apenas o cookie de username quando apenas o username for alterado", async () => {
    mockCookieStore.get.mockReturnValue({ value: "token" });
    mockedVerifyToken.mockResolvedValue({ sub: VALID_USER_ID } as never);
    mockedAuthRepo.findById.mockResolvedValue(currentUser as never);

    const updated = { ...currentUser, username: "newUsername" };
    mockedUpdateUserProfile.mockResolvedValue(updated as never);

    const result = await updateProfileUserAction({
      username: "newUsername",
      email: currentUser.email,
    });

    expect(mockCookieStore.delete).toHaveBeenCalledWith("username");
    expect(mockCookieStore.set).toHaveBeenCalledWith("username", "newUsername", expect.any(Object));
    expect(result).toEqual({
      success: true,
      data: updated,
      requiresReauth: false,
      statusCode: 200,
    });
  });

  it("retorna sem alterar cookies se nenhum dado crítico mudar", async () => {
    mockCookieStore.get.mockReturnValue({ value: "token" });
    mockedVerifyToken.mockResolvedValue({ sub: VALID_USER_ID } as never);
    mockedAuthRepo.findById.mockResolvedValue(currentUser as never);
    mockedUpdateUserProfile.mockResolvedValue(currentUser as never);

    const result = await updateProfileUserAction({
      username: currentUser.username,
      email: currentUser.email,
    });

    expect(mockCookieStore.delete).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      data: currentUser,
      requiresReauth: false,
      statusCode: 200,
    });
  });

  it("retorna mensagem genérica e registra no servidor quando ocorre um erro inesperado", async () => {
    mockCookieStore.get.mockReturnValue({ value: "token" });
    mockedVerifyToken.mockResolvedValue({ sub: VALID_USER_ID } as never);
    mockedAuthRepo.findById.mockResolvedValue(currentUser as never);
    const internalError = new Error(INTERNAL_ERROR_MESSAGE);
    mockedUpdateUserProfile.mockRejectedValue(internalError);

    const result = await updateProfileUserAction(updateInput);

    expect(result).toEqual({ success: false, error: "Erro ao atualizar perfil", statusCode: 500 });
    expectNoInternalDetails(result);
    expect(mockedLogServerError).toHaveBeenCalledWith("auth:updateProfile", internalError);
  });

  it("retorna mensagem genérica quando o erro inesperado não possui message", async () => {
    mockCookieStore.get.mockReturnValue({ value: "token" });
    mockedVerifyToken.mockResolvedValue({ sub: VALID_USER_ID } as never);
    mockedAuthRepo.findById.mockResolvedValue(currentUser as never);
    mockedUpdateUserProfile.mockRejectedValue(new Error(""));

    const result = await updateProfileUserAction(updateInput);

    expect(result).toEqual({ success: false, error: "Erro ao atualizar perfil", statusCode: 500 });
  });

  it("retorna 409 com a mensagem do domínio quando o e-mail já está em uso", async () => {
    mockCookieStore.get.mockReturnValue({ value: "token" });
    mockedVerifyToken.mockResolvedValue({ sub: VALID_USER_ID } as never);
    mockedAuthRepo.findById.mockResolvedValue(currentUser as never);
    mockedUpdateUserProfile.mockRejectedValue(new EmailAlreadyExistsError());

    const result = await updateProfileUserAction(updateInput);

    expect(result).toEqual({
      success: false,
      error: "Este e-mail já foi cadastrado.",
      statusCode: 409,
    });
    expect(mockedLogServerError).not.toHaveBeenCalled();
  });

  it("retorna 404 com a mensagem do domínio quando o serviço não encontra o usuário", async () => {
    mockCookieStore.get.mockReturnValue({ value: "token" });
    mockedVerifyToken.mockResolvedValue({ sub: VALID_USER_ID } as never);
    mockedAuthRepo.findById.mockResolvedValue(currentUser as never);
    mockedUpdateUserProfile.mockRejectedValue(new UserNotFoundError());

    const result = await updateProfileUserAction(updateInput);

    expect(result).toEqual({ success: false, error: "Usuário não encontrado.", statusCode: 404 });
    expect(mockedLogServerError).not.toHaveBeenCalled();
  });
});

describe("deleteAccountAction", () => {
  const deleteInput = { password: "SenhaValida@123" };

  it("retorna 401 se não houver token", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const result = await deleteAccountAction(deleteInput);

    expect(result).toEqual({ success: false, error: "Não autorizado", statusCode: 401 });
  });

  it("retorna 401 se a sessão for nula", async () => {
    mockCookieStore.get.mockReturnValue({ value: "token" });
    mockedVerifyToken.mockResolvedValue(null as never);

    const result = await deleteAccountAction(deleteInput);

    expect(result).toEqual({ success: false, error: "Sessão inválida ou expirada", statusCode: 401 });
  });

  it("retorna 401 se a sessão existir mas sub for vazio (linha 305: branch !userId)", async () => {
    mockCookieStore.get.mockReturnValue({ value: "token" });
    mockedVerifyToken.mockResolvedValue({ sub: "" } as never);

    const result = await deleteAccountAction(deleteInput);

    expect(result).toEqual({ success: false, error: "Sessão inválida ou expirada", statusCode: 401 });
  });

  it("retorna 400 se o input falhar na validação do schema", async () => {
    mockCookieStore.get.mockReturnValue({ value: "token" });
    mockedVerifyToken.mockResolvedValue({ sub: VALID_USER_ID } as never);

    const result = await deleteAccountAction({ password: "" });

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
  });

  it("retorna 400 quando a senha informada for incorreta", async () => {
    mockCookieStore.get.mockReturnValue({ value: "token" });
    mockedVerifyToken.mockResolvedValue({ sub: VALID_USER_ID } as never);
    mockedDeleteUserAccount.mockRejectedValue(new InvalidCredentialsError());

    const result = await deleteAccountAction(deleteInput);

    expect(result).toEqual({
      success: false,
      error: "Senha incorreta.",
      statusCode: 400,
    });
    expect(mockedLogServerError).not.toHaveBeenCalled();
  });

  it("deleta a conta, remove o cookie e retorna sucesso", async () => {
    mockCookieStore.get.mockReturnValue({ value: "token" });
    mockedVerifyToken.mockResolvedValue({ sub: VALID_USER_ID } as never);
    mockedDeleteUserAccount.mockResolvedValue(undefined as never);

    const result = await deleteAccountAction(deleteInput);

    expect(mockedDeleteUserAccount).toHaveBeenCalledWith(VALID_USER_ID, deleteInput);
    expect(mockCookieStore.delete).toHaveBeenCalledWith("token");
    expect(result).toEqual({
      success: true,
      data: null,
      requiresReauth: true,
      statusCode: 200,
    });
  });

  it("retorna mensagem genérica e registra no servidor quando ocorre um erro inesperado", async () => {
    mockCookieStore.get.mockReturnValue({ value: "token" });
    mockedVerifyToken.mockResolvedValue({ sub: VALID_USER_ID } as never);
    const internalError = new Error(INTERNAL_ERROR_MESSAGE);
    mockedDeleteUserAccount.mockRejectedValue(internalError);

    const result = await deleteAccountAction(deleteInput);

    expect(result).toEqual({ success: false, error: "Erro ao excluir conta", statusCode: 500 });
    expectNoInternalDetails(result);
    expect(mockedLogServerError).toHaveBeenCalledWith("auth:deleteAccount", internalError);
    expect(mockCookieStore.delete).not.toHaveBeenCalled();
  });

  it("retorna mensagem genérica quando o erro inesperado não possui message", async () => {
    mockCookieStore.get.mockReturnValue({ value: "token" });
    mockedVerifyToken.mockResolvedValue({ sub: VALID_USER_ID } as never);
    mockedDeleteUserAccount.mockRejectedValue(new Error(""));

    const result = await deleteAccountAction(deleteInput);

    expect(result).toEqual({ success: false, error: "Erro ao excluir conta", statusCode: 500 });
  });

  it("retorna 404 com a mensagem do domínio quando o usuário não é encontrado", async () => {
    mockCookieStore.get.mockReturnValue({ value: "token" });
    mockedVerifyToken.mockResolvedValue({ sub: VALID_USER_ID } as never);
    mockedDeleteUserAccount.mockRejectedValue(new UserNotFoundError());

    const result = await deleteAccountAction(deleteInput);

    expect(result).toEqual({ success: false, error: "Usuário não encontrado.", statusCode: 404 });
    expect(mockedLogServerError).not.toHaveBeenCalled();
  });
});

describe("getAdminProfileAction", () => {
  it("retorna 401 se não houver token", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const result = await getAdminProfileAction();

    expect(result).toEqual({ success: false, error: "Não autorizado", statusCode: 401 });
  });

  it("retorna 401 se o token não tiver sub", async () => {
    mockCookieStore.get.mockReturnValue({ value: "token" });
    mockedVerifyToken.mockResolvedValue({ sub: "" } as never);

    const result = await getAdminProfileAction();

    expect(result).toEqual({ success: false, error: "Sessão inválida ou expirada", statusCode: 401 });
  });

  it("retorna 403 se o role no token JWT não for admin", async () => {
    mockCookieStore.get.mockReturnValue({ value: "token" });
    mockedVerifyToken.mockResolvedValue({ sub: VALID_USER_ID, role: "student" } as never);

    const result = await getAdminProfileAction();

    expect(result).toEqual({
      success: false,
      error: "Acesso proibido: Requer perfil administrativo",
      statusCode: 403,
    });
  });

  it("retorna o perfil administrativo com sucesso", async () => {
    mockCookieStore.get.mockReturnValue({ value: "token" });
    mockedVerifyToken.mockResolvedValue({ sub: VALID_USER_ID, role: "admin" } as never);

    const adminProfile = {
      id: VALID_USER_ID,
      username: "adminUser",
      email: "admin@example.com",
      role: "admin" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockedGetAdminProfile.mockResolvedValue(adminProfile as never);

    const result = await getAdminProfileAction();

    expect(mockedGetAdminProfile).toHaveBeenCalledWith(VALID_USER_ID);
    expect(result).toEqual({
      success: true,
      data: adminProfile,
      requiresReauth: false,
      statusCode: 200,
    });
  });

  it("captura ForbiddenError lançado pelo serviço e retorna 403", async () => {
    mockCookieStore.get.mockReturnValue({ value: "token" });
    mockedVerifyToken.mockResolvedValue({ sub: VALID_USER_ID, role: "admin" } as never);
    mockedGetAdminProfile.mockRejectedValue(new ForbiddenError());

    const result = await getAdminProfileAction();

    expect(result).toEqual({
      success: false,
      error: "Acesso restrito a administradores.",
      statusCode: 403,
    });
    expect(mockedLogServerError).not.toHaveBeenCalled();
  });

  it("retorna 404 com a mensagem do domínio quando o usuário não é encontrado", async () => {
    mockCookieStore.get.mockReturnValue({ value: "token" });
    mockedVerifyToken.mockResolvedValue({ sub: VALID_USER_ID, role: "admin" } as never);
    mockedGetAdminProfile.mockRejectedValue(new UserNotFoundError());

    const result = await getAdminProfileAction();

    expect(result).toEqual({ success: false, error: "Usuário não encontrado.", statusCode: 404 });
    expect(mockedLogServerError).not.toHaveBeenCalled();
  });

  it("retorna mensagem genérica e registra no servidor quando o serviço lança erro inesperado", async () => {
    mockCookieStore.get.mockReturnValue({ value: "token" });
    mockedVerifyToken.mockResolvedValue({ sub: VALID_USER_ID, role: "admin" } as never);
    const internalError = new Error(INTERNAL_ERROR_MESSAGE);
    mockedGetAdminProfile.mockRejectedValue(internalError);

    const result = await getAdminProfileAction();

    expect(result).toEqual({
      success: false,
      error: "Erro ao carregar perfil administrativo",
      statusCode: 500,
    });
    expectNoInternalDetails(result);
    expect(mockedLogServerError).toHaveBeenCalledWith("auth:getAdminProfile", internalError);
  });

  it("retorna mensagem genérica quando o erro inesperado não possui message", async () => {
    mockCookieStore.get.mockReturnValue({ value: "token" });
    mockedVerifyToken.mockResolvedValue({ sub: VALID_USER_ID, role: "admin" } as never);
    mockedGetAdminProfile.mockRejectedValue(new Error(""));

    const result = await getAdminProfileAction();

    expect(result).toEqual({
      success: false,
      error: "Erro ao carregar perfil administrativo",
      statusCode: 500,
    });
  });
});
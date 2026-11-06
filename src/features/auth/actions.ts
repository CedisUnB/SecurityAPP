"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  EMAIL_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  signUpSchema,
  signInSchema,
  updateProfileSchema,
  deleteAccountSchema,
} from "./types/auth.types";
import type { DeleteAccountInput, SignInInput, SignUpInput, UpdateProfileInput, UserProfile } from "./types/auth.types";
import { deleteUserAccount, getAdminProfile, getUserProfile, InvalidCredentialsError, loginUser, registerUser, updateUserProfile } from "./services/auth";
import { getActionFailure, getAuthErrorState } from "./errors";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  getSessionWithRefresh,
  revokeAllRefreshTokens,
  revokeRefreshToken,
  REFRESH_TOKEN_TTL_SECONDS,
  setAuthCookies,
} from "@/core/security";
import { authRepository } from "./repositories/auth.repository";
import { TooManyAttemptsError } from "./services/login-rate-limit";

export type SignUpField = keyof SignUpInput;
export type SignInField = keyof SignInInput;

type ActionResponse<TData, TFields extends string = string> = 
  | { success: true; data: TData; requiresReauth: boolean; statusCode: number }
  | { success: false; error: string; fieldErrors?: Partial<Record<TFields, string>>; statusCode: number };

export interface SignUpState {
  error: string | null;
  fieldErrors: Partial<Record<SignUpField, string>>;
  fieldValues: { username: string; email: string };
  resetKey: string;
}

export interface SignInState {
  error: string | null;
  fieldErrors: Partial<Record<SignInField, string>>;
  fieldValues: { email: string };
  resetKey: string;
}

export async function logoutAction(): Promise<never> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
  clearAuthCookies(cookieStore);
  redirect("/");
}


export async function signInAction(
  _prevState: SignInState,
  formData: FormData
): Promise<SignInState> {
  const rawEmail = formData.get("email");
  const fieldValues = {
    email: typeof rawEmail === "string" ? rawEmail.slice(0, EMAIL_MAX_LENGTH) : "",
  };
  const resetKey = crypto.randomUUID();

  const parsed = signInSchema.safeParse({
    email: rawEmail,
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: Partial<Record<SignInField, string>> = {};

    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (
        (field === "email" || field === "password") &&
        !fieldErrors[field]
      ) {
        fieldErrors[field] = issue.message;
      }
    }

    return { error: null, fieldErrors, fieldValues, resetKey };
  }

  try {
    const { user, accessToken, refreshToken, refreshTokenExpiresAt } =
      await loginUser(parsed.data);
    setAuthCookies(
      await cookies(),
      { accessToken, refreshToken, refreshTokenExpiresAt },
      user,
    );
  } catch (err) {
    if (err instanceof TooManyAttemptsError) {
      return { error: err.message, fieldErrors: {}, fieldValues, resetKey };
    }

    const result = getAuthErrorState(
      err,
      "Não foi possível logar a conta. Tente novamente."
    );

    return { ...result, fieldValues, resetKey };
  }

  redirect("/tracks");
}

export async function signUpAction(
  _prevState: SignUpState,
  formData: FormData
): Promise<SignUpState> {
  const rawUsername = formData.get("username");
  const rawEmail = formData.get("email");
  const fieldValues = {
    username: typeof rawUsername === "string" ? rawUsername.slice(0, USERNAME_MAX_LENGTH) : "",
    email: typeof rawEmail === "string" ? rawEmail.slice(0, EMAIL_MAX_LENGTH) : "",
  };
  const resetKey = crypto.randomUUID();

  const parsed = signUpSchema.safeParse({
    username: rawUsername,
    email: rawEmail,
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const fieldErrors: Partial<Record<SignUpField, string>> = {};

    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (
        (field === "username" || field === "email" || field === "password" || field === "confirmPassword") &&
        !fieldErrors[field]
      ) {
        fieldErrors[field] = issue.message;
      }
    }

    return { error: null, fieldErrors, fieldValues, resetKey };
  }

  try {
    const { user, accessToken, refreshToken, refreshTokenExpiresAt } =
      await registerUser({
        username: parsed.data.username,
        email: parsed.data.email,
        password: parsed.data.password,
        confirmPassword: parsed.data.confirmPassword,
      });

    setAuthCookies(
      await cookies(),
      { accessToken, refreshToken, refreshTokenExpiresAt },
      user,
    );
  } catch (err) {
    const result = getAuthErrorState(
      err,
      "Não foi possível criar a conta. Tente novamente.",
      "email"
    );

    return { ...result, fieldValues, resetKey };
  }

  redirect("/tracks");
}

export async function getProfileUserAction(): Promise<ActionResponse<UserProfile>> {
  try {
    const cookieStore = await cookies();
    const hadAccessToken = Boolean(cookieStore.get(ACCESS_TOKEN_COOKIE)?.value);
    const session = await getSessionWithRefresh();

    if (!session && !hadAccessToken) {
      return { success: false, error: "Não autorizado", statusCode: 401 };
    }
    if (!session || !session.sub) {
      return { success: false, error: "Sessão inválida ou expirada", statusCode: 401 };
    }

    const profile = await getUserProfile(session.sub);

    return {
      success: true,
      data: profile,
      requiresReauth: false,
      statusCode: 200
    }
  } catch (err) {
    return getActionFailure(err, "auth:getProfile", "Erro ao carregar perfil");
  }

}

export async function updateProfileUserAction(input: UpdateProfileInput): Promise<ActionResponse<UserProfile>> {
  try {
    const cookieStore = await cookies();
    const hadAccessToken = Boolean(cookieStore.get(ACCESS_TOKEN_COOKIE)?.value);
    const session = await getSessionWithRefresh();

    if (!session && !hadAccessToken) {
      return { success: false, error: "Não autorizado", statusCode: 401 };
    }

    const userId = session?.sub;

    if (!session || !userId) {
      return { success: false, error: "Sessão inválida ou expirada", statusCode: 401 };
    }

    const parsed = updateProfileSchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof UpdateProfileInput, string>> = {};

      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof UpdateProfileInput;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }

      return {
        success: false,
        error: "Dados inválidos",
        fieldErrors,
        statusCode: 400,
      };
    }

    const currentUser = await authRepository.findById(userId);
    if (!currentUser) {
      return { success: false, error: "Usuário não encontrado", statusCode: 404 };
    }

    const emailChanged = currentUser.email !== parsed.data.email;
    const passwordChanged = Boolean(parsed.data.password && parsed.data.password.trim().length > 0);
    const usernameChanged = currentUser.username !== parsed.data.username;
    const requiresReauth = emailChanged || passwordChanged;

    const updatedProfile = await updateUserProfile(userId, parsed.data);
    
    if (requiresReauth) {
      await revokeAllRefreshTokens(userId);
      clearAuthCookies(cookieStore);

      return {
        success: true,
        data: updatedProfile,
        requiresReauth: true,
        statusCode: 200
      };
    } else if (usernameChanged) {
      cookieStore.delete("username");
      cookieStore.set("username", parsed.data.username, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: REFRESH_TOKEN_TTL_SECONDS,
      });
    }

    return {
      success: true,
      data: updatedProfile,
      requiresReauth: false,
      statusCode: 200
    };
  } catch (err) {
    return getActionFailure(err, "auth:updateProfile", "Erro ao atualizar perfil");
  }
}

export async function deleteAccountAction(
  input: DeleteAccountInput
): Promise<ActionResponse<null, keyof DeleteAccountInput>> {
  try {
    const cookieStore = await cookies();
    const hadAccessToken = Boolean(cookieStore.get(ACCESS_TOKEN_COOKIE)?.value);
    const session = await getSessionWithRefresh();

    if (!session && !hadAccessToken) {
      return { success: false, error: "Não autorizado", statusCode: 401 };
    }

    const userId = session?.sub;

    if (!session || !userId) {
      return { success: false, error: "Sessão inválida ou expirada", statusCode: 401 };
    }

    const parsed = deleteAccountSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Senha inválida",
        statusCode: 400,
      };
    }

    await deleteUserAccount(userId, parsed.data);

    await revokeAllRefreshTokens(userId);
    clearAuthCookies(cookieStore);

    return {
      success: true,
      data: null,
      requiresReauth: true,
      statusCode: 200
    };
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      return { success: false, error: "Senha incorreta.", statusCode: 400 };
    }

    return getActionFailure(err, "auth:deleteAccount", "Erro ao excluir conta");
  }
}

export async function getAdminProfileAction(): Promise<ActionResponse<UserProfile>> {
  try {
    const cookieStore = await cookies();
    const hadAccessToken = Boolean(cookieStore.get(ACCESS_TOKEN_COOKIE)?.value);
    const session = await getSessionWithRefresh();

    if (!session && !hadAccessToken) {
      return { success: false, error: "Não autorizado", statusCode: 401 };
    }

    const userId = session?.sub;

    if (!session || !userId) {
      return { success: false, error: "Sessão inválida ou expirada", statusCode: 401 };
    }

    // Checagem prévia no payload JWT
    if (session.role !== "admin") {
      return { success: false, error: "Acesso proibido: Requer perfil administrativo", statusCode: 403 };
    }

    const profile = await getAdminProfile(userId);

    return {
      success: true,
      data: profile,
      requiresReauth: false,
      statusCode: 200
    };
  } catch (err) {
    return getActionFailure(err, "auth:getAdminProfile", "Erro ao carregar perfil administrativo");
  }
}
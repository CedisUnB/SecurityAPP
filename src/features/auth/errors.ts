import {
  EmailAlreadyExistsError,
  ForbiddenError,
  InvalidCredentialsError,
  UserNotFoundError,
} from "./services/auth";
import { logServerError } from "@/core/logging/log-server-error";
import type { SignInField, SignUpField } from "./actions";

export type AuthErrorField = SignInField | SignUpField;

export interface ActionFailure {
  success: false;
  error: string;
  statusCode: number;
}

function emptyFieldErrors<TField extends string>(): Partial<Record<TField, string>> {
  return {};
}

/**
 * Traduz um erro lançado pela camada de domínio (auth service) para o
 * formato de estado que as Server Actions de auth devolvem ao formulário.
 *
 * @param field - Campo do formulário ao qual associar a mensagem quando o
 * erro for `EmailAlreadyExistsError` (ex: "email"). Se omitido, a mensagem
 * aparece só como erro geral (`state.error`), não embaixo de um campo específico.
 */
export function getAuthErrorState<TField extends string = string>(
  error: unknown,
  fallbackMessage: string,
  field?: TField,
): {
  error: string | null;
  fieldErrors: Partial<Record<TField, string>>;
} {
  if (error instanceof InvalidCredentialsError) {
    return { error: error.message, fieldErrors: emptyFieldErrors<TField>() };
  }

  if (error instanceof EmailAlreadyExistsError) {
    return {
      error: error.message,
      fieldErrors: field
        ? ({ [field]: error.message } as Partial<Record<TField, string>>)
        : emptyFieldErrors<TField>(),
    };
  }

  logServerError("auth", error);

  return { error: fallbackMessage, fieldErrors: emptyFieldErrors<TField>() };
}

/**
 * Traduz um erro capturado em uma Server Action de perfil/conta para a
 * resposta de falha devolvida ao cliente.
 *
 * Só erros de domínio conhecidos expõem a própria mensagem. Qualquer outro
 * erro vira `fallbackMessage` (status 500) e seus detalhes técnicos são
 * registrados apenas no servidor.
 */
export function getActionFailure(
  error: unknown,
  context: string,
  fallbackMessage: string,
): ActionFailure {
  if (error instanceof ForbiddenError) {
    return { success: false, error: error.message, statusCode: 403 };
  }

  if (error instanceof UserNotFoundError) {
    return { success: false, error: error.message, statusCode: 404 };
  }

  if (error instanceof EmailAlreadyExistsError) {
    return { success: false, error: error.message, statusCode: 409 };
  }

  logServerError(context, error);

  return { success: false, error: fallbackMessage, statusCode: 500 };
}
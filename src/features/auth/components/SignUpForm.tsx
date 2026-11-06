"use client";

import { useActionState, useState } from "react";
import { PasswordStrengthIndicator } from "@/components/inputs/PasswordStrengthIndicator";
import { signUpAction, type SignUpState } from "@/features/auth";
import { PasswordInput } from "@/components/inputs/PasswordInput";
import {
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
} from "../types/auth.types";

const initialState: SignUpState = {
  error: null,
  fieldErrors: {},
  fieldValues: { username: "", email: "" },
  resetKey: "initial",
};

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState(signUpAction, initialState);
  const [password, setPassword] = useState("");

  return (
    <form
      action={formAction}
      onReset={(e) => {
        setPassword("");
        const confirmationInput = e.currentTarget.elements.namedItem("confirmPassword");
        if (confirmationInput instanceof HTMLInputElement) {
          confirmationInput.setCustomValidity("");
        }
      }}
      onInput={(e) => {
        const target = e.target;
        if (target instanceof HTMLInputElement && target.name === "password") {
          setPassword(target.value);
        }
        const passwordInput = e.currentTarget.elements.namedItem("password");
        const confirmationInput = e.currentTarget.elements.namedItem("confirmPassword");
        if (
          passwordInput instanceof HTMLInputElement &&
          confirmationInput instanceof HTMLInputElement
        ) {
          confirmationInput.setCustomValidity(
            confirmationInput.value === passwordInput.value ? "" : "As senhas não coincidem",
          );
        }
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="username" className="text-sm font-medium text-foreground">
          Nome de usuário
        </label>
        <input
          key={`username-${state.resetKey}`}
          id="username"
          name="username"
          type="text"
          required
          minLength={3}
          maxLength={USERNAME_MAX_LENGTH}
          defaultValue={state.fieldValues.username}
          aria-invalid={Boolean(state.fieldErrors.username)}
          aria-describedby={state.fieldErrors.username ? "username-error" : undefined}
          className="rounded-md border border-brand-primary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-brand-secondary"
        />
        <p
          id="username-error"
          className={`${state.fieldErrors.username ? "block" : "field-error"} text-sm text-cancel`}
        >
          {state.fieldErrors.username ?? "Informe um nome de usuário com pelo menos 3 caracteres."}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          E-mail
        </label>
       <input
          key={`email-${state.resetKey}`}
          id="email"
          name="email"
          type="email"
          required
          maxLength={EMAIL_MAX_LENGTH}
          defaultValue={state.fieldValues.email}
          aria-invalid={Boolean(state.fieldErrors.email)}
          aria-describedby={state.fieldErrors.email ? "email-error" : undefined}
          className="rounded-md border border-brand-primary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-brand-secondary"
        />
        <p
          id="email-error"
          className={`${state.fieldErrors.email ? "block" : "field-error"} text-sm text-cancel`}
        >
          {state.fieldErrors.email ?? "Informe um e-mail válido."}
        </p>
      </div>

      <PasswordInput
        id="password"
        name="password"
        label="Senha"
        required
        minLength={8}
        maxLength={PASSWORD_MAX_LENGTH}
        pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+"
        title="8-20 caracteres, com maiúscula, minúscula, número e caractere especial"
        error={state.fieldErrors.password}
        aria-describedby="password-strength"
      />
      <PasswordStrengthIndicator id="password-strength" password={password} />

      <PasswordInput
        id="confirmPassword"
        name="confirmPassword"
        label="Confirmar Senha"
        required
        maxLength={PASSWORD_MAX_LENGTH}
        error={state.fieldErrors.confirmPassword}
      />

      {state.error && <p className="text-sm text-cancel">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-brand-primary py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Criando conta..." : "Criar conta"}
      </button>
    </form>
  );
}
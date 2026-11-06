"use client";

import { useActionState } from "react";
import { signInAction, type SignInState } from "@/features/auth";
import { PasswordInput } from "@/components/inputs/PasswordInput";
import { EMAIL_MAX_LENGTH, PASSWORD_MAX_LENGTH } from "../types/auth.types";

const initialState: SignInState = { 
  error: null, 
  fieldErrors: {},
  fieldValues: { email: "" },
  resetKey: "initial",
};

export function SignInForm() {
  const [state, formAction, isPending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
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
        {state.fieldErrors.email && (
          <p id="email-error" className="text-sm text-cancel">
            {state.fieldErrors.email}
          </p>
        )}
      </div>

      <PasswordInput
        key={`password-${state.resetKey}`}
        id="password"
        name="password"
        label="Senha"
        required
        minLength={8}
        maxLength={PASSWORD_MAX_LENGTH}
        error={state.fieldErrors.password}
      />

      {state.error && <p className="text-sm text-cancel">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-brand-primary py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
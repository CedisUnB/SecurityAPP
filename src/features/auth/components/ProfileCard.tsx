"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserProfile, UpdateProfileInput } from "../types/auth.types";
import { updateProfileUserAction } from "../actions";
import { FormatDate } from "@/utils/dateFormatter";
import { DeleteAccountModal } from "./DeleteAccountModal";
import { PasswordStrengthIndicator } from "@/components/inputs/PasswordStrengthIndicator";
import {
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
} from "../types/auth.types";

interface ProfileCardProps {
  initialUser: UserProfile;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ initialUser }) => {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState<UserProfile>(initialUser);
  const [isPending, startTransition] = useTransition();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const [formData, setFormData] = useState<UpdateProfileInput>({
    username: initialUser.username,
    email: initialUser.email,
    password: "",
    confirmPassword: "",
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof UpdateProfileInput, string>>>({});

  const formattedCreatedDate = FormatDate(user.createdAt);
  const formattedUpdatedDate = FormatDate(user.updatedAt);

  const handleCancel = () => {
    setFormData({
      username: user.username,
      email: user.email,
      password: "",
      confirmPassword: "",
    });
    setFieldErrors({});
    setErrorMessage(null);
    setIsEditing(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    startTransition(async () => {
      const response = await updateProfileUserAction(formData);

      if (!response.success) {
        if (response.statusCode === 401) {
          router.replace("/auth/login?reauth=1");
          return;
        }
        if (response.statusCode === 403) {
          setAccessDenied(true);
          setIsEditing(false);
          setIsDeleteModalOpen(false);
          setErrorMessage("Você não tem permissão para executar esta ação.");
          return;
        }
        setErrorMessage(response.error);
        if (response.fieldErrors) {
          setFieldErrors(response.fieldErrors);
        }
        return;
      }

      if (response.requiresReauth) {
        router.push("/auth/login?reauth=1");
        return;
      }

      setUser(response.data);
      setFormData((prev) => ({ ...prev, password: "", confirmPassword: "" }));
      setIsEditing(false);
      setToastMessage("Perfil atualizado com sucesso");
      router.refresh();

      setTimeout(() => setToastMessage(null), 4000);
    });
  };

  return (
    <div className="relative w-full max-w-lg rounded-xl p-6 shadow-sm bg-surface-alt">
      {toastMessage && (
        <div className="mb-4 rounded-md bg-confirm p-3 text-sm font-medium text-white transition">
          {toastMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 rounded-md bg-cancel p-3 text-sm font-medium text-white transition">
          {errorMessage}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary font-bold text-white text-xl uppercase">
            {user.username.slice(0, 2)}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {user.username}
            </h2>
            <span className="text-xs font-medium text-accent">
              {user.role === "admin" ? "Administrador" : "Estudante"}
            </span>
          </div>
        </div>

        {!isEditing && !accessDenied && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="cursor-pointer rounded-md bg-brand-primary px-3.5 py-1.5 text-sm font-medium text-white hover:opacity-90 transition"
          >
            Editar Perfil
          </button>
        )}
      </div>

      {!isEditing ? (
        <div className="space-y-4 text-sm">
          <div>
            <p className="block text-xs font-medium uppercase tracking-wider text-foreground-muted">
              Nome de Utilizador
            </p>
            <p className="mt-1 font-medium text-foreground">
              {user.username}
            </p>
          </div>

          <div>
            <p className="block text-xs font-medium uppercase tracking-wider text-foreground-muted">
              E-mail
            </p>
            <p className="mt-1 font-medium text-foreground">
              {user.email}
            </p>
          </div>

          <div>
            <p className="block text-xs font-medium uppercase tracking-wider text-foreground-muted">
              Data de Cadastro
            </p>
            <p className="mt-1 font-medium text-foreground">
              {formattedCreatedDate}
            </p>
          </div>

          {user.updatedAt && (
            <div>
              <p className="block text-xs font-medium uppercase tracking-wider text-foreground-muted">
                Última Edição Registrada
              </p>
              <p className="mt-1 font-medium text-foreground">
                {formattedUpdatedDate}
              </p>
            </div>
          )}
        </div>
      ) : (
        <form
          onSubmit={handleSave}
          onInput={(event) => {
            const passwordInput = event.currentTarget.elements.namedItem("password");
            const confirmationInput = event.currentTarget.elements.namedItem("confirmPassword");
            if (
              passwordInput instanceof HTMLInputElement &&
              confirmationInput instanceof HTMLInputElement
            ) {
              confirmationInput.setCustomValidity(
                confirmationInput.value === passwordInput.value ? "" : "As senhas não coincidem",
              );
            }
          }}
          className="space-y-4 text-sm"
        >
          <div>
            <label htmlFor="profile-username" className="block text-xs font-medium uppercase tracking-wider text-foreground-muted">
              Nome de Utilizador
            </label>
            <input
              id="profile-username"
              name="username"
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              minLength={3}
              maxLength={USERNAME_MAX_LENGTH}
              autoComplete="username"
              aria-invalid={Boolean(fieldErrors.username)}
              aria-describedby={fieldErrors.username ? "profile-username-error" : undefined}
              className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-sm text-foreground focus:outline-none focus:border-brand-primary"
              required
            />
            {fieldErrors.username && (
              <p id="profile-username-error" className="mt-1 text-xs text-cancel">{fieldErrors.username}</p>
            )}
          </div>

          <div>
            <label htmlFor="profile-email" className="block text-xs font-medium uppercase tracking-wider text-foreground-muted">
              E-mail
            </label>
            <input
              id="profile-email"
              name="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              maxLength={EMAIL_MAX_LENGTH}
              autoComplete="email"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "profile-email-error" : undefined}
              className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-sm text-foreground focus:outline-none focus:border-brand-primary"
              required
            />
            {fieldErrors.email && (
              <p id="profile-email-error" className="mt-1 text-xs text-cancel">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="profile-password" className="block text-xs font-medium uppercase tracking-wider text-foreground-muted">
              Nova Senha (opcional)
            </label>
            <input
              id="profile-password"
              name="password"
              type="password"
              placeholder="Deixe em branco para manter a atual"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+"
              title="8-20 caracteres, com maiúscula, minúscula, número e caractere especial"
              aria-describedby={formData.password ? "profile-password-strength" : undefined}
              aria-invalid={Boolean(fieldErrors.password)}
              className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-sm text-foreground focus:outline-none focus:border-brand-primary"
            />
            {formData.password && (
              <div className="mt-2">
                <PasswordStrengthIndicator id="profile-password-strength" password={formData.password} />
              </div>
            )}
            {fieldErrors.password && (
              <p id="profile-password-error" className="mt-1 text-xs text-cancel">{fieldErrors.password}</p>
            )}
          </div>

          {formData.password && (
            <div>
              <label htmlFor="profile-confirm-password" className="block text-xs font-medium uppercase tracking-wider text-foreground-muted">
                Confirmar Nova Senha
              </label>
              <input
                id="profile-confirm-password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={PASSWORD_MAX_LENGTH}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                aria-describedby={fieldErrors.confirmPassword ? "profile-confirm-password-error" : undefined}
                className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-sm text-foreground focus:outline-none focus:border-brand-primary"
              />
              {fieldErrors.confirmPassword && (
                <p id="profile-confirm-password-error" className="mt-1 text-xs text-cancel">{fieldErrors.confirmPassword}</p>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="cursor-pointer rounded-md border border-border px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-surface-hover transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="cursor-pointer rounded-md bg-brand-primary px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
            >
              {isPending ? "A salvar..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      )}
      {!accessDenied && <div className="mt-8 border-t border-border pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Zona de Perigo
            </h4>
            <p className="text-xs text-foreground-muted">
              Excluir sua conta e anonimizar seus dados permanentemente.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="cursor-pointer rounded-md border border-cancel px-3 py-1.5 text-xs font-semibold text-cancel hover:bg-cancel hover:text-white transition"
          >
            Excluir Conta
          </button>
        </div>
      </div>}

      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onAccessDenied={() => {
          setAccessDenied(true);
          setIsEditing(false);
          setErrorMessage("Você não tem permissão para executar esta ação.");
        }}
      />
    </div>
  );
};
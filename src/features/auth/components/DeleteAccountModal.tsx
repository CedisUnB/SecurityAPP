"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAccountAction } from "../actions";
import { PASSWORD_MAX_LENGTH } from "../types/auth.types";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccessDenied: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ isOpen, onClose, onAccessDenied }) => {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleDelete = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const response = await deleteAccountAction({ password });

      if (!response.success) {
        if (response.statusCode === 401) {
          router.replace("/auth/login?reauth=1");
          return;
        }
        if (response.statusCode === 403) {
          onAccessDenied();
          return;
        }
        setError(response.error);
        return;
      }

      router.push("/?deleted=true");
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-cancel bg-surface p-6 shadow-xl">
        <h3 className="text-lg font-bold text-cancel">
          Excluir Conta Permanentemente
        </h3>

        <p className="mt-2 text-sm text-foreground-muted">
          Esta ação é <strong>irreversível</strong>. Todos os seus dados serão anonimizados e sua sessão será encerrada de acordo com as diretrizes da LGPD.
        </p>

        {error && (
          <div className="mt-3 rounded-md bg-cancel p-2.5 text-xs font-medium text-white transition">
            {error}
          </div>
        )}

        <form onSubmit={handleDelete} className="mt-4 space-y-4">
          <div>
            <label htmlFor="delete-account-password" className="block text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              Digite sua senha atual para confirmar
            </label>
            <input
              id="delete-account-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              required
              maxLength={PASSWORD_MAX_LENGTH}
              className="mt-1.5 w-full rounded-md border border-border bg-surface p-2 text-sm text-foreground focus:border-cancel focus:outline-none focus:ring-1 focus:ring-cancel transition"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="cursor-pointer rounded-md border border-border px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-surface-hover transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="cursor-pointer rounded-md bg-cancel px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
            >
              {isPending ? "Excluindo..." : "Confirmar Exclusão"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
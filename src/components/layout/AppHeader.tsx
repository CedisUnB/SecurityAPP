import Link from "next/link";
import { logoutAction } from "@/features/auth";
import { ThemeToggle } from "./ThemeToggle";

interface AppHeaderProps {
  user?: string | null;
  role: string | null;
}

export function AppHeader({ user, role }: AppHeaderProps) {
  const displayName = user || "Estudante";
  const profileRoute = role === "admin" ? "/admin/profile" : "/profile";

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-brand-primary px-4 py-3">
      <Link href="/tracks" className="text-xl font-bold tracking-tight text-white">
        AEGIS
      </Link>

      <div className="flex items-center gap-2">
        <nav aria-label="Conta">
          <Link
            href={profileRoute}
            title="Ver meu perfil"
            className="inline-flex min-h-11 max-w-40 items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/20 sm:max-w-none sm:text-base"
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-400" />
            <span className="truncate">{displayName}</span>
          </Link>
        </nav>

        <ThemeToggle />

        <form action={logoutAction}>
          <button
            type="submit"
            className="cursor-pointer min-h-11 rounded-lg bg-white px-4 text-sm font-medium text-brand-primary transition hover:opacity-90 sm:text-base"
          >
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
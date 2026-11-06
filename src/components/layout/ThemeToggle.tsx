"use client";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export function ThemeToggle() {
  const handleToggle = () => {
    const root = document.documentElement;
    const current =
      root.dataset.theme ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";

    root.dataset.theme = next;

    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `theme=${next}; Path=/; Max-Age=${ONE_YEAR_IN_SECONDS}; SameSite=Lax${secure}`;
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label="Alternar entre tema claro e escuro"
      title="Alternar tema"
      className="cursor-pointer inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/30 bg-white/10 text-white transition hover:bg-white/20"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
      </svg>
    </button>
  );
}
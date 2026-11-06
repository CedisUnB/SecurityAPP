import type { ProgressSummaryData } from "../utils/progress";

export interface ProgressSummaryProps {
  summary: ProgressSummaryData;
}

export function ProgressSummary({ summary }: ProgressSummaryProps) {
  const { completedNodes, totalNodes, percent, completedTracks, totalTracks } =
    summary;

  if (totalTracks === 0) {
    return (
      <section
        aria-labelledby="progress-summary-title"
        className="rounded-2xl border-2 border-border bg-surface-alt p-4 sm:p-6"
      >
        <h2 id="progress-summary-title" className="text-base font-bold text-foreground">
          Progresso Geral - Trilhas de Aprendizado
        </h2>
        <p className="mt-2 text-sm text-foreground-muted">
          Nenhuma trilha disponível no momento.
        </p>
      </section>
    );
  }

  const isAllCompleted = percent === 100 && completedTracks === totalTracks;

  return (
    <section
      aria-labelledby="progress-summary-title"
      className="rounded-2xl border-2 border-border bg-surface-alt p-4 sm:p-6"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="progress-summary-title" className="text-base font-bold text-foreground">
          Progresso Geral - Trilhas de Aprendizado
        </h2>
        <span className="text-2xl font-bold text-foreground">{percent}%</span>
      </div>

      <div
        role="progressbar"
        aria-labelledby="progress-summary-title"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}% concluído`}
        className="mt-3 h-3 w-full overflow-hidden rounded-full border border-border bg-surface"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${
            isAllCompleted ? "bg-confirm" : "bg-accent"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <dl className="mt-4 grid gap-2 text-sm text-foreground-muted sm:grid-cols-2">
        <div>
          <dt className="sr-only">Etapas</dt>
          <dd>
            {completedNodes} de {totalNodes} etapas concluídas
          </dd>
        </div>
        <div>
          <dt className="sr-only">Trilhas</dt>
          <dd className="sm:text-right">
            {completedTracks} de {totalTracks} trilhas concluídas
          </dd>
        </div>
      </dl>
    </section>
  );
}
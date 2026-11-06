import { renderToStaticMarkup } from "react-dom/server";
import type { ProgressSummaryData } from "../utils/progress";
import { ProgressSummary } from "./ProgressSummary";

const TITLE = "Progresso Geral - Trilhas de Aprendizado";

const baseSummary: ProgressSummaryData = {
  completedNodes: 8,
  totalNodes: 29,
  percent: 28,
  completedTracks: 1,
  totalTracks: 10,
};

// O React pode separar textos adjacentes com comentários; removemos para asserir o texto final.
function render(summary: ProgressSummaryData) {
  return renderToStaticMarkup(<ProgressSummary summary={summary} />).replaceAll(
    "<!-- -->",
    "",
  );
}

describe("ProgressSummary", () => {
  it("renders the title, percentage and both counters for a user with progress", () => {
    const markup = render(baseSummary);

    expect(markup).toContain(TITLE);
    expect(markup).toContain("28%");
    expect(markup).toContain("8 de 29 etapas concluídas");
    expect(markup).toContain("1 de 10 trilhas concluídas");
  });

  it("exposes the progress as an accessible progressbar labelled by the title", () => {
    const markup = render(baseSummary);

    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-valuemin="0"');
    expect(markup).toContain('aria-valuemax="100"');
    expect(markup).toContain('aria-valuenow="28"');
    expect(markup).toContain('aria-valuetext="28% concluído"');
    expect(markup).toContain('aria-labelledby="progress-summary-title"');
    expect(markup).toContain('id="progress-summary-title"');
  });

  it("fills the bar proportionally to the percentage", () => {
    const markup = render(baseSummary);

    expect(markup).toContain("width:28%");
    expect(markup).toContain("bg-accent");
    expect(markup).not.toContain("bg-confirm");
  });

  it("shows an empty bar and zeroed counters when there is no progress", () => {
    const markup = render({
      completedNodes: 0,
      totalNodes: 29,
      percent: 0,
      completedTracks: 0,
      totalTracks: 10,
    });

    expect(markup).toContain("0%");
    expect(markup).toContain('aria-valuenow="0"');
    expect(markup).toContain("width:0%");
    expect(markup).toContain("0 de 29 etapas concluídas");
    expect(markup).toContain("0 de 10 trilhas concluídas");
  });

  it("uses the confirmation color when every track is completed", () => {
    const markup = render({
      completedNodes: 29,
      totalNodes: 29,
      percent: 100,
      completedTracks: 10,
      totalTracks: 10,
    });

    expect(markup).toContain("100%");
    expect(markup).toContain("width:100%");
    expect(markup).toContain("bg-confirm");
    expect(markup).not.toContain("bg-accent");
  });

  it("does not use the confirmation color at 100% while some track is not completed", () => {
    const markup = render({
      completedNodes: 10,
      totalNodes: 10,
      percent: 100,
      completedTracks: 1,
      totalTracks: 2,
    });

    expect(markup).toContain("bg-accent");
    expect(markup).not.toContain("bg-confirm");
  });

  it("shows an empty-state message and no progress bar when there are no tracks", () => {
    const markup = render({
      completedNodes: 0,
      totalNodes: 0,
      percent: 0,
      completedTracks: 0,
      totalTracks: 0,
    });

    expect(markup).toContain(TITLE);
    expect(markup).toContain("Nenhuma trilha disponível no momento.");
    expect(markup).not.toContain('role="progressbar"');
    expect(markup).not.toContain("%");
  });
});
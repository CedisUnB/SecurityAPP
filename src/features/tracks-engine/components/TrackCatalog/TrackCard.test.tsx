import { renderToStaticMarkup } from "react-dom/server";
import { trackCatalogFixture } from "../../__fixtures__/track-catalog";
import { TrackCard } from "./TrackCard";

describe("TrackCard", () => {
  const startedTrack = trackCatalogFixture[0];
  const notStartedTrack = trackCatalogFixture[1];

  it("renders a selectable card with progress for a started track", () => {
    const markup = renderToStaticMarkup(
      <TrackCard
        track={startedTrack}
        onSelect={() => undefined}
        variant="orbit"
      />,
    );

    expect(markup).toContain(
      `aria-label="Ver detalhes da trilha ${startedTrack.theme}"`,
    );
    expect(markup).toContain("aspect-square");
    expect(markup).toContain(startedTrack.theme);
    expect(markup).toContain(
      `${startedTrack.completedNodes}/${startedTrack.totalNodes} concluídos`,
    );
    expect(markup).toContain(`${startedTrack.totalNodes} etapas`);
    expect(markup).toContain("border-border");
    expect(markup).toContain("text-foreground");
  });

  it("shows the progress count followed by the rounded percentage for a started track", () => {
    const markup = renderToStaticMarkup(
      <TrackCard
        track={{ ...startedTrack, isStarted: true, completedNodes: 3, totalNodes: 8 }}
        onSelect={() => undefined}
        variant="orbit"
      />,
    );

    expect(markup).toContain("3/8 concluídos · 38%");
  });

  it("shows 0% for a started track with no completed nodes yet", () => {
    const markup = renderToStaticMarkup(
      <TrackCard
        track={{ ...startedTrack, isStarted: true, completedNodes: 0, totalNodes: 8 }}
        onSelect={() => undefined}
        variant="orbit"
      />,
    );

    expect(markup).toContain("0/8 concluídos · 0%");
  });

  it("uses the list layout and hides progress for a track that has not started", () => {
    const markup = renderToStaticMarkup(
      <TrackCard
        track={notStartedTrack}
        onSelect={() => undefined}
        variant="list"
      />,
    );

    expect(markup).toContain("min-h-28");
    expect(markup).toContain("flex-row");
    expect(markup).toContain(notStartedTrack.theme);
    expect(markup).toContain(`${notStartedTrack.totalNodes} etapas`);
    expect(markup).not.toContain("concluídos");
    expect(markup).not.toContain("%");
  });

  it("marks a completed track with its status, 100%, confirmation styling, and accessible label", () => {
    const completedTrack = trackCatalogFixture[5];
    const markup = renderToStaticMarkup(
      <TrackCard
        track={completedTrack}
        onSelect={() => undefined}
        variant="orbit"
      />,
    );

    expect(markup).toContain(
      `aria-label="Ver detalhes da trilha ${completedTrack.theme}, concluída"`,
    );
    expect(markup).toContain("border-confirm bg-surface-alt");
    expect(markup).toContain("text-confirm");
    expect(markup).toContain("Concluída · 100%");
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain(
      `${completedTrack.completedNodes}/${completedTrack.totalNodes} concluídos`,
    );
  });
});
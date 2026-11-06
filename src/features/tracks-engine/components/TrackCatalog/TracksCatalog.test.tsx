import { renderToStaticMarkup } from "react-dom/server";
import { trackCatalogFixture } from "../../__fixtures__/track-catalog";
import { TracksCatalog } from "./TracksCatalog";

jest.mock("next/link", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    __esModule: true,
    default: ({
      href,
      children,
      className,
    }: {
      href: string;
      children: React.ReactNode;
      className?: string;
    }) => React.createElement("a", { href, className }, children),
  };
});

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("../../actions", () => ({
  startTrackAction: jest.fn(),
}));

describe("TracksCatalog", () => {
  it("renders an empty state when there are no tracks", () => {
    const markup = renderToStaticMarkup(<TracksCatalog tracks={[]} />);

    expect(markup).toContain(
      "Nenhuma trilha está disponível no momento.",
    );
  });

  it("renders selectable track cards and progress only for started tracks", () => {
    const markup = renderToStaticMarkup(
      <TracksCatalog tracks={trackCatalogFixture} />,
    );
    const mobileCardsMarkup = markup.match(
      /<ul aria-label="Trilhas disponíveis"[^>]*>([\s\S]*?)<\/ul>/,
    )?.[1];
    const orbitCardsMarkup = markup.match(
      /<ul aria-label="Trilhas ao redor da bússola"[^>]*>([\s\S]*?)<\/ul>/,
    )?.[1];

    expect(markup).toContain("Segurança Web");
    expect(markup).toContain("8 etapas");
    expect(markup).toContain("3/8 concluídos");
    expect(markup).toContain('aria-label="Ver detalhes da trilha Segurança Web"');
    expect(markup).toContain("Proteção de Dados");
    expect(markup).toContain("5 etapas");
    expect(markup).not.toContain("0/5 concluídos");
    expect(markup).toContain("🧭");
    expect(markup).toContain("bg-surface-alt");
    expect(markup).toContain("text-foreground");
    expect(markup).toContain("border-border");
    expect(markup).toContain("text-accent");
    expect(markup).toContain('class="md:hidden"');
    expect(markup).toContain('class="hidden md:block"');
    expect(markup).toContain("Escolha uma trilha para explorar");
    expect(markup).toContain("w-full max-w-5xl");
    expect(mobileCardsMarkup).toContain("min-h-28");
    expect(mobileCardsMarkup).toContain("flex-row");
    expect(orbitCardsMarkup).toContain("aspect-square");
  });

  it("keeps tracks beyond the compass ring available in a separate grid", () => {
    const markup = renderToStaticMarkup(
      <TracksCatalog tracks={trackCatalogFixture} />,
    );

    expect(trackCatalogFixture).toHaveLength(11);
    expect(markup).toContain("<h2");
    expect(markup).toContain("Mais trilhas");
    expect(markup).toContain("(3)");
    expect(markup).toContain("Segurança em Nuvem");
    expect(markup).toContain("Resposta a Incidentes");
    expect(markup).toContain("Segurança de Dispositivos");
    expect(markup).toContain('aria-label="Mais trilhas"');
  });
});

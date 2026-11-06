import { renderToStaticMarkup } from "react-dom/server";
import type { TrackMapDTO } from "@/features/tracks-engine/types";
import { TrackMapNode } from "./TrackMapNode";

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

const baseNode: TrackMapDTO["nodes"][number] = {
  id: 42,
  orderIndex: 1,
  nodeType: "exercise",
  title: "Exercícios práticos",
  kindLabel: "Exercícios práticos",
  isCompleted: false,
  isCurrent: false,
  isMostAdvanced: false,
  isFinalTest: false,
  isNextUp: false,
  isUnlocked: true,
};

describe("TrackMapNode", () => {
    it("renders an accessible button with bubble, step label, and modal action", () => {
    const markup = renderToStaticMarkup(
      <TrackMapNode
        node={{ ...baseNode, isNextUp: true }}
        trackId={12}
        index={1}
        isLeft={false}
      />,
    );

    expect(markup).toContain('id="node-42"');
    expect(markup).toContain(
      'aria-label="Exercícios práticos: Exercícios práticos"',
    );
    expect(markup).toContain("Etapa 2");
    expect(markup).toContain(
      "border-current-border bg-current-surface text-current-foreground",
    );
    expect(markup).toContain('href="/tracks/12/nodes/42"');
    expect(markup).toContain("Começar");
    expect(markup).toContain("mr-[18%]");
  });

  it("renders a completed node with its progress label and review action", () => {
    const markup = renderToStaticMarkup(
      <TrackMapNode
        node={{
          ...baseNode,
          isCompleted: true,
          isCurrent: true,
          isMostAdvanced: true,
        }}
        trackId={12}
        index={2}
        isLeft
      />,
    );

    expect(markup).toContain("border-accent-border bg-accent text-accent-foreground");
    expect(markup).toContain("Etapa 3 · Concluída");
    expect(markup).toContain("Etapa mais avançada alcançada");
    expect(markup).toContain("Revisar");
    expect(markup).toContain('aria-current="step"');
    expect(markup).toContain("ml-[18%]");
  });

  it("renders the next incomplete node with the current-step accent", () => {
    const markup = renderToStaticMarkup(
      <TrackMapNode
        node={{
          ...baseNode,
          isCurrent: true,
          isNextUp: true,
        }}
        trackId={12}
        index={1}
        isLeft={false}
      />,
    );

    expect(markup).toContain("border-current-border bg-current-surface text-current-foreground");
    expect(markup).toContain("Etapa selecionada");
    expect(markup).toContain("Começar");
  });

  it("centers the final test bubble and labels it separately from its step number", () => {
    const markup = renderToStaticMarkup(
      <TrackMapNode
        node={{
          ...baseNode,
          kindLabel: "Teste final",
          isFinalTest: true,
          isMostAdvanced: true,
          isUnlocked: true,
        }}
        trackId={12}
        index={7}
        isLeft={false}
      />,
    );

    expect(markup).toContain("border-alert bg-alert text-alert-foreground");
    expect(markup).toContain("Teste final");
    expect(markup).toContain("Etapa 8");
    expect(markup).toContain("justify-center");
    expect(markup).not.toContain("mr-[18%]");
  });

    it("renders a locked node as a disabled button with muted styling", () => {
    const markup = renderToStaticMarkup(
      <TrackMapNode
        node={{ ...baseNode, isUnlocked: false }}
        trackId={12}
        index={3}
        isLeft={false}
      />,
    );

    expect(markup).toContain("disabled");
    expect(markup).toContain("bloqueado até concluir as etapas anteriores");
    expect(markup).toContain("border-border bg-surface-hover text-foreground-muted");
    expect(markup).toContain("cursor-not-allowed");
    expect(markup).not.toContain("opacity-");
    expect(markup).not.toContain("border-current-border");
    expect(markup).toContain("Etapa 4");
  });
});
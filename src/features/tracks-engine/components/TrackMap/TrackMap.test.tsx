import { renderToStaticMarkup } from "react-dom/server";
import type { TrackMapDTO } from "../../types";
import { TrackMap } from "./TrackMap";

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

const track: TrackMapDTO = {
  id: 12,
  theme: "Segurança Web",
  focusNodeId: 42,
  totalNodes: 4,
  completedNodes: 1,
  nodes: [
    {
      id: 41,
      orderIndex: 0,
      nodeType: "lesson",
      title: "Introdução",
      kindLabel: "Teoria",
      isCompleted: true,
      isCurrent: false,
      isMostAdvanced: false,
      isFinalTest: false,
      isNextUp: false,
      isUnlocked: true,
    },
    {
      id: 42,
      orderIndex: 1,
      nodeType: "exercise",
      title: "Teste final",
      kindLabel: "Teste final",
      isCompleted: false,
      isCurrent: true,
      isMostAdvanced: true,
      isFinalTest: true,
      isNextUp: true,
      isUnlocked: false,
    },
    {
      id: 43,
      orderIndex: 2,
      nodeType: "exercise",
      title: "Exercícios práticos",
      kindLabel: "Exercícios práticos",
      isCompleted: false,
      isCurrent: false,
      isMostAdvanced: false,
      isFinalTest: false,
      isNextUp: false,
      isUnlocked: true,
    },
    {
      id: 44,
      orderIndex: 3,
      nodeType: "lesson",
      title: "Próxima lição",
      kindLabel: "Teoria",
      isCompleted: false,
      isCurrent: false,
      isMostAdvanced: false,
      isFinalTest: false,
      isNextUp: false,
      isUnlocked: true,
    },
  ],
};

describe("TrackMap", () => {
  it("renders the track heading, ordered nodes, connectors, and focus target", () => {
    const markup = renderToStaticMarkup(<TrackMap track={track} />);

    expect(markup).toContain("Segurança Web");
    expect(markup).toContain("1 de 4 etapas concluídas · 25%");
    expect(markup).toContain('aria-label="Etapas da trilha em sequência"');
    expect(markup).toContain('id="node-41"');
    expect(markup).toContain('id="node-42"');
    expect(markup).toContain('id="node-43"');
    expect(markup).toContain('id="node-44"');
    expect(markup).toContain('viewBox="0 0 100 472"');
    expect(markup).toContain('stroke-dasharray="7 7"');
    expect(markup).toContain('d="M 30 44 L 50 172 L 30 300 L 70 428"');
    expect(markup).toContain("pointer-events-none");
    expect(markup).toContain('aria-labelledby="track-node-title-42"');
  });

  it("renders an empty state when the track has no nodes", () => {
    const markup = renderToStaticMarkup(
      <TrackMap track={{ ...track, nodes: [] }} />,
    );

    expect(markup).toContain("Esta trilha ainda não possui etapas disponíveis.");
    expect(markup).not.toContain("<path");
  });
});

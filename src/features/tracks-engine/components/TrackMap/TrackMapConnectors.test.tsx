import { renderToStaticMarkup } from "react-dom/server";
import type { TrackMapDTO } from "../../types";
import { TrackMapConnectors } from "./TrackMapConnectors";

const nodes: TrackMapDTO["nodes"] = [
  {
    id: 1,
    orderIndex: 0,
    nodeType: "lesson",
    title: "Introdução",
    kindLabel: "Teoria",
    isCompleted: false,
    isCurrent: false,
    isMostAdvanced: false,
    isFinalTest: false,
    isNextUp: false,
    isUnlocked: true,
  },
  {
    id: 2,
    orderIndex: 1,
    nodeType: "exercise",
    title: "Revisão",
    kindLabel: "Exercícios práticos",
    isCompleted: false,
    isCurrent: false,
    isMostAdvanced: false,
    isFinalTest: false,
    isNextUp: false,
    isUnlocked: true,
  },
  {
    id: 3,
    orderIndex: 2,
    nodeType: "exercise",
    title: "Teste",
    kindLabel: "Teste final",
    isCompleted: false,
    isCurrent: false,
    isMostAdvanced: false,
    isFinalTest: true,
    isNextUp: false,
    isUnlocked: false,
  },
];

describe("TrackMapConnectors", () => {
  it("renders a decorative dashed path through alternating nodes and the centered final test", () => {
    const markup = renderToStaticMarkup(<TrackMapConnectors nodes={nodes} />);

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('viewBox="0 0 100 344"');
    expect(markup).toContain('d="M 30 44 L 70 172 L 50 300"');
    expect(markup).toContain('stroke-dasharray="7 7"');
    expect(markup).toContain('stroke-linecap="round"');
    expect(markup).toContain("pointer-events-none");
  });

  it.each([
    ["no nodes", []],
    ["one node", [nodes[0]]],
  ] as Array<[string, TrackMapDTO["nodes"]]>)(
    "renders no connector with %s",
    (_label, shortNodes) => {
      expect(
        renderToStaticMarkup(<TrackMapConnectors nodes={shortNodes} />),
      ).toBe("");
    },
  );
});

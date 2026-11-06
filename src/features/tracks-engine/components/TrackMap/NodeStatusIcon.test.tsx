import { renderToStaticMarkup } from "react-dom/server";
import type { TrackMapDTO } from "../../types";
import { NodeStatusIcon } from "./NodeStatusIcon";

const baseNode: TrackMapDTO["nodes"][number] = {
  id: 1,
  orderIndex: 0,
  nodeType: "lesson",
  title: "Etapa",
  kindLabel: "Teoria",
  isCompleted: false,
  isCurrent: false,
  isMostAdvanced: false,
  isFinalTest: false,
  isNextUp: false,
  isUnlocked: true,
};

const iconCases: Array<{
  name: string;
  node: TrackMapDTO["nodes"][number];
  expected: string;
}> = [
  {
    name: "completed nodes",
    node: { ...baseNode, isCompleted: true, isFinalTest: true },
    expected: 'd="m5 12 4 4L19 6"',
  },
  {
    name: "final tests",
    node: { ...baseNode, nodeType: "exercise", isFinalTest: true },
    expected: "M8 21h8m-4-4v4",
  },
  {
    name: "lessons",
    node: baseNode,
    expected: "M12 6.5c-1.5-1-3.5-1.5-6-1.5v13",
  },
  {
    name: "exercises",
    node: { ...baseNode, nodeType: "exercise" },
    expected: '<circle cx="12" cy="12" r="8"',
  },
];

describe("NodeStatusIcon", () => {
  it.each(iconCases)(
    "renders the appropriate icon for $name",
    ({ node, expected }) => {
      const markup = renderToStaticMarkup(<NodeStatusIcon node={node} />);

      expect(markup).toContain('class="h-5 w-5"');
      expect(markup).toContain(expected);
    },
  );
});

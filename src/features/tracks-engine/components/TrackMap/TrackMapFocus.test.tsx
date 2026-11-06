import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { TrackMapFocus } from "./TrackMapFocus";

let root: Root | undefined;
let container: HTMLDivElement;
let scrollIntoView: jest.Mock;

const globalWithActFlag = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
const originalActEnvironment = globalWithActFlag.IS_REACT_ACT_ENVIRONMENT;
const originalScrollIntoView = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollIntoView",
);

describe("TrackMapFocus", () => {
  beforeAll(() => {
    globalWithActFlag.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    scrollIntoView = jest.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
  });

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
      root = undefined;
    }
    container.remove();
    if (originalScrollIntoView) {
      Object.defineProperty(
        HTMLElement.prototype,
        "scrollIntoView",
        originalScrollIntoView,
      );
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
    }
  });

  afterAll(() => {
    globalWithActFlag.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
  });

  it("scrolls the focus node into view and skips null or missing nodes", () => {
    const focusedNode = document.createElement("div");
    focusedNode.id = "node-42";
    document.body.append(focusedNode);

    act(() => {
      root?.render(<TrackMapFocus nodeId={null} />);
    });
    expect(scrollIntoView).not.toHaveBeenCalled();

    act(() => {
      root?.render(<TrackMapFocus nodeId={42} />);
    });
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });

    scrollIntoView.mockClear();
    act(() => {
      root?.render(<TrackMapFocus nodeId={99} />);
    });
    expect(scrollIntoView).not.toHaveBeenCalled();

    focusedNode.remove();
  });
});

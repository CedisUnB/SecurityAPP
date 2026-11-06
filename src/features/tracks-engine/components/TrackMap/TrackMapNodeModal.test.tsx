import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { TrackMapDTO } from "../../types";
import { TrackMapNodeModal } from "./TrackMapNodeModal";

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

type TrackNode = TrackMapDTO["nodes"][number];

const node: TrackNode = {
  id: 42,
  orderIndex: 1,
  nodeType: "exercise",
  title: "Revisão de CSP",
  kindLabel: "Exercícios práticos",
  isCompleted: true,
  isCurrent: true,
  isMostAdvanced: true,
  isFinalTest: false,
  isNextUp: false,
  isUnlocked: true,
};

let root: Root | undefined;
let container: HTMLDivElement;
let showModal: jest.Mock;
let closeDialog: jest.Mock;
const globalWithActFlag = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
const originalActEnvironment = globalWithActFlag.IS_REACT_ACT_ENVIRONMENT;
const originalShowModal = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  "showModal",
);
const originalClose = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  "close",
);

function restoreDialogMethod(
  method: "showModal" | "close",
  descriptor: PropertyDescriptor | undefined,
) {
  if (descriptor) {
    Object.defineProperty(HTMLDialogElement.prototype, method, descriptor);
  } else {
    Reflect.deleteProperty(HTMLDialogElement.prototype, method);
  }
}

function renderNode(overrides: Partial<TrackNode> = {}) {
  act(() => {
    root?.render(
      <TrackMapNodeModal trackId={12} node={{ ...node, ...overrides }}>
        <span>Node bubble</span>
      </TrackMapNodeModal>,
    );
  });
}

describe("TrackMapNodeModal", () => {
  beforeAll(() => {
    globalWithActFlag.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    showModal = jest.fn(function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    });
    closeDialog = jest.fn(function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    });
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value: showModal,
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      configurable: true,
      value: closeDialog,
    });
  });

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
      root = undefined;
    }
    container.remove();
    restoreDialogMethod("showModal", originalShowModal);
    restoreDialogMethod("close", originalClose);
  });

  afterAll(() => {
    globalWithActFlag.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
  });

  it("opens a completed node for review from its accessible trigger", () => {
    renderNode();

    const trigger = container.querySelector("button");
    const dialog = container.querySelector("dialog");

    expect(trigger).not.toBeNull();
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute("aria-labelledby")).toBe(
      "track-node-title-42",
    );
    expect(dialog?.textContent).toContain("Revisão de CSP");
    expect(dialog?.textContent).toContain("Etapa mais avançada alcançada");
    expect(dialog?.textContent).toContain("Revisar");
    expect(container.querySelector('a[href="/tracks/12/nodes/42"]')).not.toBeNull();

    act(() => {
      trigger?.click();
    });

    expect(showModal).toHaveBeenCalledTimes(1);
    expect(dialog?.open).toBe(true);
  });

  it("closes the dialog when the close button is activated", () => {
    renderNode();

    const dialog = container.querySelector("dialog");
    act(() => dialog?.showModal());

    const closeButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Fechar",
    );
    expect(closeButton).toBeDefined();

    act(() => {
      closeButton?.click();
    });

    expect(closeDialog).toHaveBeenCalledTimes(1);
    expect(dialog?.open).toBe(false);
  });

  it("lets the next-up node be opened with the start action", () => {
    renderNode({
      isCompleted: false,
      isCurrent: false,
      isMostAdvanced: false,
      isNextUp: true,
      isUnlocked: true,
    });

    const trigger = container.querySelector("button");
    const dialog = container.querySelector("dialog");

    expect(trigger?.disabled).toBe(false);
    expect(trigger?.getAttribute("aria-label")).not.toContain("bloqueado");
    expect(dialog?.textContent).toContain("Começar");
    expect(dialog?.textContent).not.toContain("Revisar");

    act(() => {
      trigger?.click();
    });

    expect(showModal).toHaveBeenCalledTimes(1);
    expect(dialog?.open).toBe(true);
  });

  const lockedCases: [string, Partial<TrackNode>][] = [
    ["a regular node", { isFinalTest: false }],
    [
      "the final test",
      { title: "Teste final", kindLabel: "Teste final", isFinalTest: true },
    ],
  ];

  it.each(lockedCases)(
    "keeps %s disabled and closed while it is locked",
    (_label, overrides) => {
      renderNode({
        ...overrides,
        isCompleted: false,
        isCurrent: false,
        isMostAdvanced: false,
        isNextUp: false,
        isUnlocked: false,
      });

      const trigger = container.querySelector("button");
      expect(trigger?.disabled).toBe(true);
      expect(trigger?.getAttribute("aria-label")).toContain(
        "bloqueado até concluir as etapas anteriores",
      );

      act(() => {
        trigger?.click();
      });

      expect(showModal).not.toHaveBeenCalled();
      expect(container.querySelector("dialog")?.open).toBe(false);
    },
  );

  it("allows opening the final test once it becomes the next step", () => {
    renderNode({
      title: "Teste final",
      kindLabel: "Teste final",
      isCompleted: false,
      isCurrent: false,
      isMostAdvanced: false,
      isFinalTest: true,
      isNextUp: true,
      isUnlocked: true,
    });

    const trigger = container.querySelector("button");
    act(() => {
      trigger?.click();
    });

    expect(trigger?.disabled).toBe(false);
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(container.querySelector("dialog")?.open).toBe(true);
  });
});
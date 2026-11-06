import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { startTrackAction } from "../../actions";
import { TrackDetailsDialog } from "./TrackDetailsDialog";

const mockRouterPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

jest.mock("../../actions", () => ({
  startTrackAction: jest.fn(),
}));

const mockedStartTrackAction =
  startTrackAction as jest.MockedFunction<typeof startTrackAction>;
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

let root: Root | undefined;
let container: HTMLDivElement;
let showModal: jest.Mock;
let closeDialog: jest.Mock;

const track = {
  id: 11,
  theme: "Trilha de teste",
  description: "Descrição",
  totalNodes: 3,
  completedNodes: 0,
  isStarted: false,
};

function renderDialog(
  selectedTrack: typeof track | null = track,
  onClose = jest.fn(),
) {
  act(() => {
    root?.render(
      <TrackDetailsDialog track={selectedTrack} onClose={onClose} />,
    );
  });
  return onClose;
}

describe("TrackDetailsDialog", () => {
  beforeAll(() => {
    globalWithActFlag.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    jest.clearAllMocks();
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
    if (originalShowModal) {
      Object.defineProperty(
        HTMLDialogElement.prototype,
        "showModal",
        originalShowModal,
      );
    } else {
      Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
    }
    if (originalClose) {
      Object.defineProperty(
        HTMLDialogElement.prototype,
        "close",
        originalClose,
      );
    } else {
      Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
    }
  });

  afterAll(() => {
    globalWithActFlag.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
  });

  it("renders the selected track details and its action", () => {
    const markup = renderToStaticMarkup(
      <TrackDetailsDialog track={track} onClose={() => undefined} />,
    );

    expect(markup).toContain('aria-labelledby="track-dialog-title"');
    expect(markup).toContain(track.theme);
    expect(markup).toContain(track.description);
    expect(markup).toContain("Começar");
    expect(markup).toContain('type="button"');
    expect(markup).toContain("bg-surface");
    expect(markup).toContain("backdrop:bg-overlay");
  });

  it("opens and closes the dialog when the selected track changes", () => {
    renderDialog(null);
    expect(showModal).not.toHaveBeenCalled();
    expect(closeDialog).not.toHaveBeenCalled();

    renderDialog(track);
    expect(showModal).toHaveBeenCalledTimes(1);

    renderDialog({ ...track, id: 12 });
    expect(showModal).toHaveBeenCalledTimes(1);

    renderDialog(null);
    expect(closeDialog).toHaveBeenCalledTimes(1);
  });

  it("starts the selected track and navigates on success", async () => {
    mockedStartTrackAction.mockResolvedValueOnce();
    renderDialog();

    await act(async () => {
      container
        .querySelector("button.bg-accent")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(mockedStartTrackAction).toHaveBeenCalledWith({trackId: track.id.toString()});
    expect(mockRouterPush).toHaveBeenCalledWith(`/tracks/${track.id}`);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("shows an error and does not navigate when starting fails", async () => {
    mockedStartTrackAction.mockRejectedValueOnce(new Error("database error"));
    renderDialog();

    await act(async () => {
      container
        .querySelector("button.bg-accent")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "Não foi possível iniciar a trilha. Tente novamente.",
    );
    expect(container.textContent).not.toContain("database error");
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it("closes from the close button, cancel event, and backdrop click", () => {
    const onClose = renderDialog();

    act(() => {
      container
        .querySelector('button[aria-label="Fechar detalhes da trilha"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    const dialog = container.querySelector("dialog");
    act(() => {
      dialog?.dispatchEvent(new Event("cancel", { bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(2);

    act(() => {
      dialog?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("does not close when clicking inside and renders started singular tracks", () => {
    const onClose = renderDialog({
      ...track,
      totalNodes: 1,
      completedNodes: 1,
      isStarted: true,
    });

    act(() => {
      container
        .querySelector("h2")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(container.textContent).toContain("1 etapa · 1 concluídas");
    expect(container.textContent).toContain("Continuar trilha");
  });
});

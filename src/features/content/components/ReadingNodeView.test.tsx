import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { useRouter } from "next/navigation";
import { completeLessonAction } from "../actions";
import { ReadingNodeView } from "./ReadingNodeView";

jest.mock("next/navigation", () => ({ useRouter: jest.fn() }));
jest.mock("../actions", () => ({ completeLessonAction: jest.fn() }));

const push = jest.fn();
const complete = completeLessonAction as jest.MockedFunction<typeof completeLessonAction>;
const lesson = {
  id: 4,
  orderIndex: 0,
  nodeType: "lesson" as const,
  trackId: 7,
  title: "Leitura de teste",
  json: {
    slides: [
      { tag: "Conceito", title: "Primeiro", body: "Texto 1", source: "Fonte 1" },
      { tag: "", title: "Segundo", body: "Texto 2", source: null },
    ],
  },
};

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("ReadingNodeView", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push });
    complete.mockResolvedValue({ success: true, statusCode: 200, data: { message: "ok" } });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  async function render() {
    await act(async () => root.render(<ReadingNodeView trackTitle="Trilha" lesson={lesson} trackId={7} />));
  }
  async function click(name: string) {
    const button = [...container.querySelectorAll("button")].find((item) => item.textContent?.includes(name));
    if (!button) throw new Error(`Botão não encontrado: ${name}`);
    await act(async () => button.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  }

  it("navigates through slides, shows optional tags and sources, and completes the lesson", async () => {
    await render();
    expect(container.textContent).toContain("Trilha · Trilha");
    expect(container.textContent).toContain("Conceito");
    expect(container.textContent).toContain("Fonte 1");
    expect(container.textContent).toContain("1 / 2");
    await click("Próximo");
    expect(container.textContent).toContain("2 / 2");
    expect(container.textContent).toContain("Segundo");
    expect(container.textContent).not.toContain("Fonte 1");
    await click("Voltar");
    expect(container.textContent).toContain("1 / 2");
    await click("Próximo");
    await click("Concluir");
    expect(complete).toHaveBeenCalledWith(4, 7);
    expect(push).toHaveBeenCalledWith("/tracks/7");
  });

  it("shows action failures and catches thrown completion errors", async () => {
    await render();
    await click("Próximo");
    complete.mockResolvedValueOnce({ success: false, statusCode: 500, error: "Falha no servidor" });
    await click("Concluir");
    expect(container.textContent).toContain("Falha no servidor");

    complete.mockRejectedValueOnce(new Error("network"));
    await click("Concluir");
    expect(container.textContent).toContain("Erro ao registrar a conclusão da leitura.");
  });
});

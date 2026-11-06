import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { useRouter } from "next/navigation";
import { submitExercisesAction } from "../actions";
import { ExercisesContent, Result } from "../types/content.types";
import { ExerciseNodeView } from "./ExerciseNodeView";

jest.mock("next/navigation", () => ({ useRouter: jest.fn() }));
jest.mock("../actions", () => ({ submitExercisesAction: jest.fn() }));

const push = jest.fn();
const submit = submitExercisesAction as jest.MockedFunction<typeof submitExercisesAction>;
const question = (id: number, questionType: string, options: string[] = []) => ({
  id,
  type: "revision" as const,
  json: { questionType, prompt: `Pergunta ${id}`, options },
});
const content: ExercisesContent = {
  id: 5,
  orderIndex: 1,
  nodeType: "exercise",
  exercises: [
    question(1, "multiple_choice", ["Opção A", "Opção B"]),
    question(2, "fill_in_the_blank"),
    question(3, "ordering", ["Primeiro", "Segundo"]),
    question(4, "true_false", ["Verdadeiro", "Falso"]),
  ],
};
const result: Result = {
  trackNodeId: 5,
  isNodeCompleted: true,
  score: 80,
  passingScore: 60,
  isFinalTest: false,
  exercises: [
    { id: 1, isCorrect: true },
    { id: 2, isCorrect: false, feedback: "Resposta esperada" },
    { id: 3, isCorrect: false },
    { id: 4, isCorrect: false, feedback: "Outro feedback" },
  ],
};

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("ExerciseNodeView", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    jest.resetAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push });
    submit.mockResolvedValue({ success: true, statusCode: 200, data: result });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
  async function render(exercisesContent = content) {
    await act(async () => root.render(<ExerciseNodeView trackTitle="Fundamentos" exercisesContent={exercisesContent} trackId={9} />));
  }
  async function click(name: string) {
    const button = [...container.querySelectorAll("button")].find((item) => item.textContent?.includes(name));
    if (!button) throw new Error(`Botão não encontrado: ${name}`);
    await act(async () => button.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  }

  it("supports answer selection, navigation and all input presentations", async () => {
    await render();
    expect(container.textContent).toContain("Exercícios Fundamentos");
    await click("Opção A");
    expect(container.querySelector("button")?.className).toBeTruthy();
    await click("Próximo");
    const input = container.querySelector("input");
    expect(input).not.toBeNull();
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, "minha resposta");
      input?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await click("Próximo");
    expect(container.textContent).toContain("Selecione os blocos abaixo");
    await click("Primeiro");
    expect(container.textContent).toContain("Sua Resposta");
    await click("Primeiro");
    expect(container.textContent).toContain("Blocos Disponíveis");
    await click("Próximo");
    expect(container.textContent).toContain("Verdadeiro");
    await click("Voltar");
    expect(container.textContent).toContain("Sua Resposta");
    await click("Próximo");
    await click("Finalizar");
    expect(submit).toHaveBeenCalledWith(9, {
      trackNodeId: 5,
      exercises: [
        { id: 1, value: 0 },
        { id: 2, value: "minha resposta" },
        { id: 3, value: [] },
        { id: 4, value: "" },
      ],
    });
  });

  it("renders completed and failed results, feedback, and the return action", async () => {
    await render({ ...content, exercises: content.exercises.slice(0, 2) });
    await click("Próximo");
    await click("Finalizar");
    expect(container.textContent).toContain("Parabéns!");
    expect(container.textContent).toContain("80%");
    expect(container.textContent).toContain("Resposta esperada");
    expect(container.textContent).toContain("Incorreto");
    await click("Voltar a Trilha");
    expect(push).toHaveBeenCalledWith("/tracks/9");

    submit.mockResolvedValueOnce({
      success: true,
      statusCode: 200,
      data: { ...result, isNodeCompleted: false, exercises: [{ id: 1, isCorrect: false }] },
    });
    await act(async () => root.render(<ExerciseNodeView key="retry" trackTitle="Fundamentos" exercisesContent={{ ...content, exercises: [content.exercises[0]] }} trackId={9} />));
    await click("Finalizar");
    expect(container.textContent).toContain("Quase lá!");
  });

  it("shows server errors and catches rejected submissions", async () => {
    await render({ ...content, exercises: [content.exercises[0]] });
    submit.mockResolvedValueOnce({ success: false, statusCode: 500, error: "Falha ao avaliar" });
    await click("Finalizar");
    expect(container.textContent).toContain("Falha ao avaliar");

    submit.mockRejectedValueOnce(new Error("network"));
    await click("Finalizar");
    expect(container.textContent).toContain("Erro ao enviar as respostas.");
  });

  it("renders an empty input for an unknown question format", async () => {
    const unsupported = question(6, "unsupported") as unknown as ExercisesContent["exercises"][number];
    await render({ ...content, exercises: [unsupported] });
    expect(container.textContent).toContain("Pergunta 6");
    expect(container.querySelector("input")).toBeNull();
  });
});

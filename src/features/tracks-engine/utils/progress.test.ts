import { calculateProgress, summarizeProgress } from "./progress";

describe("calculateProgress", () => {
  it.each([
    [0, 8, 0],
    [1, 8, 13], // 12,5 arredonda para cima
    [3, 8, 38], // 37,5 arredonda para cima
    [1, 3, 33],
    [2, 3, 67],
    [4, 8, 50],
    [8, 8, 100],
  ])("calcula %i de %i como %i%%", (completed, total, expected) => {
    expect(calculateProgress(completed, total)).toBe(expected);
  });

  it("retorna 0 quando o total é zero, sem gerar NaN", () => {
    expect(calculateProgress(0, 0)).toBe(0);
  });

  it("retorna 0 quando o total é negativo", () => {
    expect(calculateProgress(3, -5)).toBe(0);
  });

  it("não passa de 100% quando há mais concluídos que o total", () => {
    expect(calculateProgress(9, 8)).toBe(100);
  });

  it("não fica abaixo de 0% com concluídos negativos", () => {
    expect(calculateProgress(-2, 8)).toBe(0);
  });

  it("retorna 0 para entradas não numéricas", () => {
    expect(calculateProgress(Number.NaN, 8)).toBe(0);
    expect(calculateProgress(3, Number.NaN)).toBe(0);
    expect(calculateProgress(3, Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("summarizeProgress", () => {
  const track = (completedNodes: number, totalNodes: number) => ({
    completedNodes,
    totalNodes,
  });

  it("retorna tudo zerado quando não há trilhas", () => {
    expect(summarizeProgress([])).toEqual({
      completedNodes: 0,
      totalNodes: 0,
      percent: 0,
      completedTracks: 0,
      totalTracks: 0,
    });
  });

  it("conta trilhas não iniciadas no total, mantendo o percentual em 0", () => {
    expect(summarizeProgress([track(0, 4), track(0, 6)])).toEqual({
      completedNodes: 0,
      totalNodes: 10,
      percent: 0,
      completedTracks: 0,
      totalTracks: 2,
    });
  });

  it("pondera o percentual pelos nós, e não pela média das trilhas", () => {
    // 4 de 10 nós = 40%. A média dos percentuais (100% e 0%) daria 50%.
    expect(summarizeProgress([track(4, 4), track(0, 6)])).toEqual({
      completedNodes: 4,
      totalNodes: 10,
      percent: 40,
      completedTracks: 1,
      totalTracks: 2,
    });
  });

  it("marca 100% e todas as trilhas concluídas quando tudo está completo", () => {
    expect(summarizeProgress([track(4, 4), track(6, 6)])).toEqual({
      completedNodes: 10,
      totalNodes: 10,
      percent: 100,
      completedTracks: 2,
      totalTracks: 2,
    });
  });

  it("não conta como concluída a trilha apenas em andamento", () => {
    const summary = summarizeProgress([track(2, 4), track(3, 6)]);

    expect(summary.percent).toBe(50);
    expect(summary.completedTracks).toBe(0);
  });

  it("não conta como concluída uma trilha sem nós", () => {
    const summary = summarizeProgress([track(0, 0), track(4, 4)]);

    expect(summary.completedTracks).toBe(1);
    expect(summary.totalTracks).toBe(2);
    expect(summary.percent).toBe(100);
  });

  it("usa o mesmo arredondamento da calculateProgress", () => {
    // 3 de 8 = 37,5% arredonda para 38, igual ao card e ao mapa.
    const summary = summarizeProgress([track(3, 8)]);

    expect(summary.percent).toBe(38);
    expect(summary.percent).toBe(calculateProgress(3, 8));
  });

  it("soma corretamente várias trilhas em andamento e concluídas", () => {
    const summary = summarizeProgress([
      track(2, 2), // concluída
      track(2, 5), // em andamento
      track(0, 4), // não iniciada
    ]);

    expect(summary).toEqual({
      completedNodes: 4,
      totalNodes: 11,
      percent: 36, // 4/11 = 36,36...
      completedTracks: 1,
      totalTracks: 3,
    });
  });
});
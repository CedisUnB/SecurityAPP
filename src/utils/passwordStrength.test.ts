import { evaluatePasswordStrength } from "./passwordStrength";

const metIds = (password: string) =>
  evaluatePasswordStrength(password)
    .requirements.filter((r) => r.met)
    .map((r) => r.id);

describe("evaluatePasswordStrength", () => {
  it("retorna o estado vazio para senha vazia", () => {
    const result = evaluatePasswordStrength("");

    expect(result.level).toBe("empty");
    expect(result.score).toBe(0);
    expect(result.isValid).toBe(false);
    expect(result.requirements.every((r) => !r.met)).toBe(true);
  });

  it("classifica como fraca quando atende até 2 requisitos", () => {
    const result = evaluatePasswordStrength("abc");

    expect(result.level).toBe("weak");
    expect(result.score).toBe(1);
    expect(result.label).toBe("Senha fraca");
  });

  it("classifica como média quando atende 3 ou 4 requisitos", () => {
    const result = evaluatePasswordStrength("Abcdefg1");

    expect(result.level).toBe("medium");
    expect(result.score).toBe(2);
    expect(result.isValid).toBe(false);
  });

  it("classifica como forte quando atende todos os requisitos", () => {
    const result = evaluatePasswordStrength("Senha@123");

    expect(result.level).toBe("strong");
    expect(result.score).toBe(3);
    expect(result.isValid).toBe(true);
  });

  it("marca cada requisito individualmente", () => {
    expect(metIds("abc")).toEqual(["lowercase"]);
    expect(metIds("ABC")).toEqual(["uppercase"]);
    expect(metIds("123")).toEqual(["number"]);
    expect(metIds("!@#")).toEqual(["special"]);
    expect(metIds("Senha@123")).toEqual(["length", "lowercase", "uppercase", "number", "special"]);
  });

  it("respeita os limites de tamanho (8 a 20)", () => {
    expect(metIds("Aa1!aaa")).not.toContain("length"); // 7
    expect(metIds("Aa1!aaaa")).toContain("length"); // 8
    expect(metIds(`Aa1!${"a".repeat(16)}`)).toContain("length"); // 20
    expect(metIds(`Aa1!${"a".repeat(17)}`)).not.toContain("length"); // 21
  });

  it("não considera forte uma senha acima do tamanho máximo", () => {
    const result = evaluatePasswordStrength(`Senha@${"1".repeat(20)}`);

    expect(result.isValid).toBe(false);
    expect(result.level).toBe("medium");
  });
});
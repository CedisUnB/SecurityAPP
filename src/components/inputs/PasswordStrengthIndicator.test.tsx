import { renderToStaticMarkup } from "react-dom/server";
import { PasswordStrengthIndicator } from "./PasswordStrengthIndicator";

function render(password: string, id = "pw-strength") {
  return renderToStaticMarkup(
    <PasswordStrengthIndicator id={id} password={password} />,
  ).replaceAll("<!-- -->", "");
}

function statusText(markup: string) {
  return /role="status"[^>]*>([^<]*)</.exec(markup)?.[1];
}

function count(markup: string, token: string) {
  return markup.split(token).length - 1;
}

function isMet(markup: string, label: string) {
  return markup.includes(`${label}<span class="sr-only"> (atendido)</span>`);
}

function isPending(markup: string, label: string) {
  return markup.includes(`${label}<span class="sr-only"> (pendente)</span>`);
}

describe("PasswordStrengthIndicator", () => {
  it("uses the received id on the container so inputs can reference it with aria-describedby", () => {
    const markup = render("", "custom-id");

    expect(markup).toContain('id="custom-id"');
  });

  it("shows the initial guidance, an empty meter and every requirement pending for an empty password", () => {
    const markup = render("");

    expect(statusText(markup)).toBe("Digite uma senha");
    expect(markup).toContain('aria-label="Requisitos da senha"');
    expect(count(markup, "(pendente)")).toBe(5);
    expect(count(markup, "(atendido)")).toBe(0);
    expect(count(markup, "bg-border")).toBe(3);
  });

  it("classifies a password meeting up to two requirements as weak with one filled segment", () => {
    const markup = render("abc");

    expect(statusText(markup)).toBe("Senha fraca");
    expect(count(markup, "bg-cancel")).toBe(1);
    expect(count(markup, "bg-border")).toBe(2);
    expect(markup).not.toContain("bg-accent");
    expect(markup).not.toContain("bg-confirm");
  });

  it("classifies a password meeting three or four requirements as medium with two filled segments", () => {
    const markup = render("Abcdefg1");

    expect(statusText(markup)).toBe("Senha média");
    expect(count(markup, "bg-accent")).toBe(2);
    expect(count(markup, "bg-border")).toBe(1);
    expect(markup).not.toContain("bg-cancel");
    expect(markup).not.toContain("bg-confirm");
  });

  it("classifies a password meeting every requirement as strong with all segments filled", () => {
    const markup = render("Senha@123");

    expect(statusText(markup)).toBe("Senha forte");
    expect(count(markup, "bg-confirm")).toBe(3);
    expect(markup).not.toContain("bg-border");
    expect(count(markup, "(atendido)")).toBe(5);
  });

  it("marks each requirement as met or pending according to the password", () => {
    const markup = render("Abcdefg1");

    expect(isMet(markup, "Entre 8 e 20 caracteres")).toBe(true);
    expect(isMet(markup, "Uma letra minúscula")).toBe(true);
    expect(isMet(markup, "Uma letra maiúscula")).toBe(true);
    expect(isMet(markup, "Um número")).toBe(true);
    expect(isPending(markup, "Um caractere especial")).toBe(true);
  });

  it("respects the 8 to 20 characters boundaries", () => {
    const label = "Entre 8 e 20 caracteres";

    expect(isPending(render("Aa1!aaa"), label)).toBe(true); // 7
    expect(isMet(render("Aa1!aaaa"), label)).toBe(true); // 8
    expect(isMet(render(`Aa1!${"a".repeat(16)}`), label)).toBe(true); // 20
    expect(isPending(render(`Aa1!${"a".repeat(17)}`), label)).toBe(true); // 21
  });

  it("conveys the state of each requirement with text and icons, not only color", () => {
    const markup = render("Abcdefg1");

    expect(markup).toContain("✓");
    expect(markup).toContain("○");
    expect(markup).toContain("(atendido)");
    expect(markup).toContain("(pendente)");
  });

  it("exposes a single status region so screen readers announce only strength level changes", () => {
    expect(count(render(""), 'role="status"')).toBe(1);
    expect(count(render("Senha@123"), 'role="status"')).toBe(1);
  });

  it("hides the decorative meter from assistive technologies", () => {
    expect(render("abc")).toContain('aria-hidden="true"');
  });

  it("never renders the typed password", () => {
    const markup = render("Senha@123");

    expect(markup).not.toContain("Senha@123");
  });
});
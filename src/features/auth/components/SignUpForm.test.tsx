import { renderToStaticMarkup } from "react-dom/server";
import { SignUpForm } from "./SignUpForm";

jest.mock("@/features/auth", () => ({ signUpAction: jest.fn() }));

function render() {
  return renderToStaticMarkup(<SignUpForm />).replaceAll("<!-- -->", "");
}

function count(markup: string, token: string) {
  return markup.split(token).length - 1;
}

describe("SignUpForm - password strength indicator", () => {
  it("renders the indicator with its initial guidance and the list of requirements", () => {
    const markup = render();

    expect(markup).toContain('id="password-strength"');
    expect(markup).toContain("Digite uma senha");
    expect(markup).toContain('aria-label="Requisitos da senha"');
    expect(count(markup, "(pendente)")).toBe(5);
  });

  it("associates the indicator only with the password field, not with the confirmation field", () => {
    const markup = render();

    expect(count(markup, 'aria-describedby="password-strength"')).toBe(1);
    expect(markup).toMatch(/id="password"[^>]*aria-describedby="password-strength"/);
  });

  it("keeps the existing browser validation rules on the password field", () => {
    const markup = render();

    expect(markup).toContain('minLength="8"');
    expect(markup).toContain('maxLength="20"');
    expect(markup).toContain("pattern=");
    expect(markup).toContain("required");
  });

  it("does not render any password value", () => {
    const markup = render();

    expect(markup).not.toMatch(/type="password"[^>]*value=/);
  });
});
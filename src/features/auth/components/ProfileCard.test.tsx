import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { updateProfileUserAction } from "../actions";
import type { UserProfile } from "../types/auth.types";
import { ProfileCard } from "./ProfileCard";

const mockRouter = { push: jest.fn(), replace: jest.fn(), refresh: jest.fn() };

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));
jest.mock("../actions", () => ({ updateProfileUserAction: jest.fn() }));
jest.mock("./DeleteAccountModal", () => ({ DeleteAccountModal: () => null }));
jest.mock("@/utils/dateFormatter", () => ({ FormatDate: () => "01/01/2026" }));

const user = {
  username: "aluno",
  email: "aluno@example.com",
  role: "student",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
} as unknown as UserProfile;
const mockedUpdateProfileUserAction = jest.mocked(updateProfileUserAction);

Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);

describe("ProfileCard - password strength indicator", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("does not render the indicator or the password form while the profile is not being edited", () => {
    const markup = renderToStaticMarkup(<ProfileCard initialUser={user} />);

    expect(markup).toContain("Editar Perfil");
    expect(markup).not.toContain("profile-password");
    expect(markup).not.toContain("Requisitos da senha");
    expect(markup).not.toContain("profile-password-strength");
  });

  it("redirects to login when a profile update returns 401", async () => {
    mockedUpdateProfileUserAction.mockResolvedValue({
      success: false,
      error: "Não autorizado",
      statusCode: 401,
    });

    await act(async () => root.render(<ProfileCard initialUser={user} />));
    await act(async () => container.querySelector("button")?.click());
    await act(async () => container.querySelector<HTMLButtonElement>('button[type="submit"]')?.click());

    expect(mockRouter.replace).toHaveBeenCalledWith("/auth/login?reauth=1");
  });

  it("hides profile actions when a profile update returns 403", async () => {
    mockedUpdateProfileUserAction.mockResolvedValue({
      success: false,
      error: "Acesso proibido",
      statusCode: 403,
    });

    await act(async () => root.render(<ProfileCard initialUser={user} />));
    await act(async () => container.querySelector("button")?.click());
    await act(async () => container.querySelector<HTMLButtonElement>('button[type="submit"]')?.click());

    expect(container.textContent).toContain("Você não tem permissão para executar esta ação.");
    expect(container.textContent).not.toContain("Editar Perfil");
    expect(container.textContent).not.toContain("Excluir Conta");
  });
});
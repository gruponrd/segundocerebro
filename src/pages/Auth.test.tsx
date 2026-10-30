import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ signIn: vi.fn(), signUp: vi.fn(), reset: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mocks }));
vi.mock("@/lib/previewMode", () => ({ isDesignPreview: false, isAccountPreview: false, setDesignAccountPreview: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { resetPasswordForEmail: mocks.reset } } }));
import AuthPage from "./Auth";
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it("keeps visible labels, password visibility and existing login behavior", async () => {
  mocks.signIn.mockResolvedValue({ error: null });
  render(<AuthPage/>);
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "test-password" } });
  fireEvent.click(screen.getByRole("button", { name: "Mostrar senha" }));
  expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "text");
  fireEvent.click(screen.getByRole("button", { name: "Entrar no painel" }));
  await waitFor(() => expect(mocks.signIn).toHaveBeenCalledWith("test@example.com", "test-password"));
  expect(mocks.signUp).not.toHaveBeenCalled();
});
it("switches to account registration with an explicit name without submitting anything", () => {
  render(<AuthPage/>);
  fireEvent.click(screen.getByRole("button", { name: "Criar uma conta nova" }));
  expect(screen.getByLabelText("Seu nome")).toBeRequired();
  expect(screen.getByLabelText("Senha")).toHaveAttribute("autocomplete", "new-password");
  fireEvent.click(screen.getByRole("button", { name: "Já tenho uma conta" }));
  expect(screen.queryByLabelText("Seu nome")).not.toBeInTheDocument();
  expect(mocks.signIn).not.toHaveBeenCalled();
  expect(mocks.signUp).not.toHaveBeenCalled();
});
it("keeps recovery available without requesting a password or sending an email on view change", () => {
  render(<AuthPage/>);
  fireEvent.click(screen.getByRole("button", { name: "Esqueci minha senha" }));
  expect(screen.getByRole("button", { name: "Enviar link seguro" })).toBeInTheDocument();
  expect(screen.queryByLabelText("Senha")).not.toBeInTheDocument();
  expect(mocks.reset).not.toHaveBeenCalled();
});

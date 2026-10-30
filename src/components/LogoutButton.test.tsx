import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ signOut: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ session: { user: { id: "test-user" } }, signOut: mocks.signOut }) }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
import { LogoutButton } from "./LogoutButton";
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it("keeps the compact logout accessible and waits for actual sign-out before reporting success", async () => {
  let resolve!: () => void;
  mocks.signOut.mockReturnValue(new Promise<void>(done => { resolve = done; }));
  render(<LogoutButton iconOnly/>);
  fireEvent.click(screen.getByRole("button", { name: "Sair da conta" }));
  expect(screen.getByRole("button", { name: "Saindo…" })).toBeDisabled();
  expect(mocks.success).not.toHaveBeenCalled();
  resolve();
  await waitFor(() => expect(mocks.success).toHaveBeenCalledOnce());
  expect(mocks.signOut).toHaveBeenCalledOnce();
});
it("allows retry after failure and never reports an unsuccessful logout as completed", async () => {
  mocks.signOut.mockRejectedValue(new Error("offline"));
  render(<LogoutButton iconOnly/>);
  fireEvent.click(screen.getByRole("button", { name: "Sair da conta" }));
  await waitFor(() => expect(mocks.error).toHaveBeenCalledOnce());
  expect(screen.getByRole("button", { name: "Sair da conta" })).toBeEnabled();
  expect(mocks.success).not.toHaveBeenCalled();
});

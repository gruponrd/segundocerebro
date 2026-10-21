import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ pathname: "/", selectedMonth: 9 }));
vi.mock("react-router-dom", () => ({ useLocation: () => ({ pathname: state.pathname }) }));
vi.mock("@/stores/financeStore", () => ({ useFinanceStore: () => ({ selectedMonth: state.selectedMonth }) }));
import { WorkspaceMotion } from "./WorkspaceMotion";
const animate = vi.fn();
let reduced: boolean;
let listeners: Set<() => void>;
const cancel = vi.fn();
beforeEach(() => {
  state.pathname = "/"; state.selectedMonth = 9; reduced = false; listeners = new Set();
  animate.mockReset().mockReturnValue({ cancel }); cancel.mockClear();
  vi.stubGlobal("matchMedia", () => ({ get matches() { return reduced; }, addEventListener: (_event: string, listener: () => void) => listeners.add(listener), removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener) }));
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  Object.defineProperty(Element.prototype, "animate", { configurable: true, value: animate });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); delete (Element.prototype as unknown as Record<string, unknown>).animate; });
const content = <><input aria-label="Rascunho" defaultValue="" /><div className="panorama-plot" /><div className="panorama-plot" /><section aria-label="Saldo projetado do período" /></>;

it("animates the two new-period plots together and cancels interrupted motion without clearing form state", () => {
  const page = render(<WorkspaceMotion>{content}</WorkspaceMotion>);
  expect(animate).not.toHaveBeenCalled();
  const input = screen.getByLabelText("Rascunho");
  fireEvent.change(input, { target: { value: "Não perder" } });
  state.selectedMonth++;
  page.rerender(<WorkspaceMotion>{content}</WorkspaceMotion>);
  expect(animate).toHaveBeenCalledTimes(3);
  expect(animate.mock.calls[0][1]).toMatchObject({ duration: 260 });
  state.pathname = "/fluxo";
  page.rerender(<WorkspaceMotion>{content}</WorkspaceMotion>);
  expect(cancel).toHaveBeenCalledTimes(3);
  expect(screen.getByLabelText("Rascunho")).toBe(input);
  expect(input).toHaveValue("Não perder");
});

it("skips motion when reduced motion is enabled and cancels it when the preference changes", () => {
  const page = render(<WorkspaceMotion>{content}</WorkspaceMotion>);
  state.selectedMonth++;
  page.rerender(<WorkspaceMotion>{content}</WorkspaceMotion>);
  reduced = true;
  listeners.forEach(listener => listener());
  expect(cancel).toHaveBeenCalledTimes(3);
  animate.mockClear();
  state.selectedMonth++;
  page.rerender(<WorkspaceMotion>{content}</WorkspaceMotion>);
  expect(animate).not.toHaveBeenCalled();
  page.unmount();
  expect(listeners.size).toBe(0);
});

it("reveals opened details without replacing their content and respects reduced motion", () => {
  const page = render(<WorkspaceMotion><details><summary>Detalhes</summary><div><input aria-label="Detalhe preservado" defaultValue="Rascunho" /></div></details></WorkspaceMotion>);
  const details = page.container.querySelector("details")!;
  details.open = true;
  fireEvent(details, new Event("toggle"));
  expect(animate).toHaveBeenCalledOnce();
  expect(screen.getByLabelText("Detalhe preservado")).toHaveValue("Rascunho");
  reduced = true;
  animate.mockClear();
  fireEvent(details, new Event("toggle"));
  expect(animate).not.toHaveBeenCalled();
});

it("waits for lazy route content and abandons interrupted navigation", async () => {
  const page = render(<WorkspaceMotion>{content}</WorkspaceMotion>);
  state.pathname = "/carteira";
  page.rerender(<WorkspaceMotion><div className="workspace-route-loading">Carregando</div></WorkspaceMotion>);
  expect(animate).not.toHaveBeenCalled();
  page.rerender(<WorkspaceMotion><div>Página pronta</div></WorkspaceMotion>);
  await waitFor(() => expect(animate).toHaveBeenCalledOnce());
  animate.mockClear();
  state.pathname = "/fluxo";
  page.rerender(<WorkspaceMotion><div className="workspace-route-loading">Carregando</div></WorkspaceMotion>);
  page.unmount();
  await Promise.resolve();
  expect(animate).not.toHaveBeenCalled();
  expect(listeners.size).toBe(0);
});

it("cancels the previous disclosure motion on close and on repeated opening", () => {
  const page = render(<WorkspaceMotion><details><summary>Abrir</summary><div>Conteúdo</div></details></WorkspaceMotion>);
  const details = page.container.querySelector("details")!;
  details.open = true;
  fireEvent(details, new Event("toggle"));
  fireEvent(details, new Event("toggle"));
  expect(cancel).toHaveBeenCalledOnce();
  details.open = false;
  fireEvent(details, new Event("toggle"));
  expect(cancel).toHaveBeenCalledTimes(2);
});

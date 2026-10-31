import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({ writes: vi.fn(), opened: vi.fn() }));
vi.mock("@/stores/financeStore", async () => {
  const { useState } = await import("react");
  const banks = ["Azul", "Roxo"].map((name, index) => ({ id: String(index), name, color: "bank-other", glowClass: "", limitTotal: 1000, limitUsed: 100, debtFinal: 100, status: "pendente", installments: [] }));
  return { useFinanceStore: () => {
    const [selectedBank, select] = useState<unknown>(null);
    return { banks, selectedBank, setSelectedBank: (bank: unknown) => { fixture.opened(bank); select(bank); }, addBank: fixture.writes, updateBank: fixture.writes, updateInstallment: fixture.writes, removeInstallment: fixture.writes, addInstallment: fixture.writes, removeBank: fixture.writes, currentCashflow: { month: "Outubro", year: 2026 }, expectedBalance: 1000 };
  } };
});
vi.mock("@/components/BankDetailSheet", () => ({ BankDetailSheet: ({ bank, open, onOpenChange }: { bank: { name: string } | null; open: boolean; onOpenChange: (open: boolean) => void }) => open ? <div role="dialog" aria-label={`Detalhes ${bank?.name}`}><button onClick={() => onOpenChange(false)}>Fechar detalhes</button></div> : null }));
vi.mock("@/components/CardPurchaseForm", () => ({ CardPurchaseButton: () => null }));
import Carteira from "./Carteira";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("abre o cartão clicado, inclusive o já selecionado, e fecha sem gravar dados", () => {
  render(<MemoryRouter><Carteira /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Abrir detalhes de Azul" }));
  expect(screen.getByRole("dialog", { name: "Detalhes Azul" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Fechar detalhes" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole("button", { name: "Abrir detalhes de Roxo" }), { key: "Enter" });
  expect(screen.getByRole("dialog", { name: "Detalhes Roxo" })).toBeInTheDocument();
  expect(fixture.writes).not.toHaveBeenCalled();
});
it("também abre detalhes pela visão de todos os cartões", () => {
  render(<MemoryRouter><Carteira /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Todos os cartões" }));
  // The wallet stack remains mounted but hidden; target the visible grid heading.
  const gridButton = screen.getAllByRole("button", { name: "Abrir detalhes de Roxo" }).find(element => element.tagName === "BUTTON");
  fireEvent.click(gridButton!);
  expect(screen.getByRole("dialog", { name: "Detalhes Roxo" })).toBeInTheDocument();
  expect(fixture.writes).not.toHaveBeenCalled();
});

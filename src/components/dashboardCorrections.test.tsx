import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/hooks/use-theme", () => ({ useTheme: () => ({ theme: "dark" }) }));
vi.mock("recharts", async (original) => ({ ...await original<typeof import("recharts")>(), ResponsiveContainer: () => null }));
import { HeroChart } from "./HeroChart";
import { BankCard } from "./BankCard";
import { ReorderControls } from "./ReorderControls";
import type { Bank } from "@/data/financialData";
afterEach(cleanup);
const bank: Bank = { id: "test", name: "Cartão azul", color: "bank-other", glowClass: "", limitTotal: 1000, limitUsed: 0, debtFinal: 0, status: "pendente", installments: [] };
const props = { cashflowMonths: [{ month: "Outubro", year: 2026, incomes: [{ label: "Receita", amount: 1000 }], expenses: [] }], totalDebt: 0, totalExpense: 0, expectedBalance: 1000, savingsGoalMonth: 500, selectedMonth: 0, banks: [], creditors: [], cardExpensesForMonth: 0 };
describe("correções de interação do dashboard", () => {
  it("mantém a meta inválida aberta, anuncia o erro e aceita o envio do formulário com valor válido", () => {
    const save = vi.fn();
    render(<HeroChart {...props} onSavingsGoalChange={save} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar meta mensal de economia" }));
    const input = screen.getByLabelText("Meta mensal em reais");
    fireEvent.change(input, { target: { value: "-20" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar meta mensal de economia" }));
    expect(screen.getByRole("alert")).toHaveTextContent("igual ou maior que zero");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveValue(-20);
    expect(save).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.submit(input.closest("form")!);
    expect(save).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "650.25" } });
    fireEvent.submit(input.closest("form")!);
    expect(save).toHaveBeenCalledExactlyOnceWith(650.25);
    expect(screen.queryByLabelText("Meta mensal em reais")).not.toBeInTheDocument();
  });
  it("cancela com Escape sem salvar e diferencia cobertura de dinheiro guardado", () => {
    const save = vi.fn();
    render(<HeroChart {...props} onSavingsGoalChange={save} />);
    expect(screen.getByRole("progressbar", { name: "Cobertura prevista da meta mensal" })).toHaveAttribute("aria-valuetext", expect.stringContaining("não representa dinheiro guardado"));
    fireEvent.click(screen.getByRole("button", { name: "Editar meta mensal de economia" }));
    fireEvent.change(screen.getByLabelText("Meta mensal em reais"), { target: { value: "999" } });
    fireEvent.keyDown(screen.getByLabelText("Meta mensal em reais"), { key: "Escape" });
    expect(save).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Meta mensal em reais")).not.toBeInTheDocument();
  });
  it("abre detalhes do cartão por botão sem acionar edição ou troca de status", () => {
    const open = vi.fn(), update = vi.fn();
    render(<BankCard bank={bank} index={0} onClick={open} onUpdateBank={update} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver detalhes do cartão Cartão azul" }));
    expect(open).toHaveBeenCalledOnce();
    expect(update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Editar nome do cartão Cartão azul" }));
    expect(screen.getByLabelText("Nome do cartão")).toBeInTheDocument();
    expect(open).toHaveBeenCalledOnce();
  });
  it("oferece alternativa ao arraste e bloqueia ultrapassar as extremidades", () => {
    const move = vi.fn();
    render(<ReorderControls label="seção Fluxo" index={0} total={3} onMove={move} />);
    expect(screen.getByRole("button", { name: "Mover seção Fluxo para cima" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Mover seção Fluxo para baixo" }));
    expect(move).toHaveBeenCalledExactlyOnceWith(1);
  });
});

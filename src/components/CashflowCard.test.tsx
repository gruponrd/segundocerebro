import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Bank, CashflowMonth, Installment } from "@/data/financialData";
import { money } from "@/lib/planningTools";
import { CashflowCard } from "./CashflowCard";

const fixture = vi.hoisted(() => ({ useFinanceStore: vi.fn() }));
vi.mock("@/stores/financeStore", () => ({ useFinanceStore: fixture.useFinanceStore }));
vi.mock("@/components/CardPurchaseForm", () => ({ CardPurchaseButton: () => null }));
afterEach(cleanup);

const month: CashflowMonth = {
  month: "Novembro", year: 2026, incomes: [], expenses: [
    { label: "Aluguel", amount: 500, category: "moradia", paid: true },
    { label: "Condomínio", amount: 300.25, category: "moradia" },
    { label: "Farmácia", amount: 49.75, category: "saude" },
  ],
};

function installment(id: string, amount: number, status: Installment["status"], dueDate = "2026-11-15"): Installment {
  return { id, description: id, installmentAmount: amount, totalAmount: amount, status, dueDate, currentInstallment: 1, totalInstallments: 1 };
}

function bank(name: string, installments: Installment[], status: Bank["status"] = "pendente"): Bank {
  return { id: name, name, color: "#154b85", glowClass: "", limitTotal: 2000, limitUsed: 0, debtFinal: 0, status, installments };
}

function expectTotals(label: string, total: number, open: number) {
  const totals = within(screen.getByLabelText(label));
  expect(totals.getByText("Total").nextElementSibling?.textContent).toBe(money(total));
  expect(totals.getByText("Falta pagar").nextElementSibling?.textContent).toBe(money(open));
}

it("mostra o total e o saldo em aberto de cada grupo e atualiza após confirmar pagamento", () => {
  const settled = bank("Cartão quitado", [installment("Compra paga", 500, "pago")]);
  const late = installment("Compra atrasada", 500, "atrasado");
  const next = installment("Compra de dezembro", 321, "pendente", "2026-12-15");
  const archived = bank("Cartão cancelado", [installment("Compra excluída do fluxo", 100, "pendente")], "cancelado");
  const updateInstallment = vi.fn();
  const setCards = (status: Installment["status"]) => fixture.useFinanceStore.mockReturnValue({
    currentCashflow: month,
    banks: [settled, bank("Cartão em aberto", [{ ...late, status }, next]), archived],
    updateInstallment,
  });
  setCards("atrasado");
  const props = {
    presentation: "ledger" as const, cashflow: month, monthIndex: 0, totalIncome: 0, totalExpense: 1850,
    cardExpensesForMonth: 1000, expectedBalance: -1850, canPrev: false, canNext: false,
    onPrev: vi.fn(), onNext: vi.fn(), onTogglePaid: vi.fn(), onAddItem: vi.fn(), onRemoveItem: vi.fn(),
    onUpdateItem: vi.fn(), onSetFixed: vi.fn(), onReplicateFixed: vi.fn(),
  };
  const page = render(<CashflowCard {...props} />);
  expectTotals("Valores de saídas diretas", 850, 350);
  expectTotals("Valores da Central de Cartões", 1000, 500);
  expectTotals("Valores de Cartão quitado", 500, 0);
  expectTotals("Valores de Cartão em aberto", 500, 500);
  expect(screen.queryByLabelText("Valores de Cartão cancelado")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Moradia" }));
  expectTotals("Valores de saídas diretas", 800.25, 300.25);
  fireEvent.click(screen.getByRole("checkbox", { name: "Confirmar pagamento da parcela de Compra atrasada" }));
  expect(updateInstallment).toHaveBeenCalledWith("Cartão em aberto", late.id, { status: "pago" });
  setCards("pago");
  page.rerender(<CashflowCard {...props} />);
  expectTotals("Valores da Central de Cartões", 1000, 0);
  expectTotals("Valores de Cartão em aberto", 500, 0);
});

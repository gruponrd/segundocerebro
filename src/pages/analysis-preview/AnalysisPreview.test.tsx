import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { money } from "@/lib/planningTools";
import AnalysisPreview from "./AnalysisPreview";

vi.mock("@/stores/financeStore", async () => {
  const { useState } = await import("react");
  const cashflowMonths = [
    { month: "Novembro", year: 2026, incomes: [
      { label: "Adiantamento", amount: 1200, paid: true },
      { label: "Salário", amount: 1800, paid: false, date: "2026-12-07" },
    ], expenses: [] },
    { month: "Dezembro", year: 2026, incomes: [
      { label: "Salário", amount: 1900, paid: true, date: "2027-01-07" },
    ], expenses: Array.from({ length: 5 }, (_, index) => ({
      label: `Conta ${index + 1}`, amount: 100, date: `2026-12-${10 + index}`,
    })) },
  ];
  return {
    useFinanceStore: () => {
      const [selectedMonth, setSelectedMonth] = useState(0);
      return { cashflowMonths, selectedMonth, setSelectedMonth, banks: [] };
    },
  };
});
vi.mock("@/components/CashflowWorkspace", () => ({
  CashflowEntries: () => <h2>Lançamentos do mês</h2>,
  SmartEntryPanel: () => <h2>Lançamento rápido</h2>,
}));
vi.mock("@/components/CashflowDueDates", () => ({ CashflowDueDates: () => null }));

afterEach(() => { cleanup(); vi.useRealTimers(); });

it("mostra recebidos e pendentes no card de receitas do período selecionado", () => {
  render(<MemoryRouter><AnalysisPreview /></MemoryRouter>);

  const receipts = within(screen.getByLabelText("Recebimentos do mês"));
  const receiptAmount = (label: string) => receipts.getByText(label).nextElementSibling?.textContent;
  expect(receiptAmount("Já recebido")).toBe(money(1200));
  expect(receiptAmount("Falta receber")).toBe(money(1800));
  const trend = within(screen.getByRole("region", { name: "Entradas, saídas e saldo" }));
  expect(trend.getByRole("img", { name: /três meses anteriores/ })).toBeInTheDocument();
  expect(trend.getByText("Saldo Live")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Próximo mês" }));
  expect(receiptAmount("Já recebido")).toBe(money(1900));
  expect(receiptAmount("Falta receber")).toBe(money(0));
});

it("mostra o plano completo depois dos lançamentos e deixa o lançamento rápido por último", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-27T15:00:00Z"));
  render(<MemoryRouter><AnalysisPreview /></MemoryRouter>);

  const plan = screen.getByRole("region", { name: "Próximo recebimento" });
  const ledger = screen.getByRole("heading", { name: "Lançamentos do mês" });
  const quickEntry = screen.getByRole("heading", { name: "Lançamento rápido" });
  expect(ledger.compareDocumentPosition(plan) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(plan.compareDocumentPosition(quickEntry) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(within(plan).getAllByRole("listitem")).toHaveLength(5);
  expect(within(plan).getByText("Conta 5")).toBeVisible();
  expect(screen.queryByText(/sessões de pagamento/i)).not.toBeInTheDocument();
});

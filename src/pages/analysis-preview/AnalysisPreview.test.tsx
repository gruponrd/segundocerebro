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
    ], expenses: [] },
  ];
  return {
    useFinanceStore: () => {
      const [selectedMonth, setSelectedMonth] = useState(0);
      return { cashflowMonths, selectedMonth, setSelectedMonth, banks: [] };
    },
  };
});
vi.mock("@/components/CashflowWorkspace", () => ({ CashflowEntries: () => null, SmartEntryPanel: () => null }));
vi.mock("@/components/CashflowDueDates", () => ({ CashflowDueDates: () => null }));
vi.mock("@/components/PaymentSessions", () => ({ PaymentSessions: () => null }));

afterEach(cleanup);

it("mostra recebidos e pendentes no card de receitas do período selecionado", () => {
  render(<MemoryRouter><AnalysisPreview /></MemoryRouter>);

  const receipts = within(screen.getByLabelText("Recebimentos do mês"));
  const receiptAmount = (label: string) => receipts.getByText(label).nextElementSibling?.textContent;
  expect(receiptAmount("Já recebido")).toBe(money(1200));
  expect(receiptAmount("Falta receber")).toBe(money(1800));
  expect(screen.getByRole("heading", { name: "Evolução mensal" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Próximo mês" }));
  expect(receiptAmount("Já recebido")).toBe(money(1900));
  expect(receiptAmount("Falta receber")).toBe(money(0));
});

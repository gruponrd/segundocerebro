import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ store: {
  banks: [], creditors: [], goals: [], incomeSources: [], salary: 0, transportEntries: [], transportBalance: 0,
  cashflowMonths: [{ month: "Outubro", year: 2026, incomes: [], expenses: [] }],
  currentCashflow: { month: "Outubro", year: 2026 }, totalIncome: 0, totalExpense: 0, cardExpensesForMonth: 0,
  expectedBalance: 0, totalCreditorsDebt: 0, totalCreditorsPaid: 0,
} }));
vi.mock("@/stores/financeStore", () => ({ useFinanceStore: () => mock.store }));
import { GettingStarted } from "./GettingStarted";
import { FinancialHealthScore } from "./FinancialHealthScore";

beforeEach(() => { mock.store.salary = 0; });
it("orienta a conta vazia sem apresentar uma avaliação crítica como se houvesse dados", () => {
  render(<MemoryRouter><GettingStarted /><FinancialHealthScore /></MemoryRouter>);
  expect(screen.getByRole("link", { name: "Cadastrar minha renda" })).toHaveAttribute("href", "/renda");
  expect(screen.getByText("Aguardando seus dados")).toBeInTheDocument();
  expect(screen.queryByText("Crítico")).not.toBeInTheDocument();
});
it("não mostra o guia de conta vazia para uma conta com renda existente", () => {
  mock.store.salary = 5000;
  render(<MemoryRouter><GettingStarted /></MemoryRouter>);
  expect(screen.queryByText("Seu espaço começa aqui.")).not.toBeInTheDocument();
});

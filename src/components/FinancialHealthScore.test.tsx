import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({ income: 1000, expense: 0, balance: 1000 }));
vi.mock("@/stores/financeStore", () => ({ useFinanceStore: () => ({
  banks: [], creditors: [], goals: [], incomeSources: [], salary: 1000,
  currentCashflow: { month: "Outubro", year: 2026 }, cashflowMonths: [],
  totalIncome: fixture.income, totalExpense: fixture.expense, expectedBalance: fixture.balance,
  cardExpensesForMonth: 0, totalCreditorsDebt: 0, totalCreditorsPaid: 0,
}) }));
import { FinancialHealthScore } from "./FinancialHealthScore";

afterEach(cleanup);
it.each([
  { income: 0, expense: 1000, balance: -1000, score: 18, stage: "Atenção" },
  { income: 1000, expense: 1000, balance: 0, score: 43, stage: "Em equilíbrio" },
  { income: 1000, expense: 0, balance: 1000, score: 83, stage: "Saudável" },
])("preserva o cálculo e identifica a faixa $stage", ({ score, stage, ...values }) => {
  Object.assign(fixture, values);
  render(<FinancialHealthScore />);
  expect(screen.getByRole("meter", { name: "Score de saúde financeira" })).toHaveAttribute("aria-valuenow", String(score));
  expect(screen.getByRole("meter")).toHaveAttribute("aria-valuetext", `${score} de 100 · ${stage}`);
  const bands = screen.getByRole("list", { name: "Faixas do score" });
  expect(bands.querySelectorAll("li")).toHaveLength(3);
  expect(bands.querySelector('[aria-current="step"]')).toHaveTextContent(stage);
});

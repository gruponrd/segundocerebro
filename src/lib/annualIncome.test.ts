import { describe, expect, it } from "vitest";
import { annualGoalsForYear, confirmedAnnualIncome } from "@/lib/annualIncome";
import type { CashflowMonth } from "@/data/financialData";

describe("annual income", () => {
  const month = (month: string, year: number, incomes: CashflowMonth["incomes"]): CashflowMonth => ({ month, year, incomes, expenses: [] });
  it("counts only confirmed incomes in the selected year, grouped by month", () => {
    const months = [
      month("Dezembro", 2026, [{ label: "Old", amount: 999, paid: true }]),
      month("Janeiro", 2027, [{ label: "Paid", amount: 100.1, paid: true }, { label: "Paid 2", amount: 0.2, paid: true }, { label: "Expected", amount: 200, paid: false }, { label: "Unknown", amount: 300 }]),
      month("Fevereiro", 2027, [{ label: "Paid", amount: 50, paid: true }]),
      month("Janeiro", 2028, [{ label: "Next", amount: 999, paid: true }]),
    ];
    const totals = confirmedAnnualIncome(months, 2027);
    expect(totals).toEqual([100.3, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    months[1].incomes[0].paid = false;
    expect(confirmedAnnualIncome(months, 2027)[0]).toBe(0.2);
  });
  it("tolerates missing or invalid saved goals", () => {
    expect(annualGoalsForYear(undefined)).toEqual(Array(12).fill(0));
    expect(annualGoalsForYear([100, -1, null, 200]).slice(0, 4)).toEqual([100, 0, 0, 200]);
  });
});

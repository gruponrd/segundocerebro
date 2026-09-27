import { describe, expect, it } from "vitest";
import { parseCoverageInput, parseIncomeAnalysisInput } from "../../supabase/functions/_shared/validation";

describe("validação das análises de IA", () => {
  it("aceita apenas valores financeiros finitos e listas pequenas", () => {
    expect(parseIncomeAnalysisInput({
      incomeSources: [{ label: "Salário", amount: 3000 }],
      goals: [{ title: "Reserva", targetAmount: 5000, savedAmount: 1000 }],
      totalDebt: 0, totalExpense: 1500, savingsGoalMonth: 500,
    }).incomeSources[0].label).toBe("Salário");
    expect(() => parseCoverageInput({ months: [{ label: "Setembro", income: Number.NaN, cost: 100 }] })).toThrow();
    expect(() => parseCoverageInput({ months: Array.from({ length: 7 }, () => ({ label: "Mês", income: 1, cost: 1 })) })).toThrow();
  });
});

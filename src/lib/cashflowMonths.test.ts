import { describe, expect, it } from "vitest";
import type { CashflowMonth } from "@/data/financialData";
import { mergeCashflowMonths } from "./cashflowMonths";

const month = (name: string, year: number): CashflowMonth => ({ month: name, year, incomes: [], expenses: [] });

describe("ordem dos meses do fluxo", () => {
  it("insere meses ausentes na posição cronológica e preserva lançamentos", () => {
    const december = { ...month("Dezembro", 2026), incomes: [{ label: "Renda", amount: 100 }] };
    const result = mergeCashflowMonths(
      [month("Fevereiro", 2026), december],
      [month("Janeiro", 2026), month("Fevereiro", 2026), month("Janeiro", 2027)],
    );
    expect(result.map((entry) => `${entry.month}/${entry.year}`)).toEqual([
      "Janeiro/2026", "Fevereiro/2026", "Dezembro/2026", "Janeiro/2027",
    ]);
    expect(result[2].incomes).toEqual(december.incomes);
  });
});

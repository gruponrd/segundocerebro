import { describe, expect, it } from "vitest";
import type { Bank, CashflowMonth } from "@/data/financialData";
import { extendCashflowMonths, mergeCashflowMonths } from "./cashflowMonths";

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

  it("preenche o calendário até a última fatura ou entrada sem modificar os dados de origem", () => {
    const january = { ...month("Janeiro", 2026), incomes: [{ id: "old", label: "Renda", amount: 100, paid: true }] };
    const september = { ...month("Setembro", 2028), incomes: [{ id: "future", label: "Contrato", amount: 200 }] };
    const card: Bank = { id: "c", name: "Cartão", color: "", glowClass: "", limitTotal: 1000, limitUsed: 100, debtFinal: 100, status: "pendente", installments: [{ id: "i", description: "Compra", totalAmount: 100, installmentAmount: 100, currentInstallment: 1, totalInstallments: 1, dueDate: "2029-02-10", status: "pago" }] };
    const source = [january, september];
    const before = JSON.stringify({ source, card });
    const result = extendCashflowMonths(source, [card], new Date(2026, 9, 19));
    expect(result[0]).toBe(january);
    expect(result.find(row => row.month === "Setembro" && row.year === 2028)).toBe(september);
    expect(result.at(-1)).toEqual(month("Fevereiro", 2029));
    expect(result).toHaveLength(38);
    expect(JSON.stringify({ source, card })).toBe(before);
    expect(extendCashflowMonths(source, [{ ...card, status: "cancelado" }], new Date(2026, 9, 19)).at(-1)).toBe(september);
  });
});

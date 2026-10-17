import { describe, expect, it } from "vitest";
import type { Bank, CashflowMonth } from "@/data/financialData";
import { buildPanoramaSeries, panoramaTicks, PANORAMA_END, YEAR_CUT } from "./panoramaSeries";
const now = new Date(2026, 9, 17);
const month = (name: string, income: number, expense: number, year = 2026): CashflowMonth => ({ month: name, year, incomes: [{ id: "salary", label: "Renda", amount: income }], expenses: [{ id: "expense", label: "Despesa", amount: expense }] });
const card: Bank = { id: "card", name: "Cartão", color: "", glowClass: "", limitTotal: 1000, limitUsed: 0, debtFinal: 0, status: "pendente", installments: [{ id: "purchase", description: "Compra", totalAmount: 100, installmentAmount: 100, currentInstallment: 1, totalInstallments: 1, dueDate: "2027-01-15", status: "pendente" }] };
describe("horizonte visual até março de 2027", () => {
  it("extends without persisting months and uses the current baseline rather than December's seasonal income", () => {
    const months = [month("Outubro", 4030, 1025), month("Dezembro", 5880, 900)];
    const before = JSON.stringify({ months, card });
    const result = buildPanoramaSeries(months, [card], now);
    expect(result.slice(-3).map(point => point.month)).toEqual(["Jan/2027", "Fev/2027", "Mar/2027"]);
    expect(panoramaTicks(result)).toEqual(expect.arrayContaining([2026 * 12 + 11, PANORAMA_END]));
    expect(result.at(-1)?.period).toBe(PANORAMA_END);
    expect(result.find(point => point.month === "Jan/2027")).toMatchObject({ estimated: true, baseline: "Out/2026", future_entradas: 4030, future_saidas: 1125 });
    expect(result.find(point => point.month === "Fev/2027")?.future_saidas).toBe(1025);
    expect(JSON.stringify({ months, card })).toBe(before);
    expect(YEAR_CUT).toBeGreaterThan(2026 * 12 + 11);
    expect(YEAR_CUT).toBeLessThan(2027 * 12);
  });
  it("honors explicitly saved 2027 records and includes cards exactly once", () => {
    const result = buildPanoramaSeries([month("Outubro", 1000, 300), month("Janeiro", 2000, 600, 2027)], [card], now);
    expect(result.find(point => point.month === "Jan/2027")).toMatchObject({ estimated: false, future_entradas: 2000, future_saidas: 700 });
    expect(result[0]).toMatchObject({ entradas: 1000, saidas: 300, future_entradas: 1000, future_saidas: 300 });
  });
  it("does not fabricate past data, counts cancelled cards as zero and limits the horizon", () => {
    expect(buildPanoramaSeries([], [], now)).toEqual([]);
    const result = buildPanoramaSeries([month("Outubro", 0.3, 0.1), month("Abril", 3000, 1000, 2027)], [{ ...card, status: "cancelado" }], now);
    expect(result.find(point => point.month === "Jan/2027")).toMatchObject({ future_entradas: 0.3, future_saidas: 0.1 });
    expect(result.every(point => point.period <= PANORAMA_END)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import type { Bank, CashflowMonth } from "@/data/financialData";
import { buildPanoramaSeries, panoramaTicks, panoramaYearCuts } from "./panoramaSeries";
const now = new Date(2026, 9, 17);
const month = (name: string, income: number, expense: number, year = 2026): CashflowMonth => ({ month: name, year, incomes: [{ id: "salary", label: "Renda", amount: income }], expenses: [{ id: "expense", label: "Despesa", amount: expense }] });
const card: Bank = { id: "card", name: "Cartão", color: "", glowClass: "", limitTotal: 1000, limitUsed: 0, debtFinal: 0, status: "pendente", installments: [{ id: "purchase", description: "Compra", totalAmount: 100, installmentAmount: 100, currentInstallment: 1, totalInstallments: 1, dueDate: "2027-01-15", status: "pendente" }] };
describe("janela móvel de treze meses do panorama", () => {
  it("mostra seis meses antes e seis depois sem alterar dados e mantém a base atual para estimativas", () => {
    const months = [month("Outubro", 4030, 1025), month("Dezembro", 5880, 900)];
    const before = JSON.stringify({ months, card });
    const result = buildPanoramaSeries(months, [card], now);
    expect(result).toHaveLength(13);
    expect(result[0].month).toBe("Abr/2026");
    expect(result[6].month).toBe("Out/2026");
    expect(result.at(-1)?.month).toBe("Abr/2027");
    expect(panoramaTicks(result)).toEqual(expect.arrayContaining([2026 * 12 + 3, 2027 * 12 + 3]));
    expect(result.find(point => point.month === "Jan/2027")).toMatchObject({ estimated: true, baseline: "Out/2026", future_entradas: 4030, future_saidas: 1125 });
    expect(result.find(point => point.month === "Fev/2027")?.future_saidas).toBe(1025);
    expect(JSON.stringify({ months, card })).toBe(before);
    expect(panoramaYearCuts(result)).toEqual([{ period: 2026 * 12 + 11.5, year: 2027 }]);
    expect(result[0]).toMatchObject({ estimated: false, hasRecords: false, entradas: 0, saidas: 0 });
  });
  it("honors explicitly saved 2027 records and includes cards exactly once", () => {
    const result = buildPanoramaSeries([month("Outubro", 1000, 300), month("Janeiro", 2000, 600, 2027)], [card], now);
    expect(result.find(point => point.month === "Jan/2027")).toMatchObject({ estimated: false, future_entradas: 2000, future_saidas: 700 });
    expect(result[6]).toMatchObject({ entradas: 1000, saidas: 300, future_entradas: 1000, future_saidas: 300 });
  });
  it("preserva meses vazios no eixo, ignora cartões cancelados e usa lançamentos posteriores a março de 2027", () => {
    const empty = buildPanoramaSeries([], [], now);
    expect(empty).toHaveLength(13);
    expect(empty.every(point => !point.hasRecords && !point.estimated)).toBe(true);
    const result = buildPanoramaSeries([month("Outubro", 0.3, 0.1), month("Abril", 3000, 1000, 2027)], [{ ...card, status: "cancelado" }], now);
    expect(result.find(point => point.month === "Jan/2027")).toMatchObject({ future_entradas: 0.3, future_saidas: 0.1 });
    expect(result.at(-1)).toMatchObject({ month: "Abr/2027", estimated: false, future_entradas: 3000, future_saidas: 1000 });
  });
  it("acompanha a seleção em qualquer ano e atualiza o marcador da virada", () => {
    const selected = 2028 * 12 + 7;
    const result = buildPanoramaSeries([month("Agosto", 2500, 500, 2028)], [], now, selected);
    expect(result).toHaveLength(13);
    expect(result[0].month).toBe("Fev/2028");
    expect(result[6]).toMatchObject({ month: "Ago/2028", future_entradas: 2500, estimated: false });
    expect(result.at(-1)?.month).toBe("Fev/2029");
    expect(panoramaYearCuts(result)).toEqual([{ period: 2028 * 12 + 11.5, year: 2029 }]);
    expect(result[0]).toMatchObject({ hasRecords: false, estimated: false, future_entradas: 0 });
  });
  it("inclui faturas no intervalo mesmo quando o mês ainda não existe no calendário", () => {
    const futureCard = { ...card, installments: [{ ...card.installments[0], dueDate: "2028-08-20", status: "pago" as const }] };
    const result = buildPanoramaSeries([], [futureCard], now, 2028 * 12 + 7);
    expect(result[6]).toMatchObject({ month: "Ago/2028", estimated: false, hasRecords: true, future_entradas: 0, future_saidas: 100 });
  });
});

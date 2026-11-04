import { describe, expect, it } from "vitest";
import type { CashflowMonth } from "@/data/financialData";
import { buildSparklinePoints } from "./SurplusSparkline";

describe("visão mensal do gráfico", () => {
  it("mostra sete meses atravessando o ano e conserva saldos negativos e meses sem registros", () => {
    const december: CashflowMonth = { month: "Dezembro", year: 2026, incomes: [{ label: "Renda", amount: 1000 }], expenses: [{ label: "Conta", amount: 1400 }] };
    const january: CashflowMonth = { month: "Janeiro", year: 2027, incomes: [{ label: "Renda", amount: 1500 }], expenses: [] };
    const points = buildSparklinePoints(december, [december, january], []);
    expect(points.map(point => point.full)).toEqual(["setembro de 2026", "outubro de 2026", "novembro de 2026", "dezembro de 2026", "janeiro de 2027", "fevereiro de 2027", "março de 2027"]);
    expect(points[3]).toMatchObject({ income: 1000, cost: 1400, balance: -400 });
    expect(points[4]).toMatchObject({ income: 1500, cost: 0, balance: 1500 });
    expect(points[5]).toMatchObject({ income: null, cost: null, balance: null });
  });
});

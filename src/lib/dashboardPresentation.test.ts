import { describe, expect, it } from "vitest";
import type { Bank, CashflowMonth } from "@/data/financialData";
import { buildBalanceProjection, parseSavingsGoal } from "./dashboardPresentation";
const month = (name: string, income: number, expense = 0, year = 2026): CashflowMonth => ({ month: name, year, incomes: [{ label: "Receita prevista", amount: income }], expenses: [{ label: "Despesa", amount: expense, paid: true }] });
const card: Bank = { id: "test", name: "Teste", color: "", glowClass: "", limitTotal: 1000, limitUsed: 100, debtFinal: 100, status: "pendente", installments: [{ id: "i", description: "Compra", totalAmount: 100, installmentAmount: 100, currentInstallment: 1, totalInstallments: 1, dueDate: "2026-12-10", status: "pago" }] };
describe("projeção do dashboard sem alterar lançamentos", () => {
  it("permite escolher o prazo, preserva centavos e limita horizontes inválidos", () => {
    const months = [month("Dezembro", 100.10, 10)];
    expect(buildBalanceProjection(months, [], 0, 0)).toHaveLength(1);
    const rows = buildBalanceProjection(months, [], 0, 3);
    expect(rows).toHaveLength(4);
    expect(rows[3]).toMatchObject({ forecast: 360.4, source: "Média estimada" });
    expect(rows[3].label).toContain("27");
    expect(buildBalanceProjection(months, [], 0, -1)).toHaveLength(1);
    expect(buildBalanceProjection(months, [], 0, 1000)).toHaveLength(37);
    expect(buildBalanceProjection(months, [], 0, NaN)).toHaveLength(7);
  });
  it("parte do período selecionado, usa registros futuros e estima apenas lacunas", () => {
    const months = [month("Novembro", 1000, 200), month("Dezembro", 2000, 200), month("Janeiro", 4000, 1000, 2027)];
    const before = JSON.stringify({ months, card });
    const rows = buildBalanceProjection(months, [card], 1);
    expect(rows).toHaveLength(8);
    expect(rows[1]).toMatchObject({ planned: 2500, forecast: 2500, net: 1700 }); // card included once, even paid
    expect(rows[2]).toMatchObject({ forecast: 5500, net: 3000, source: "Lançamentos" });
    expect(rows[3]).toMatchObject({ forecast: 6750, net: 1250, source: "Média estimada" });
    expect(rows[7].label).toContain("27");
    expect(JSON.stringify({ months, card })).toBe(before);
  });
  it("não converte calendário vazio em histórico nem inventa saldo sem registros", () => {
    const blank: CashflowMonth = { month: "Outubro", year: 2026, incomes: [], expenses: [] };
    expect(buildBalanceProjection([blank], [], 0)).toEqual([]);
    expect(buildBalanceProjection([], [], 0)).toEqual([]);
    const rows = buildBalanceProjection([month("Setembro", 10, 30), blank], [], 1);
    expect(rows[1]).toMatchObject({ planned: -20, source: "Sem lançamentos" });
    expect(rows[2]).toMatchObject({ net: -20, forecast: -40 });
  });
  it("considera parcelas futuras mesmo fora do calendário de fluxo cadastrado", () => {
    const rows = buildBalanceProjection([month("Novembro", 1000)], [card], 0);
    expect(rows[1]).toMatchObject({ net: -100, forecast: 900, source: "Lançamentos" });
  });
  it("ordena meses e mantém centavos e cenários negativos", () => {
    const rows = buildBalanceProjection([month("Dezembro", 1, 10), month("Outubro", 0.3, 0.2), month("Novembro", 0.2, 0.1)], [], 0);
    expect(rows.map(row => row.net).slice(0, 4)).toEqual([0.1, 0.1, -9, -2.93]);
    expect(rows[2].planned).toBe(-8.8);
  });
});
describe("validação da meta", () => {
  it("aceita zero e centavos e rejeita vazio, negativo e não finitos", () => {
    expect(parseSavingsGoal("0")).toBe(0);
    expect(parseSavingsGoal("123.456")).toBe(123.46);
    for (const value of ["", " ", "-1", "Infinity", "NaN", "500abc", "1e99"]) expect(parseSavingsGoal(value)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import type { Bank, CashflowMonth } from "@/data/financialData";
import { buildBalanceProjection, parseSavingsGoal, surplusProjectionHorizon } from "./dashboardPresentation";
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
    expect(buildBalanceProjection(months, [], 0, 40)).toHaveLength(41);
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

describe("prazo da sobra conforme contas a pagar", () => {
  it("zera o acumulado no início escolhido sem somar meses anteriores", () => {
    const months = [month("Setembro", 10000), month("Outubro", 1000, 200), month("Novembro", 2000, 500)];
    const rows = buildBalanceProjection(months, [], 1, 1, true);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ planned: 800, net: 800 });
    expect(rows[1]).toMatchObject({ forecast: 2300, net: 1500 });
    expect(buildBalanceProjection(months, [], 2, 0, true)[0].planned).toBe(1500);
  });
  it("inicia um mês vazio em zero e inclui somente as parcelas seguintes", () => {
    const months: CashflowMonth[] = [{ month: "Novembro", year: 2026, incomes: [], expenses: [] }];
    const rows = buildBalanceProjection(months, [card], 0, 1, true);
    expect(rows[0]).toMatchObject({ planned: 0, source: "Sem lançamentos" });
    expect(rows[1]).toMatchObject({ forecast: -100, source: "Lançamentos" });
  });
  it("ignora meses vazios, receitas, parcelas pagas e cartões cancelados", () => {
    const months = [month("Outubro", 1000), month("Janeiro", 2000, 0, 2029)];
    const unpaid = { ...card, installments: card.installments.map(item => ({ ...item, status: "pendente" as const })) };
    const cancelled = { ...unpaid, status: "cancelado" as const, installments: unpaid.installments.map(item => ({ ...item, dueDate: "2029-01-10" })) };
    expect(surplusProjectionHorizon(months, [card, cancelled], 0)).toBe(0);
    expect(surplusProjectionHorizon(months, [unpaid, cancelled], 0)).toBe(2);
    const before = JSON.stringify({ months, unpaid });
    expect(buildBalanceProjection(months, [unpaid], 0, surplusProjectionHorizon(months, [unpaid], 0))).toHaveLength(3);
    expect(JSON.stringify({ months, unpaid })).toBe(before);
  });
  it("inclui contas manuais pendentes, cruza o ano e não estende além da última conta", () => {
    const months = [month("Novembro", 1000), { ...month("Fevereiro", 0, 50, 2027), expenses: [{ label: "Conta", amount: 50 }] }];
    expect(surplusProjectionHorizon(months, [], 0)).toBe(3);
    expect(surplusProjectionHorizon(months, [], 1)).toBe(0);
    expect(surplusProjectionHorizon([], [], 0)).toBe(0);
  });
});
describe("validação da meta", () => {
  it("aceita zero e centavos e rejeita vazio, negativo e não finitos", () => {
    expect(parseSavingsGoal("0")).toBe(0);
    expect(parseSavingsGoal("123.456")).toBe(123.46);
    for (const value of ["", " ", "-1", "Infinity", "NaN", "500abc", "1e99"]) expect(parseSavingsGoal(value)).toBeNull();
  });
});

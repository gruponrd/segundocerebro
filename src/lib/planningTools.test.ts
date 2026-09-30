import { describe, expect, it } from "vitest";
import type { Bank, CashflowMonth } from "@/data/financialData";
import { pendingPayments, projectScenario } from "./planningTools";

const month = (name: string, year = 2026): CashflowMonth => ({ month: name, year,
  incomes: [{ label: "Entrada", amount: 1000, paid: true }], expenses: [{ label: "Saída", amount: 200, paid: true }, { label: "Conta", amount: 50 }] });
const scenario = { startIndex: 0, startingBalance: 0, purchase: 100, installments: 3, incomeChange: 0, expenseReduction: 0 };
const bank: Bank = { id: "a", name: "Cartão", color: "", glowClass: "", limitTotal: 0, limitUsed: 0, debtFinal: 0, status: "pendente",
  installments: [
    { id: "paid", description: "Pago", totalAmount: 50, installmentAmount: 50, currentInstallment: 1, totalInstallments: 1, dueDate: "2026-12-01", status: "pago" },
    { id: "unpaid", description: "Pendente", totalAmount: 25, installmentAmount: 25, currentInstallment: 1, totalInstallments: 1, dueDate: "2026-12-10", status: "pendente" },
  ] };

describe("planejamento sem alterar registros", () => {
  it("distribui todos os centavos de uma compra e atravessa anos mantendo os originais", () => {
    const months = [month("Novembro"), month("Dezembro"), month("Janeiro", 2027), month("Fevereiro", 2027)];
    const snapshot = JSON.stringify({ months, bank });
    const result = projectScenario(months, [bank], scenario);
    expect(result.map(row => row.purchasePayment)).toEqual([33.33, 33.33, 33.34, 0]);
    expect(result[1].net).toBe(675); // paid installments still belong to the month's spending
    expect(result[3].baseline - result[3].simulated).toBe(100);
    expect(JSON.stringify({ months, bank })).toBe(snapshot);
  });
  it("limita cortes às despesas manuais e mantém mudanças de renda negativas", () => {
    const rows = projectScenario([month("Dezembro")], [bank], { ...scenario, purchase: 0, incomeChange: -100, expenseReduction: 900 });
    expect(rows[0].scenarioNet).toBe(825); // 1000 - 100 - 75 in cards
  });
  it("mostra somente pendências, sem classificar despesas sem data como atrasadas", () => {
    const result = pendingPayments(month("Dezembro"), [bank, { ...bank, id: "c", status: "cancelado" }], new Date(2026, 11, 11));
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ title: "Pendente", amount: 25, overdue: true });
    expect(result[1]).toMatchObject({ title: "Conta", dueDate: null, overdue: false });
  });
  it("respeita o mês inicial e o saldo hipotético informado", () => {
    const rows = projectScenario([month("Novembro"), month("Dezembro")], [], { ...scenario, startIndex: 1, startingBalance: 500, purchase: 0 });
    expect(rows).toHaveLength(1);
    expect(rows[0].baseline).toBe(1250);
  });
  it("posiciona parcelas no calendário quando faltam meses cadastrados", () => {
    const rows = projectScenario([month("Novembro"), month("Janeiro", 2027), month("Fevereiro", 2027)], [], scenario);
    expect(rows.map(row => row.purchasePayment)).toEqual([33.33, 33.34, 0]);
    expect(rows.filter(row => row.purchaseInstallment)).toHaveLength(2);
  });
});

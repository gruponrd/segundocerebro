import { describe, expect, it } from "vitest";
import type { Bank, CashflowMonth } from "@/data/financialData";
import { incomeSessionKey, labelPaymentDay, monthlyCashflowChart } from "./monthlyCashflowChart";
import { cardSpendingForMonth } from "./financeCalculations";

const month: CashflowMonth = { month: "Outubro", year: 2026, incomes: [
  { label: "Salário dia 5", amount: 1000.01, paid: true },
  { label: "Extra dia 20", amount: 200, paid: false },
  { label: "Sem data", amount: 20 },
], expenses: [
  { label: "Mercado", amount: 32.25, date: "2026-10-10", paid: true },
  { label: "Aluguel dia 8", amount: 100, paid: false },
  { label: "Viagem 3x", amount: 15 },
] };
const bank: Bank = { id: "card", name: "Cartão", color: "", glowClass: "", status: "pendente", limitTotal: 2000, limitUsed: 0, debtFinal: 0, installments: [
  { id: "bill", description: "Compra", dueDate: "2026-10-10", installmentAmount: 50.75, totalAmount: 100, currentInstallment: 1, totalInstallments: 2, status: "pendente" },
  { id: "paid", description: "Pago", dueDate: "2026-10-20", installmentAmount: 10, totalAmount: 10, currentInstallment: 1, totalInstallments: 1, status: "pago" },
  { id: "next", description: "Compra", dueDate: "2026-11-10", installmentAmount: 49.25, totalAmount: 100, currentInstallment: 2, totalInstallments: 2, status: "pendente" },
] };
describe("gráfico diário por mês", () => {
  it("inclui o calendário inteiro e concilia com o Fluxo incluindo cartões pagos", () => {
    const before = structuredClone({ month, bank });
    const chart = monthlyCashflowChart(month, [bank]);
    expect(chart.points).toHaveLength(31);
    expect(chart.points[4].incomes).toBe(1000.01);
    expect(chart.points[9].expenses).toBe(83);
    expect(chart.points[19]).toMatchObject({ incomes: 200, expenses: 10 });
    expect(chart.totalIncome).toBe(1220.01);
    expect(chart.totalExpense).toBe(month.expenses.reduce((sum, i) => sum + i.amount, 0) + cardSpendingForMonth([bank], 10, 2026));
    expect(chart.points.reduce((sum, point) => sum + point.expenses, 0) + chart.undatedExpense).toBe(chart.totalExpense);
    expect({ month, bank }).toEqual(before);
  });
  it("troca o mês e o ano sem projetar parcelas nem carregar valores de outro mês", () => {
    const next = monthlyCashflowChart({ month: "Novembro", year: 2026, incomes: [], expenses: [] }, [bank]);
    expect(next.points).toHaveLength(30);
    expect(next.totalExpense).toBe(49.25);
    expect(next.points[9].expenses).toBe(49.25);
    expect(monthlyCashflowChart({ month: "Outubro", year: 2027, incomes: [], expenses: [] }, [bank]).totalExpense).toBe(0);
  });
  it("filtra confirmados sem retirar pagamentos do total previsto", () => {
    const chart = monthlyCashflowChart(month, [bank], {}, true);
    expect(chart.totalIncome).toBe(1000.01);
    expect(chart.totalExpense).toBe(42.25);
    expect(chart.entries.every(entry => entry.paid)).toBe(true);
    expect(monthlyCashflowChart(month, [bank]).totalExpense).toBe(208);
  });
  it("mantém sem dia os valores sem referência e ignora números ambíguos", () => {
    const chart = monthlyCashflowChart(month, []);
    expect(chart.undatedIncome).toBe(20);
    expect(chart.undatedExpense).toBe(15);
    expect(chart.points[4].expenses).toBe(0);
    expect(labelPaymentDay("13º salário 2026")).toBeNull();
    expect(labelPaymentDay("Compra 5x")).toBeNull();
    expect(labelPaymentDay("Dias diferentes: dia 5 e dia 20")).toBeNull();
    expect(labelPaymentDay("Recebimento DIA 05")).toBe(5);
  });
  it("usa atribuições existentes por conta e dá prioridade à data registrada", () => {
    const dated = { ...month, incomes: [{ label: "Salário dia 5", amount: 100, date: "2026-10-12" }, { label: "Adiantamento", amount: 50 }] };
    const chart = monthlyCashflowChart(dated, [], { [incomeSessionKey(dated, 0, dated.incomes[0].label)]: "s20", [incomeSessionKey(dated, 1, dated.incomes[1].label)]: "s20" });
    expect(chart.points[11].incomes).toBe(100);
    expect(chart.points[19].incomes).toBe(50);
    expect(chart.undated).toHaveLength(1);
  });
  it("trata fevereiro e referência dia 30 no último dia sem alterar o registro", () => {
    const feb = { ...month, month: "Fevereiro", year: 2028, incomes: [{ label: "Salário dia 30", amount: 100 }] };
    const chart = monthlyCashflowChart(feb, []);
    expect(chart.points).toHaveLength(29);
    expect(chart.points[28].incomes).toBe(100);
    expect(chart.entries[0].reference).toContain("último dia do mês: 29");
    expect(feb.incomes[0].label).toBe("Salário dia 30");
  });
  it("não normaliza datas inválidas nem desloca lançamentos de outro mês", () => {
    const wrongDates = { ...month, expenses: [{ label: "Dia 5", amount: 30, date: "2026-10-32" }, { label: "Dia 10", amount: 50, date: "2026-11-10" }] };
    const chart = monthlyCashflowChart(wrongDates, []);
    expect(chart.undatedExpense).toBe(80);
    expect(chart.points.every(point => point.expenses === 0)).toBe(true);
    expect(monthlyCashflowChart(month, [{ ...bank, status: "cancelado" }]).totalExpense).toBe(147.25);
  });
});

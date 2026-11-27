import { expect, it } from "vitest";
import type { Bank, CashflowMonth } from "@/data/financialData";
import { nextPaymentPlan } from "./nextPaymentPlan";

it("combina entradas do mesmo dia e prioriza pendências por data até a véspera do próximo recebimento", () => {
  const months: CashflowMonth[] = [
    { month: "Novembro", year: 2026, incomes: [
      { label: "Atrasada", amount: 900, date: "2026-11-25" },
      { label: "Salário", amount: 600, date: "2026-11-30" },
      { label: "Extra", amount: 50.25, date: "2026-11-30" },
      { label: "Já recebido", amount: 200, date: "2026-11-28", paid: true },
      { label: "Fechamento", amount: 300, date: "2026-12-05" },
    ], expenses: [
      { label: "Conta anterior", amount: 100, date: "2026-11-24" },
      { label: "Conta sem data", amount: 90 },
      { label: "Conta paga", amount: 150, date: "2026-11-27", paid: true },
    ] },
    { month: "Dezembro", year: 2026, incomes: [], expenses: [
      { label: "Conta de dezembro", amount: 220.25, date: "2026-12-03" },
      { label: "Conta do recebimento seguinte", amount: 100, date: "2026-12-05" },
    ] },
  ];
  const card: Bank = {
    id: "card", name: "Cartão teste", color: "", glowClass: "", limitTotal: 0, limitUsed: 0, debtFinal: 0, status: "pendente",
    installments: [{ id: "installment", description: "Parcela", totalAmount: 400, installmentAmount: 400,
      totalInstallments: 1, currentInstallment: 1, status: "atrasado", dueDate: "2026-11-26" }],
  };
  const plan = nextPaymentPlan(months, [card, { ...card, id: "canceled", status: "cancelado" }], "2026-11-27");
  expect(plan).toMatchObject({ date: "2026-11-30", nextDate: "2026-12-05", until: "2026-12-04", income: 65025, committed: 72025, difference: -7000 });
  expect(plan?.deposit.map(item => item.label)).toEqual(["Salário", "Extra"]);
  expect(plan?.accounts.map(item => [item.label, item.covered])).toEqual([
    ["Conta anterior", true], ["Parcela", true], ["Conta de dezembro", false],
  ]);
});

it("usa a data real da entrada de fechamento na virada do ano", () => {
  const december: CashflowMonth = { month: "Dezembro", year: 2026,
    incomes: [{ label: "Fechamento", amount: 1000, date: "2027-01-05" }], expenses: [] };
  expect(nextPaymentPlan([december], [], "2026-12-28")).toMatchObject({
    date: "2027-01-05", until: "2027-01-31", difference: 100000, accounts: [],
  });
  expect(nextPaymentPlan([december], [], "2027-01-06")).toBeNull();
});

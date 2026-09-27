import { describe, expect, it } from "vitest";
import type { Bank, Installment } from "@/data/financialData";
import { cardSpendingForMonth, remainingBankDebt, remainingInstallments, unpaidCardSpendingForMonth } from "./financeCalculations";

const plan: Installment = {
  id: "plan", description: "Compra", totalAmount: 1200,
  installmentAmount: 100, currentInstallment: 4, totalInstallments: 12,
  dueDate: "2026-09-10", status: "pendente",
};
const bank: Bank = {
  id: "bank", name: "Banco", color: "", glowClass: "", limitTotal: 2000,
  limitUsed: 0, debtFinal: 0, status: "pendente", installments: [plan],
};

describe("cálculos de parcelas", () => {
  it("conta cada fatura registrada uma vez e exclui as pagas", () => {
    expect(remainingInstallments(plan)).toBe(9);
    expect(remainingBankDebt(bank)).toBe(100);
    expect(remainingBankDebt({ ...bank, installments: [{ ...plan, status: "pago" }] })).toBe(0);
    expect(remainingBankDebt({ ...bank, status: "cancelado" })).toBe(0);
  });

  it("soma somente as faturas com vencimento no mês", () => {
    expect(cardSpendingForMonth([bank], 9, 2026)).toBe(100);
    expect(cardSpendingForMonth([bank], 10, 2026)).toBe(0);
    expect(cardSpendingForMonth([{ ...bank, installments: [{ ...plan, status: "pago" }] }], 9, 2026)).toBe(100);
    expect(unpaidCardSpendingForMonth([{ ...bank, installments: [{ ...plan, status: "pago" }] }], 9, 2026)).toBe(0);
    expect(unpaidCardSpendingForMonth([{ ...bank, installments: [{ ...plan, status: "pago" }] }], 10, 2026)).toBe(0);
    const next = { ...plan, id: "next", currentInstallment: 5, dueDate: "2026-10-10" };
    expect(remainingBankDebt({ ...bank, installments: [plan, next] })).toBe(200);
    expect(cardSpendingForMonth([{ ...bank, installments: [plan, next] }], 10, 2026)).toBe(100);
  });

  it("trata registros antigos 0/0 como uma cobrança avulsa", () => {
    const singleBill = { ...plan, currentInstallment: 0, totalInstallments: 0 };
    expect(remainingInstallments(singleBill)).toBe(1);
    expect(remainingBankDebt({ ...bank, installments: [singleBill] })).toBe(100);
    expect(cardSpendingForMonth([{ ...bank, installments: [singleBill] }], 9, 2026)).toBe(100);
    expect(cardSpendingForMonth([{ ...bank, installments: [singleBill] }], 10, 2026)).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { cashflowPeriods } from "./cashflowPeriods";
import { cashflowDateBounds, replicateCashflowDate, shortCashflowDate, displayCashflowDate, validCashflowDate } from "./cashflowDates";
import type { Bank, CashflowMonth } from "@/data/financialData";

const month: CashflowMonth = { month: "Janeiro", year: 2028, incomes: [{ label: "Pagamento", amount: 100, date: "2028-01-05" }, { label: "Adiantamento", amount: 50, date: "2028-01-20" }, { label: "Salário dia 5", amount: 15 }], expenses: [{ label: "Mercado", amount: 20, date: "2028-01-12" }, { label: "Sem data", amount: 10 }] };
const bank: Bank = { id: "b", name: "Banco", color: "", glowClass: "", limitTotal: 0, limitUsed: 0, debtFinal: 0, status: "pendente", installments: [{ id: "i", description: "Compra", totalAmount: 30, installmentAmount: 30, currentInstallment: 1, totalInstallments: 1, dueDate: "2028-01-21", status: "pago" }] };
describe("datas e comparação de períodos", () => {
  it("usa apenas datas reais para semanas e quinzenas, preservando itens não datados", () => {
    const before = structuredClone({month, bank});
    const weekly = cashflowPeriods(month, [bank], "weekly");
    expect(weekly.ranges.map(x => [x.from, x.to, x.incomes, x.expenses])).toEqual([[1,7,100,0],[8,14,0,20],[15,21,50,30],[22,28,0,0],[29,31,0,0]]);
    expect(weekly).toMatchObject({ missingIncome: 15, missingExpense: 10 });
    expect(cashflowPeriods(month, [bank], "fortnightly").ranges.map(x => [x.from,x.to,x.incomes,x.expenses])).toEqual([[1,15,100,20],[16,31,50,30]]);
    expect({month,bank}).toEqual(before);
  });
  it("valida o mês e replica datas fixas no último dia dos meses mais curtos", () => {
    const feb = { ...month, month: "Fevereiro" };
    expect(cashflowDateBounds(feb)?.max).toBe("2028-02-29");
    expect(validCashflowDate("2028-02-30", feb)).toBe(false);
    expect(validCashflowDate("2028-01-05", feb)).toBe(false);
    expect(replicateCashflowDate("2028-01-31", month, feb)).toBe("2028-02-29");
    expect(replicateCashflowDate(undefined, month, feb)).toBeUndefined();
  });
  it("usa o ano do mês selecionado na virada e valida dia, mês e ano bissexto", () => {
    const dec = { ...month, month: "Dezembro", year: 2027 };
    expect(shortCashflowDate("31/12", dec)).toBe("2027-12-31");
    expect(shortCashflowDate("01/01", month)).toBe("2028-01-01");
    expect(shortCashflowDate("01/01", dec)).toBeNull();
    expect(shortCashflowDate("29/02", { ...month, month: "Fevereiro" })).toBe("2028-02-29");
    expect(shortCashflowDate("29/02", { ...month, month: "Fevereiro", year: 2027 })).toBeNull();
    expect(displayCashflowDate("2028-01-05", month)).toBe("05/01");
    expect(displayCashflowDate("2027-01-05", month)).toBe("2027-01-05");
  });
});

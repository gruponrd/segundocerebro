import type { Bank, CashflowMonth, Creditor } from "@/data/financialData";
import { cashflowPeriod } from "./cashflowMonths";

/** A read-only scenario: pending bills stay pending in storage. */
export function debtProjection(banks: Bank[], creditors: Creditor[], month: Pick<CashflowMonth, "month" | "year">, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", month: "numeric", year: "numeric" }).formatToParts(now);
  const current = Number(parts.find(part => part.type === "year")?.value) * 12 + Number(parts.find(part => part.type === "month")?.value) - 1;
  const selected = cashflowPeriod(month);
  const isProjection = selected !== undefined && selected >= current;
  let cards = 0;
  let scheduled = 0;
  for (const bank of banks) {
    if (bank.status === "cancelado") continue;
    for (const bill of bank.installments) {
      if (bill.status === "pago") continue;
      const amount = Math.round(bill.installmentAmount * 100);
      cards += amount;
      const due = /^(\d{4})-(\d{2})-(\d{2})$/.exec(bill.dueDate);
      if (!due) continue;
      const year = Number(due[1]), monthIndex = Number(due[2]) - 1, day = Number(due[3]);
      const date = new Date(Date.UTC(year, monthIndex, day));
      if (date.getUTCFullYear() !== year || date.getUTCMonth() !== monthIndex || date.getUTCDate() !== day) continue;
      const period = year * 12 + monthIndex;
      // Arrears before the current month never disappear just by moving the selector.
      if (isProjection && period >= current && period <= selected) scheduled += amount;
    }
  }
  // A creditor due date alone is not an amortization schedule.
  const creditorCents = creditors.reduce((total, creditor) => total + Math.max(0, Math.round(creditor.totalDebt * 100) - Math.round(creditor.amountPaid * 100)), 0);
  return {
    isProjection,
    currentDebt: (cards + creditorCents) / 100,
    projectedPayments: scheduled / 100,
    cardsRemaining: (cards - scheduled) / 100,
    creditorsRemaining: creditorCents / 100,
    remaining: (cards - scheduled + creditorCents) / 100,
  };
}

import type { Bank, Installment } from "@/data/financialData";

/** Informational count for a plan; other months may already have their own records. */
export function remainingInstallments(installment: Installment): number {
  // Older records use 0/0 for a single bill, not for an empty plan.
  const total = Math.max(1, Math.floor(installment.totalInstallments));
  const current = Math.max(1, Math.floor(installment.currentInstallment));
  const remaining = Math.max(0, total - current + 1);
  return Math.max(0, remaining - (installment.status === "pago" ? 1 : 0));
}

export function remainingBankDebt(bank: Bank): number {
  if (bank.status === "cancelado") return 0;
  return bank.installments.reduce(
    (sum, installment) => sum + (installment.status === "pago" ? 0 : installment.installmentAmount),
    0,
  );
}

function scheduledCardSpendingForMonth(banks: Bank[], month: number, year: number, includePaidCurrent: boolean): number {
  return banks.reduce((total, bank) => {
    if (bank.status === "cancelado") return total;
    return total + bank.installments.reduce((sum, installment) => {
      const due = new Date(`${installment.dueDate}T00:00:00`);
      if (Number.isNaN(due.getTime())) return sum;
      return due.getFullYear() === year && due.getMonth() + 1 === month && (includePaidCurrent || installment.status !== "pago")
        ? sum + installment.installmentAmount
        : sum;
    }, 0);
  }, 0);
}

/** Paid installments still count in the month's total spending. */
export function cardSpendingForMonth(banks: Bank[], month: number, year: number): number {
  return scheduledCardSpendingForMonth(banks, month, year, true);
}

/** Expected payments that have not already been marked paid. */
export function unpaidCardSpendingForMonth(banks: Bank[], month: number, year: number): number {
  return scheduledCardSpendingForMonth(banks, month, year, false);
}

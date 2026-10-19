import type { Bank, CashflowMonth } from "@/data/financialData";

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const MONTH_INDEX: Record<string, number> = {
  Janeiro: 0, Fevereiro: 1, Março: 2, Abril: 3, Maio: 4, Junho: 5,
  Julho: 6, Agosto: 7, Setembro: 8, Outubro: 9, Novembro: 10, Dezembro: 11,
};

function monthOrder(month: CashflowMonth): number {
  return month.year * 12 + (MONTH_INDEX[month.month] ?? 0);
}

export function cashflowPeriod(month: Pick<CashflowMonth, "month" | "year">): number | undefined {
  const index = MONTH_INDEX[month.month];
  return index !== undefined && Number.isInteger(month.year) ? month.year * 12 + index : undefined;
}

/** A navigable calendar; existing records are reused and never filled with estimates. */
export function extendCashflowMonths(stored: CashflowMonth[], banks: Bank[], now = new Date()): CashflowMonth[] {
  const current = now.getFullYear() * 12 + now.getMonth();
  const periods = stored.map(cashflowPeriod).filter((period): period is number => period !== undefined);
  for (const bank of banks) {
    if (bank.status === "cancelado") continue;
    for (const installment of bank.installments) {
      const due = new Date(`${installment.dueDate}T00:00:00`);
      if (!Number.isNaN(due.getTime())) periods.push(due.getFullYear() * 12 + due.getMonth());
    }
  }
  const start = Math.min(current, ...periods);
  const end = Math.max(current, ...periods);
  const calendar: CashflowMonth[] = [];
  for (let period = start; period <= end; period++) {
    calendar.push({ month: MONTH_NAMES[period % 12], year: Math.floor(period / 12), incomes: [], expenses: [] });
  }
  return mergeCashflowMonths(stored, calendar);
}

/** Keep saved months and add only missing calendar months in date order. */
export function mergeCashflowMonths(stored: CashflowMonth[], fallback: CashflowMonth[]): CashflowMonth[] {
  const storedKeys = new Set(stored.map((month) => `${month.month}-${month.year}`));
  const missing = fallback.filter((month) => !storedKeys.has(`${month.month}-${month.year}`));
  return [...stored, ...missing].sort((a, b) => monthOrder(a) - monthOrder(b));
}

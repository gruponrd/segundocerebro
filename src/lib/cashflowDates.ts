import type { CashflowItem, CashflowMonth } from "@/data/financialData";
import { cashflowPeriod, emptyCashflowMonth, mergeCashflowMonths } from "./cashflowMonths";

export const INCOME_CLOSING_DAY = 7;

const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export function cashflowDateBounds(month: CashflowMonth) {
  const number = months.indexOf(month.month) + 1;
  if (!number || !Number.isInteger(month.year)) return null;
  const prefix = `${month.year}-${String(number).padStart(2, "0")}`;
  const last = new Date(Date.UTC(month.year, number, 0)).getUTCDate();
  return { min: `${prefix}-01`, max: `${prefix}-${last}`, prefix, last };
}
export function calendarDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? parsed : null;
}

export function incomeReferencePeriod(date: string): number | null {
  const parsed = calendarDate(date);
  if (!parsed) return null;
  const period = parsed.getUTCFullYear() * 12 + parsed.getUTCMonth();
  return parsed.getUTCDate() <= INCOME_CLOSING_DAY ? period - 1 : period;
}

export function validCashflowDate(date: string, month: CashflowMonth, closingIncome = false) {
  const bounds = cashflowDateBounds(month);
  if (!bounds || !calendarDate(date)) return false;
  return (date >= bounds.min && date <= bounds.max)
    || (closingIncome && incomeReferencePeriod(date) === cashflowPeriod(month));
}
/** Input accepts dates in the selected month and receipts through its closing day. */
export function shortCashflowDate(value: string, month: CashflowMonth): string | null {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) return null;
  const monthIndex = months.indexOf(month.month);
  const year = month.year + Number(monthIndex === 11 && match[2] === "01");
  const date = `${year}-${match[2]}-${match[1]}`;
  return validCashflowDate(date, month, true) ? date : null;
}
export function displayCashflowDate(value: string | undefined, month: CashflowMonth): string {
  if (!value) return "";
  return validCashflowDate(value, month, true) ? `${value.slice(8, 10)}/${value.slice(5, 7)}` : value;
}
export function replicateCashflowDate(date: string | undefined, source: CashflowMonth, target: CashflowMonth, closingIncome = false) {
  if (!date || !validCashflowDate(date, source, closingIncome)) return undefined;
  const targetPeriod = cashflowPeriod(target);
  const followingMonth = date > (cashflowDateBounds(source)?.max ?? date);
  const bounds = cashflowDateBounds(followingMonth && targetPeriod !== undefined ? emptyCashflowMonth(targetPeriod + 1) : target);
  return bounds ? `${bounds.prefix}-${String(Math.min(Number(date.slice(8)), bounds.last)).padStart(2, "0")}` : undefined;
}

/** Reassign only dated income. Keep the original entries, including IDs, dates and payment status. */
export function groupCashflowIncome(months: CashflowMonth[]): CashflowMonth[] {
  const moved = new Map<number, CashflowItem[]>();
  const retained = months.map(month => {
    const period = cashflowPeriod(month);
    if (period === undefined) return month;
    const incomes = month.incomes.filter(item => {
      const destination = item.date ? incomeReferencePeriod(item.date) : null;
      if (destination === null || destination === period) return true;
      const entries = moved.get(destination) ?? [];
      entries.push(item);
      moved.set(destination, entries);
      return false;
    });
    return incomes.length === month.incomes.length ? month : { ...month, incomes };
  });
  if (!moved.size) return months;
  const missing = Array.from(moved.keys(), emptyCashflowMonth);
  return mergeCashflowMonths(retained, missing).map(month => {
    const entries = moved.get(cashflowPeriod(month) ?? -1);
    return entries ? { ...month, incomes: [...month.incomes, ...entries] } : month;
  });
}

import type { CashflowMonth } from "@/data/financialData";

const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export function cashflowDateBounds(month: CashflowMonth) {
  const number = months.indexOf(month.month) + 1;
  if (!number || !Number.isInteger(month.year)) return null;
  const prefix = `${month.year}-${String(number).padStart(2, "0")}`;
  const last = new Date(Date.UTC(month.year, number, 0)).getUTCDate();
  return { min: `${prefix}-01`, max: `${prefix}-${last}`, prefix, last };
}
export function validCashflowDate(date: string, month: CashflowMonth) {
  const bounds = cashflowDateBounds(month);
  if (!bounds || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < bounds.min || date > bounds.max) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}
/** The selected cash-flow period is the source of the year and month. */
export function shortCashflowDate(value: string, month: CashflowMonth): string | null {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) return null;
  const date = `${month.year}-${match[2]}-${match[1]}`;
  return validCashflowDate(date, month) ? date : null;
}
export function displayCashflowDate(value: string | undefined, month: CashflowMonth): string {
  if (!value) return "";
  return validCashflowDate(value, month) ? `${value.slice(8, 10)}/${value.slice(5, 7)}` : value;
}
export function replicateCashflowDate(date: string | undefined, source: CashflowMonth, target: CashflowMonth) {
  if (!date || !validCashflowDate(date, source)) return undefined;
  const bounds = cashflowDateBounds(target);
  return bounds ? `${bounds.prefix}-${String(Math.min(Number(date.slice(8)), bounds.last)).padStart(2, "0")}` : undefined;
}

import type { CashflowMonth } from "@/data/financialData";
import { cashflowPeriod } from "@/lib/cashflowMonths";

export const INCOME_MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

/** Only confirmed entries count; the month of the cash-flow record determines the year. */
export function confirmedAnnualIncome(months: CashflowMonth[], year: number): number[] {
  const cents = Array<number>(12).fill(0);
  for (const month of months) {
    const period = cashflowPeriod(month);
    if (month.year !== year || period === undefined || !Array.isArray(month.incomes)) continue;
    const index = period - year * 12;
    for (const item of month.incomes) {
      if (item.paid === true && Number.isFinite(item.amount)) cents[index] += Math.round(item.amount * 100);
    }
  }
  return cents.map(value => value / 100);
}

export function annualGoalsForYear(value: unknown): number[] {
  return Array.from({ length: 12 }, (_, i) => {
    const amount = Array.isArray(value) ? value[i] : 0;
    return typeof amount === "number" && Number.isFinite(amount) && amount >= 0 ? amount : 0;
  });
}

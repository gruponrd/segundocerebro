import type { Bank, CashflowMonth } from "@/data/financialData";
import { cardSpendingForMonth } from "@/lib/financeCalculations";
import { monthNumber } from "@/lib/planningTools";

export interface PanoramaPoint {
  month: string;
  period: number;
  entradas?: number;
  saidas?: number;
  future_entradas?: number;
  future_saidas?: number;
  estimated: boolean;
  hasRecords: boolean;
  baseline?: string;
}
export function periodLabel(period: number) {
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[period % 12]}/${Math.floor(period / 12)}`;
}
export function panoramaTicks(points: PanoramaPoint[]): number[] {
  if (!points.length) return [];
  const stride = Math.max(1, Math.ceil((points.length - 1) / 6));
  return points.filter((_, index) => index % stride === 0 || index === points.length - 1).map(point => point.period);
}

export function panoramaYearCuts(points: PanoramaPoint[]): { period: number; year: number }[] {
  return points.filter((point, index) => index > 0 && point.period % 12 === 0)
    .map(point => ({ period: point.period - 0.5, year: Math.floor(point.period / 12) }));
}
const cents = (items: { amount: number }[]) => items.reduce((sum, item) => sum + Math.round(item.amount * 100), 0);

/** Display only. Registered months win; no saved calendar or transaction is mutated. */
export function buildPanoramaSeries(months: CashflowMonth[], banks: Bank[], now = new Date(), selectedPeriod = now.getFullYear() * 12 + now.getMonth()): PanoramaPoint[] {
  const current = now.getFullYear() * 12 + now.getMonth();
  const calendar = months.flatMap(month => {
    const number = monthNumber(month.month);
    return number ? [{ ...month, period: month.year * 12 + number - 1 }] : [];
  }).sort((a, b) => a.period - b.period);
  const baseline = calendar.filter(month => month.period <= current && (month.incomes.length || month.expenses.length)).slice(-1)[0];
  const result: PanoramaPoint[] = [];
  for (let period = selectedPeriod - 6; period <= selectedPeriod + 6; period++) {
    const month = calendar.find(item => item.period === period);
    const cards = cardSpendingForMonth(banks, period % 12 + 1, Math.floor(period / 12));
    const registered = !!month && !!(month.incomes.length || month.expenses.length);
    const estimated = !registered && period > current && !!baseline;
    const income = registered ? cents(month!.incomes) / 100 : estimated ? cents(baseline!.incomes) / 100 : 0;
    const expense = (registered ? cents(month!.expenses) / 100 : estimated ? cents(baseline!.expenses) / 100 : 0) + cards;
    const future = period > current;
    result.push({ month: periodLabel(period), period, estimated, hasRecords: registered || cards !== 0, baseline: estimated ? periodLabel(baseline!.period) : undefined,
      entradas: future ? undefined : income, saidas: future ? undefined : expense,
      future_entradas: future ? income : undefined, future_saidas: future ? expense : undefined });
  }
  let lastPast = -1;
  result.forEach((point, index) => { if (point.entradas !== undefined) lastPast = index; });
  if (lastPast >= 0 && lastPast < result.length - 1) {
    result[lastPast].future_entradas = result[lastPast].entradas;
    result[lastPast].future_saidas = result[lastPast].saidas;
  }
  return result;
}

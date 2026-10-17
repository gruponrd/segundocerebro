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
  baseline?: string;
}
export const PANORAMA_END = 2027 * 12 + 2;
export const YEAR_CUT = 2026 * 12 + 11.5;
export function periodLabel(period: number) {
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[period % 12]}/${Math.floor(period / 12)}`;
}
export function panoramaTicks(points: PanoramaPoint[]): number[] {
  if (!points.length) return [];
  const first = points[0].period, last = points[points.length - 1].period;
  const stride = Math.max(1, Math.ceil((last - first) / 5));
  const december = Math.floor(YEAR_CUT);
  return points.filter(point => point.period === first || point.period === last || point.period === december
    || ((point.period - first) % stride === 0 && Math.abs(point.period - december) >= 2 && last - point.period >= 2)).map(point => point.period);
}
const cents = (items: { amount: number }[]) => items.reduce((sum, item) => sum + Math.round(item.amount * 100), 0);

/** Display only. Registered months win; no saved calendar or transaction is mutated. */
export function buildPanoramaSeries(months: CashflowMonth[], banks: Bank[], now = new Date()): PanoramaPoint[] {
  const current = now.getFullYear() * 12 + now.getMonth();
  const calendar = months.flatMap(month => {
    const number = monthNumber(month.month);
    return number ? [{ ...month, period: month.year * 12 + number - 1 }] : [];
  }).sort((a, b) => a.period - b.period);
  const baseline = calendar.filter(month => month.period <= current && (month.incomes.length || month.expenses.length)).slice(-1)[0];
  const periods = new Set(calendar.filter(month => month.period <= PANORAMA_END).map(month => month.period));
  // The requested extra horizon is Jan–Mar 2027. Earlier empty history stays empty.
  for (let period = 2027 * 12; period <= PANORAMA_END; period++) if (period > current && (baseline || banks.length)) periods.add(period);
  const result: PanoramaPoint[] = [];
  for (const period of [...periods].sort((a, b) => a - b)) {
    const month = calendar.find(item => item.period === period);
    const cards = cardSpendingForMonth(banks, period % 12 + 1, Math.floor(period / 12));
    const registered = !!month && !!(month.incomes.length || month.expenses.length);
    const estimated = !registered && period >= 2027 * 12 && period > current && !!baseline;
    if (!registered && !estimated && cards === 0) continue;
    const income = registered ? cents(month!.incomes) / 100 : estimated ? cents(baseline!.incomes) / 100 : 0;
    const expense = (registered ? cents(month!.expenses) / 100 : estimated ? cents(baseline!.expenses) / 100 : 0) + cards;
    const future = period > current;
    result.push({ month: periodLabel(period), period, estimated, baseline: estimated ? periodLabel(baseline!.period) : undefined,
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

import type { Bank, CashflowMonth } from "@/data/financialData";
import { cardSpendingForMonth } from "@/lib/financeCalculations";
import { monthNumber } from "@/lib/planningTools";

export const compactReais = (value: number) => new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value);

export function parseSavingsGoal(value: string): number | null {
  if (!value.trim()) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= Number.MAX_SAFE_INTEGER / 100
    ? Math.round(amount * 100) / 100 : null;
}

export interface ProjectionPoint {
  label: string;
  planned?: number;
  forecast?: number;
  net: number;
  source: "Lançamentos" | "Média estimada" | "Sem lançamentos";
}

/** Display-only forecast. Starts at zero, never treats planned entries as a bank balance. */
export function buildBalanceProjection(months: CashflowMonth[], banks: Bank[], selectedIndex: number): ProjectionPoint[] {
  const selected = months[selectedIndex];
  if (!selected || !monthNumber(selected.month)) return [];
  const selectedPeriod = selected.year * 12 + monthNumber(selected.month) - 1;
  const registered = months.flatMap(month => {
    const number = monthNumber(month.month);
    if (!number) return [];
    const cards = cardSpendingForMonth(banks, number, month.year);
    if (!month.incomes.length && !month.expenses.length && cards === 0) return [];
    const income = month.incomes.reduce((sum, item) => sum + Math.round(item.amount * 100), 0);
    const expense = month.expenses.reduce((sum, item) => sum + Math.round(item.amount * 100), 0);
    return [{ period: month.year * 12 + number - 1, net: income - expense - Math.round(cards * 100) }];
  }).sort((a, b) => a.period - b.period);
  const history = registered.filter(row => row.period <= selectedPeriod);
  if (!history.length) return [];
  const label = (period: number) => new Date(Math.floor(period / 12), period % 12, 1)
    .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
  let accumulated = 0;
  const points: ProjectionPoint[] = history.map(row => {
    accumulated += row.net;
    return { label: label(row.period), planned: accumulated / 100, net: row.net / 100, source: "Lançamentos" };
  });
  if (history[history.length - 1].period < selectedPeriod) points.push({ label: label(selectedPeriod), planned: accumulated / 100, net: 0, source: "Sem lançamentos" });
  points[points.length - 1].forecast = accumulated / 100;
  const recent = history.slice(-3);
  const average = Math.round(recent.reduce((sum, row) => sum + row.net, 0) / recent.length);
  for (let offset = 1; offset <= 6; offset++) {
    const period = selectedPeriod + offset;
    const record = registered.find(row => row.period === period);
    const scheduledCards = Math.round(cardSpendingForMonth(banks, period % 12 + 1, Math.floor(period / 12)) * 100);
    const hasRecords = !!record || scheduledCards !== 0;
    const net = record?.net ?? (hasRecords ? -scheduledCards : average);
    accumulated += net;
    points.push({ label: label(period), forecast: accumulated / 100, net: net / 100, source: hasRecords ? "Lançamentos" : "Média estimada" });
  }
  return points;
}

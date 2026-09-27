import type { CashflowMonth } from "@/data/financialData";

const MONTH_INDEX: Record<string, number> = {
  Janeiro: 0, Fevereiro: 1, Março: 2, Abril: 3, Maio: 4, Junho: 5,
  Julho: 6, Agosto: 7, Setembro: 8, Outubro: 9, Novembro: 10, Dezembro: 11,
};

function monthOrder(month: CashflowMonth): number {
  return month.year * 12 + (MONTH_INDEX[month.month] ?? 0);
}

/** Keep saved months and add only missing calendar months in date order. */
export function mergeCashflowMonths(stored: CashflowMonth[], fallback: CashflowMonth[]): CashflowMonth[] {
  const storedKeys = new Set(stored.map((month) => `${month.month}-${month.year}`));
  const missing = fallback.filter((month) => !storedKeys.has(`${month.month}-${month.year}`));
  return [...stored, ...missing].sort((a, b) => monthOrder(a) - monthOrder(b));
}

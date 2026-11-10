import type { Bank, CashflowMonth } from "@/data/financialData";
import { monthlyCashflowChart } from "@/lib/monthlyCashflowChart";

/** Groups only explicit dates; estimates and legacy labels remain unallocated. */
export function cashflowPeriods(month: CashflowMonth, banks: Bank[], mode: "weekly" | "fortnightly") {
  const chart = monthlyCashflowChart(month, banks);
  const width = mode === "weekly" ? 7 : 15;
  const ranges: { from: number; to: number; incomes: number; expenses: number }[] = [];
  for (let from = 1; from <= chart.points.length; from += width) {
    const to = mode === "fortnightly" && from === 16 ? chart.points.length : Math.min(from + width - 1, chart.points.length);
    ranges.push({ from, to, incomes: 0, expenses: 0 });
    if (mode === "fortnightly" && from === 16) break;
  }
  let missingIncome = 0, missingExpense = 0;
  for (const entry of chart.entries) {
    const dated = entry.day !== null && (entry.reference === "Data registrada" || entry.reference === "Vencimento da parcela");
    const cents = Math.round(entry.amount * 100);
    const range = dated ? ranges.find(row => entry.day! >= row.from && entry.day! <= row.to) : undefined;
    if (range) range[entry.kind] += cents;
    else if (entry.kind === "incomes") missingIncome += cents;
    else missingExpense += cents;
  }
  return { ranges: ranges.map(row => ({ ...row, incomes: row.incomes / 100, expenses: row.expenses / 100 })), missingIncome: missingIncome / 100, missingExpense: missingExpense / 100 };
}

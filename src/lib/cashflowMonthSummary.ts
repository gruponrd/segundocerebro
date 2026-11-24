import type { Bank, CashflowMonth } from "@/data/financialData";
import { monthlyCashflowChart } from "@/lib/monthlyCashflowChart";
import { monthlyFlow } from "@/overview-proposal/monthlyFlow";

export function cashflowMonthSummary(item: CashflowMonth | undefined, banks: Bank[]) {
  if (!item) return { invalid: false, totals: null };
  const flow = monthlyFlow(item, banks);
  const hasData = !flow.invalid && !!(item.incomes.length || item.expenses.length || flow.cost);
  const { entries } = monthlyCashflowChart(item, banks);
  const sums = entries.reduce((totals, entry) => {
    const cents = Math.round(entry.amount * 100);
    if (entry.paid) totals[entry.kind] += cents;
    if (entry.id.startsWith("card:")) totals.cards += cents;
    return totals;
  }, { incomes: 0, expenses: 0, cards: 0 });
  return {
    invalid: flow.invalid,
    totals: hasData ? {
      income: flow.income, cost: flow.cost, cards: sums.cards / 100,
      status: {
        received: sums.incomes / 100,
        receivable: (Math.round(flow.income * 100) - sums.incomes) / 100,
        paid: sums.expenses / 100,
        payable: (Math.round(flow.cost * 100) - sums.expenses) / 100,
      },
    } : null,
  };
}

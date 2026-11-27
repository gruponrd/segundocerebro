import type { Bank, CashflowMonth } from "@/data/financialData";
import { calendarDate, validCashflowDate } from "@/lib/cashflowDates";

const cents = (amount: number) => Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0;

type Bill = { id: string; label: string; source: string; date: string; cents: number };

/** Plans against one scheduled deposit date, using explicit calendar dates and unpaid entries. */
export function nextPaymentPlan(months: CashflowMonth[], banks: Bank[], today: string) {
  const receipts = months.flatMap(month => month.incomes.flatMap(item => {
    const amount = cents(item.amount);
    if (item.paid || !amount || !item.date || item.date < today || !validCashflowDate(item.date, month, true)) return [];
    return [{ label: item.label, date: item.date, cents: amount }];
  })).sort((a, b) => a.date.localeCompare(b.date));

  const first = receipts[0];
  if (!first) return null;
  const deposit = receipts.filter(item => item.date === first.date);
  const next = receipts.find(item => item.date > first.date);
  const date = new Date(`${(next ?? first).date}T00:00:00Z`);
  if (next) date.setUTCDate(date.getUTCDate() - 1);
  else date.setUTCMonth(date.getUTCMonth() + 1, 0);
  const until = date.toISOString().slice(0, 10);

  const bills: Bill[] = [];
  for (const month of months) month.expenses.forEach((item, index) => {
    const amount = cents(item.amount);
    if (item.paid || !amount || !item.date || item.date > until || !validCashflowDate(item.date, month)) return;
    bills.push({ id: `expense-${month.year}-${month.month}-${item.id ?? index}`, label: item.label,
      source: "Saída direta", date: item.date, cents: amount });
  });
  for (const bank of banks) {
    if (bank.status === "cancelado") continue;
    for (const item of bank.installments) {
      const amount = cents(item.installmentAmount);
      if (item.status === "pago" || !amount || item.dueDate > until || !calendarDate(item.dueDate)) continue;
      bills.push({ id: `card-${bank.id}-${item.id}`, label: item.description, source: bank.name,
        date: item.dueDate, cents: amount });
    }
  }
  bills.sort((a, b) => a.date.localeCompare(b.date));

  const income = deposit.reduce((sum, item) => sum + item.cents, 0);
  let committed = 0;
  const accounts = bills.map(bill => {
    committed += bill.cents;
    return { ...bill, covered: committed <= income };
  });
  return { date: first.date, deposit, nextDate: next?.date, until, accounts, income, difference: income - committed, committed };
}

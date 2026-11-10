import type { Bank, CashflowMonth, Creditor } from "@/data/financialData";
import { cashflowPeriod } from "@/lib/cashflowMonths";
import { saoPauloPeriod } from "@/lib/debtActionPlan";

const cents = (amount: number) => Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0;
function validDate(value: string | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]) ? value! : null;
}
function dateInSaoPaulo(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (name: string) => parts.find(part => part.type === name)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Informational suggestions only. Never treats a projected difference as cash in a bank. */
export function suggestDebtActions(months: CashflowMonth[], banks: Bank[], creditors: Creditor[], reserve: number, now = new Date()) {
  const period = saoPauloPeriod(now);
  const month = months.find(item => cashflowPeriod(item) === period);
  const pendingIncome = month?.incomes.filter(item => !item.paid).reduce((sum, item) => sum + cents(item.amount), 0) ?? 0;
  const pendingExpense = month?.expenses.filter(item => !item.paid).reduce((sum, item) => sum + cents(item.amount), 0) ?? 0;
  const today = dateInSaoPaulo(now);
  let cards = 0, priorCards = 0, unaccounted = 0, incompleteCount = 0;
  const urgentCards: {name:string; date:string | null; amount:number}[] = [];
  for (const bank of banks) {
    if (bank.status === "cancelado") continue;
    for (const item of bank.installments) {
      if (item.status === "pago") continue;
      const amount = cents(item.installmentAmount), due = validDate(item.dueDate);
      const dueMonth = due ? Number(due.slice(0,4)) * 12 + Number(due.slice(5,7)) - 1 : null;
      if (dueMonth === period) cards += amount;
      if (dueMonth !== null && dueMonth < period) priorCards += amount;
      if (dueMonth === null) { unaccounted += amount; incompleteCount++; }
      if (!due || due < today || item.status === "atrasado") urgentCards.push({name:bank.name, date:due, amount:amount / 100});
    }
  }
  const outstanding = creditors.map(c => ({...c, remaining: Math.max(0, cents(c.totalDebt) - cents(c.amountPaid)), rate: typeof c.interestRate === "number" && Number.isFinite(c.interestRate) && c.interestRate >= 0 ? c.interestRate : null})).filter(c => c.remaining > 0);
  outstanding.sort((a,b) => {
    const aDue = validDate(a.dueDate), bDue = validDate(b.dueDate);
    const overdue = Number(!!bDue && bDue < today) - Number(!!aDue && aDue < today);
    if (overdue) return overdue;
    if (a.rate === null && b.rate !== null) return 1;
    if (b.rate === null && a.rate !== null) return -1;
    return (b.rate ?? 0) - (a.rate ?? 0) || a.remaining - b.remaining;
  });
  urgentCards.sort((a,b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"));
  const reserveCents = cents(reserve);
  const pendingOut = pendingExpense + cards + priorCards;
  const projectedDifference = pendingIncome - pendingOut;
  const creditorTotal = outstanding.reduce((sum, item) => sum + item.remaining, 0);
  // Undated installments cannot safely be assigned to a payment period.
  const suggestion = month && incompleteCount === 0 && pendingIncome > 0
    ? Math.min(creditorTotal, Math.max(0, projectedDifference - reserveCents)) : 0;
  const evidence = (!!month && (month.incomes.length > 0 || month.expenses.length > 0)) || cards > 0 || priorCards > 0 || incompleteCount > 0;
  return { month, pendingIncome:pendingIncome / 100, pendingExpense:pendingExpense / 100, cards:cards / 100, priorCards:priorCards / 100, pendingOut:pendingOut / 100, projectedDifference:projectedDifference / 100, reserve:reserveCents / 100, unaccounted:unaccounted / 100, incompleteCount, suggestedExtra:suggestion / 100, priority:outstanding[0] ?? null, urgentCard:urgentCards[0] ?? null, evidence };
}

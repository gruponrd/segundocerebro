import type { Bank, Creditor } from "@/data/financialData";

export type DebtStrategy = "smallest" | "interest" | "custom";
export interface DebtPlanSettings { monthlyExtra: number; strategy: DebtStrategy; priorityId: string }
export const DEFAULT_DEBT_PLAN: DebtPlanSettings = { monthlyExtra: 0, strategy: "smallest", priorityId: "" };
const cents = (value: number) => Number.isFinite(value) ? Math.max(0, Math.round(value * 100)) : 0;

export function normalizeDebtPlan(value: unknown): DebtPlanSettings {
  if (!value || typeof value !== "object") return { ...DEFAULT_DEBT_PLAN };
  const input = value as Partial<DebtPlanSettings>;
  return {
    monthlyExtra: typeof input.monthlyExtra === "number" ? Math.min(cents(input.monthlyExtra), 99999999900) / 100 : 0,
    strategy: input.strategy === "interest" || input.strategy === "custom" ? input.strategy : "smallest",
    priorityId: typeof input.priorityId === "string" ? input.priorityId : "",
  };
}

function duePeriod(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? year * 12 + month - 1 : null;
}
export function saoPauloPeriod(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", month: "numeric", year: "numeric" }).formatToParts(now);
  return Number(parts.find(part => part.type === "year")?.value) * 12 + Number(parts.find(part => part.type === "month")?.value) - 1;
}

/** Read-only simulation. Scheduled installments are assumed paid on their due month;
 * extra amounts are applied only to creditors, with no unverified interest or discount. */
export function simulateDebtPlan(banks: Bank[], creditors: Creditor[], settings: DebtPlanSettings, startPeriod = saoPauloPeriod(), maxMonths = 60) {
  const loans = creditors.map(c => ({ id: c.id, name: c.name, remaining: Math.max(0, cents(c.totalDebt) - cents(c.amountPaid)), rate: typeof c.interestRate === "number" && Number.isFinite(c.interestRate) && c.interestRate >= 0 ? c.interestRate : null })).filter(c => c.remaining > 0);
  const installmentMap = new Map<number, number>();
  let unscheduledCents = 0, unscheduledCount = 0, installmentsCents = 0;
  for (const bank of banks) {
    if (bank.status === "cancelado") continue;
    for (const bill of bank.installments) {
      if (bill.status === "pago") continue;
      const amount = cents(bill.installmentAmount);
      installmentsCents += amount;
      const due = duePeriod(bill.dueDate);
      if (due === null || due < startPeriod || bill.status === "atrasado") { unscheduledCents += amount; unscheduledCount++; }
      else installmentMap.set(due, (installmentMap.get(due) ?? 0) + amount);
    }
  }
  const initialCents = installmentsCents + loans.reduce((sum, c) => sum + c.remaining, 0);
  const unknownRates = loans.filter(c => c.rate === null).length;
  const steps: { period: number; scheduled: number; extra: number; remaining: number; allocations: { name: string; amount: number; cleared: boolean }[] }[] = [];
  let scheduledLeft = installmentsCents;
  let finishPeriod: number | null = initialCents === 0 ? startPeriod : null;
  const monthly = cents(settings.monthlyExtra);
  for (let offset = 0; offset < maxMonths && initialCents > 0; offset++) {
    const period = startPeriod + offset;
    const scheduled = installmentMap.get(period) ?? 0;
    scheduledLeft -= scheduled;
    let budget = monthly;
    const allocations: { name: string; amount: number; cleared: boolean }[] = [];
    const ordered = loans.filter(loan => loan.remaining > 0).sort((a, b) => {
      if (settings.strategy === "custom") {
        const priority = Number(b.id === settings.priorityId) - Number(a.id === settings.priorityId);
        if (priority) return priority;
      }
      if (settings.strategy === "interest") {
        if (a.rate === null && b.rate !== null) return 1;
        if (b.rate === null && a.rate !== null) return -1;
        if (a.rate !== b.rate) return (b.rate ?? 0) - (a.rate ?? 0);
      }
      return a.remaining - b.remaining || a.name.localeCompare(b.name, "pt-BR");
    });
    for (const loan of ordered) {
      if (budget <= 0) break;
      const payment = Math.min(budget, loan.remaining);
      loan.remaining -= payment; budget -= payment;
      allocations.push({ name: loan.name, amount: payment / 100, cleared: loan.remaining === 0 });
    }
    const remaining = scheduledLeft + loans.reduce((sum, loan) => sum + loan.remaining, 0);
    steps.push({ period, scheduled: scheduled / 100, extra: (monthly - budget) / 100, remaining: remaining / 100, allocations });
    if (remaining === 0) { finishPeriod = period; break; }
    if (monthly === 0 && period >= Math.max(startPeriod, ...installmentMap.keys())) break;
    if (unscheduledCents > 0 && loans.every(loan => loan.remaining === 0) && period >= Math.max(startPeriod, ...installmentMap.keys())) break;
  }
  return { initial: initialCents / 100, creditors: creditors.filter(c => cents(c.totalDebt) > cents(c.amountPaid)).length, unknownRates, unscheduled: unscheduledCents / 100, unscheduledCount, steps, finishPeriod };
}

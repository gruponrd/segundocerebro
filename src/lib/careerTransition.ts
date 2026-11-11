import type { Bank } from "@/data/financialData";
import { saoPauloPeriod } from "@/lib/debtActionPlan";

export interface CareerPlan {
  savings: number; currentIncome: number; monthlyExpenses: number; newIncome: number;
  newIncomeDelay: number; reserveMonths: number; insuranceAmount: number; insuranceInstallments: number; insuranceDelay: number; severance: number;
}
export const DEFAULT_CAREER_PLAN: CareerPlan = { savings: 0, currentIncome: 0, monthlyExpenses: 0, newIncome: 0, newIncomeDelay: 0, reserveMonths: 6, insuranceAmount: 0, insuranceInstallments: 0, insuranceDelay: 1, severance: 0 };
export function normalizeCareerPlan(value: unknown): CareerPlan {
  const input = value && typeof value === "object" ? value as Partial<CareerPlan> : {};
  const bounded = (v: unknown, fallback: number, max: number, integer = false) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? (integer ? Math.floor(v) : Math.round(v * 100) / 100) : fallback;
  return { savings: bounded(input.savings, 0, 99999999), currentIncome: bounded(input.currentIncome, 0, 99999999), monthlyExpenses: bounded(input.monthlyExpenses, 0, 99999999), newIncome: bounded(input.newIncome, 0, 99999999), newIncomeDelay: bounded(input.newIncomeDelay, 0, 24, true), reserveMonths: bounded(input.reserveMonths, 6, 24, true), insuranceAmount: bounded(input.insuranceAmount, 0, 99999999), insuranceInstallments: bounded(input.insuranceInstallments, 0, 5, true), insuranceDelay: bounded(input.insuranceDelay, 1, 12, true), severance: bounded(input.severance, 0, 99999999) };
}

const cents = (n: number) => Math.round(n * 100);
export function careerProjection(plan: CareerPlan, banks: Bank[], withInsurance = false, nowPeriod = saoPauloPeriod()) {
  const scheduled = new Map<number, number>();
  let overdue = 0, unknown = 0;
  for (const bank of banks) {
    if (bank.status === "cancelado") continue;
    for (const item of bank.installments) {
      if (item.status === "pago") continue;
      if (!Number.isFinite(item.installmentAmount) || item.installmentAmount < 0) { unknown++; continue; }
      if (item.installmentAmount === 0) continue;
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(item.dueDate);
      const day = m && new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
      if (!m || !day || day.getUTCFullYear() !== +m[1] || day.getUTCMonth() + 1 !== +m[2] || day.getUTCDate() !== +m[3]) { unknown++; continue; }
      const period = +m[1] * 12 + +m[2] - 1;
      if (period <= nowPeriod || item.status === "atrasado") overdue += cents(item.installmentAmount);
      else scheduled.set(period, (scheduled.get(period) ?? 0) + cents(item.installmentAmount));
    }
  }
  const floor = cents(plan.monthlyExpenses) * plan.reserveMonths;
  let available = cents(plan.savings);
  let beforeExitValid = true;
  const candidates = [] as { period: number; starting: number; lowest: number; ending: number; timeline: { period: number; income: number; severance: number; expenses: number; installments: number; balance: number }[] }[];
  for (let offset = 1; offset <= 36; offset++) {
    const exit = nowPeriod + offset;
    const starting = available + cents(plan.severance);
    let balance = starting, lowest = starting;
    const timeline: { period: number; income: number; severance: number; expenses: number; installments: number; balance: number }[] = [];
    for (let post = 0; post < 12; post++) {
      const benefitWindow = withInsurance && post >= plan.insuranceDelay && post < plan.insuranceDelay + plan.insuranceInstallments;
      // A hypothetical benefit is never combined with income from the new activity.
      const income = benefitWindow ? cents(plan.insuranceAmount) : post >= plan.newIncomeDelay ? cents(plan.newIncome) : 0;
      const installments = (scheduled.get(exit + post) ?? 0) + (offset === 1 && post === 0 ? overdue : 0);
      balance += income - cents(plan.monthlyExpenses) - installments;
      lowest = Math.min(lowest, balance);
      timeline.push({ period: exit + post, income: income / 100, severance: post === 0 ? plan.severance : 0, expenses: plan.monthlyExpenses, installments: installments / 100, balance: balance / 100 });
    }
    if (beforeExitValid && unknown === 0 && lowest >= floor) candidates.push({ period: exit, starting: starting / 100, lowest: lowest / 100, ending: balance / 100, timeline });
    available += cents(plan.currentIncome) - cents(plan.monthlyExpenses) - (scheduled.get(exit) ?? 0) - (offset === 1 ? overdue : 0);
    if (available < 0) beforeExitValid = false;
  }
  return { first: candidates[0] ?? null, reserveTarget: floor / 100, overdue: overdue / 100, unknown };
}
export function careerPeriodLabel(period: number) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(Math.floor(period / 12), period % 12, 1)));
}

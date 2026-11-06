import type { CashflowMonth } from "@/data/financialData";
import { cashflowPeriod } from "@/lib/cashflowMonths";

export interface PlannedWish {
  id: string;
  label: string;
  amount: number;
  monthIdx: number;
  /** Stable month identity. Absent for wishes created before this field existed. */
  period?: number;
  priority: "alta" | "media" | "baixa";
  createdAt: number;
}

export function wishMonthIndex(wish: PlannedWish, months: CashflowMonth[]): number {
  return wish.period === undefined ? wish.monthIdx : months.findIndex(month => cashflowPeriod(month) === wish.period);
}

export function evaluateWishes(wishes: PlannedWish[], months: CashflowMonth[], balances: number[], safetyMargin: number) {
  const priorities = { alta: 0, media: 1, baixa: 2 };
  const groups = new Map<number, PlannedWish[]>();
  for (const wish of wishes) {
    // A legacy index may already point at the wrong month. Do not treat it as
    // a confirmed financial forecast until its owner chooses a month.
    if (wish.period === undefined) continue;
    const index = wishMonthIndex(wish, months);
    if (index < 0 || !months[index]) continue;
    groups.set(index, [...(groups.get(index) ?? []), wish]);
  }
  const results: Record<string, { verdict: "ok" | "risco" | "inviavel"; leftover: number; needed: number }> = {};
  let previousWishes = 0;
  for (const [index, group] of [...groups].sort(([a], [b]) => a - b)) {
    let available = Math.round(balances[index] * 100) - previousWishes;
    for (const wish of [...group].sort((a, b) => priorities[a.priority] - priorities[b.priority] || b.amount - a.amount)) {
      const cents = Math.round(wish.amount * 100);
      available -= cents;
      previousWishes += cents;
      const verdict = available >= Math.round(safetyMargin * 100) ? "ok" : available >= 0 ? "risco" : "inviavel";
      results[wish.id] = { verdict, leftover: available / 100, needed: wish.amount };
    }
  }
  return results;
}

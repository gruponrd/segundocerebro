import type { Goal } from "@/data/financialData";
export const toCents = (value: number) => Math.round(value * 100);
export function validateGoalPlan(goals: Goal[], budget: number, allocations: Record<string, number>): string | null {
  if (!Number.isFinite(budget) || budget < 0 || budget > 1_000_000) return "Informe uma economia mensal válida, até R$ 1.000.000.";
  let total = 0;
  for (const goal of goals) {
    const amount = allocations[goal.id] ?? 0;
    if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000) return `Informe um valor válido para ${goal.title}.`;
    if (goal.savedAmount >= goal.targetAmount && amount > 0) return `A meta ${goal.title} já foi concluída. Deixe sua parcela em zero.`;
    total += toCents(amount);
  }
  return total > toCents(budget) ? "A soma das metas ultrapassa sua economia mensal." : null;
}
export function equalGoalAllocation(goals: Goal[], budget: number): Record<string, number> {
  const active = goals.filter(g => g.savedAmount < g.targetAmount);
  const total = Math.max(0, toCents(Number.isFinite(budget) ? budget : 0));
  const share = active.length ? Math.floor(total / active.length) : 0;
  const result = Object.fromEntries(goals.map(g => [g.id, 0]));
  active.forEach((g, i) => { result[g.id] = (share + (i < total % active.length ? 1 : 0)) / 100; });
  return result;
}
export function goalMonthlyAmount(goal: Goal): number {
  return goal.savedAmount >= goal.targetAmount ? 0 : Math.max(0, Number.isFinite(goal.monthlyAllocation) ? goal.monthlyAllocation! : 0);
}

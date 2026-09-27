export interface IncomeAnalysisInput {
  incomeSources: { label: string; amount: number }[];
  goals: { title: string; targetAmount: number; savedAmount: number }[];
  totalDebt: number;
  totalExpense: number;
  savingsGoalMonth: number;
}

export interface CoverageInput {
  months: { label: string; income: number; cost: number }[];
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Dados inválidos");
  return value as Record<string, unknown>;
}

function text(value: unknown, maxLength: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) throw new Error("Texto inválido");
  return value.trim().replace(/[\r\n\t]+/g, " ");
}

function money(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1_000_000_000) {
    throw new Error("Valor financeiro inválido");
  }
  return value;
}

function list(value: unknown, maxLength: number): unknown[] {
  if (!Array.isArray(value) || value.length > maxLength) throw new Error("Lista inválida");
  return value;
}

export function parseIncomeAnalysisInput(value: unknown): IncomeAnalysisInput {
  const input = record(value);
  return {
    incomeSources: list(input.incomeSources, 30).map((item) => {
      const source = record(item);
      return { label: text(source.label, 100), amount: money(source.amount) };
    }),
    goals: list(input.goals, 50).map((item) => {
      const goal = record(item);
      const targetAmount = money(goal.targetAmount);
      const savedAmount = money(goal.savedAmount);
      if (savedAmount > targetAmount) throw new Error("Objetivo inválido");
      return { title: text(goal.title, 100), targetAmount, savedAmount };
    }),
    totalDebt: money(input.totalDebt),
    totalExpense: money(input.totalExpense),
    savingsGoalMonth: money(input.savingsGoalMonth),
  };
}

export function parseCoverageInput(value: unknown): CoverageInput {
  const input = record(value);
  return {
    months: list(input.months, 6).map((item) => {
      const month = record(item);
      return { label: text(month.label, 40), income: money(month.income), cost: money(month.cost) };
    }),
  };
}

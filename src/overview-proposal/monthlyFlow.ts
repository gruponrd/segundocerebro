import type { Bank, CashflowMonth } from "@/data/financialData";
import { getCategory, suggestCategory } from "@/data/categories";
import { cardSpendingForMonth } from "@/lib/financeCalculations";
import { monthNumber } from "@/lib/planningTools";

export interface FlowItem { id: string; label: string; value: number; color: string; kind: "income" | "expense" | "surplus" | "gap" }
const colors: Record<string, string> = { moradia: "#e2bc86", alimentacao: "#e3a58d", transporte: "#8abce3", contas: "#b2b4ce", lazer: "#b6a2e2", saude: "#e2a3b1", educacao: "#a4b7ed", assinaturas: "#b9a9db", compras: "#d9aac6", investimento: "#9ccebb", outros: "#b1bac5" };
const cents = (value: number) => Math.round(value * 100);
const total = (items: FlowItem[]) => items.reduce((sum, item) => sum + cents(item.value), 0);

/** Read-only monthly totals; never infer which specific salary paid which bill. */
export function monthlyFlow(month: CashflowMonth, banks: Bank[]) {
  const invalid = [...month.incomes, ...month.expenses].some(item => !Number.isFinite(item.amount) || item.amount < 0);
  const incomes: FlowItem[] = month.incomes.filter(item => item.amount > 0).map((item, index) => ({ id: `income-${index}`, label: item.label || "Entrada sem nome", value: cents(item.amount) / 100, color: "#89e5ac", kind: "income" }));
  const categories = new Map<string, number>();
  for (const expense of month.expenses) {
    const category = getCategory(expense.category || suggestCategory(expense.label));
    if (expense.amount > 0) categories.set(category.id, (categories.get(category.id) ?? 0) + cents(expense.amount));
  }
  const expenses: FlowItem[] = [...categories].map(([id, value]) => ({ id: `expense-${id}`, label: getCategory(id).label, value: value / 100, color: colors[id] ?? colors.outros, kind: "expense" }));
  const cards = cardSpendingForMonth(banks, monthNumber(month.month), month.year);
  if (cards > 0) expenses.push({ id: "cards", label: "Cartões", value: cents(cards) / 100, color: "#b69aff", kind: "expense" });
  expenses.sort((a, b) => b.value - a.value);
  const income = total(incomes), cost = total(expenses);
  const balance = income - cost;
  const sources = [...incomes];
  const destinations = [...expenses];
  if (balance > 0) destinations.push({ id: "surplus", label: "Sobra prevista", value: balance / 100, color: "#89e5ac", kind: "surplus" });
  if (balance < 0) sources.push({ id: "gap", label: "Valor que falta", value: -balance / 100, color: "#ff9c9f", kind: "gap" });
  return { sources, destinations, income: income / 100, cost: cost / 100, balance: balance / 100, basis: Math.max(income, cost) / 100, invalid };
}

/** Only group the visual overview; its table retains the complete composition. */
export function compactFlow(items: FlowItem[], limit: number): FlowItem[] {
  if (items.length <= limit) return items;
  const regular = items.filter(item => item.kind !== "surplus" && item.kind !== "gap").sort((a, b) => b.value - a.value);
  const special = items.filter(item => item.kind === "surplus" || item.kind === "gap");
  const keep = Math.max(0, limit - special.length - 1);
  const remainder = regular.slice(keep);
  return [...regular.slice(0, keep), { id: `group-${items[0].kind}`, label: items[0].kind === "income" ? "Outras entradas" : "Outras despesas", value: total(remainder) / 100, color: "#a5b0c0", kind: items[0].kind }, ...special];
}

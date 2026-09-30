import type { Bank, CashflowMonth } from "@/data/financialData";
import { cardSpendingForMonth } from "@/lib/financeCalculations";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const monthNumber = (name: string) => MONTHS.indexOf(name) + 1;
const cents = (value: number) => Math.round(value * 100);
const safeNumber = (value: number) => Number.isFinite(value) ? value : 0;

export interface ScenarioInput {
  startIndex: number;
  startingBalance: number;
  purchase: number;
  installments: number;
  incomeChange: number;
  expenseReduction: number;
}

/** Pure projection: never changes the supplied months or installments. */
export function projectScenario(months: CashflowMonth[], banks: Bank[], input: ScenarioInput) {
  const purchaseCents = Math.max(0, cents(safeNumber(input.purchase)));
  const count = Math.max(1, Math.min(36, Math.floor(safeNumber(input.installments))));
  const installmentCents = Math.floor(purchaseCents / count);
  const firstMonth = months[input.startIndex];
  const firstPeriod = firstMonth ? firstMonth.year * 12 + monthNumber(firstMonth.month) : 0;
  let baseline = cents(safeNumber(input.startingBalance));
  let simulated = baseline;
  return months.slice(input.startIndex).map((month) => {
    const offset = month.year * 12 + monthNumber(month.month) - firstPeriod;
    const income = cents(month.incomes.reduce((sum, item) => sum + item.amount, 0));
    const expenses = cents(month.expenses.reduce((sum, item) => sum + item.amount, 0));
    const cards = cents(cardSpendingForMonth(banks, monthNumber(month.month), month.year));
    const purchasePayment = offset >= count ? 0 : installmentCents + (offset === count - 1 ? purchaseCents % count : 0);
    const reduction = Math.min(expenses, Math.max(0, cents(safeNumber(input.expenseReduction))));
    const net = income - expenses - cards;
    const scenarioNet = net + cents(safeNumber(input.incomeChange)) + reduction - purchasePayment;
    baseline += net;
    simulated += scenarioNet;
    return {
      label: `${month.month.slice(0, 3)}/${String(month.year).slice(-2)}`,
      fullLabel: `${month.month} ${month.year}`,
      baseline: baseline / 100,
      simulated: simulated / 100,
      net: net / 100,
      scenarioNet: scenarioNet / 100,
      purchasePayment: purchasePayment / 100,
      purchaseInstallment: offset >= 0 && offset < count,
    };
  });
}

export interface PendingPayment {
  id: string;
  title: string;
  source: string;
  amount: number;
  dueDate: string | null;
  overdue: boolean;
  route: string;
}

/** Undated cashflow entries stay undated; payment status is never inferred from the date. */
export function pendingPayments(month: CashflowMonth, banks: Bank[], today = new Date()): PendingPayment[] {
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const entries: PendingPayment[] = month.expenses.flatMap((item, index) => item.paid ? [] : [{
    id: `expense-${index}`, title: item.label, source: "Fluxo de caixa", amount: item.amount,
    dueDate: null, overdue: false, route: "/fluxo",
  }]);
  for (const bank of banks) {
    if (bank.status === "cancelado") continue;
    for (const item of bank.installments) {
      if (item.status === "pago") continue;
      const due = new Date(`${item.dueDate}T00:00:00`);
      if (Number.isNaN(due.getTime()) || due.getMonth() + 1 !== monthNumber(month.month) || due.getFullYear() !== month.year) continue;
      entries.push({ id: `${bank.id}-${item.id}`, title: item.description, source: bank.name, amount: item.installmentAmount,
        dueDate: item.dueDate, overdue: item.status === "atrasado" || due.getTime() < startOfDay, route: "/carteira" });
    }
  }
  return entries.sort((a, b) => Number(b.overdue) - Number(a.overdue) || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
}

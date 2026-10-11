import type { Bank, CashflowItem, CashflowMonth } from "@/data/financialData";

export const PAYMENT_SESSION_STORAGE_KEY = "payment-session-income-map-v1";
export const PAYMENT_SESSIONS = [
  { id: "s30", label: "Recebimento dia 30", range: "Venc. 1 – 4", from: 1, to: 4, payDay: 30, note: "receita do mês anterior" },
  { id: "s5", label: "Recebimento dia 5", range: "Venc. 5 – 19", from: 5, to: 19, payDay: 5, note: null },
  { id: "s20", label: "Recebimento dia 20", range: "Venc. 20 – 29", from: 20, to: 29, payDay: 20, note: null },
  { id: "s30b", label: "Recebimento dia 30", range: "Venc. 30 – 31", from: 30, to: 31, payDay: 30, note: "fecha o mês" },
] as const;
export type PaymentSessionId = typeof PAYMENT_SESSIONS[number]["id"];
export type PaymentSessionMap = Record<string, PaymentSessionId>;
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export const incomeSessionKey = (month: CashflowMonth, index: number, label: string) => `${month.month}-${month.year}|${index}|${label}`;
export interface DailyCashflowEntry {
  id: string; label: string; amount: number; kind: "incomes" | "expenses"; paid: boolean;
  day: number | null; source: string; reference: string;
}
export interface DailyCashflowPoint { day: number; incomes: number; expenses: number; entries: DailyCashflowEntry[] }

// Match an explicit day reference, never an installment count or arbitrary number.
export function labelPaymentDay(label: string): number | null {
  // A business day needs a holiday calendar; do not treat it as a calendar day.
  if (/\bdia\s*[uú]til\b/i.test(label)) return null;
  const matches = [...label.matchAll(/\bdia\s*(\d{1,2})(?:º|°)?\b/gi), ...label.matchAll(/\b(\d{1,2})\s*[º°]?\s*dia\b/gi)];
  const days = [...new Set(matches.map(m => Number(m[1])))];
  return days.length === 1 && days[0] >= 1 && days[0] <= 31 ? days[0] : null;
}
function dateParts(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day ? { year, month, day } : null;
}
export function monthlyCashflowChart(month: CashflowMonth, banks: Bank[], sessionMap: PaymentSessionMap = {}, confirmedOnly = false) {
  const monthNum = MONTHS.indexOf(month.month) + 1;
  const days = new Date(Date.UTC(month.year, monthNum, 0)).getUTCDate();
  const entries: DailyCashflowEntry[] = [];
  const add = (entry: DailyCashflowEntry) => { if (Number.isFinite(entry.amount) && entry.amount > 0 && (!confirmedOnly || entry.paid)) entries.push(entry); };
  const flowDay = (item: CashflowItem, index: number, kind: DailyCashflowEntry["kind"]) => {
    if (item.date) {
      const date = dateParts(item.date);
      return date && date.year === month.year && date.month === monthNum
        ? { day: date.day, reference: "Data registrada" }
        : { day: null, reference: "Data inválida ou fora deste mês" };
    }
    const assigned = kind === "incomes" ? PAYMENT_SESSIONS.find(s => s.id === sessionMap[incomeSessionKey(month, index, item.label)]) : undefined;
    const day = assigned?.payDay ?? labelPaymentDay(item.label);
    return day === null ? { day: null, reference: "Sem dia definido" }
      : { day: Math.min(day, days), reference: `Referência dia ${day}${day > days ? ` (último dia do mês: ${days})` : ""}` };
  };
  for (const kind of ["incomes", "expenses"] as const) month[kind].forEach((item, index) => {
    add({ id: `flow:${kind}:${item.id ?? index}`, label: item.label, amount: item.amount, kind, paid: item.paid === true, source: "Fluxo", ...flowDay(item, index, kind) });
  });
  for (const bank of banks) {
    if (bank.status === "cancelado") continue;
    for (const item of bank.installments) {
      const date = dateParts(item.dueDate);
      if (date?.year === month.year && date.month === monthNum) add({ id: `card:${bank.id}:${item.id}`, label: item.description, amount: item.installmentAmount, kind: "expenses", paid: item.status === "pago", day: date.day, source: bank.name, reference: "Vencimento da parcela" });
    }
  }
  const points: DailyCashflowPoint[] = Array.from({ length: days }, (_, i) => ({ day: i + 1, incomes: 0, expenses: 0, entries: [] }));
  const sum = (list: DailyCashflowEntry[], kind: DailyCashflowEntry["kind"]) => list.filter(e => e.kind === kind).reduce((total, e) => total + Math.round(e.amount * 100), 0) / 100;
  entries.forEach(entry => { if (entry.day !== null) points[entry.day - 1].entries.push(entry); });
  points.forEach(point => { point.incomes = sum(point.entries, "incomes"); point.expenses = sum(point.entries, "expenses"); });
  const undated = entries.filter(e => e.day === null);
  return { points, entries, undated, totalIncome: sum(entries, "incomes"), totalExpense: sum(entries, "expenses"), undatedIncome: sum(undated, "incomes"), undatedExpense: sum(undated, "expenses") };
}

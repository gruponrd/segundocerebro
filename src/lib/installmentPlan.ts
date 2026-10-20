import type { Bank, Installment } from "@/data/financialData";

export type InstallmentDraft = Omit<Installment, "id">;
export interface PurchasePlan {
  description: string;
  amount: number;
  count: number;
  amountMode: "installment" | "total";
  firstDueDate: string;
  category: string;
  purchaseId: string;
}

export function monthlyDueDate(anchor: string, offset: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(anchor)) throw new Error("Informe um vencimento válido.");
  const [year, month, day] = anchor.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (year < 2000 || year > 2100 || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) throw new Error("Informe um vencimento válido entre 2000 e 2100.");
  const target = new Date(year, month - 1 + offset, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

export function buildPurchasePlan(input: PurchasePlan): InstallmentDraft[] {
  if (!input.description.trim()) throw new Error("Informe a descrição da compra.");
  if (!Number.isInteger(input.count) || input.count < 1 || input.count > 120) throw new Error("Informe entre 1 e 120 parcelas.");
  const cents = Math.round((input.amount + Number.EPSILON) * 100);
  const total = input.amountMode === "installment" ? cents * input.count : cents;
  if (!Number.isFinite(input.amount) || input.amount <= 0 || !Number.isSafeInteger(total) || total < input.count || total > 100_000_000_000) throw new Error("Informe um valor positivo válido, com ao menos um centavo por parcela.");
  const base = Math.floor(total / input.count);
  return Array.from({ length: input.count }, (_, index) => ({
    description: input.description.trim(), purchaseId: input.purchaseId,
    totalAmount: total / 100, installmentAmount: (base + (index === input.count - 1 ? total % input.count : 0)) / 100,
    currentInstallment: index + 1, totalInstallments: input.count,
    dueDate: monthlyDueDate(input.firstDueDate, index), status: "pendente", category: input.category,
  }));
}

export function buildRemainingPlan(source: Installment, purchaseId: string, existing: Installment[] = []): InstallmentDraft[] {
  if (!Number.isInteger(source.currentInstallment) || source.currentInstallment < 1 || !Number.isInteger(source.totalInstallments) || source.totalInstallments <= source.currentInstallment || source.totalInstallments > 120 || !Number.isFinite(source.installmentAmount) || source.installmentAmount <= 0) throw new Error("Esta parcela não tem uma sequência restante válida. Confira a numeração e o valor.");
  const anchor = source.purchaseId ? existing.filter(item => item.purchaseId === source.purchaseId && item.currentInstallment <= source.currentInstallment).sort((a, b) => a.currentInstallment - b.currentInstallment)[0] ?? source : source;
  const cents = Math.round(source.installmentAmount * 100);
  const totalCents = Math.round(source.totalAmount * 100);
  const adjustment = totalCents - cents * source.totalInstallments;
  return Array.from({ length: source.totalInstallments - source.currentInstallment }, (_, index) => ({
    description: source.description, totalAmount: source.totalAmount,
    installmentAmount: (cents + (source.currentInstallment + index + 1 === source.totalInstallments && Math.abs(adjustment) < source.totalInstallments ? adjustment : 0)) / 100,
    currentInstallment: source.currentInstallment + index + 1, totalInstallments: source.totalInstallments,
    dueDate: monthlyDueDate(anchor.dueDate, source.currentInstallment - anchor.currentInstallment + index + 1), status: "pendente", category: source.category,
    purchaseId: source.purchaseId ?? purchaseId,
  }));
}

const normalized = (value: string) => value.trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
export function isMatchingInstallment(a: InstallmentDraft, b: InstallmentDraft): boolean {
  if (a.purchaseId && b.purchaseId && a.purchaseId === b.purchaseId) return a.currentInstallment === b.currentInstallment;
  return normalized(a.description) === normalized(b.description) && a.currentInstallment === b.currentInstallment && a.totalInstallments === b.totalInstallments &&
    Math.round(a.totalAmount * 100) === Math.round(b.totalAmount * 100) && a.dueDate.slice(0, 7) === b.dueDate.slice(0, 7);
}

export function partitionInstallments<T extends InstallmentDraft>(existing: Installment[], candidates: T[]) {
  const missing: T[] = [];
  const duplicates: T[] = [];
  for (const candidate of candidates) {
    if ([...existing, ...missing].some(item => isMatchingInstallment(item, candidate))) duplicates.push(candidate);
    else missing.push(candidate);
  }
  return { missing, duplicates };
}

/** One update, against the latest bank state. Never overwrites or removes saved records. */
export function appendInstallmentBatch(banks: Bank[], bankId: string, candidates: Installment[], source?: Installment): Bank[] {
  return banks.map(bank => {
    if (bank.id !== bankId || bank.status === "cancelado") return bank;
    if (source && !bank.installments.some(item => item.id === source.id && JSON.stringify(item) === JSON.stringify(source))) return bank;
    const { missing } = partitionInstallments(bank.installments, candidates);
    if (!missing.length) return bank;
    return { ...bank, installments: [...bank.installments, ...missing] };
  });
}

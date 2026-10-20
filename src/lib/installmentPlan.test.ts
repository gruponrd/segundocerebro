import { describe, expect, it } from "vitest";
import type { Bank, Installment } from "@/data/financialData";
import { appendInstallmentBatch, buildPurchasePlan, buildRemainingPlan, monthlyDueDate, partitionInstallments, type PurchasePlan } from "./installmentPlan";

const input: PurchasePlan = { description: "Compra", amount: 500, count: 5, amountMode: "installment", firstDueDate: "2026-01-31", category: "outros", purchaseId: "purchase" };
const saved = (plan = buildPurchasePlan(input)): Installment[] => plan.map((item, i) => ({ ...item, id: `id-${i}` }));
const bank = (installments: Installment[]): Bank => ({ id: "card", name: "Meu cartão", color: "", glowClass: "", limitTotal: 5000, limitUsed: 0, debtFinal: 0, status: "pendente", installments });

describe("compras parceladas", () => {
  it("gera 5x500 e mantém o dia original após fevereiro sem mudar de mês", () => {
    const rows = buildPurchasePlan(input);
    expect(rows.map(item => item.dueDate)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31"]);
    expect(rows.map(item => item.currentInstallment)).toEqual([1, 2, 3, 4, 5]);
    expect(rows.every(item => item.installmentAmount === 500 && item.totalAmount === 2500)).toBe(true);
    expect(monthlyDueDate("2027-12-31", 2)).toBe("2028-02-29");
  });
  it("distribui os centavos na última parcela mantendo exatamente o total", () => {
    const rows = buildPurchasePlan({ ...input, amount: 100, count: 3, amountMode: "total" });
    expect(rows.map(item => item.installmentAmount)).toEqual([33.33, 33.33, 33.34]);
    expect(rows.reduce((sum, item) => sum + Math.round(item.installmentAmount * 100), 0)).toBe(10000);
    const [source] = saved(rows);
    expect(buildRemainingPlan(source, "rest").map(item => item.installmentAmount)).toEqual([33.33, 33.34]);
  });
  it("rejeita valores inválidos, datas impossíveis e quantidades fracionadas", () => {
    for (const amount of [-1, 0, NaN, Infinity, 1e15]) expect(() => buildPurchasePlan({ ...input, amount })).toThrow();
    for (const count of [0, 121, 2.5, NaN]) expect(() => buildPurchasePlan({ ...input, count })).toThrow();
    for (const firstDueDate of ["2026-02-31", "2026-13-01", "invalid", "0001-01-01"]) expect(() => buildPurchasePlan({ ...input, firstDueDate })).toThrow();
  });
  it("gera somente as restantes, conserva pagamentos e usa o dia original da compra vinculada", () => {
    const all = saved();
    const source = { ...all[1], status: "pago" as const };
    const existing = [all[0], source, all[3]];
    const before = JSON.stringify(existing);
    const remaining = buildRemainingPlan(source, "unused", existing);
    expect(remaining.map(item => item.dueDate)).toEqual(["2026-03-31", "2026-04-30", "2026-05-31"]);
    const { missing, duplicates } = partitionInstallments(existing, remaining);
    expect(missing.map(item => item.currentInstallment)).toEqual([3, 5]);
    expect(duplicates).toHaveLength(1);
    expect(JSON.stringify(existing)).toBe(before);
  });
  it("identifica duplicatas antigas mesmo sem vínculo de compra, incluindo parcelas pagas", () => {
    const existing = saved().slice(0, 2).map(item => ({ ...item, purchaseId: undefined, status: "pago" as const }));
    expect(partitionInstallments(existing, buildPurchasePlan({ ...input, purchaseId: "another" })).missing).toHaveLength(3);
  });
  it("confere o estado mais recente, é idempotente e preserva os demais cartões e registros", () => {
    const original = { ...saved()[0], status: "pago" as const, category: "custom" };
    const other = { ...bank([]), id: "other" };
    const banks = [bank([original]), other];
    const before = JSON.stringify(banks);
    const candidates = saved(buildRemainingPlan(original, "rest"));
    const result = appendInstallmentBatch(banks, "card", candidates, original);
    expect(result[0].installments).toHaveLength(5);
    expect(result[0].installments[0]).toBe(original);
    expect(result[1]).toBe(other);
    expect(appendInstallmentBatch(result, "card", candidates, original)[0].installments).toHaveLength(5);
    expect(JSON.stringify(banks)).toBe(before);
    expect(appendInstallmentBatch([{ ...banks[0], status: "cancelado" }, other], "card", candidates, original)[0].installments).toHaveLength(1);
    expect(appendInstallmentBatch([bank([{ ...original, description: "Changed" }])], "card", candidates, original)[0].installments).toHaveLength(1);
  });
});

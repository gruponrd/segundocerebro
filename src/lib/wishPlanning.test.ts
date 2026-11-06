import { expect, it } from "vitest";
import type { CashflowMonth } from "@/data/financialData";
import { evaluateWishes, wishMonthIndex, type PlannedWish } from "./wishPlanning";
const months: CashflowMonth[] = ["Outubro", "Novembro", "Dezembro"].map(month => ({ month, year: 2026, incomes: [], expenses: [] }));
const wish = (id: string, period: number, amount: number): PlannedWish => ({ id, label: id, amount, period, monthIdx: 0, priority: "media", createdAt: 1 });
it("identifica o mês pela data após inserir meses anteriores", () => {
  const december = wish("d", 2026 * 12 + 11, 100);
  expect(wishMonthIndex(december, months)).toBe(2);
  expect(wishMonthIndex(december, months.slice(1))).toBe(1);
});
it("considera desejos de meses anteriores na sobra dos seguintes", () => {
  const first = wish("a", 2026 * 12 + 9, 400);
  const second = wish("b", 2026 * 12 + 10, 800);
  const result = evaluateWishes([second, first], months, [1000, 1100, 1200], 100);
  expect(result.a.leftover).toBe(600);
  expect(result.b).toMatchObject({ leftover: -100, verdict: "inviavel" });
});

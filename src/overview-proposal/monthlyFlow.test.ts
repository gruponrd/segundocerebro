import { expect, it } from "vitest";
import type { Bank, CashflowMonth } from "@/data/financialData";
import { compactFlow, monthlyFlow } from "./monthlyFlow";
const bank: Bank = { id: "card", name: "Cartão", color: "", glowClass: "", status: "pendente", limitTotal: 2000, limitUsed: 0, debtFinal: 0, installments: [
  { id: "paid", description: "Já pago", dueDate: "2026-10-20", installmentAmount: 100, totalAmount: 100, currentInstallment: 1, totalInstallments: 1, status: "pago" },
  { id: "pending", description: "Pendente", dueDate: "2026-10-22", installmentAmount: 50.25, totalAmount: 50.25, currentInstallment: 1, totalInstallments: 1, status: "pendente" },
  { id: "future", description: "Futuro", dueDate: "2026-11-20", installmentAmount: 50, totalAmount: 50, currentInstallment: 1, totalInstallments: 1, status: "pendente" },
] };
const month: CashflowMonth = { month: "Outubro", year: 2026, incomes: [{ label: "Salário", amount: 1000.01, paid: true }, { label: "Extra", amount: 100 }], expenses: [{ label: "Mercado", amount: 50.15, category: "alimentacao", paid: true }, { label: "Supermercado", amount: 20.1, category: "alimentacao" }] };
const sum = (items: { value: number }[]) => items.reduce((value, item) => value + Math.round(item.value * 100), 0);
it("concilia os caminhos com o mês, inclui cartões pagos uma vez e não altera registros", () => {
  const before = structuredClone({ month, bank });
  const result = monthlyFlow(month, [bank, { ...bank, id: "cancelled", status: "cancelado" }]);
  expect(result.income).toBe(1100.01);
  expect(result.cost).toBe(220.5);
  expect(result.balance).toBe(879.51);
  expect(result.destinations.find(item => item.id === "cards")?.value).toBe(150.25);
  expect(result.destinations.find(item => item.label === "Alimentação")?.value).toBe(70.25);
  expect(sum(result.sources)).toBe(sum(result.destinations));
  expect({ month, bank }).toEqual(before);
});
it("representa déficit como diferença a cobrir e nunca como renda ou sobra", () => {
  const result = monthlyFlow({ ...month, incomes: [{ label: "Renda", amount: 100 }], expenses: [{ label: "Despesa", amount: 500 }] }, []);
  expect(result.income).toBe(100);
  expect(result.balance).toBe(-400);
  expect(result.sources.find(item => item.kind === "gap")?.value).toBe(400);
  expect(result.destinations.some(item => item.kind === "surplus")).toBe(false);
  expect(sum(result.sources)).toBe(sum(result.destinations));
});
it("agrupa só a apresentação, mantém todos os centavos e preserva a sobra", () => {
  const result = monthlyFlow({ ...month, incomes: Array.from({ length: 8 }, (_, index) => ({ label: `Fonte ${index}`, amount: 100.01 })) }, []);
  const compact = compactFlow(result.sources, 4);
  expect(compact).toHaveLength(4);
  expect(sum(compact)).toBe(sum(result.sources));
  const destinations = compactFlow(result.destinations, 2);
  expect(destinations.some(item => item.kind === "surplus")).toBe(true);
  expect(sum(destinations)).toBe(sum(result.destinations));
});
it("mantém mês vazio sem inventar fluxo e identifica valores incompatíveis", () => {
  expect(monthlyFlow({ ...month, incomes: [], expenses: [] }, []).basis).toBe(0);
  expect(monthlyFlow({ ...month, incomes: [{ label: "Inválida", amount: -10 }] }, []).invalid).toBe(true);
});

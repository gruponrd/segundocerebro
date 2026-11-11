import { describe, expect, it } from "vitest";
import { careerPeriodLabel, careerProjection, DEFAULT_CAREER_PLAN, normalizeCareerPlan } from "./careerTransition";
import type { Bank } from "@/data/financialData";
const start = 2026 * 12 + 11;
const plan = { ...DEFAULT_CAREER_PLAN, savings: 12000, currentIncome: 5000, monthlyExpenses: 2000, newIncome: 2000, reserveMonths: 6 };
const bank: Bank = { id: "b", name: "Banco", color: "", glowClass: "", limitTotal: 0, limitUsed: 0, debtFinal: 0, status: "pendente", installments: [{ id: "p", description: "Parcela", totalAmount: 1000, installmentAmount: 1000, currentInstallment: 1, totalInstallments: 1, dueDate: "2027-02-01", status: "pendente" }] };
describe("projeção de mudança de trabalho", () => {
  it("inicia no próximo mês, desconta parcelas e preserva uma reserva mínima", () => {
    const before = structuredClone(bank);
    const result = careerProjection(plan, [bank], false, start);
    expect(result.first).toMatchObject({ period: start + 2, starting: 15000, lowest: 14000 });
    expect(result.first?.timeline).toHaveLength(12);
    expect(result.first?.timeline[0]).toEqual({ period: start + 2, income: 2000, severance: 0, expenses: 2000, installments: 1000, balance: 14000 });
    expect(result.first?.timeline.at(-1)?.balance).toBe(result.first?.ending);
    expect(result.reserveTarget).toBe(12000);
    expect(careerPeriodLabel(start + 1)).toBe("janeiro de 2027");
    expect(bank).toEqual(before);
  });
  it("não promete data quando despesas futuras consomem a reserva", () => {
    expect(careerProjection({ ...plan, savings: 12000, currentIncome: 2000, newIncome: 0 }, [], false, start).first).toBeNull();
  });
  it("não inclui seguro no cenário principal e não soma outra renda durante o benefício", () => {
    const p = { ...plan, currentIncome: 2000, savings: 12000, newIncome: 1000, insuranceAmount: 2000, insuranceInstallments: 3, insuranceDelay: 0, reserveMonths: 1 };
    const base = careerProjection(p, [], false, start);
    const benefit = careerProjection(p, [], true, start);
    expect(base.first).toBeNull();
    expect(benefit.first?.lowest).toBe(3000);
  });
  it("trata parcelas anteriores como obrigação e recusa datas desconhecidas", () => {
    const late = { ...bank, installments: [{ ...bank.installments[0], dueDate: "2026-12-04" }] };
    expect(careerProjection(plan, [late], false, start)).toMatchObject({ overdue: 1000, first: { period: start + 2, starting: 14000 } });
    const unknown = { ...bank, installments: [{ ...bank.installments[0], dueDate: "sem data" }] };
    expect(careerProjection(plan, [unknown], false, start)).toMatchObject({ unknown: 1, first: null });
  });
  it("acrescenta a rescisão apenas no mês da saída, também na comparação com seguro", () => {
    const p = { ...plan, savings: 10000, severance: 3000, insuranceAmount: 2000, insuranceInstallments: 1 };
    for (const withInsurance of [false, true]) {
      const result = careerProjection(p, [], withInsurance, start);
      expect(result.first?.period).toBe(start + 1);
      expect(result.first?.starting).toBe(13000);
      expect(result.first?.timeline[0].severance).toBe(3000);
      expect(result.first?.timeline.slice(1).every(month => month.severance === 0)).toBe(true);
    }
    const { severance: _unused, ...oldPlan } = p;
    expect(normalizeCareerPlan(oldPlan)).toMatchObject({ savings: 10000, severance: 0 });
  });
});

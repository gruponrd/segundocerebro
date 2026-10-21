import { expect, it } from "vitest";
import { incomeTotals, updateIncomeSourceValues } from "./incomeSources";

it("mantém valores e identificadores legados como líquidos, sem desconto presumido", () => {
  const legacy = { id: "existing", label: "Salário", amount: 5000.25 };
  expect(incomeTotals([legacy])).toEqual({ gross: 5000.25, deductions: 0, net: 5000.25 });
  expect(updateIncomeSourceValues(legacy, { label: "Meu salário" })).toEqual({ ...legacy, label: "Meu salário" });
});
it("calcula por centavos e soma fontes líquidas sem duplicar bruto e descontos", () => {
  const source = updateIncomeSourceValues({ id: "a", label: "A", amount: 5000 }, { grossAmount: 6000.25, deductions: [{ id: "d", label: "INSS", amount: 500.1 }, { id: "e", label: "IRRF", amount: 100.2 }] });
  expect(source.amount).toBe(5399.95);
  expect(incomeTotals([source, { id: "b", label: "Extra", amount: 100.05 }])).toEqual({ gross: 6100.3, deductions: 600.3, net: 5500 });
  expect(updateIncomeSourceValues(source, { deductions: [] }).amount).toBe(6000.25);
});
it("recusa descontos maiores que o bruto, sem nome, negativos ou não finitos", () => {
  const source = { id: "a", label: "A", amount: 5000 };
  for (const deduction of [{ label: "INSS", amount: 6000 }, { label: "", amount: 1 }, { label: "INSS", amount: -1 }, { label: "INSS", amount: NaN }]) {
    expect(() => updateIncomeSourceValues(source, { grossAmount: 5000, deductions: [{ id: "d", ...deduction }] })).toThrow();
  }
  expect(source.amount).toBe(5000);
});

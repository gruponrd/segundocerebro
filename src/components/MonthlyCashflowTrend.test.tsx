import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import type { CashflowMonth } from "@/data/financialData";
import { money } from "@/lib/planningTools";
import { MonthlyCashflowTrend } from "./MonthlyCashflowTrend";

afterEach(cleanup);

it("consulta outro mês e mantém os filtros da Evolução mensal", () => {
  const months: CashflowMonth[] = [
    { month: "Novembro", year: 2026, incomes: [{ label: "Salário", amount: 1200, paid: false }], expenses: [] },
    { month: "Dezembro", year: 2026, incomes: [{ label: "Salário", amount: 1800, paid: true }], expenses: [] },
  ];

  function OverviewTrend() {
    const [selected, setSelected] = useState(0);
    return <MonthlyCashflowTrend months={months} banks={[]} selected={selected} onSelect={setSelected} />;
  }

  render(<OverviewTrend />);
  const trend = within(screen.getByRole("region", { name: "Evolução mensal" }));
  const december = trend.getByRole("button", { name: /^Dezembro 2026/ });
  expect(december).toHaveAttribute("aria-pressed", "false");
  fireEvent.click(december);
  expect(december).toHaveAttribute("aria-pressed", "true");
  expect(trend.getByText("Recebido").nextElementSibling?.textContent).toBe(money(1800));

  const revenues = trend.getByRole("button", { name: "Receitas" });
  fireEvent.click(revenues);
  expect(revenues).toHaveAttribute("aria-pressed", "true");
  expect(trend.getByRole("button", { name: "Comparar" })).toHaveAttribute("aria-pressed", "false");
});

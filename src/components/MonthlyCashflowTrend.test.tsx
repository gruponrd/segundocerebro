import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import type { CashflowMonth } from "@/data/financialData";
import { money } from "@/lib/planningTools";
import { MonthlyCashflowTrend } from "./MonthlyCashflowTrend";

afterEach(cleanup);

it("mantém sete meses e compara o recebido com todas as saídas do período selecionado", () => {
  const months: CashflowMonth[] = [
    { month: "Novembro", year: 2026, incomes: [{ label: "Salário", amount: 1200, paid: false }], expenses: [] },
    { month: "Dezembro", year: 2026, incomes: [{ label: "Salário", amount: 1800, paid: true }], expenses: [
      { label: "Luz", amount: 90, paid: true },
      { label: "Aluguel", amount: 600, paid: false },
    ] },
  ];

  function OverviewTrend() {
    const [selected, setSelected] = useState(0);
    return <MonthlyCashflowTrend months={months} banks={[]} selected={selected} onSelect={setSelected} />;
  }

  render(<OverviewTrend />);
  const trend = within(screen.getByRole("region", { name: "Evolução mensal" }));
  const calendar = within(trend.getByRole("group", { name: "Consultar valores por mês" }));
  const periods = () => calendar.getAllByRole("button").map(button => button.getAttribute("aria-label")?.split(":", 1)[0]);
  expect(trend.getByText("Recebido").nextElementSibling?.textContent).toBe(money(0));
  expect(periods()).toEqual([
    "Agosto 2026", "Setembro 2026", "Outubro 2026", "Novembro 2026", "Dezembro 2026", "Janeiro 2027", "Fevereiro 2027",
  ]);
  expect(calendar.getByRole("button", { name: "Janeiro 2027: sem lançamentos" })).toBeDisabled();
  const december = trend.getByRole("button", { name: /^Dezembro 2026/ });
  expect(december).toHaveAttribute("aria-pressed", "false");
  expect(december).toHaveAttribute("aria-label", `Dezembro 2026: Recebido: ${money(1800)}, Saídas do mês: ${money(690)}`);
  fireEvent.click(december);
  expect(december).toHaveAttribute("aria-pressed", "true");
  expect(periods()).toEqual([
    "Setembro 2026", "Outubro 2026", "Novembro 2026", "Dezembro 2026", "Janeiro 2027", "Fevereiro 2027", "Março 2027",
  ]);
  expect(trend.getByText("Recebido").nextElementSibling?.textContent).toBe(money(1800));
  expect(trend.getByText("Saídas do mês").nextElementSibling?.textContent).toBe(money(690));
  expect(trend.queryByRole("group", { name: "Filtrar gráfico" })).not.toBeInTheDocument();
});

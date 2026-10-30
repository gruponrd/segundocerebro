import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import type { Bank, CashflowMonth } from "@/data/financialData";
vi.mock("./ProposalHealthScore", () => ({ ProposalHealthScore: () => <div>Score atual</div> }));
vi.mock("./AnimatedAmount", () => ({ AnimatedAmount: ({ value }: { value: number }) => <span>{value}</span> }));
import { OverviewDebtCard } from "./OverviewDebtCard";

afterEach(() => { cleanup(); vi.useRealTimers(); });
it("atualiza o saldo e os subtotais ao trocar o mês e ao confirmar um pagamento", () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-30T12:00:00Z"));
  const banks: Bank[] = [{ id: "b", name: "Cartão", color: "", glowClass: "", limitTotal: 10000, limitUsed: 1500, debtFinal: 1500, status: "pendente", installments: ["2026-10-10", "2026-11-10", "2026-12-10"].map(dueDate => ({ id: dueDate, description: "Compra", totalAmount: 1500, installmentAmount: 500, currentInstallment: 1, totalInstallments: 3, dueDate, status: "pendente" })) }];
  const month = (name: string): CashflowMonth => ({ month: name, year: 2026, incomes: [], expenses: [] });
  const ui = (name: string) => <MemoryRouter><OverviewDebtCard banks={banks} creditors={[]} month={month(name)} /></MemoryRouter>;
  const view = render(ui("Outubro"));
  const card = screen.getByRole("region", { name: "Dívida restante prevista" });
  expect(card.querySelector(":scope > span")).toHaveTextContent("1000");
  view.rerender(ui("Novembro"));
  expect(card.querySelector(":scope > span")).toHaveTextContent("500");
  expect(within(card).getByText(/Novembro\/2026, incluindo este mês/)).toBeInTheDocument();
  banks[0].installments[0].status = "pago";
  view.rerender(ui("Novembro"));
  expect(card.querySelector(":scope > span")).toHaveTextContent("500");
  view.rerender(ui("Dezembro"));
  expect(card.querySelector(":scope > span")).toHaveTextContent("0");
  expect(within(card).getByRole("link", { name: /Ver detalhes/ })).toHaveAttribute("href", "/divida");
});

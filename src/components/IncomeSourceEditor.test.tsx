import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { IncomeSourceEditor } from "./IncomeSourceEditor";
afterEach(cleanup);

it("só altera o líquido após salvar a composição e permite cancelar", () => {
  const update = vi.fn();
  render(<IncomeSourceEditor source={{ id: "salary", label: "Salário", amount: 5000 }} onRemove={vi.fn()} onUpdate={update} />);
  fireEvent.click(screen.getByRole("button", { name: "Bruto e descontos" }));
  fireEvent.change(screen.getByLabelText("Valor bruto mensal"), { target: { value: "6000" } });
  fireEvent.click(screen.getByRole("button", { name: "Adicionar desconto" }));
  fireEvent.change(screen.getByLabelText("Desconto 1"), { target: { value: "INSS" } });
  fireEvent.change(screen.getByLabelText("Valor do desconto 1"), { target: { value: "600" } });
  expect(update).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(update).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Bruto e descontos" }));
  expect(screen.getByLabelText("Valor bruto mensal")).toHaveValue(5000);
  fireEvent.change(screen.getByLabelText("Valor bruto mensal"), { target: { value: "6000" } });
  fireEvent.click(screen.getByRole("button", { name: "Adicionar desconto" }));
  fireEvent.change(screen.getByLabelText("Desconto 1"), { target: { value: "INSS" } });
  fireEvent.change(screen.getByLabelText("Valor do desconto 1"), { target: { value: "600" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar composição" }));
  expect(update).toHaveBeenCalledWith({ grossAmount: 6000, amount: 5400, deductions: [{ id: expect.any(String), label: "INSS", amount: 600 }] });
});
it("não salva uma composição cujo líquido seria negativo", () => {
  const update = vi.fn();
  render(<IncomeSourceEditor source={{ id: "salary", label: "Salário", amount: 100 }} onRemove={vi.fn()} onUpdate={update} />);
  fireEvent.click(screen.getByRole("button", { name: "Bruto e descontos" }));
  fireEvent.click(screen.getByRole("button", { name: "Adicionar desconto" }));
  fireEvent.change(screen.getByLabelText("Desconto 1"), { target: { value: "INSS" } });
  fireEvent.change(screen.getByLabelText("Valor do desconto 1"), { target: { value: "101" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar composição" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Os descontos não podem superar o valor bruto");
  expect(update).not.toHaveBeenCalled();
});

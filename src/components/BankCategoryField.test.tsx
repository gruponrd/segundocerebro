import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BankCategoryField } from "./BankCategoryField";
import { bankCategoryLabel } from "@/lib/bankCategory";

afterEach(cleanup);
it("trata registros antigos como cartão e permite reclassificar e voltar", () => {
  const change = vi.fn();
  const view = render(<BankCategoryField onChange={change} />);
  expect(screen.getByRole("combobox", { name: "Categoria da carteira" })).toHaveValue("cartao");
  expect(bankCategoryLabel()).toBe("Cartão de crédito");
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "emprestimo_credito" } });
  expect(change).toHaveBeenLastCalledWith("emprestimo_credito");
  view.rerender(<BankCategoryField value="emprestimo_credito" onChange={change} />);
  expect(screen.getByRole("combobox")).toHaveValue("emprestimo_credito");
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "cartao" } });
  expect(change).toHaveBeenLastCalledWith("cartao");
});

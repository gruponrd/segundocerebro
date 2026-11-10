import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { expect, it } from "vitest";
import { CashflowDateInput } from "./CashflowDateInput";

it("permite digitar apenas dia e mês e indica o ano selecionado", () => {
  function Example() {
    const [value, setValue] = useState("");
    return <CashflowDateInput value={value} onChange={setValue} month={{ month: "Janeiro", year: 2027, incomes: [], expenses: [] }} />;
  }
  render(<Example />);
  const input = screen.getByLabelText("Dia e mês do recebimento");
  fireEvent.change(input, { target: { value: "0501" } });
  expect(input).toHaveValue("05/01");
  expect(input).toHaveAttribute("aria-invalid", "false");
  expect(screen.getByText(/Ano automático: 2027/)).toBeInTheDocument();
  fireEvent.change(input, { target: { value: "3102" } });
  expect(input).toHaveAttribute("aria-invalid", "true");
});

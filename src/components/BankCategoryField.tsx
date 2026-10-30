import { useId } from "react";
import type { BankCategory } from "@/data/financialData";

export function BankCategoryField({ value = "cartao", onChange }: { value?: BankCategory; onChange: (category: BankCategory) => void }) {
  const id = useId();
  return <div className="space-y-1">
    <label htmlFor={id} className="block text-xs text-muted-foreground">Categoria da carteira</label>
    <select id={id} value={value} onChange={event => { if (event.target.value === "cartao" || event.target.value === "emprestimo_credito") onChange(event.target.value); }} className="h-10 w-full rounded-md border border-input bg-secondary px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <option value="cartao">Cartão de crédito</option><option value="emprestimo_credito">Empréstimo/Crédito</option>
    </select>
  </div>;
}

import type { BankCategory } from "@/data/financialData";

export function bankCategoryLabel(category?: BankCategory) {
  return category === "emprestimo_credito" ? "Empréstimo/Crédito" : "Cartão de crédito";
}

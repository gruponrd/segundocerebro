export interface IncomeDeduction { id: string; label: string; amount: number }
export interface IncomeSource {
  id: string;
  label: string;
  /** Net monthly income. Legacy records already store the available amount here. */
  amount: number;
  grossAmount?: number;
  deductions?: IncomeDeduction[];
}

const cents = (value: number) => Math.round(value * 100);
export function incomeBreakdown(source: IncomeSource) {
  const deductions = (source.deductions ?? []).reduce((total, item) => total + cents(item.amount), 0);
  const gross = cents(source.grossAmount ?? source.amount);
  return { gross: gross / 100, deductions: deductions / 100, net: source.grossAmount === undefined ? source.amount : Math.max(0, gross - deductions) / 100 };
}

export function incomeTotals(sources: IncomeSource[]) {
  const total = sources.reduce((sum, source) => {
    const item = incomeBreakdown(source);
    return { gross: sum.gross + cents(item.gross), deductions: sum.deductions + cents(item.deductions), net: sum.net + cents(item.net) };
  }, { gross: 0, deductions: 0, net: 0 });
  return { gross: total.gross / 100, deductions: total.deductions / 100, net: total.net / 100 };
}

/** Validate and save the net in amount for compatibility with existing clients/exports. */
export function updateIncomeSourceValues(source: IncomeSource, updates: Partial<Pick<IncomeSource, "label" | "amount" | "grossAmount" | "deductions">>): IncomeSource {
  const next = { ...source, ...updates };
  const validMoney = (value: number) => Number.isFinite(value) && value >= 0 && Number.isSafeInteger(cents(value));
  if (!validMoney(next.amount) || (next.grossAmount !== undefined && !validMoney(next.grossAmount))) throw new Error("Informe um valor válido e não negativo.");
  if (next.deductions?.some(item => !item.label.trim() || !validMoney(item.amount))) throw new Error("Dê um nome e um valor válido a cada desconto.");
  if (next.grossAmount !== undefined) {
    const breakdown = incomeBreakdown(next);
    if (breakdown.deductions > breakdown.gross) throw new Error("Os descontos não podem superar o valor bruto.");
    next.amount = breakdown.net;
  }
  return next;
}

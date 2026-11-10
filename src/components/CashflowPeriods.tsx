import { useState } from "react";
import type { Bank, CashflowMonth } from "@/data/financialData";
import { cashflowPeriods } from "@/lib/cashflowPeriods";

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export function CashflowPeriods({ month, banks }: { month: CashflowMonth; banks: Bank[] }) {
  const [mode, setMode] = useState<"weekly" | "fortnightly">("weekly");
  const { ranges, missingIncome, missingExpense } = cashflowPeriods(month, banks, mode);
  const max = Math.max(1, ...ranges.flatMap(row => [row.incomes, row.expenses]));
  return <section className="rounded-xl border border-border/60 bg-secondary/30 p-4 space-y-4" aria-labelledby="cashflow-period-title">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 id="cashflow-period-title" className="font-semibold text-sm">Entradas e pagamentos por período</h4><p className="mt-1 text-xs text-muted-foreground">Valores previstos e confirmados nas datas cadastradas.</p></div>
      <div role="group" aria-label="Período de comparação" className="inline-flex rounded-lg bg-background/60 p-1 gap-1">{([ ["weekly", "Semanal"], ["fortnightly", "Quinzenal"] ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={`rounded-md px-3 py-2 text-xs font-medium ${mode === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>)}</div></div>
    <div className="space-y-3">{ranges.map(row => <div key={row.from} className="space-y-1.5"><div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs"><strong>Dias {row.from}–{row.to}</strong><span><span className="text-income">{money(row.incomes)} entradas</span><span className="text-muted-foreground"> · </span><span className="text-expense">{money(row.expenses)} saídas</span></span></div><div aria-hidden="true" className="space-y-1"><div className="h-1.5 rounded-full bg-border/50"><div className="h-full rounded-full bg-income" style={{width:`${row.incomes / max * 100}%`}} /></div><div className="h-1.5 rounded-full bg-border/50"><div className="h-full rounded-full bg-expense" style={{width:`${row.expenses / max * 100}%`}} /></div></div><p className="text-xs text-muted-foreground">Diferença do período: <span className="text-foreground tabular-nums">{money(row.incomes - row.expenses)}</span></p></div>)}</div>
    <p className="text-xs leading-relaxed text-muted-foreground">Sem data cadastrada neste mês: {money(missingIncome)} em entradas e {money(missingExpense)} em saídas. Esses valores não entram nos períodos. A diferença não considera saldo anterior.</p>
  </section>;
}

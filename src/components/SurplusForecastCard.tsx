import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { useFinanceStore } from "@/stores/financeStore";
import { buildBalanceProjection } from "@/lib/dashboardPresentation";
import { money, monthNumber } from "@/lib/planningTools";

export function SurplusForecastCard() {
  const store = useFinanceStore();
  const [horizon, setHorizon] = useState(6);
  const selected = store.currentCashflow;
  const startPeriod = selected.year * 12 + monthNumber(selected.month) - 1;
  const label = (offset: number) => new Date(Math.floor((startPeriod + offset) / 12), (startPeriod + offset) % 12, 1)
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const rows = useMemo(() => buildBalanceProjection(store.cashflowMonths, store.banks, store.selectedMonth, horizon),
    [store.cashflowMonths, store.banks, store.selectedMonth, horizon]);
  const last = rows[rows.length - 1];
  const total = last?.forecast ?? last?.planned ?? 0;
  const estimated = rows.filter(row => row.source === "Média estimada").length;

  return <section className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5 mb-6" aria-labelledby="surplus-forecast-title">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 id="surplus-forecast-title" className="flex items-center gap-2 text-sm font-medium"><TrendingUp aria-hidden className="h-4 w-4 text-primary" />Sobra prevista até…</h2>
        <div aria-live="polite" aria-atomic="true" className="mt-3">
          {last ? <><p className={`text-money text-2xl sm:text-3xl ${total < 0 ? "text-expense" : "text-income"}`}>{money(total)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{total < 0 ? "Déficit acumulado" : "Sobra acumulada"} até {label(horizon)}</p><p className="mt-1 text-xs text-muted-foreground">Contabilizado desde {rows[0].label}, partindo de zero.</p></>
            : <p className="text-sm text-muted-foreground">Adicione lançamentos até o mês selecionado para calcular.</p>}
        </div>
      </div>
      <div className="w-full sm:w-56 shrink-0">
        <label htmlFor="surplus-end-month" className="block text-xs text-muted-foreground mb-1.5">Mês final da projeção</label>
        <select id="surplus-end-month" value={horizon} onChange={event => setHorizon(Number(event.target.value))}
          className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {Array.from({ length: 37 }, (_, offset) => <option key={offset} value={offset}>{label(offset)}</option>)}
        </select>
      </div>
    </div>
    <p className="mt-4 text-xs text-muted-foreground leading-5">{last ? `${estimated} ${estimated === 1 ? "mês estimado" : "meses estimados"} no cálculo. ` : ""}Projeção de fluxo; não representa saldo bancário nem dinheiro guardado.</p>
    {last && <details className="mt-2 text-xs text-muted-foreground">
      <summary className="min-h-11 py-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">Como é calculado e valores por mês</summary>
      <p className="leading-5">Parte de zero em {rows[0].label} e soma receitas menos despesas e parcelas, incluindo pagamentos feitos e pendentes. Após {label(0)}, usa os lançamentos cadastrados; meses sem registros repetem a média dos últimos três meses com registros até o mês selecionado. Meses que têm apenas parcelas consideram somente essas saídas.</p>
      <div className="overflow-x-auto mt-3"><table className="w-full text-left"><caption className="sr-only">Sobra acumulada prevista por mês</caption><thead><tr><th scope="col" className="py-2">Mês</th><th scope="col" className="py-2 text-right">Acumulado</th><th scope="col" className="py-2 pl-3">Origem</th></tr></thead><tbody>{rows.map(row => <tr key={row.label} className="border-t border-border"><th scope="row" className="py-2 font-normal whitespace-nowrap">{row.label}</th><td className="py-2 text-right tabular-nums whitespace-nowrap">{money(row.planned ?? row.forecast ?? 0)}</td><td className="py-2 pl-3">{row.source}</td></tr>)}</tbody></table></div>
    </details>}
  </section>;
}

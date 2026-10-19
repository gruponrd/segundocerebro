import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { useFinanceStore } from "@/stores/financeStore";
import { buildBalanceProjection, surplusProjectionHorizon } from "@/lib/dashboardPresentation";
import { money } from "@/lib/planningTools";
import { cashflowPeriod } from "@/lib/cashflowMonths";

export function SurplusForecastCard() {
  const store = useFinanceStore();
  const today = new Date();
  const currentPeriod = today.getFullYear() * 12 + today.getMonth();
  const [chosenStart, setChosenStart] = useState<number | null>(null);
  const [chosenEnd, setChosenEnd] = useState<number | null>(null);
  const calendar = useMemo(() => {
    const makeMonth = (period: number) => ({ month: new Date(Math.floor(period / 12), period % 12, 1).toLocaleDateString("pt-BR", { month: "long" }).replace(/^./, char => char.toUpperCase()), year: Math.floor(period / 12), incomes: [], expenses: [] });
    const months = [...store.cashflowMonths];
    if (!months.some(month => cashflowPeriod(month) === currentPeriod)) months.push(makeMonth(currentPeriod));
    const currentIndex = months.findIndex(month => cashflowPeriod(month) === currentPeriod);
    const lastBillPeriod = currentPeriod + surplusProjectionHorizon(months, store.banks, currentIndex);
    const firstPeriod = Math.min(currentPeriod, ...months.filter(month => month.incomes.length || month.expenses.length).map(month => cashflowPeriod(month) ?? currentPeriod));
    const start = Math.max(firstPeriod, Math.min(chosenStart ?? currentPeriod, lastBillPeriod));
    if (!months.some(month => cashflowPeriod(month) === start)) months.push(makeMonth(start));
    return { months, firstPeriod, lastBillPeriod, start, index: months.findIndex(month => cashflowPeriod(month) === start) };
  }, [store.cashflowMonths, store.banks, currentPeriod, chosenStart]);
  const startPeriod = calendar.start;
  const endPeriod = Math.max(startPeriod, Math.min(chosenEnd ?? calendar.lastBillPeriod, calendar.lastBillPeriod));
  const horizon = endPeriod - startPeriod;
  const label = (offset: number) => new Date(Math.floor((startPeriod + offset) / 12), (startPeriod + offset) % 12, 1)
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const rows = useMemo(() => buildBalanceProjection(calendar.months, store.banks, calendar.index, horizon, true),
    [calendar, store.banks, horizon]);
  const last = rows[rows.length - 1];
  const total = last?.forecast ?? last?.planned ?? 0;
  const estimated = rows.filter(row => row.source === "Média estimada").length;

  return <section className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5 mb-6" aria-labelledby="surplus-forecast-title">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0">
        <h2 id="surplus-forecast-title" className="flex items-center gap-2 text-sm font-medium"><TrendingUp aria-hidden className="h-4 w-4 text-primary" />Sobra prevista até…</h2>
        <div aria-live="polite" aria-atomic="true" className="mt-3">
          {last ? <><p className={`text-money text-2xl sm:text-3xl ${total < 0 ? "text-expense" : "text-income"}`}>{money(total)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{total < 0 ? "Déficit acumulado" : "Sobra acumulada"} até {label(horizon)}</p><p className="mt-1 text-xs text-muted-foreground">Contabilizado desde {rows[0].label}, partindo de zero.</p></>
            : <p className="text-sm text-muted-foreground">Adicione lançamentos para calcular.</p>}
        </div>
      </div>
      <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2 shrink-0">
        <div>
        <label htmlFor="surplus-start-month" className="block text-xs text-muted-foreground mb-1.5">Mês inicial da projeção</label>
        <select id="surplus-start-month" value={startPeriod} onChange={event => setChosenStart(Number(event.target.value))}
          className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-base sm:text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {Array.from({ length: calendar.lastBillPeriod - calendar.firstPeriod + 1 }, (_, offset) => {
            const period = calendar.firstPeriod + offset;
            return <option key={period} value={period}>{label(period - startPeriod)}</option>;
          })}
        </select>
        </div>
        <div>
        <label htmlFor="surplus-end-month" className="block text-xs text-muted-foreground mb-1.5">Mês final da projeção</label>
        <select id="surplus-end-month" value={endPeriod} onChange={event => setChosenEnd(Number(event.target.value))}
          className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-base sm:text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {Array.from({ length: calendar.lastBillPeriod - startPeriod + 1 }, (_, offset) => <option key={offset} value={startPeriod + offset}>{label(offset)}</option>)}
        </select>
        </div>
      </div>
    </div>
    <p className="mt-3 text-xs text-muted-foreground">{calendar.lastBillPeriod > currentPeriod ? `Último mês com contas ou faturas a pagar: ${label(calendar.lastBillPeriod - startPeriod)}.` : "Sem contas ou faturas a pagar após o mês atual."}</p>
    <p className="mt-4 text-xs text-muted-foreground leading-5">{last ? `${estimated} ${estimated === 1 ? "mês estimado" : "meses estimados"} no cálculo. ` : ""}Projeção de fluxo; não representa saldo bancário nem dinheiro guardado.</p>
    {last && <details className="mt-2 text-xs text-muted-foreground">
      <summary className="min-h-11 py-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">Como é calculado e valores por mês</summary>
      <p className="leading-5">Parte de zero em {label(0)} e soma receitas menos despesas e parcelas, incluindo pagamentos feitos e pendentes. As sobras anteriores ao mês inicial não entram no acumulado. Após {label(0)}, usa os lançamentos cadastrados; meses sem registros repetem a média dos últimos três meses com registros até o mês inicial (ou zero, sem histórico). Meses que têm apenas parcelas consideram somente essas saídas.</p>
      <div className="overflow-x-auto mt-3"><table className="w-full text-left"><caption className="sr-only">Sobra acumulada prevista por mês</caption><thead><tr><th scope="col" className="py-2">Mês</th><th scope="col" className="py-2 text-right">Acumulado</th><th scope="col" className="py-2 pl-3">Origem</th></tr></thead><tbody>{rows.map(row => <tr key={row.label} className="border-t border-border"><th scope="row" className="py-2 font-normal whitespace-nowrap">{row.label}</th><td className="py-2 text-right tabular-nums whitespace-nowrap">{money(row.planned ?? row.forecast ?? 0)}</td><td className="py-2 pl-3">{row.source}</td></tr>)}</tbody></table></div>
    </details>}
  </section>;
}

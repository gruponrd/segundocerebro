import { useMemo } from "react";
import { useFinanceStore } from "@/stores/financeStore";
import { ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, CartesianGrid } from "recharts";
import { LineChart as LineIcon } from "lucide-react";
import { buildBalanceProjection, compactReais } from "@/lib/dashboardPresentation";
import { money } from "@/lib/planningTools";

export function BalanceProjectionChart() {
  const store = useFinanceStore();
  const data = useMemo(() => buildBalanceProjection(store.cashflowMonths, store.banks, store.selectedMonth), [store.cashflowMonths, store.banks, store.selectedMonth]);
  const selected = store.currentCashflow;
  return <section className="rounded-2xl bg-card border border-border/50 p-5" aria-labelledby="projection-title">
    <div className="flex items-start gap-3 mb-4">
      <LineIcon aria-hidden className="w-5 h-5 text-primary shrink-0" />
      <div><h3 id="projection-title" className="text-sm font-semibold">Fluxo acumulado previsto</h3>
      <p className="text-xs text-muted-foreground mt-1">6 meses após {selected.month.toLowerCase()} de {selected.year}</p></div>
    </div>
    {data.length ? <>
      <div className="h-[260px]" role="img" aria-label="Fluxo acumulado previsto a partir de zero. Valores e origem da previsão disponíveis na tabela abaixo.">
        <ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={compactReais} />
          <Tooltip content={({ active, payload, label }) => {
            const row = payload?.[0]?.payload;
            return active && row ? <div className="rounded-xl border border-border bg-popover p-3 text-xs text-foreground shadow-lg"><p>{label} · {row.source}</p><p className="mt-1">Fluxo acumulado: {money(row.planned ?? row.forecast)}</p><p className="text-muted-foreground mt-1">Fluxo do mês: {money(row.net)}</p></div> : null;
          }} />
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.4} />
          <Line type="monotone" dataKey="planned" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
          <Line type="monotone" dataKey="forecast" stroke="hsl(var(--accent))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} isAnimationActive={false} />
        </ComposedChart></ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-2"><span aria-hidden className="w-3 border-t-2 border-accent" />Até o mês selecionado</span><span className="inline-flex items-center gap-2"><span aria-hidden className="w-3 border-t-2 border-dashed border-accent" />Próximos 6 meses</span></div>
      <details className="mt-3 text-xs text-muted-foreground"><summary className="cursor-pointer min-h-8">Como é calculado e valores</summary>
        <p className="mt-2 leading-5">Acumula receitas menos despesas e parcelas, partindo de zero em {data[0].label}. Inclui lançamentos pagos e pendentes; não representa dinheiro guardado nem saldo bancário. Nos próximos 6 meses, usa os lançamentos cadastrados. Onde não há lançamentos, repete a média dos últimos 3 meses com registros até o período selecionado (ou dos disponíveis).</p>
        <div className="overflow-x-auto"><table className="mt-3 w-full text-left"><caption className="sr-only">Fluxo acumulado previsto em reais e origem de cada mês</caption><thead><tr><th scope="col" className="py-2">Mês</th><th scope="col" className="py-2 text-right">Acumulado</th><th scope="col" className="py-2 pl-3">Origem</th></tr></thead><tbody>{data.map(row => <tr key={row.label} className="border-t border-border"><th scope="row" className="py-2 font-normal">{row.label}</th><td className="py-2 text-right tabular-nums whitespace-nowrap">{money(row.planned ?? row.forecast ?? 0)}</td><td className="py-2 pl-3">{row.source}</td></tr>)}</tbody></table></div>
      </details>
    </> : <p className="py-10 text-sm text-muted-foreground">Adicione lançamentos até o mês selecionado para calcular esta previsão.</p>}
  </section>;
}

import { useId, useMemo } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { compactReais } from "@/lib/dashboardPresentation";
import { money } from "@/lib/planningTools";
import { panoramaTicks, panoramaYearCuts, periodLabel, type PanoramaPoint } from "@/lib/panoramaSeries";



/** Reuses the panorama totals: card installments are already included in saidas. */
export function MonthlySurplusChart({ data, monthLabel, balance }: { data: PanoramaPoint[]; monthLabel: string; balance: number }) {
  const gradientId = useId().replace(/:/g, "");
  const points = useMemo(() => data.map(point => ({
    month: point.month, period: point.period, estimated: point.estimated, baseline: point.baseline, hasRecords: point.hasRecords,
    sobra: point.entradas !== undefined && point.saidas !== undefined ? point.entradas - point.saidas : undefined,
    previsao: point.future_entradas !== undefined && point.future_saidas !== undefined ? point.future_entradas - point.future_saidas : undefined,
  })), [data]);
  const yearCuts = panoramaYearCuts(data);
  const range = data.length ? `${data[0].month} a ${data.at(-1)?.month}` : "";
  const selected = points.find(point => point.month === monthLabel);
  const selectedBalance = selected?.sobra ?? selected?.previsao ?? balance;
  return <section className="monthly-surplus-card panorama-chart data-surface relative flex min-w-0 flex-col overflow-hidden p-5" aria-labelledby={`${gradientId}-title`}>
    <div className="relative mb-3 flex items-center justify-between gap-3"><h3 id={`${gradientId}-title`} className="text-sm font-medium">Sobra mensal</h3><span className="text-xs text-muted-foreground">{monthLabel}</span></div>
    <div className="panorama-plot relative" role="img" aria-label={`Sobra mensal de ${range}: mês selecionado, seis anteriores e seis seguintes. Receitas menos despesas, incluindo cartões. Marcadores indicam a mudança de ano. Valores disponíveis na tabela abaixo.`}>
      {points.length ? <ResponsiveContainer width="100%" height="100%"><ComposedChart data={points} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
        <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary-text))" stopOpacity={0.15} /><stop offset="100%" stopColor="hsl(var(--primary-text))" stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 4" />
        <XAxis dataKey="period" type="number" domain={["dataMin", "dataMax"]} ticks={panoramaTicks(data)} tickFormatter={periodLabel} interval="preserveStartEnd" tick={{fill:"hsl(var(--muted-foreground))",fontSize:11}} axisLine={false} tickLine={false} minTickGap={18} />
        <YAxis width={58} tick={{fill:"hsl(var(--muted-foreground))",fontSize:12}} axisLine={false} tickLine={false} tickFormatter={compactReais} />
        <ReferenceLine x={points.find(point => point.month === monthLabel)?.period} stroke="hsl(var(--primary-text))" strokeOpacity={0.45} strokeDasharray="2 4" />
        <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.4} />
        {yearCuts.map(cut => <ReferenceLine key={cut.year} x={cut.period} stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="5 4" label={{ value: String(cut.year), position: "insideTopLeft", fill: "hsl(var(--foreground))", fontSize: 11 }} />)}<Tooltip content={({ active, payload }) => {
          const value = payload?.find(item => typeof item.value === "number")?.value;
          return active && typeof value === "number" ? <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs text-foreground shadow-lg"><p className="text-muted-foreground">{payload?.[0]?.payload.month}{payload?.[0]?.payload.estimated ? " · Estimativa" : !payload?.[0]?.payload.hasRecords ? " · Sem lançamentos" : ""}</p><p className="mt-1">Sobra prevista <strong className={value < 0 ? "ml-2 text-expense" : "ml-2 text-accent"}>{money(value)}</strong></p></div> : null;
        }} />
        <Area dataKey="sobra" type="monotone" stroke="none" fill={`url(#${gradientId})`} isAnimationActive={false} />
        <Line dataKey="sobra" name="Sobra mensal" type="monotone" stroke="hsl(var(--primary-text))" strokeWidth={1.75} dot={{r:2,fill:"hsl(var(--primary-text))"}} activeDot={{r:5}} isAnimationActive={false} />
        <Line dataKey="previsao" name="Próximos meses" type="monotone" stroke="hsl(var(--primary-text))" strokeWidth={1.5} strokeDasharray="4 5" dot={{r:2}} activeDot={{r:5}} isAnimationActive={false} />
      </ComposedChart></ResponsiveContainer> : <p className="grid h-full place-items-center text-center text-xs text-muted-foreground">Sem lançamentos para calcular a sobra mensal.</p>}
    </div>
    <div className="surplus-footer mt-3 flex flex-wrap items-center justify-between gap-2 text-xs"><span className="text-muted-foreground">{selected?.estimated ? "Sobra estimada" : "Sobra prevista"} · {monthLabel}</span><span className={selectedBalance<0?"text-money text-expense":"text-money text-primary"}>{money(selectedBalance)}</span></div>
    <p className="mt-2 text-xs text-muted-foreground">{range} · 6 meses antes e 6 depois</p>
    <details className="surplus-values mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer">Ver valores mensais</summary><p className="mt-2 leading-5">Receitas menos despesas e parcelas do mês. Não acumula sobras de outros meses nem representa saldo bancário. Estimativas para meses futuros usam a base indicada no gráfico de entradas e saídas; meses sem lançamentos nem estimativa aparecem zerados.</p><table className="mt-2 w-full text-left"><caption className="sr-only">Sobra prevista por mês em reais</caption><thead><tr><th scope="col" className="py-2 font-medium">Mês</th><th scope="col" className="py-2 text-right font-medium">Sobra prevista</th></tr></thead><tbody>{points.map(point=><tr key={point.month} className="border-t border-border"><th scope="row" className="py-2 font-normal">{point.month}{point.estimated ? <small className="block">Estimativa</small> : !point.hasRecords && <small className="block">Sem lançamentos</small>}</th><td className="py-2 text-right tabular-nums">{money(point.sobra ?? point.previsao ?? 0)}</td></tr>)}</tbody></table></details>
  </section>;
}

import { useId, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis, type TooltipProps } from "recharts";
import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/line-chart";
import { Button } from "@/components/ui/button";
import { useFinanceStore } from "@/stores/financeStore";
import { usePaymentSessionMap } from "@/hooks/usePaymentSessionMap";
import { monthlyCashflowChart, type DailyCashflowPoint } from "@/lib/monthlyCashflowChart";
import { money } from "@/lib/planningTools";

const chartConfig = {
  incomes: { label: "Recebimentos", color: "hsl(var(--income))" },
  expenses: { label: "Pagamentos e saídas", color: "hsl(var(--expense))" },
} satisfies ChartConfig;
const compactMoney = (amount: number) => amount.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

function DayTooltip({ active, payload }: TooltipProps<number, string>) {
  const point = payload?.[0]?.payload as DailyCashflowPoint | undefined;
  if (!active || !point) return null;
  return <div className="max-w-64 rounded-xl border border-border bg-popover p-3 text-xs text-popover-foreground shadow-xl">
    <p className="mb-2 font-semibold">Dia {String(point.day).padStart(2, "0")}</p>
    <p className="flex justify-between gap-4">Recebimentos <strong className="tabular-nums">{money(point.incomes)}</strong></p>
    <p className="mt-1 flex justify-between gap-4">Pagamentos e saídas <strong className="tabular-nums">{money(point.expenses)}</strong></p>
    {point.entries.length > 0 && <div className="mt-2 space-y-1 border-t border-border pt-2">{point.entries.slice(0, 3).map(item => <p key={item.id} className="break-words text-muted-foreground">{item.label} · {money(item.amount)}</p>)}{point.entries.length > 3 && <p className="text-muted-foreground">+ {point.entries.length - 3} lançamento(s) na lista abaixo</p>}</div>}
  </div>;
}

export function MonthlyCashflowChart() {
  const { currentCashflow, banks } = useFinanceStore();
  const { map } = usePaymentSessionMap();
  const [confirmedOnly, setConfirmedOnly] = useState(false);
  const [selectedDay, setSelectedDay] = useState("all");
  const id = useId();
  const data = useMemo(() => monthlyCashflowChart(currentCashflow, banks, map, confirmedOnly), [currentCashflow, banks, map, confirmedOnly]);
  const dailyTotal = data.totalIncome - data.totalExpense;
  const hasDated = data.entries.some(e => e.day !== null);
  const datedDays = data.points.filter(point => point.entries.length > 0).map(p => p.day);
  const visibleEntries = data.entries.filter(entry => selectedDay === "all" || (selectedDay === "undated" ? entry.day === null : entry.day === Number(selectedDay))).sort((a, b) => (a.day ?? 32) - (b.day ?? 32));
  return <Card className="glass-card min-w-0 rounded-2xl border-border/60 shadow-none">
    <CardHeader className="gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0"><CardTitle className="flex items-center gap-2 text-base sm:text-lg"><CalendarDays aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" /> Entradas e saídas por dia</CardTitle><CardDescription className="mt-2">{currentCashflow.month} {currentCashflow.year} · Fluxo e parcelas dos cartões</CardDescription></div>
        <div className="flex gap-1 rounded-xl border border-border bg-secondary/30 p-1" role="group" aria-label="Situação dos lançamentos no gráfico">
          <Button size="sm" variant={confirmedOnly ? "ghost" : "secondary"} className="min-h-10 rounded-lg" aria-pressed={!confirmedOnly} onClick={() => { setConfirmedOnly(false); setSelectedDay("all"); }}>Todos</Button>
          <Button size="sm" variant={confirmedOnly ? "secondary" : "ghost"} className="min-h-10 rounded-lg" aria-pressed={confirmedOnly} onClick={() => { setConfirmedOnly(true); setSelectedDay("all"); }}>Recebidos / pagos</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-3" aria-live="polite" aria-atomic="true">
        <div><p className="text-xs text-muted-foreground">{confirmedOnly ? "Recebido" : "Entradas do mês"}</p><p className="mt-1 text-lg font-semibold tabular-nums text-income">{money(data.totalIncome)}</p></div>
        <div><p className="text-xs text-muted-foreground">{confirmedOnly ? "Pago" : "Saídas do mês"}</p><p className="mt-1 text-lg font-semibold tabular-nums text-expense">{money(data.totalExpense)}</p></div>
        <div><p className="text-xs text-muted-foreground">Diferença do período</p><p className="mt-1 text-lg font-semibold tabular-nums">{money(dailyTotal)}</p></div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4 p-5 pt-0 sm:p-6 sm:pt-0">
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground" aria-label="Legenda do gráfico">
        <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="w-6 border-t-2 border-dashed border-income" /> Recebimentos · tracejado</span>
        <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="w-6 border-t-2 border-expense" /> Pagamentos e saídas · contínuo</span>
      </div>
      {hasDated ? <ChartContainer config={chartConfig} className="h-[260px] w-full min-w-0 aspect-auto sm:h-[300px]" aria-label={`Valores diários em reais de ${currentCashflow.month} ${currentCashflow.year}. A lista de lançamentos abaixo permite consultar os mesmos dados.`}>
        <LineChart accessibilityLayer data={data.points} margin={{ left: 0, right: 12, top: 10, bottom: 8 }} onClick={state => { if (state?.activeLabel !== undefined) setSelectedDay(String(state.activeLabel)); }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
          <XAxis dataKey="day" axisLine={false} tickLine={false} tickMargin={10} minTickGap={25} tickFormatter={day => String(day).padStart(2, "0")} />
          <YAxis width={50} tickLine={false} axisLine={false} tickFormatter={compactMoney} />
          <ChartTooltip cursor={false} content={<DayTooltip />} />
          <Line type="linear" dataKey="incomes" name="Recebimentos" stroke="var(--color-incomes)" strokeWidth={2.5} strokeDasharray="4 4" dot={false} activeDot={{ r: 5 }} isAnimationActive={false} />
          <Line type="linear" dataKey="expenses" name="Pagamentos e saídas" stroke="var(--color-expenses)" strokeWidth={2.5} dot={{ r: 2.5, fill: "var(--color-expenses)", strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
        </LineChart>
      </ChartContainer> : <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-border bg-secondary/20 p-6 text-center text-sm text-muted-foreground">{data.entries.length ? "Seus lançamentos estão no resumo. Ainda não há dias identificados para desenhar as linhas." : confirmedOnly ? "Nenhum recebimento ou pagamento confirmado neste mês." : "Nenhum lançamento neste mês. As linhas aparecerão quando houver entradas ou saídas com dia definido."}</div>}
      <p className="text-xs leading-relaxed text-muted-foreground">Eixo horizontal: dias do mês · Eixo vertical: valor em R$. As linhas mostram valores de cada dia, sem acumular. São usadas as datas registradas, os vencimentos e as referências de dia das descrições ou das sessões de pagamento. Marcar como pago não informa a data efetiva do pagamento.</p>
      {data.undated.length > 0 && <div role="status" className="rounded-xl border border-border bg-secondary/30 p-3 text-sm"><p className="font-medium">{data.undated.length} lançamento(s) sem dia neste mês</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Entradas: {money(data.undatedIncome)} · Saídas: {money(data.undatedExpense)}. Incluídos nos totais, separados das linhas diárias.</p></div>}
      <details className="rounded-xl border border-border p-4">
        <summary className="min-h-7 cursor-pointer text-sm font-medium">Ver lançamentos por dia ({data.entries.length})</summary>
        <label htmlFor={id} className="mt-4 block text-xs font-medium">Filtrar lançamentos</label>
        <select id={id} value={selectedDay} onChange={e => setSelectedDay(e.target.value)} className="mt-2 h-11 w-full max-w-xs rounded-xl border border-input bg-background px-3 text-sm"><option value="all">Todos os dias</option>{datedDays.map(day => <option key={day} value={String(day)}>Dia {String(day).padStart(2, "0")}</option>)}{data.undated.length > 0 && <option value="undated">Sem dia definido</option>}{selectedDay !== "all" && selectedDay !== "undated" && !datedDays.includes(Number(selectedDay)) && <option value={selectedDay}>Dia {selectedDay} · sem lançamentos</option>}</select>
        <div className="mt-4 max-h-80 overflow-auto"><ul className="divide-y divide-border/60">{visibleEntries.map(entry => <li key={entry.id} className="flex items-start justify-between gap-3 py-3"><div className="min-w-0"><p className="break-words text-sm font-medium">{entry.day === null ? "Sem dia" : `Dia ${String(entry.day).padStart(2, "0")}`} · {entry.label}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{entry.source} · {entry.reference} · {entry.kind === "incomes" ? entry.paid ? "Recebido" : "A receber" : entry.paid ? "Pago" : "A pagar"}</p></div><span className="shrink-0 text-sm font-medium tabular-nums">{entry.kind === "incomes" ? "+" : "−"} {money(entry.amount)}</span></li>)}</ul>{!visibleEntries.length && <p className="py-4 text-sm text-muted-foreground">Nenhum lançamento neste filtro.</p>}</div>
      </details>
    </CardContent>
  </Card>;
}

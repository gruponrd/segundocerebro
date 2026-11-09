import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money } from "@/lib/planningTools";
import { INCOME_MONTHS } from "@/lib/annualIncome";

interface AnnualIncomeChartProps {
  received: number[];
  target: number;
  year: number;
}

/** Values are accumulated to the latest month with a nonzero confirmed amount. */
export function annualIncomeChartData(received: number[]) {
  const last = received.reduce((found, value, index) => value !== 0 ? index : found, -1);
  let cents = 0;
  return INCOME_MONTHS.map((name, index) => {
    cents += Math.round((received[index] ?? 0) * 100);
    return { month: name.slice(0, 3), fullMonth: name, acumulado: index <= last ? cents / 100 : null };
  });
}

export function AnnualIncomeChart({ received, target, year }: AnnualIncomeChartProps) {
  const data = annualIncomeChartData(received);
  const total = Math.round(received.reduce((sum, value) => sum + Math.round(value * 100), 0)) / 100;
  const reached = target > 0 && total >= target;
  const progress = target > 0 ? Math.max(0, Math.min(total / target * 100, 100)) : 0;
  const percentage = target > 0 ? Math.round(total / target * 100) : null;
  const hasEntries = data.some(point => point.acumulado !== null);
  const chartMin = Math.min(0, ...data.map(point => point.acumulado ?? 0));
  const chartMax = Math.max(1, target, ...data.map(point => point.acumulado ?? 0));
  return (
    <section aria-labelledby="income-evolution-title" className="overflow-hidden rounded-xl border border-border bg-background/50 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 id="income-evolution-title" className="font-semibold">Evolução da meta anual</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">O total recebido se acumula ao longo de {year}.</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-2xl font-bold tabular-nums text-income">{money(total)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{target > 0 ? `de ${money(target)} da meta` : "recebidos · defina uma meta anual"}</p>
        </div>
      </div>
      {target > 0 && <div className="mt-5">
        <div className="mb-2 flex justify-between gap-4 text-xs"><span className="font-medium">{reached ? "Meta atingida" : "Progresso da meta"}</span><span className="font-semibold tabular-nums">{percentage}%</span></div>
        <div role="progressbar" aria-label="Progresso da meta anual" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-valuetext={`${percentage}% da meta anual`} className="h-3 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-income transition-[width] duration-700 motion-reduce:transition-none" style={{width:`${progress}%`}} /></div>
        {total > target && <p className="mt-2 text-xs text-income">{money(total - target)} acima da meta</p>}
      </div>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-4 text-xs text-muted-foreground">
        <span>Recebido acumulado por mês</span>{target > 0 && <span className="flex items-center gap-2"><span aria-hidden="true" className="w-5 border-t border-dashed border-primary" />Meta anual</span>}
      </div>
      <div className="relative mt-3 h-52 w-full min-w-0" role="img" aria-label={`Gráfico de rendimentos acumulados em ${year}. O detalhamento está disponível na lista mês a mês abaixo.`}>
        <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{top: 8, right: 4, left: -14, bottom: 0}}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 5" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{fontSize: 11, fill: "hsl(var(--muted-foreground))"}} interval="preserveStartEnd" />
          <YAxis domain={[chartMin, chartMax * 1.1]} width={58} tickLine={false} axisLine={false} tick={{fontSize: 10, fill: "hsl(var(--muted-foreground))"}} tickFormatter={value => new Intl.NumberFormat("pt-BR", {notation: "compact", maximumFractionDigits: 1}).format(value)} />
          <Tooltip cursor={{fill:"hsl(var(--secondary) / 0.5)"}} contentStyle={{background:"hsl(var(--card))", border:"1px solid hsl(var(--border))", borderRadius:12, color:"hsl(var(--foreground))"}} formatter={(value: number) => [money(value), "Recebido acumulado"]} labelFormatter={(_, payload) => payload?.[0]?.payload?.fullMonth ?? ""} />
          {target > 0 && <ReferenceLine y={target} stroke="hsl(var(--primary))" strokeDasharray="5 4" />}
          <Bar dataKey="acumulado" fill="hsl(var(--income))" maxBarSize={34} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart></ResponsiveContainer>
        {!hasEntries && <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-12 text-center"><p className="rounded-lg bg-background/90 p-3 text-xs leading-relaxed text-muted-foreground">As barras aparecem quando você confirmar entradas de {year} no fluxo de caixa.</p></div>}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Cada barra mostra o total confirmado até aquele mês. Meses posteriores ao último recebimento ficam vazios.</p>
    </section>
  );
}

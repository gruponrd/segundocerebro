import { useMemo } from "react";
import { useFinanceStore } from "@/stores/financeStore";
import { Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, CartesianGrid } from "recharts";
import { LineChart as LineIcon } from "lucide-react";
import { cardSpendingForMonth } from "@/lib/financeCalculations";

const MONTH_MAP: Record<string, number> = {
  Janeiro: 1, Fevereiro: 2, Março: 3, Abril: 4, Maio: 5, Junho: 6,
  Julho: 7, Agosto: 8, Setembro: 9, Outubro: 10, Novembro: 11, Dezembro: 12,
};
const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function BalanceProjectionChart() {
  const store = useFinanceStore();

  const data = useMemo(() => {
    const points: { label: string; real?: number; proj?: number; otimista?: number; pessimista?: number }[] = [];

    // Real balances per existing month
    const real = store.cashflowMonths.map((m) => {
      const income = m.incomes.reduce((s, i) => s + i.amount, 0);
      const expense = m.expenses.reduce((s, e) => s + e.amount, 0);
      const monthNum = MONTH_MAP[m.month];
      const cardExp = cardSpendingForMonth(store.banks, monthNum, m.year);
      return { label: `${MONTHS_SHORT[(monthNum || 1) - 1]}/${String(m.year).slice(2)}`, balance: income - expense - cardExp, year: m.year, monthNum };
    });

    // Cumulative real starting from saved balance
    let acc = 0;
    real.forEach((r, i) => {
      acc += r.balance;
      points.push({ label: r.label, real: acc });
      if (i === real.length - 1) {
        points[points.length - 1].proj = acc;
        points[points.length - 1].otimista = acc;
        points[points.length - 1].pessimista = acc;
      }
    });

    // Projection: average of last 3 monthly balances
    const last3 = real.slice(-3).map((r) => r.balance);
    const avg = last3.reduce((s, v) => s + v, 0) / Math.max(1, last3.length);

    const lastReal = real[real.length - 1];
    let curMonth = lastReal?.monthNum ?? new Date().getMonth() + 1;
    let curYear = lastReal?.year ?? new Date().getFullYear();
    let projAcc = acc;
    let optAcc = acc;
    let pesAcc = acc;

    for (let i = 0; i < 6; i++) {
      curMonth += 1;
      if (curMonth > 12) { curMonth = 1; curYear += 1; }
      projAcc += avg;
      optAcc += avg * 1.15;
      pesAcc += avg * 0.85;
      points.push({
        label: `${MONTHS_SHORT[curMonth - 1]}/${String(curYear).slice(2)}`,
        proj: Math.round(projAcc),
        otimista: Math.round(optAcc),
        pessimista: Math.round(pesAcc),
      });
    }

    return points;
  }, [store.cashflowMonths, store.banks]);

  return (
    <div className="rounded-2xl bg-card border border-border/50 p-5">
      <div className="flex items-center gap-3 mb-4">
        <LineIcon className="w-5 h-5 text-primary" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">Projeção de Saldo</h3>
          <p className="text-xs text-muted-foreground">Próximos 6 meses com base na média atual</p>
        </div>
      </div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="projBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.18} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.25} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
              formatter={(v: number, name: string) => [fmt(v), name === "real" ? "Real" : name === "proj" ? "Projeção" : name === "otimista" ? "Otimista" : "Pessimista"]}
            />
            <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeOpacity={0.4} strokeDasharray="3 3" />
            <Area type="monotone" dataKey="otimista" stroke="none" fill="url(#projBand)" />
            <Area type="monotone" dataKey="pessimista" stroke="none" fill="hsl(var(--background))" />
            <Line type="monotone" dataKey="real" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--primary))" }} />
            <Line type="monotone" dataKey="proj" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-primary" /> Saldo real</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-primary opacity-60" style={{ borderTop: "2px dashed" }} /> Projeção</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded bg-primary/20" /> Faixa ±15%</div>
      </div>
    </div>
  );
}

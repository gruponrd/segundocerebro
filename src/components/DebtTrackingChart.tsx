import { useMemo } from "react";
import { useFinanceStore } from "@/stores/financeStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
} from "recharts";
import { TrendingUp, Info } from "lucide-react";
import { unpaidCardSpendingForMonth } from "@/lib/financeCalculations";

const MONTH_MAP: Record<string, number> = {
  Janeiro: 0, Fevereiro: 1, Março: 2, Abril: 3, Maio: 4, Junho: 5,
  Julho: 6, Agosto: 7, Setembro: 8, Outubro: 9, Novembro: 10, Dezembro: 11,
};

const SHORT_MONTH = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/**
 * Registered payments are shown in the current bucket because older payments
 * have no reliable month history. Future installments form the projection.
 */
export function DebtTrackingChart() {
  const store = useFinanceStore();

  const { chartData, initialDebt, alreadyAmortized } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const currentTotalDebt = store.totalDebt;
    const alreadyAmortized = store.totalCreditorsPaid + store.banks.reduce(
      (sum, bank) => sum + bank.installments
        .filter((installment) => installment.status === "pago")
        .reduce((paid, installment) => paid + installment.installmentAmount, 0),
      0,
    );
    const totalInitial = currentTotalDebt + alreadyAmortized;

    let cumulativePaid = 0;

    const data = store.cashflowMonths.map((m, idx) => {
      const mIdx = MONTH_MAP[m.month] ?? idx;
      const isCurrent = m.year === currentYear && mIdx === currentMonth;
      const isPast = m.year < currentYear || (m.year === currentYear && mIdx < currentMonth);
      const isFuture = !isPast && !isCurrent;

      let abatimento = 0;
      if (isCurrent) {
        // Attribute the entire historical amortization to the current month bucket
        abatimento = alreadyAmortized - cumulativePaid;
      } else if (isFuture) {
        abatimento = unpaidCardSpendingForMonth(store.banks, mIdx + 1, m.year);
      }

      cumulativePaid += abatimento;
      // Cap so cumulative never exceeds initial
      if (cumulativePaid > totalInitial) cumulativePaid = totalInitial;

      const remaining = Math.max(totalInitial - cumulativePaid, 0);

      return {
        name: SHORT_MONTH[mIdx] ?? m.month.slice(0, 3),
        progresso: cumulativePaid,
        abatimento,
        remaining,
        isPast: isPast || isCurrent,
      };
    });

    return { chartData: data, initialDebt: totalInitial, alreadyAmortized };
  }, [store.cashflowMonths, store.banks, store.totalDebt, store.totalCreditorsPaid]);

  const currentDebt = store.totalDebt;
  const reductionPercent = initialDebt > 0 ? Math.round((alreadyAmortized / initialDebt) * 100) : 0;

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-chart-2/10 flex items-center justify-center">
              <TrendingUp className="w-4.5 h-4.5 text-chart-2" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold tracking-tight">Progresso de Quitação</CardTitle>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="w-3 h-3" /> Considera apenas parcelas pagas e amortização de credores
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">
              R$ {currentDebt.toLocaleString("pt-BR")}
            </p>
            <p className="text-xs text-muted-foreground">
              Quitado: <span className="text-chart-2 font-semibold">{reductionPercent}%</span>
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis
                dataKey="name"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<DebtTooltip initialDebt={initialDebt} />} />
              <ReferenceLine
                y={initialDebt}
                stroke="hsl(var(--chart-2))"
                strokeDasharray="6 4"
                opacity={0.5}
                label={{ value: "Meta: Dívida Zero", position: "insideTopRight", fill: "hsl(var(--chart-2))", fontSize: 10 }}
              />
              <Area
                type="monotone"
                dataKey="progresso"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2.5}
                fill="url(#progressGradient)"
                dot={false}
                activeDot={{ r: 5, fill: "hsl(var(--chart-2))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="abatimento"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(var(--destructive))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                activeDot={{ r: 5, fill: "hsl(var(--destructive))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(var(--chart-2))" }} />
            <span>Quitação Acumulada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-destructive/60" />
            <span>Abatimento Mensal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0 border-t-2 border-dashed" style={{ borderColor: "hsl(var(--chart-2))" }} />
            <span>Meta</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DebtTooltip({ active, payload, label, initialDebt }: {
  active?: boolean;
  payload?: { dataKey: string; value?: number }[];
  label?: string;
  initialDebt: number;
}) {
  if (!active || !payload?.length) return null;

  const progresso = payload.find((p) => p.dataKey === "progresso")?.value ?? 0;
  const remaining = Math.max(initialDebt - progresso, 0);

  return (
    <div className="bg-popover/95 backdrop-blur-md border border-border rounded-xl px-4 py-3 shadow-xl">
      <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry, i) => {
        const isProgress = entry.dataKey === "progresso";
        return (
          <div key={i} className="flex items-center justify-between gap-4 text-xs">
            <span className="text-muted-foreground">
              {isProgress ? "Total Quitado" : "Abatimento"}
            </span>
            <span
              className="font-bold"
              style={{ color: isProgress ? "hsl(var(--chart-2))" : "hsl(var(--destructive))" }}
            >
              R$ {entry.value?.toLocaleString("pt-BR")}
            </span>
          </div>
        );
      })}
      <div className="flex items-center justify-between gap-4 text-xs mt-1 pt-1 border-t border-border">
        <span className="text-muted-foreground">Restante</span>
        <span className="font-bold text-foreground">R$ {remaining.toLocaleString("pt-BR")}</span>
      </div>
    </div>
  );
}

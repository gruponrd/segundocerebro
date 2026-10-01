import { useMemo } from "react";
import { useFinanceStore } from "@/stores/financeStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, AlertTriangle, ShieldAlert } from "lucide-react";
import { cardSpendingForMonth } from "@/lib/financeCalculations";

const MONTH_MAP: Record<string, number> = {
  Janeiro: 1, Fevereiro: 2, "Março": 3, Abril: 4, Maio: 5, Junho: 6,
  Julho: 7, Agosto: 8, Setembro: 9, Outubro: 10, Novembro: 11, Dezembro: 12,
};

export function IncomeCoverage() {
  const store = useFinanceStore();

  const months = useMemo(() => {
    const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    const now = new Date();
    let startIdx = store.cashflowMonths.findIndex(
      (m) => m.month === MONTHS_PT[now.getMonth()] && m.year === now.getFullYear()
    );
    if (startIdx < 0) startIdx = 0;
    const slice = store.cashflowMonths.slice(startIdx, startIdx + 3);
    return slice.map((m) => {
      const monthNum = MONTH_MAP[m.month];
      const income = m.incomes.reduce((s, i) => s + i.amount, 0);
      const manual = m.expenses.reduce((s, e) => s + e.amount, 0);
      const cards = cardSpendingForMonth(store.banks, monthNum, m.year);
      const cost = manual + cards;
      return { label: `${m.month} ${m.year}`, income, cost, balance: income - cost };
    });
  }, [store.cashflowMonths, store.banks]);

  const overall = useMemo(() => {
    const totalIncome = months.reduce((s, m) => s + m.income, 0);
    const totalCost = months.reduce((s, m) => s + m.cost, 0);
    const ratio = totalCost > 0 ? totalIncome / totalCost : totalIncome > 0 ? 2 : 1;
    let status: "ok" | "warn" | "danger";
    let label: string;
    let Icon: import("lucide-react").LucideIcon;
    let color: string;
    if (ratio >= 1.15) { status = "ok"; label = "Renda cobre confortavelmente"; Icon = ShieldCheck; color = "hsl(var(--income))"; }
    else if (ratio >= 1) { status = "warn"; label = "Cobertura apertada"; Icon = AlertTriangle; color = "hsl(var(--warning, 38 92% 50%))"; }
    else { status = "danger"; label = "Renda insuficiente"; Icon = ShieldAlert; color = "hsl(var(--destructive))"; }
    return { totalIncome, totalCost, ratio, status, label, Icon, color };
  }, [months]);

  return (
    <Card className="glass-card overflow-hidden border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${overall.color}20` }}>
              <overall.Icon className="w-5 h-5" style={{ color: overall.color }} />
            </div>
            <div>
              <div>Cobertura de Renda</div>
              <p className="text-xs text-muted-foreground font-normal">Próximos 3 meses</p>
            </div>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall status banner */}
        <div className="rounded-xl p-4 flex items-center justify-between gap-4" style={{ background: `${overall.color}12`, borderLeft: `3px solid ${overall.color}` }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: overall.color }}>{overall.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Renda total: <span className="text-money font-medium text-foreground">R$ {overall.totalIncome.toLocaleString("pt-BR")}</span> · Custos: <span className="text-money font-medium text-foreground">R$ {overall.totalCost.toLocaleString("pt-BR")}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-money" style={{ color: overall.color }}>
              {(overall.ratio * 100).toFixed(0)}%
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">cobertura</p>
          </div>
        </div>

        {/* Per-month bars */}
        <div className="space-y-3">
          {months.map((m) => {
            const ratio = m.cost > 0 ? m.income / m.cost : m.income > 0 ? 2 : 1;
            const pct = Math.min(ratio * 100, 200);
            const barColor = ratio >= 1.15 ? "hsl(var(--income))" : ratio >= 1 ? "hsl(38 92% 50%)" : "hsl(var(--destructive))";
            const covered = m.income >= m.cost;
            return (
              <div key={m.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{m.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      <span className="text-income text-money">R$ {m.income.toLocaleString("pt-BR")}</span>
                      {" / "}
                      <span className="text-money">R$ {m.cost.toLocaleString("pt-BR")}</span>
                    </span>
                    <span className={`text-money font-semibold ${covered ? "text-income" : "text-destructive"}`}>
                      {covered ? "+" : ""}R$ {m.balance.toLocaleString("pt-BR")}
                    </span>
                  </div>
                </div>
                <div className="relative h-2.5 rounded-full bg-secondary overflow-hidden">
                  <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
                  {pct > 100 && (
                    <div className="absolute inset-y-0 right-0 w-0.5 bg-foreground/30" style={{ left: "100%" }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center pt-2">
          Cobertura calculada a partir das receitas, despesas e parcelas cadastradas.
        </p>
      </CardContent>
    </Card>
  );
}

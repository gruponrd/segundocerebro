import { useState, useMemo } from "react";
import { DebtTrackingChart } from "@/components/DebtTrackingChart";
import { CreditorWidget } from "@/components/CreditorWidget";
import { useFinanceStore } from "@/stores/financeStore";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingDown, TrendingUp, Percent, CalendarDays, AlertTriangle,
  Clock, CheckCircle2, Calculator, Zap, Target, History, Bell, Flame, Snowflake, Timer, Briefcase, Wallet,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ExportXlsxButton } from "@/components/ExportXlsxButton";
import { cardSpendingForMonth, remainingBankDebt } from "@/lib/financeCalculations";

const HOURS_PER_WEEK = 48;
const HOURS_PER_MONTH = HOURS_PER_WEEK * (52 / 12);
const MONTH_MAP: Record<string, number> = {
  Janeiro: 0, Fevereiro: 1, Março: 2, Abril: 3, Maio: 4, Junho: 5,
  Julho: 6, Agosto: 7, Setembro: 8, Outubro: 9, Novembro: 10, Dezembro: 11,
};

/* ───── Helpers ───── */

function getDueDateStatus(dueDate?: string): "overdue" | "soon" | "ok" {
  if (!dueDate) return "ok";
  const now = new Date();
  const due = new Date(dueDate);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "overdue";
  if (diffDays <= 7) return "soon";
  return "ok";
}

const STATUS_CONFIG = {
  overdue: { color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", icon: AlertTriangle, label: "Atrasado" },
  soon: { color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30", icon: Clock, label: "Vence em breve" },
  ok: { color: "text-chart-2", bg: "bg-chart-2/10", border: "border-chart-2/30", icon: CheckCircle2, label: "Em dia" },
};

/* ───── Stat Card ───── */

function StatCard({ icon: Icon, label, value, sub, color }: { icon: import("lucide-react").LucideIcon; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-foreground text-money">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

/* ───── Donut Chart ───── */

function DebtDonutChart({ data }: { data: { name: string; value: number; paid: number }[] }) {
  const chartData = data.filter(d => d.value > 0).map(d => ({
    name: d.name,
    remaining: d.value - d.paid,
    paid: d.paid,
    pct: d.value > 0 ? Math.round((d.paid / d.value) * 100) : 100,
  }));

  const COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--chart-2))",
    "hsl(45, 100%, 50%)",
    "hsl(var(--destructive))",
    "hsl(280, 60%, 55%)",
    "hsl(200, 70%, 50%)",
  ];

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">% Quitado por Dívida</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="remaining"
                nameKey="name"
                cx="50%" cy="50%"
                innerRadius={55} outerRadius={80}
                stroke="hsl(var(--background))"
                strokeWidth={2}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.4} />
                ))}
              </Pie>
              <Pie
                data={chartData}
                dataKey="paid"
                nameKey="name"
                cx="50%" cy="50%"
                innerRadius={55} outerRadius={80}
                stroke="none"
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-popover/95 backdrop-blur-md border border-border rounded-xl px-3 py-2 shadow-xl text-xs">
                      <p className="font-semibold text-foreground">{d.name}</p>
                      <p className="text-muted-foreground">{d.pct}% quitado</p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-1.5 mt-2">
          {chartData.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-muted-foreground">{d.name}</span>
              </div>
              <span className="font-semibold text-foreground">{d.pct}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ───── Debt Cards (per creditor) ───── */

function DebtCard({ creditor }: { creditor: ReturnType<typeof useFinanceStore>["creditors"][0] }) {
  const remaining = creditor.totalDebt - creditor.amountPaid;
  const pct = creditor.totalDebt > 0 ? (creditor.amountPaid / creditor.totalDebt) * 100 : 100;
  const status = getDueDateStatus(creditor.dueDate);
  const cfg = STATUS_CONFIG[status];
  const StatusIcon = cfg.icon;
  const isComplete = pct >= 100;

  return (
    <div className={`rounded-xl border ${isComplete ? "border-chart-2/30" : cfg.border} bg-card/80 backdrop-blur-sm p-4 space-y-3`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{creditor.name}</p>
          <p className="text-xs text-muted-foreground">
            Saldo: <span className="text-money font-semibold text-foreground">R$ {remaining.toLocaleString("pt-BR")}</span>
          </p>
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${isComplete ? "bg-chart-2/10 text-chart-2" : `${cfg.bg} ${cfg.color}`}`}>
          <StatusIcon className="w-3 h-3" />
          {isComplete ? "Quitado" : cfg.label}
        </div>
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground">
        {creditor.interestRate != null && creditor.interestRate > 0 && (
          <span>Juros: <span className="text-foreground font-medium">{creditor.interestRate}% a.m.</span></span>
        )}
        {creditor.dueDate && (
          <span>Vencimento: <span className="text-foreground font-medium">{new Date(creditor.dueDate).toLocaleDateString("pt-BR")}</span></span>
        )}
      </div>

      <div>
        <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
          <span>{pct.toFixed(0)}% quitado</span>
          <span className="text-money">R$ {creditor.amountPaid.toLocaleString("pt-BR")} / {creditor.totalDebt.toLocaleString("pt-BR")}</span>
        </div>
        <Progress
          value={Math.min(pct, 100)}
          className={`h-2 bg-secondary ${isComplete ? "[&>div]:bg-chart-2" : status === "overdue" ? "[&>div]:bg-destructive" : status === "soon" ? "[&>div]:bg-yellow-500" : "[&>div]:bg-primary"}`}
        />
      </div>
    </div>
  );
}


/* ───── Payment History Timeline ───── */

function PaymentHistory({ cashflowMonths }: { cashflowMonths: ReturnType<typeof useFinanceStore>["cashflowMonths"] }) {
  const paidEntries = useMemo(() => {
    const entries: { month: string; year: number; label: string; amount: number }[] = [];
    cashflowMonths.forEach(m => {
      m.expenses.filter(e => e.paid).forEach(e => {
        entries.push({ month: m.month, year: m.year, label: e.label, amount: e.amount });
      });
    });
    return entries.slice(-12); // Last 12
  }, [cashflowMonths]);

  if (paidEntries.length === 0) return null;

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Histórico de Pagamentos</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-0">
          {paidEntries.map((e, i) => (
            <div key={i} className="flex gap-3 pb-3 last:pb-0">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-chart-2 mt-1.5" />
                {i < paidEntries.length - 1 && <div className="w-px flex-1 bg-border/50" />}
              </div>
              <div className="flex-1 flex items-center justify-between pb-2">
                <div>
                  <p className="text-sm text-foreground">{e.label}</p>
                  <p className="text-[11px] text-muted-foreground">{e.month} {e.year}</p>
                </div>
                <span className="text-sm font-semibold text-chart-2 text-money">
                  R$ {e.amount.toLocaleString("pt-BR")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ───── Due Date Alerts ───── */

function DueDateAlerts({ creditors }: { creditors: ReturnType<typeof useFinanceStore>["creditors"] }) {
  const alerts = creditors
    .filter(c => c.amountPaid < c.totalDebt && c.dueDate)
    .map(c => {
      const status = getDueDateStatus(c.dueDate);
      const due = new Date(c.dueDate!);
      const diffDays = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return { ...c, status, diffDays };
    })
    .filter(c => c.status !== "ok")
    .sort((a, b) => a.diffDays - b.diffDays);

  if (alerts.length === 0) return null;

  return (
    <Card className="border-destructive/20 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-destructive" />
          <CardTitle className="text-sm font-medium text-destructive uppercase tracking-wider">Alertas de Vencimento</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map(a => {
          const cfg = STATUS_CONFIG[a.status];
          return (
            <div key={a.id} className={`flex items-center justify-between p-3 rounded-lg ${cfg.bg}`}>
              <div className="flex items-center gap-2">
                <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                <div>
                  <p className="text-sm text-foreground">{a.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    R$ {(a.totalDebt - a.amountPaid).toLocaleString("pt-BR")} restantes
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-xs font-semibold ${cfg.color}`}>
                  {a.diffDays < 0 ? `${Math.abs(a.diffDays)} dias atrasado` : `${a.diffDays} dias`}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(a.dueDate!).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* ───── Payoff Time (48h/semana) ───── */

function PayoffTimeCard({
  totalRemaining,
  cashflowMonths,
}: {
  totalRemaining: number;
  cashflowMonths: ReturnType<typeof useFinanceStore>["cashflowMonths"];
}) {
  const { avgIncome, hourlyRate, workHours, calendarDays, workDays, weeks } = useMemo(() => {
    const totals = cashflowMonths.map((m) => m.incomes.reduce((s, i) => s + i.amount, 0));
    const positive = totals.filter((t) => t > 0);
    const avg = positive.length > 0 ? positive.reduce((s, t) => s + t, 0) / positive.length : 0;
    const rate = avg / HOURS_PER_MONTH;
    const hours = rate > 0 ? totalRemaining / rate : 0;
    const wks = hours / HOURS_PER_WEEK;
    const cal = wks * 7;
    const wDays = hours / 8; // 8h/dia útil
    return { avgIncome: avg, hourlyRate: rate, workHours: hours, calendarDays: cal, workDays: wDays, weeks: wks };
  }, [cashflowMonths, totalRemaining]);

  const totalHoursCeil = Math.ceil(workHours);
  const days = Math.floor(calendarDays);
  const hoursRemainder = Math.max(0, Math.ceil((calendarDays - days) * 24));

  if (totalRemaining <= 0) {
    return (
      <Card className="border-chart-2/30 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-5 text-center">
          <p className="text-sm text-chart-2 font-semibold">🎉 Sem dívida pendente — nada a quitar!</p>
        </CardContent>
      </Card>
    );
  }

  if (avgIncome <= 0) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Cadastre suas receitas para calcular o tempo de trabalho até a quitação.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-card/90 to-primary/5 backdrop-blur-sm overflow-hidden relative">
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/10 blur-3xl" />
      <CardHeader className="pb-3 relative">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Timer className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold tracking-tight">Tempo até a Quitação</CardTitle>
            <p className="text-xs text-muted-foreground">Baseado em escala de 48h/semana e sua renda média mensal</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-secondary/40">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Dias corridos</p>
            <p className="text-2xl font-bold text-primary text-money">{days}</p>
            <p className="text-[11px] text-muted-foreground">e {hoursRemainder}h</p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/40">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Horas de trabalho</p>
            <p className="text-2xl font-bold text-foreground text-money">{totalHoursCeil.toLocaleString("pt-BR")}h</p>
            <p className="text-[11px] text-muted-foreground">a 48h/semana</p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/40">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Semanas</p>
            <p className="text-2xl font-bold text-foreground text-money">{Math.ceil(weeks)}</p>
            <p className="text-[11px] text-muted-foreground">≈ {Math.ceil(workDays)} dias úteis (8h)</p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/40">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Valor/hora</p>
            <p className="text-2xl font-bold text-chart-2 text-money">R$ {hourlyRate.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground">Renda média: R$ {Math.round(avgIncome).toLocaleString("pt-BR")}</p>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <Briefcase className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Para quitar <span className="text-foreground font-semibold text-money">R$ {totalRemaining.toLocaleString("pt-BR")}</span>,
            você precisa trabalhar <span className="text-primary font-bold">{totalHoursCeil.toLocaleString("pt-BR")} horas</span>
            {" "}(≈ <span className="text-foreground font-semibold">{days} dias e {hoursRemainder} horas</span> corridos),
            considerando 48h semanais e sua renda média histórica.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ───── Ideal Income Suggestion ───── */

function IdealIncomeCard({
  banks,
  cashflowMonths,
  totalRemaining,
  currentIncome,
}: {
  banks: ReturnType<typeof useFinanceStore>["banks"];
  cashflowMonths: ReturnType<typeof useFinanceStore>["cashflowMonths"];
  totalRemaining: number;
  currentIncome: number;
}) {
  const {
    avgMonthlyCost,
    creditorAllocation,
    idealIncome,
    gap,
    status,
    statusLabel,
    statusColor,
    StatusIcon,
  } = useMemo(() => {
    const monthsWithCost = cashflowMonths.map((m) => {
      const manual = m.expenses.reduce((s, e) => s + e.amount, 0);
      const monthIdx = MONTH_MAP[m.month];
      const cardTotal = monthIdx === undefined ? 0 : cardSpendingForMonth(banks, monthIdx + 1, m.year);
      return manual + cardTotal;
    });

    const avgCost =
      monthsWithCost.length > 0
        ? monthsWithCost.reduce((s, c) => s + c, 0) / monthsWithCost.length
        : 0;

    // Suggest allocating enough to clear remaining debt in 24 months (conservative baseline)
    const allocation = totalRemaining > 0 ? totalRemaining / 24 : 0;
    const base = avgCost + allocation;
    const ideal = base * 1.2; // 20% safety margin

    const gapValue = ideal - currentIncome;
    let st: "ok" | "warn" | "danger";
    if (currentIncome >= ideal) st = "ok";
    else if (currentIncome >= ideal * 0.85) st = "warn";
    else st = "danger";

    const config = {
      ok: {
        label: "Renda cobre com folga",
        color: "text-chart-2",
        bg: "bg-chart-2/10",
        border: "border-chart-2/30",
        bar: "bg-chart-2",
        Icon: CheckCircle2,
      },
      warn: {
        label: "Renda cobre, mas sem margem",
        color: "text-yellow-500",
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/30",
        bar: "bg-yellow-500",
        Icon: AlertTriangle,
      },
      danger: {
        label: "Renda abaixo do ideal",
        color: "text-destructive",
        bg: "bg-destructive/10",
        border: "border-destructive/30",
        bar: "bg-destructive",
        Icon: TrendingDown,
      },
    }[st];

    return {
      avgMonthlyCost: avgCost,
      creditorAllocation: allocation,
      idealIncome: ideal,
      gap: gapValue,
      status: st,
      statusLabel: config.label,
      statusColor: config.color,
      StatusIcon: config.Icon,
    };
  }, [banks, cashflowMonths, totalRemaining, currentIncome]);

  const coverageRatio = idealIncome > 0 ? (currentIncome / idealIncome) * 100 : 100;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-card/90 to-primary/5 backdrop-blur-sm overflow-hidden relative">
      <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full bg-chart-2/10 blur-3xl" />
      <CardHeader className="pb-3 relative">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wallet className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold tracking-tight">Renda Ideal Sugerida</CardTitle>
              <p className="text-xs text-muted-foreground">Quanto sua renda deveria ser para cobrir custos com folga</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${status === "ok" ? "bg-chart-2/10 text-chart-2" : status === "warn" ? "bg-yellow-500/10 text-yellow-500" : "bg-destructive/10 text-destructive"}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {statusLabel}
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-secondary/40">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Renda ideal</p>
            <p className="text-2xl font-bold text-primary text-money">R$ {Math.round(idealIncome).toLocaleString("pt-BR")}</p>
            <p className="text-[11px] text-muted-foreground">com 20% de margem</p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/40">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Renda atual</p>
            <p className="text-2xl font-bold text-foreground text-money">R$ {Math.round(currentIncome).toLocaleString("pt-BR")}</p>
            <p className="text-[11px] text-muted-foreground">mês selecionado</p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/40">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gap</p>
            <p className={`text-2xl font-bold text-money ${gap > 0 ? "text-destructive" : "text-chart-2"}`}>
              {gap > 0 ? "+" : ""}R$ {Math.round(Math.abs(gap)).toLocaleString("pt-BR")}
            </p>
            <p className="text-[11px] text-muted-foreground">{gap > 0 ? "faltam" : "sobram"} por mês</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Cobertura atual</span>
            <span className="font-semibold text-foreground">{coverageRatio.toFixed(0)}% da renda ideal</span>
          </div>
          <div className="relative h-2.5 rounded-full bg-secondary overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${status === "ok" ? "bg-chart-2" : status === "warn" ? "bg-yellow-500" : "bg-destructive"}`}
              style={{ width: `${Math.min(coverageRatio, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <Calculator className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Consideramos seus custos médios mensais de{" "}
            <span className="text-foreground font-semibold text-money">R$ {Math.round(avgMonthlyCost).toLocaleString("pt-BR")}</span>
            {" "}mais uma alocação de{" "}
            <span className="text-foreground font-semibold text-money">R$ {Math.round(creditorAllocation).toLocaleString("pt-BR")}</span>
            /mês para quitar dívidas em 24 meses, com 20% de reserva.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ───── Page ───── */


export default function DividaPage() {
  const store = useFinanceStore();

  // Fixed initial debt baseline (user-defined). Current totalDebt is trusted;
  // amortization is derived so that remaining === store.totalDebt.
  // Real debt paid so far: paid installments + creditor amortization (used for pace metrics only)
  const paidInstallmentsTotal = useMemo(
    () => store.banks.reduce(
      (s, b) => s + b.installments.filter(i => i.status === "pago").reduce((x, i) => x + i.installmentAmount, 0),
      0,
    ),
    [store.banks],
  );
  const totalRemaining = store.totalDebt;
  const totalAbatido = paidInstallmentsTotal + store.totalCreditorsPaid;
  const initialTotalDebt = totalRemaining + totalAbatido;
  const pctQuitado = initialTotalDebt > 0 ? Math.round((totalAbatido / initialTotalDebt) * 100) : 0;

  // Average monthly abatement based on months with actual paid installments
  const monthsWithPayments = useMemo(() => {
    const set = new Set<string>();
    store.banks.forEach(b => b.installments.forEach(i => {
      if (i.status === "pago") set.add(i.dueDate.slice(0, 7));
    }));
    return set.size;
  }, [store.banks]);
  const avgMonthly = monthsWithPayments > 0 ? paidInstallmentsTotal / monthsWithPayments : 0;
  const monthsToPayOff = avgMonthly > 0 ? Math.ceil(totalRemaining / avgMonthly) : 0;

  // Extra rich metrics
  const totalInstallmentsCount = store.banks.reduce((s, b) => s + b.installments.length, 0);
  const paidInstallmentsCount = store.banks.reduce(
    (s, b) => s + b.installments.filter(i => i.status === "pago").length,
    0,
  );
  const overdueCount = store.banks.reduce(
    (s, b) => s + b.installments.filter(i => i.status === "atrasado").length,
    0,
  );
  const avgInterest = useMemo(() => {
    const rates = store.creditors.filter(c => (c.interestRate ?? 0) > 0).map(c => c.interestRate!);
    return rates.length > 0 ? rates.reduce((s, r) => s + r, 0) / rates.length : 0;
  }, [store.creditors]);
  const nextInstallment = useMemo(() => {
    const now = Date.now();
    return store.allInstallments
      .filter((i) => new Date(i.dueDate + "T00:00:00").getTime() >= now)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  }, [store.allInstallments]);
  const highestDebt = useMemo(() => {
    const sorted = [...store.banks].filter(b => b.status !== "cancelado").sort((a, b) => b.limitUsed - a.limitUsed);
    return sorted[0];
  }, [store.banks]);

  // Donut data: combine banks + creditors
  const donutData = useMemo(() => {
    const bankItems = store.banks.map(b => {
      const totalOwed = remainingBankDebt(b);
      const paid = b.installments
        .filter(inst => inst.status === "pago")
        .reduce((s, inst) => s + inst.installmentAmount, 0);
      return { name: b.name, value: totalOwed + paid, paid };
    });
    const creditorItems = store.creditors.map(c => ({
      name: c.name, value: c.totalDebt, paid: c.amountPaid,
    }));
    return [...bankItems, ...creditorItems].filter(d => d.value > 0);
  }, [store.banks, store.creditors]);

  // Sort creditors by urgency (highest interest first)
  const sortedCreditors = useMemo(() => {
    return [...store.creditors].sort((a, b) => (b.interestRate ?? 0) - (a.interestRate ?? 0));
  }, [store.creditors]);

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8 max-w-[1600px] mx-auto space-y-8 pb-24 md:pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dívida</h1>
          <p className="text-sm text-muted-foreground">Acompanhe a evolução e abatimento da sua dívida total</p>
        </div>
        <ExportXlsxButton />
      </div>

      {/* Payoff Time (48h/semana) */}
      <PayoffTimeCard totalRemaining={totalRemaining} cashflowMonths={store.cashflowMonths} />

      {/* Ideal income suggestion */}
      <IdealIncomeCard
        banks={store.banks}
        cashflowMonths={store.cashflowMonths}
        totalRemaining={totalRemaining}
        currentIncome={store.totalIncome}
      />

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingDown}
          label="Dívida Atual"
          value={`R$ ${store.totalDebt.toLocaleString("pt-BR")}`}
          sub={`Saldo + pagamentos registrados: R$ ${initialTotalDebt.toLocaleString("pt-BR")}`}
          color="bg-destructive/10 text-destructive"
        />
        <StatCard
          icon={TrendingUp}
          label="Pagamentos Registrados"
          value={`R$ ${totalAbatido.toLocaleString("pt-BR")}`}
          sub={`${paidInstallmentsCount}/${totalInstallmentsCount} parcelas pagas`}
          color="bg-chart-2/10 text-chart-2"
        />
        <StatCard
          icon={Percent}
          label="Quanto Falta"
          value={`R$ ${totalRemaining.toLocaleString("pt-BR")}`}
          sub={`${pctQuitado}% quitado`}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          icon={CalendarDays}
          label="Previsão"
          value={monthsToPayOff > 0 ? `${monthsToPayOff} meses` : "—"}
          sub={avgMonthly > 0 ? `Ritmo: R$ ${Math.round(avgMonthly).toLocaleString("pt-BR")}/mês` : "sem histórico ainda"}
          color="bg-accent/50 text-accent-foreground"
        />
      </div>

      {/* Extra info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={AlertTriangle}
          label="Parcelas Atrasadas"
          value={`${overdueCount}`}
          sub={overdueCount > 0 ? "Atenção urgente" : "Tudo em dia"}
          color={overdueCount > 0 ? "bg-destructive/10 text-destructive" : "bg-chart-2/10 text-chart-2"}
        />
        <StatCard
          icon={Percent}
          label="Juros Médio (credores)"
          value={avgInterest > 0 ? `${avgInterest.toFixed(2)}% a.m.` : "—"}
          sub={`${store.creditors.length} credores`}
          color="bg-yellow-500/10 text-yellow-500"
        />
        <StatCard
          icon={Clock}
          label="Próximo Vencimento"
          value={nextInstallment ? `R$ ${nextInstallment.installmentAmount.toLocaleString("pt-BR")}` : "—"}
          sub={nextInstallment ? `${nextInstallment.bankName} · ${new Date(nextInstallment.dueDate).toLocaleDateString("pt-BR")}` : "sem parcelas"}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          icon={Flame}
          label="Maior Dívida"
          value={highestDebt ? `R$ ${highestDebt.limitUsed.toLocaleString("pt-BR")}` : "—"}
          sub={highestDebt?.name ?? ""}
          color="bg-destructive/10 text-destructive"
        />
      </div>

      {/* Due Date Alerts */}
      <DueDateAlerts creditors={store.creditors} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
        <DebtTrackingChart />
        <DebtDonutChart data={donutData} />
      </div>

      {/* Debt cards per creditor - sorted by urgency */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
            <Zap className="w-4.5 h-4.5 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">Dívidas por Urgência</h2>
            <p className="text-xs text-muted-foreground">Ordenado por maior taxa de juros</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedCreditors.map(c => (
            <DebtCard key={c.id} creditor={c} />
          ))}
        </div>
      </section>

      {/* History */}
      <PaymentHistory cashflowMonths={store.cashflowMonths} />

      {/* Creditors CRUD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CreditorWidget
          creditors={store.creditors}
          totalDebt={store.totalCreditorsDebt}
          totalPaid={store.totalCreditorsPaid}
          onAdd={store.addCreditor}
          onRemove={store.removeCreditor}
          onUpdate={store.updateCreditor}
        />
      </div>
    </div>
  );
}

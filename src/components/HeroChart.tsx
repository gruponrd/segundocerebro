import { useState, useMemo } from "react";
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { type CashflowMonth, type Bank } from "@/data/financialData";
import { TrendingDown, Target, Pencil, Check, X, ChevronDown, ChevronUp, CreditCard, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/hooks/use-theme";
import { type Creditor } from "@/data/financialData";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { cardSpendingForMonth, remainingBankDebt, unpaidCardSpendingForMonth } from "@/lib/financeCalculations";
import { money } from "@/lib/planningTools";

const monthNameToIndex: Record<string, number> = {
  Janeiro: 0, Fevereiro: 1, "Março": 2, Abril: 3,
  Maio: 4, Junho: 5, Julho: 6, Agosto: 7,
  Setembro: 8, Outubro: 9, Novembro: 10, Dezembro: 11,
};

interface HeroChartProps {
  cashflowMonths: CashflowMonth[];
  totalDebt: number;
  totalExpense: number;
  expectedBalance: number;
  savingsGoalMonth: number;
  onSavingsGoalChange: (v: number) => void;
  selectedMonth: number;
  banks: Bank[];
  creditors: Creditor[];
  cardExpensesForMonth: number;
}

export function HeroChart({ cashflowMonths, totalDebt, totalExpense, expectedBalance, savingsGoalMonth, onSavingsGoalChange, selectedMonth, banks, creditors, cardExpensesForMonth }: HeroChartProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const isMonochrome = theme === "monochrome";
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalValue, setGoalValue] = useState(String(savingsGoalMonth));
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Calculate cumulative card payments from month 0 through selectedMonth
  // Find the index of the current real month in cashflowMonths
  const currentRealMonthIndex = useMemo(() => {
    const now = new Date();
    const curMonth = now.getMonth(); // 0-based
    const curYear = now.getFullYear();
    return cashflowMonths.findIndex((m) => {
      const mIdx = monthNameToIndex[m.month] ?? 0;
      return mIdx === curMonth && m.year === curYear;
    });
  }, [cashflowMonths]);

  // Calculate card payments from current real month through selectedMonth
  const cumulativeCardPayments = useMemo(() => {
    const startIdx = Math.max(currentRealMonthIndex, 0);
    let total = 0;
    for (let i = startIdx; i <= selectedMonth && i < cashflowMonths.length; i++) {
      const m = cashflowMonths[i];
      const mIdx = monthNameToIndex[m.month] ?? 0;
      const monthNum = mIdx + 1;
      total += unpaidCardSpendingForMonth(banks, monthNum, m.year);
    }
    return total;
  }, [banks, cashflowMonths, selectedMonth, currentRealMonthIndex]);

  // Build breakdown items
  const breakdownItems = useMemo(() => {
    const items: { label: string; value: number; type: "debt" | "payment"; icon: "card" | "creditor" }[] = [];
    
    // Bank debts
    banks.forEach((b) => {
      const used = remainingBankDebt(b);
      if (used > 0) {
        items.push({ label: b.name, value: used, type: "debt", icon: "card" });
      }
    });
    
    // Creditor debts
    creditors.forEach((c) => {
      const remaining = c.totalDebt - c.amountPaid;
      if (remaining > 0) {
        items.push({ label: c.name, value: remaining, type: "debt", icon: "creditor" });
      }
    });
    
    return items;
  }, [banks, creditors]);

  const handleSaveGoal = () => {
    const val = parseFloat(goalValue);
    if (!isNaN(val) && val >= 0) onSavingsGoalChange(val);
    setEditingGoal(false);
  };

  // Calculate previous month balance for trend
  const prevBalance = useMemo(() => {
    if (selectedMonth <= 0) return null;
    const prev = cashflowMonths[selectedMonth - 1];
    const inc = prev.incomes.reduce((s, i) => s + i.amount, 0);
    const exp = prev.expenses.reduce((s, e) => s + e.amount, 0);
    const card = cardSpendingForMonth(banks, monthNameToIndex[prev.month] + 1, prev.year);
    return inc - exp - card;
  }, [cashflowMonths, selectedMonth, banks]);

  // Build chart data with solid lines for past months & dashed for future
  const chartData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-based
    const currentYear = now.getFullYear();

    const result = cashflowMonths.flatMap((m) => {
      const mIdx = monthNameToIndex[m.month] ?? 0;
      const isPast = m.year < currentYear || (m.year === currentYear && mIdx <= currentMonth);
      const entradas = m.incomes.reduce((s, i) => s + i.amount, 0);
      const manualSaidas = m.expenses.reduce((s, e) => s + e.amount, 0);

      // Add card installments for this month
      const monthNum = mIdx + 1;
      const cardSaidas = cardSpendingForMonth(banks, monthNum, m.year);
      const saidas = manualSaidas + cardSaidas;

      // A blank calendar month is not a financial observation.
      if (m.incomes.length === 0 && m.expenses.length === 0 && cardSaidas === 0) return [];

      return [{
        month: `${m.month.slice(0, 3)}/${m.year}`,
        entradas: isPast ? entradas : undefined as number | undefined,
        saidas: isPast ? saidas : undefined as number | undefined,
        future_entradas: !isPast ? entradas : undefined as number | undefined,
        future_saidas: !isPast ? saidas : undefined as number | undefined,
      }];
    });

    // Bridge: last past month should also appear in future series for continuity
    let lastPastIdx = -1;
    for (let i = result.length - 1; i >= 0; i--) { if (result[i].entradas !== undefined) { lastPastIdx = i; break; } }
    if (lastPastIdx >= 0 && lastPastIdx < result.length - 1) {
      result[lastPastIdx].future_entradas = result[lastPastIdx].entradas;
      result[lastPastIdx].future_saidas = result[lastPastIdx].saidas;
    }


    return result;
  }, [cashflowMonths, banks]);

  const incomeColor = isMonochrome ? "hsl(0 0% 100%)" : "hsl(145 63% 42%)";
  const expenseColor = isMonochrome ? "hsl(0 0% 60%)" : "hsl(0 72% 51%)";

  return (
    <section className="mb-8 animate-float-in">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="data-surface p-5 relative overflow-hidden flex flex-col">

          <div className="relative flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground">
              Entradas e saídas
            </h3>
            <span className="text-[10px] font-medium text-primary/80 px-2 py-0.5 rounded-full bg-primary/10 ring-1 ring-primary/20">
              {cashflowMonths[selectedMonth]?.month.slice(0, 3)}/{cashflowMonths[selectedMonth]?.year}
            </span>
          </div>
          <div key={selectedMonth} className="relative flex-1 min-h-[240px] animate-float-in">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-income" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={incomeColor} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={incomeColor} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-expense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={expenseColor} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={expenseColor} stopOpacity={0} />
                  </linearGradient>
                  <filter id="glow-line" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "hsl(240 5% 90%)" : isMonochrome ? "hsl(0 0% 18% / 0.5)" : "hsl(240 5% 18% / 0.5)"} />
                <XAxis dataKey="month" tick={{ fill: isLight ? "hsl(240 5% 40%)" : isMonochrome ? "hsl(0 0% 55%)" : "hsl(240 5% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: isLight ? "hsl(240 5% 40%)" : isMonochrome ? "hsl(0 0% 55%)" : "hsl(240 5% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = { entradas: "Entradas", saidas: "Saídas", future_entradas: "Entradas (Projeção)", future_saidas: "Saídas (Projeção)" };
                    return [value === undefined ? "—" : money(value), labels[name] || name];
                  }}
                  contentStyle={{
                    background: isLight ? "hsl(0 0% 100% / 0.95)" : isMonochrome ? "hsl(0 0% 6% / 0.95)" : "hsl(240 6% 10% / 0.95)",
                    border: `1px solid ${isLight ? "hsl(240 5% 87%)" : isMonochrome ? "hsl(0 0% 25% / 0.4)" : "hsl(240 5% 25% / 0.4)"}`,
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: isLight ? "hsl(240 10% 10%)" : isMonochrome ? "hsl(0 0% 95%)" : "hsl(0 0% 95%)",
                    boxShadow: "0 8px 32px -8px hsl(var(--primary) / 0.25)",
                  }}
                />
                {/* Gradient area fills */}
                <Area type="monotone" dataKey="entradas" stroke="none" fill="url(#grad-income)" isAnimationActive animationDuration={800} connectNulls={false} />
                <Area type="monotone" dataKey="saidas" stroke="none" fill="url(#grad-expense)" isAnimationActive animationDuration={800} connectNulls={false} />
                {/* Glowing lines */}
                <Line type="monotone" dataKey="entradas" stroke={incomeColor} strokeWidth={2.5} dot={{ r: 4, fill: incomeColor }} activeDot={{ r: 6 }} name="entradas" connectNulls={false} filter="url(#glow-line)" isAnimationActive animationDuration={900} />
                <Line type="monotone" dataKey="saidas" stroke={expenseColor} strokeWidth={2.5} dot={{ r: 4, fill: expenseColor }} activeDot={{ r: 6 }} name="saidas" connectNulls={false} filter="url(#glow-line)" isAnimationActive animationDuration={900} />
                {/* Future/dashed lines */}
                <Line type="monotone" dataKey="future_entradas" stroke={incomeColor} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, fill: incomeColor, strokeDasharray: "" }} name="future_entradas" connectNulls={false} isAnimationActive animationDuration={900} />
                <Line type="monotone" dataKey="future_saidas" stroke={expenseColor} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, fill: expenseColor, strokeDasharray: "" }} name="future_saidas" connectNulls={false} isAnimationActive animationDuration={900} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="relative flex gap-5 mt-3">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="w-3 h-3 rounded-sm bg-income inline-block shadow-[0_0_8px_hsl(145_63%_42%/0.6)]" /> Entradas</span>
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="w-3 h-3 rounded-sm bg-expense inline-block shadow-[0_0_8px_hsl(0_72%_51%/0.6)]" /> Saídas</span>
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="w-3 h-0.5 border-t-2 border-dashed border-muted-foreground inline-block" /> Projeção</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 stagger-children">

          {/* Dívida Total */}
          <div
            className="widget-card p-4 flex-1 flex flex-col justify-between"
            style={{ ["--widget-accent" as string]: "var(--widget-accent-debt)" }}
          >
            <div className="relative flex items-start justify-between gap-3">
              <span className="widget-label">Dívida Total</span>
              <span className="widget-sub text-[10px]">Em aberto</span>
            </div>
            <div className="relative flex items-end justify-between gap-3 mt-2">
              <p className="widget-value text-[2rem] leading-none font-semibold">
                <AnimatedNumber value={totalDebt} prefix="R$ " decimals={2} />
              </p>
              <div className="flex items-end gap-[3px] h-8 shrink-0">
                {breakdownItems.slice(0, 12).map((item, i) => {
                  const max = Math.max(...breakdownItems.map((b) => b.value), 1);
                  return (
                    <span
                      key={i}
                      className="w-[5px] rounded-full"
                      style={{
                        height: `${Math.max(12, (item.value / max) * 100)}%`,
                        background: "hsl(var(--widget-accent))",
                        opacity: 0.35 + (item.value / max) * 0.65,
                      }}
                    />
                  );
                })}
              </div>
            </div>
            <p className="relative text-[10px] widget-sub mt-2">Cartões + Credores</p>
          </div>

          {/* Próximo Total */}
          <div
            className="widget-card p-4 flex-1"
            style={{ ["--widget-accent" as string]: "var(--widget-accent-next)" }}
          >
            <div
              className="relative cursor-pointer rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              role="button"
              tabIndex={0}
              aria-label="Ver composição das dívidas e parcelas previstas"
              aria-expanded={showBreakdown}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setShowBreakdown(current => !current); } }}
              onClick={() => setShowBreakdown(!showBreakdown)}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="widget-label">Após parcelas previstas</span>
                <div className="flex items-center gap-2">
                  {totalDebt > 0 && cumulativeCardPayments > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold widget-accent">
                      <TrendingDown className="w-3 h-3" />
                      −{((cumulativeCardPayments / totalDebt) * 100).toFixed(1)}%
                    </span>
                  )}
                  <span className="widget-sub">
                    {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </span>
                </div>
              </div>
              <p className="widget-value text-[2rem] leading-none font-semibold mt-2">
                <AnimatedNumber value={Math.max(totalDebt - cumulativeCardPayments, 0)} prefix="R$ " decimals={2} />
              </p>
              <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--widget-line) / 0.08)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${totalDebt > 0 ? Math.min(100, (cumulativeCardPayments / totalDebt) * 100) : 0}%`,
                    background: "hsl(var(--widget-accent))",
                    boxShadow: "0 0 12px hsl(var(--widget-accent) / 0.8)",
                  }}
                />
              </div>
              <p className="text-[10px] widget-sub mt-2">
                Se as parcelas até {cashflowMonths[selectedMonth]?.month.slice(0, 3)}/{cashflowMonths[selectedMonth]?.year} forem pagas (−{money(cumulativeCardPayments)})
              </p>
            </div>

            {showBreakdown && (
              <div className="relative mt-3 pt-3 space-y-1.5 animate-float-in" style={{ borderTop: "1px solid hsl(var(--widget-line) / 0.08)" }}>
                <p className="widget-label mb-2">Composição da Dívida</p>
                {breakdownItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: "hsl(var(--widget-line) / 0.08)" }}>
                      {item.icon === "card" ? (
                        <CreditCard className="w-3 h-3 widget-sub" />
                      ) : (
                        <Users className="w-3 h-3 widget-sub" />
                      )}
                    </div>
                    <span className="flex-1 widget-sub truncate">{item.label}</span>
                    <span className="font-medium tabular-nums" style={{ color: "hsl(var(--widget-line) / 0.85)" }}>
                      R$ {item.value.toLocaleString("pt-BR")}
                    </span>
                  </div>
                ))}
                {cumulativeCardPayments > 0 && (
                  <>
                    <div className="my-2" style={{ borderTop: "1px dashed hsl(var(--widget-line) / 0.12)" }} />
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: "hsl(var(--widget-accent) / 0.15)" }}>
                        <Check className="w-3 h-3 widget-accent" />
                      </div>
                      <span className="flex-1 widget-accent">Parcelas previstas até {cashflowMonths[selectedMonth]?.month.slice(0, 3)}</span>
                      <span className="widget-accent font-medium tabular-nums">
                        −R$ {cumulativeCardPayments.toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Meta de Economia */}
          <div
            className="widget-card p-4 flex-1 group flex flex-col justify-between"
            style={{ ["--widget-accent" as string]: "var(--widget-accent-goal)" }}
          >
            <div className="relative flex items-start justify-between gap-3">
              <span className="widget-label">Meta de Economia</span>
              <Target className="w-4 h-4 widget-accent" />
            </div>
            {editingGoal ? (
              <div className="relative flex items-center gap-1 mt-2">
                <Input type="number" value={goalValue} onChange={(e) => setGoalValue(e.target.value)} className="h-8 text-sm rounded-lg w-28" autoFocus />
                <button onClick={handleSaveGoal} className="p-1 rounded hover:bg-income/20 text-income"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditingGoal(false)} className="p-1 rounded hover:bg-expense/20 text-expense"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  aria-label="Editar meta mensal de economia"
                  className="relative widget-value text-left text-[2rem] leading-none font-semibold mt-2 cursor-pointer rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  onClick={() => { setGoalValue(String(savingsGoalMonth)); setEditingGoal(true); }}
                >
                  {money(savingsGoalMonth)}
                  <span className="text-xs widget-sub font-normal ml-1">/mês</span>
                  <Pencil className="w-3 h-3 inline ml-2 opacity-60" />
                </button>
                <div className="relative mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--widget-line) / 0.08)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${savingsGoalMonth > 0 ? Math.min(100, Math.max(0, (expectedBalance / savingsGoalMonth) * 100)) : 0}%`,
                      background: "hsl(var(--widget-accent))",
                      boxShadow: "0 0 12px hsl(var(--widget-accent) / 0.8)",
                    }}
                  />
                </div>
                <p className="relative text-[10px] widget-sub mt-2">
                  Saldo previsto: {money(expectedBalance)}
                </p>
              </>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}

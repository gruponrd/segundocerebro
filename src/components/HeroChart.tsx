import { useState, useMemo, useId, useRef } from "react";
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { type CashflowMonth, type Bank } from "@/data/financialData";
import { TrendingDown, Target, Pencil, Check, X, ChevronDown, ChevronUp, CreditCard, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/hooks/use-theme";
import { type Creditor } from "@/data/financialData";
import { MonthlySurplusChart } from "@/components/MonthlySurplusChart";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { cardSpendingForMonth, remainingBankDebt, unpaidCardSpendingForMonth } from "@/lib/financeCalculations";
import { compactReais, parseSavingsGoal } from "@/lib/dashboardPresentation";
import { money } from "@/lib/planningTools";
import { buildPanoramaSeries, panoramaTicks, periodLabel, YEAR_CUT } from "@/lib/panoramaSeries";

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
  const goalInputId = useId();
  const goalButton = useRef<HTMLButtonElement>(null);
  const [goalError, setGoalError] = useState("");
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

  const closeGoalEditor = () => {
    setEditingGoal(false);
    setGoalError("");
    requestAnimationFrame(() => goalButton.current?.focus());
  };
  const handleSaveGoal = () => {
    const val = parseSavingsGoal(goalValue);
    if (val === null) {
      setGoalError("Informe um valor válido, igual ou maior que zero, em reais.");
      return;
    }
    onSavingsGoalChange(val);
    closeGoalEditor();
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

  const chartData = useMemo(() => buildPanoramaSeries(cashflowMonths, banks), [cashflowMonths, banks]);

  const incomeColor = isMonochrome ? "hsl(0 0% 100%)" : "hsl(var(--income))";
  const expenseColor = isMonochrome ? "hsl(0 0% 60%)" : "hsl(var(--expense))";

  return (
    <section className="financial-panorama mb-8 animate-float-in">
      <div className="panorama-grid grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="panorama-chart data-surface p-5 relative overflow-hidden flex flex-col">

          <div className="relative flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-foreground">
              Entradas e saídas
            </h3>
            <span className="text-[10px] font-medium text-primary/80 px-2 py-0.5 rounded-full bg-primary/10 ring-1 ring-primary/20">
              {cashflowMonths[selectedMonth]?.month.slice(0, 3)}/{cashflowMonths[selectedMonth]?.year}
            </span>
          </div>
          <div key={selectedMonth} className="panorama-plot relative flex-1 min-h-[240px] animate-float-in" role="img" aria-label="Entradas e saídas até março de 2027, com corte após dezembro de 2026. Saídas incluem as parcelas dos cartões. Valores e hipóteses disponíveis na tabela abaixo.">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-income" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={incomeColor} stopOpacity={0.07} />
                    <stop offset="100%" stopColor={incomeColor} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-expense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={expenseColor} stopOpacity={0.05} />
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
                <XAxis dataKey="period" type="number" domain={["dataMin", "dataMax"]} ticks={panoramaTicks(chartData)} tickFormatter={periodLabel} interval="preserveStartEnd" minTickGap={18} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis width={58} tick={{ fill: isLight ? "hsl(240 5% 40%)" : isMonochrome ? "hsl(0 0% 55%)" : "hsl(240 5% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={compactReais} />
                <ReferenceLine x={(cashflowMonths[selectedMonth]?.year ?? 2026) * 12 + (monthNameToIndex[cashflowMonths[selectedMonth]?.month] ?? 0)} stroke="hsl(var(--accent))" strokeOpacity={0.45} strokeDasharray="2 4" />
                <ReferenceLine x={YEAR_CUT} stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="5 4" label={{ value: "2027", position: "insideTopLeft", fill: "hsl(var(--foreground))", fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    const row = payload?.[0]?.payload;
                    return active && row ? <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs text-foreground shadow-lg"><p className="text-muted-foreground">{row.month} · {row.estimated ? `Estimativa, base ${row.baseline}` : "Previsto nos lançamentos"}</p><p className="mt-1">Entradas: {money(row.entradas ?? row.future_entradas ?? 0)}</p><p>Saídas: {money(row.saidas ?? row.future_saidas ?? 0)}</p></div> : null;
                  }}
                />
                {/* Gradient area fills */}
                <Area type="monotone" dataKey="entradas" stroke="none" fill="url(#grad-income)" isAnimationActive={false} connectNulls={false} />
                <Area type="monotone" dataKey="saidas" stroke="none" fill="url(#grad-expense)" isAnimationActive={false} connectNulls={false} />
                {/* Glowing lines */}
                <Line type="monotone" dataKey="entradas" stroke={incomeColor} strokeWidth={1.75} dot={{ r: 2, fill: incomeColor }} activeDot={{ r: 6 }} name="entradas" connectNulls={false}  isAnimationActive={false} />
                <Line type="monotone" dataKey="saidas" stroke={expenseColor} strokeWidth={1.75} dot={{ r: 2, fill: expenseColor }} activeDot={{ r: 6 }} name="saidas" connectNulls={false}  isAnimationActive={false} />
                {/* Future/dashed lines */}
                <Line type="monotone" dataKey="future_entradas" stroke={incomeColor} strokeWidth={1.5} strokeDasharray="4 5" dot={{ r: 3, fill: incomeColor, strokeDasharray: "" }} name="future_entradas" connectNulls={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="future_saidas" stroke={expenseColor} strokeWidth={1.5} strokeDasharray="4 5" dot={{ r: 3, fill: expenseColor, strokeDasharray: "" }} name="future_saidas" connectNulls={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="relative flex gap-5 mt-3">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="w-3 h-3 rounded-sm bg-income inline-block shadow-[0_0_8px_hsl(145_63%_42%/0.6)]" /> Entradas</span>
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="w-3 h-3 rounded-sm bg-expense inline-block shadow-[0_0_8px_hsl(0_72%_51%/0.6)]" /> Saídas</span>
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="w-3 h-0.5 border-t-2 border-dashed border-muted-foreground inline-block" /> Projeção</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Até mar/2027 · Corte após dez/2026{chartData.some(point => point.estimated) ? " · 2027 estimado" : ""}</p>
          <details className="surplus-values mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer">Ver entradas e saídas mensais</summary>
            <p className="mt-2 leading-5">Valores previstos, incluindo lançamentos pagos e pendentes. Saídas já incluem as parcelas dos cartões. O tracejado indica os próximos meses.</p>
            {chartData.some(point => point.estimated) && <p className="mt-2 leading-5">Meses de 2027 sem lançamentos usam receitas e despesas manuais de {chartData.find(point => point.estimated)?.baseline}, mais as parcelas cadastradas para cada mês. Estimativa visual, sem criar ou alterar registros.</p>}
            <table className="mt-2 w-full text-left"><caption className="sr-only">Entradas e saídas previstas por mês em reais</caption><thead><tr><th scope="col" className="py-2 font-medium">Mês</th><th scope="col" className="py-2 text-right font-medium">Entradas</th><th scope="col" className="py-2 text-right font-medium">Saídas</th></tr></thead><tbody>{chartData.map(point => <tr key={point.month} className="border-t border-border"><th scope="row" className="py-2 font-normal">{point.month}{point.estimated && <small className="block">Estimativa</small>}</th><td className="py-2 text-right tabular-nums">{money(point.entradas ?? point.future_entradas ?? 0)}</td><td className="py-2 text-right tabular-nums">{money(point.saidas ?? point.future_saidas ?? 0)}</td></tr>)}</tbody></table>
          </details>
        </div>

        <MonthlySurplusChart data={chartData} monthLabel={`${cashflowMonths[selectedMonth]?.month.slice(0,3)}/${cashflowMonths[selectedMonth]?.year}`} balance={expectedBalance} />

        <div className="panorama-metrics flex flex-col gap-3 stagger-children">

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
              <form noValidate className="relative mt-2" onSubmit={(event) => { event.preventDefault(); handleSaveGoal(); }} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); closeGoalEditor(); } }}>
                <label htmlFor={goalInputId} className="block text-xs text-muted-foreground mb-2">Meta mensal em reais</label>
                <div className="flex items-center gap-1">
                  <Input id={goalInputId} type="number" inputMode="decimal" min="0" step="0.01" required value={goalValue} onChange={(e) => { setGoalValue(e.target.value); setGoalError(""); }} aria-invalid={!!goalError} aria-describedby={goalError ? `${goalInputId}-error` : undefined} className="h-10 text-base rounded-lg min-w-0 flex-1" autoFocus />
                  <button type="submit" aria-label="Salvar meta mensal de economia" className="icon-action text-income hover:bg-income/20"><Check className="w-4 h-4" /></button>
                  <button type="button" aria-label="Cancelar edição da meta mensal" onClick={closeGoalEditor} className="icon-action text-expense hover:bg-expense/20"><X className="w-4 h-4" /></button>
                </div>
                {goalError && <p id={`${goalInputId}-error`} role="alert" className="text-xs text-expense mt-2">{goalError}</p>}
              </form>
            ) : (
              <>
                <button
                  type="button"
                  ref={goalButton}
                  aria-label="Editar meta mensal de economia"
                  className="savings-goal-trigger relative widget-value text-left text-[2rem] leading-none font-semibold mt-2 cursor-pointer rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  onClick={() => { setGoalValue(String(savingsGoalMonth)); setGoalError(""); setEditingGoal(true); }}
                >
                  {money(savingsGoalMonth)}
                  <span className="text-xs widget-sub font-normal ml-1">/mês</span>
                  <Pencil className="w-3 h-3 inline ml-2 opacity-60" />
                </button>
                <div role="progressbar" aria-label="Cobertura prevista da meta mensal" aria-valuemin={0} aria-valuemax={100} aria-valuenow={savingsGoalMonth > 0 ? Math.min(100, Math.max(0, expectedBalance / savingsGoalMonth * 100)) : 0} aria-valuetext={savingsGoalMonth > 0 ? `${Math.round(Math.max(0, expectedBalance / savingsGoalMonth * 100))}% de cobertura pelo saldo projetado; não representa dinheiro guardado` : "Meta mensal não definida"} className="relative mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--widget-line) / 0.08)" }}>
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
                  {savingsGoalMonth <= 0 ? "Defina uma meta mensal para ver a cobertura prevista." : expectedBalance >= savingsGoalMonth ? "O saldo projetado cobre a meta mensal." : `Faltam ${money(savingsGoalMonth - Math.max(0, expectedBalance))} de saldo projetado para cobrir a meta.`}
                  <span className="block mt-1">Cobertura prevista · não é dinheiro guardado.</span>
                </p>
              </>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}

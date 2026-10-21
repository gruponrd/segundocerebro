import { useMemo } from "react";
import { useFinanceStore } from "@/stores/financeStore";
import { Shield } from "lucide-react";
import { unpaidCardSpendingForMonth } from "@/lib/financeCalculations";

const HEALTH_STAGES = [
  { label: "Atenção", range: "0–39", color: "#fb7185", start: 0, end: 39 },
  { label: "Em equilíbrio", range: "40–69", color: "#fbbf24", start: 40, end: 69 },
  { label: "Saudável", range: "70–100", color: "#34d399", start: 70, end: 100 },
];

function gaugePoint(value: number) {
  const angle = Math.PI * (1 - value / 100);
  return { x: 120 + 92 * Math.cos(angle), y: 112 - 92 * Math.sin(angle) };
}

export function FinancialHealthScore() {
  const store = useFinanceStore();

  const { score, tips } = useMemo(() => {
    const factors: { name: string; score: number; weight: number }[] = [];

    // Dynamic debt: only pending installments + remaining creditors (updates as bills get paid)
    const pendingBankDebt = store.banks.reduce((sum, b) => sum + b.limitUsed, 0);
    const pendingCardExpensesMonth = (() => {
      const MONTH_MAP: Record<string, number> = { "Janeiro":1,"Fevereiro":2,"Março":3,"Abril":4,"Maio":5,"Junho":6,"Julho":7,"Agosto":8,"Setembro":9,"Outubro":10,"Novembro":11,"Dezembro":12 };
      const monthNum = MONTH_MAP[store.currentCashflow.month];
      const year = store.currentCashflow.year;
      if (!monthNum) return store.cardExpensesForMonth;
      return unpaidCardSpendingForMonth(store.banks, monthNum, year);
    })();
    const dynamicTotalDebt = pendingBankDebt + (store.totalCreditorsDebt - store.totalCreditorsPaid);

    // 1. Balance ratio (only pending expenses count against income)
    const balanceRatio = store.totalIncome > 0
      ? Math.max(0, Math.min(((store.totalIncome - store.totalExpense + store.cardExpensesForMonth - pendingCardExpensesMonth) / store.totalIncome) * 100, 100))
      : 0;
    factors.push({ name: "Saldo", score: balanceRatio, weight: 0.3 });

    // 2. Debt-to-income ratio (lower is better) — uses dynamic debt
    const dti = store.totalIncome > 0
      ? Math.min(dynamicTotalDebt / (store.totalIncome * 6), 1)
      : 1;
    factors.push({ name: "Dívida/Renda", score: (1 - dti) * 100, weight: 0.25 });

    // 3. Creditors paid ratio
    const creditorTotal = store.totalCreditorsDebt;
    const creditorScore = creditorTotal > 0
      ? (store.totalCreditorsPaid / creditorTotal) * 100
      : 50;
    factors.push({ name: "Credores", score: creditorScore, weight: 0.2 });

    // 4. Goals progress
    const goalsScore = store.goals.length > 0
      ? store.goals.reduce((acc, g) => acc + Math.min((g.savedAmount / g.targetAmount) * 100, 100), 0) / store.goals.length
      : 50;
    factors.push({ name: "Objetivos", score: goalsScore, weight: 0.15 });

    // 5. Savings potential
    const savingsScore = store.totalIncome > 0
      ? Math.min(Math.max(store.expectedBalance / store.totalIncome, 0) * 100, 100)
      : 0;
    factors.push({ name: "Poupança", score: savingsScore, weight: 0.1 });

    const weighted = factors.reduce((acc, f) => acc + f.score * f.weight, 0);
    const finalScore = Math.round(Math.max(0, Math.min(100, weighted)));

    const tips: string[] = [];
    if (balanceRatio < 20) tips.push("Suas despesas estão muito próximas da sua renda");
    if (dti > 0.5) tips.push("Sua dívida está alta em relação à renda");
    if (goalsScore < 30) tips.push("Foque em avançar seus objetivos financeiros");
    if (finalScore >= 70) tips.push("Continue assim! Sua saúde financeira está boa");

    return { score: finalScore, tips };
  }, [store.banks, store.goals, store.totalIncome, store.totalExpense, store.cardExpensesForMonth, store.expectedBalance, store.totalCreditorsDebt, store.totalCreditorsPaid, store.currentCashflow]);

  const hasRecords = store.banks.length || store.creditors.length || store.goals.length
    || store.incomeSources.length || store.salary
    || store.cashflowMonths.some(month => month.incomes.length || month.expenses.length);
  if (!hasRecords) return (
    <div className="rounded-2xl bg-card border border-border/50 p-5">
      <h3 className="flex items-center gap-3 text-sm font-semibold"><Shield className="h-5 w-5 text-muted-foreground" />Saúde Financeira</h3>
      <p className="mt-6 text-lg font-medium">Aguardando seus dados</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Cadastre sua renda e seus lançamentos para calcular este indicador. Uma conta vazia ainda não tem uma avaliação financeira.</p>
    </div>
  );

  const stageIndex = score < 40 ? 0 : score < 70 ? 1 : 2;
  const health = HEALTH_STAGES[stageIndex];
  const marker = gaugePoint(score);

  return (
    <div className="rounded-2xl bg-card border border-border/50 p-5">
      <div className="flex items-center gap-3">
        <Shield aria-hidden="true" className="w-5 h-5" style={{ color: health.color }} />
        <h3 className="text-sm font-semibold text-foreground">Saúde Financeira</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{store.currentCashflow.month} {store.currentCashflow.year} · indicador do app</p>
      <div role="meter" aria-label="Score de saúde financeira" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} aria-valuetext={`${score} de 100 · ${health.label}`} className="relative mx-auto mt-4 w-full max-w-[260px]">
        <svg aria-hidden="true" viewBox="0 0 240 150" className="w-full overflow-visible">
          {HEALTH_STAGES.map((stage, index) => {
            const start = gaugePoint(stage.start + 2);
            const end = gaugePoint(stage.end - 2);
            return <path key={stage.label} d={`M ${start.x} ${start.y} A 92 92 0 0 1 ${end.x} ${end.y}`} fill="none" stroke={stage.color} strokeWidth="13" strokeLinecap="round" opacity={index === stageIndex ? 1 : 0.65} />;
          })}
          <circle cx={marker.x} cy={marker.y} r="8" fill="hsl(var(--foreground))" stroke="hsl(var(--card))" strokeWidth="3" />
          <text x="28" y="136" textAnchor="middle" className="fill-muted-foreground text-xs">0</text>
          <text x="212" y="136" textAnchor="middle" className="fill-muted-foreground text-xs">100</text>
        </svg>
        <div aria-hidden="true" className="absolute inset-x-0 top-[38%] text-center">
          <span className="font-display text-4xl font-bold tabular-nums text-foreground">{score}</span><span className="ml-1 text-xs text-muted-foreground">/100</span>
          <p className="mt-1 text-sm font-semibold text-foreground">{health.label}</p>
        </div>
      </div>
      <ul aria-label="Faixas do score" className="grid grid-cols-3 gap-2 border-b border-border/50 pb-4">
        {HEALTH_STAGES.map((stage, index) => <li key={stage.label} aria-current={index === stageIndex ? "step" : undefined} className="min-w-0 text-center">
          <div aria-hidden="true" className="mb-2 h-1 rounded-full" style={{ backgroundColor: stage.color, opacity: index === stageIndex ? 1 : 0.45 }} />
          <p className={`text-xs text-foreground ${index === stageIndex ? "font-bold" : "font-medium"}`}>{stage.label}</p>
          <p className="mt-1 text-xs tabular-nums text-muted-foreground">{stage.range}</p>
        </li>)}
      </ul>
      <div className="mt-4 space-y-2">
          {tips.length === 0 && <p className="text-xs leading-relaxed text-muted-foreground">Combina saldo, dívida, credores, objetivos e potencial de economia.</p>}
          {tips.slice(0, 3).map((tip, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: health.color }} />
              <p className="text-xs text-muted-foreground leading-relaxed">{tip}</p>
            </div>
          ))}
      </div>
    </div>
  );
}

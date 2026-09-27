import { useMemo } from "react";
import { useFinanceStore } from "@/stores/financeStore";
import { TrendingUp, TrendingDown, Shield, AlertTriangle, Zap } from "lucide-react";
import { unpaidCardSpendingForMonth } from "@/lib/financeCalculations";

function getHealthData(score: number) {
  if (score >= 80) return { label: "Excelente", color: "hsl(145, 63%, 42%)", emoji: "🟢", icon: Shield };
  if (score >= 60) return { label: "Bom", color: "hsl(145, 50%, 50%)", emoji: "🟢", icon: TrendingUp };
  if (score >= 40) return { label: "Regular", color: "hsl(45, 100%, 50%)", emoji: "🟡", icon: Zap };
  if (score >= 20) return { label: "Atenção", color: "hsl(27, 100%, 50%)", emoji: "🟠", icon: AlertTriangle };
  return { label: "Crítico", color: "hsl(0, 72%, 51%)", emoji: "🔴", icon: TrendingDown };
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

  const health = getHealthData(score);
  const Icon = health.icon;
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="rounded-2xl bg-card border border-border/50 p-5">
      <div className="flex items-center gap-3 mb-4">
        <Icon className="w-5 h-5" style={{ color: health.color }} />
        <h3 className="text-sm font-semibold text-foreground">Saúde Financeira</h3>
      </div>

      <div className="flex items-center gap-6">
        {/* Ring */}
        <div className="relative w-[130px] h-[130px] flex-shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke={health.color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-foreground">{score}</span>
            <span className="text-[10px] font-medium text-muted-foreground">{health.label}</span>
          </div>
        </div>

        {/* Tips */}
        <div className="flex-1 space-y-2">
          {tips.slice(0, 3).map((tip, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: health.color }} />
              <p className="text-xs text-muted-foreground leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

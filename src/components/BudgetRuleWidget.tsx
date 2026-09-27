import { useMemo } from "react";
import { PieChart, Wallet, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { type CashflowMonth } from "@/data/financialData";

const NEEDS_LABELS = ["aluguel", "parcelas cartões", "luz", "água", "internet", "condomínio", "seguro", "plano de saúde", "transporte"];
const WANTS_LABELS = ["alimentação", "lazer", "ifood", "uber", "99", "roupas", "assinatura", "streaming"];

interface BudgetRuleWidgetProps {
  cashflow: CashflowMonth;
  totalIncome: number;
}

function classify(label: string): "needs" | "wants" | "debts" {
  const lower = label.toLowerCase();
  if (NEEDS_LABELS.some((n) => lower.includes(n))) return "needs";
  if (WANTS_LABELS.some((w) => lower.includes(w))) return "wants";
  return "debts";
}

export function BudgetRuleWidget({ cashflow, totalIncome }: BudgetRuleWidgetProps) {
  const categories = useMemo(() => {
    let needs = 0, wants = 0, debts = 0;
    cashflow.expenses.forEach((e) => {
      const cat = classify(e.label);
      if (cat === "needs") needs += e.amount;
      else if (cat === "wants") wants += e.amount;
      else debts += e.amount;
    });
    const total = totalIncome || 1;
    return [
      { label: "Necessidades", ideal: 50, actual: Math.round((needs / total) * 100), amount: needs, color: "bg-primary" },
      { label: "Desejos", ideal: 30, actual: Math.round((wants / total) * 100), amount: wants, color: "bg-amber-500" },
      { label: "Dívidas/Invest.", ideal: 20, actual: Math.round((debts / total) * 100), amount: debts, color: "bg-income" },
    ];
  }, [cashflow, totalIncome]);

  return (
    <div className="glass-card rounded-2xl p-5 animate-float-in" style={{ animationDelay: "250ms" }}>
      <div className="flex items-center gap-2 mb-4">
        <PieChart className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Regra 50-30-20</h3>
      </div>

      <div className="space-y-3">
        {categories.map((cat) => {
          const isOver = cat.actual > cat.ideal;
          return (
            <div key={cat.label}>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-foreground font-medium">{cat.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Ideal: {cat.ideal}%</span>
                  <span className={`font-semibold ${isOver ? "text-expense" : "text-income"}`}>
                    Atual: {cat.actual}%
                  </span>
                </div>
              </div>
              <div className="relative">
                <Progress
                  value={Math.min(cat.actual, 100)}
                  className={`h-2 bg-secondary ${cat.actual > cat.ideal ? "[&>div]:bg-expense" : `[&>div]:${cat.color}`}`}
                />
                {/* Ideal marker */}
                <div
                  className="absolute top-0 h-2 w-0.5 bg-foreground/50"
                  style={{ left: `${cat.ideal}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                R$ {cat.amount.toLocaleString("pt-BR")}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

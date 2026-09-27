import { useState } from "react";
import { Anchor, ArrowRight } from "lucide-react";
import { useFinanceStore } from "@/stores/financeStore";
import { Input } from "@/components/ui/input";

export function DolphinEffect() {
  const { goals, dailySavings } = useFinanceStore();
  const [value, setValue] = useState("");
  const amount = parseFloat(value);
  const delayDays = !isNaN(amount) && dailySavings > 0 ? Math.ceil(amount / dailySavings) : 0;

  // Pick the most incomplete goal for the message
  const activeGoal = goals
    .filter((g) => g.savedAmount < g.targetAmount)
    .sort((a, b) => (a.savedAmount / a.targetAmount) - (b.savedAmount / b.targetAmount))[0];

  return (
    <div className="glass-card rounded-2xl p-5 animate-float-in">
      <div className="flex items-center gap-2 mb-4">
        <Anchor className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Efeito Dolphin
        </h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Quanto um gasto extra atrasa seu sonho?
      </p>
      <Input
        type="number"
        placeholder="Valor do gasto supérfluo (R$)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="rounded-xl h-9 text-sm"
        min={0}
      />
      {delayDays > 0 && activeGoal && (
        <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 mt-3 animate-float-in">
          <p className="text-sm text-foreground leading-relaxed">
            🐬 Este gasto empurrou a chegada do seu{" "}
            <span className="text-primary font-bold">{activeGoal.title}</span>{" "}
            <span className="text-expense font-bold">{delayDays} {delayDays === 1 ? "dia" : "dias"}</span> mais para o futuro.
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Base: R$ {dailySavings.toFixed(2)}/dia de poupança
          </p>
        </div>
      )}
      {delayDays > 0 && !activeGoal && (
        <div className="rounded-xl bg-muted/50 p-3 mt-3">
          <p className="text-xs text-muted-foreground">Crie um objetivo na aba Objetivos para ver o impacto.</p>
        </div>
      )}
    </div>
  );
}

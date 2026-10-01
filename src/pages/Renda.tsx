import { money } from "@/lib/planningTools";
import { useMemo } from "react";
import { useFinanceStore } from "@/stores/financeStore";
import {
  DollarSign, Plus, Trash2, TrendingUp, Target,
  AlertTriangle, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";

/* ─── Income Source Row ─── */
function IncomeSourceRow({
  source,
  onRemove,
  onUpdate,
}: {
  source: { id: string; label: string; amount: number };
  onRemove: () => void;
  onUpdate: (label: string, amount: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 group">
      <div className="min-w-0 flex-1 flex flex-col gap-2 sm:flex-row">
        <Input
          aria-label="Nome da fonte de renda"
          value={source.label}
          onChange={(e) => onUpdate(e.target.value, source.amount)}
          className="rounded-xl h-10 text-sm"
          placeholder="Ex: Salário CLT"
        />
        <Input
          aria-label={`Valor mensal de ${source.label || "fonte de renda"}`}
          type="number"
          step="0.01"
          value={source.amount || ""}
          onChange={(e) => onUpdate(source.label, Math.max(0, parseFloat(e.target.value) || 0))}
          className="rounded-xl h-10 text-sm w-full sm:w-36"
          placeholder="R$ 0"
          min={0}
        />
      </div>
      <button
        type="button"
        aria-label={`Excluir fonte de renda ${source.label || "sem nome"}`}
        onClick={onRemove}
        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary transition-all"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ─── Goal Summary Row ─── */
function GoalRow({ goal }: { goal: { title: string; targetAmount: number; savedAmount: number; image: string; color: string } }) {
  const remaining = Math.max(goal.targetAmount - goal.savedAmount, 0);
  const pct = goal.targetAmount > 0 ? (goal.savedAmount / goal.targetAmount) * 100 : 0;
  const isComplete = remaining <= 0;

  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="text-2xl">{goal.image}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-foreground truncate">{goal.title}</span>
          <span className="text-sm text-money text-foreground ml-2 shrink-0">
            {money(goal.targetAmount)}
          </span>
        </div>
        <div className="relative h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(pct, 100)}%`,
              background: isComplete ? "hsl(var(--income))" : `hsl(${goal.color})`,
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[11px] text-muted-foreground">
            {isComplete ? "✅ Conquistado" : `Faltam R$ ${remaining.toLocaleString("pt-BR")}`}
          </span>
          <span className="text-[11px] text-muted-foreground">{pct.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function RendaPage() {
  const store = useFinanceStore();

  const totalIncome = store.incomeSources.reduce((s, i) => s + i.amount, 0);
  const totalGoalsRemaining = store.goals.reduce((s, g) => s + Math.max(g.targetAmount - g.savedAmount, 0), 0);
  const totalGoalsTarget = store.goals.reduce((s, g) => s + g.targetAmount, 0);
  const monthlyAvailable = totalIncome - store.totalExpense;
  const monthsToAllGoals = monthlyAvailable > 0 ? Math.ceil(totalGoalsRemaining / monthlyAvailable) : 0;

  const healthStatus = useMemo(() => {
    if (totalIncome === 0) return { label: "Sem renda cadastrada", color: "text-muted-foreground", icon: AlertTriangle };
    if (monthlyAvailable <= 0) return { label: "Renda insuficiente", color: "text-destructive", icon: AlertTriangle };
    if (monthlyAvailable < store.totalExpense * 0.2) return { label: "Margem apertada", color: "text-warning", icon: AlertTriangle };
    return { label: "Renda saudável", color: "text-income", icon: CheckCircle2 };
  }, [totalIncome, monthlyAvailable, store.totalExpense]);

  return (
    <div className="page-container min-h-screen bg-background space-y-8">
      {/* Header */}
      <PageHeader title="Renda" description="Acompanhe suas fontes de renda e o caminho até seus objetivos." icon={DollarSign} />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Renda Total</p>
            <p className="text-lg sm:text-2xl text-money font-bold text-income">
              {money(totalIncome)}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Sobra Mensal</p>
            <p className={`text-lg sm:text-2xl text-money font-bold ${monthlyAvailable >= 0 ? "text-income" : "text-destructive"}`}>
              {money(monthlyAvailable)}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Sonhos Restantes</p>
            <p className="text-lg sm:text-2xl text-money font-bold text-foreground">
              {money(totalGoalsRemaining)}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <healthStatus.icon className={`w-3.5 h-3.5 ${healthStatus.color}`} />
              {healthStatus.label}
            </p>
            <p className="text-2xl text-money font-bold text-foreground">
              {monthsToAllGoals > 0 ? `${monthsToAllGoals} meses` : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">estimativa para todos os objetivos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Sources */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-income" />
                Fontes de Renda
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl gap-1"
                onClick={() => store.addIncomeSource("Nova fonte", 0)}
              >
                <Plus className="w-4 h-4" /> Adicionar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {store.incomeSources.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">
                Adicione suas fontes de renda para começar
              </p>
            )}
            {store.incomeSources.map((src) => (
              <IncomeSourceRow
                key={src.id}
                source={src}
                onRemove={() => store.removeIncomeSource(src.id)}
                onUpdate={(label, amount) => store.updateIncomeSource(src.id, { label, amount })}
              />
            ))}
            {store.incomeSources.length > 0 && (
              <div className="pt-3 border-t border-border/50 flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Total mensal</span>
                <span className="text-lg text-money font-bold text-income">
                  {money(totalIncome)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals Summary */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="w-5 h-5 text-primary" />
                Meus Sonhos
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                Total: {money(totalGoalsTarget)}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {store.goals.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">
                Adicione objetivos na aba Objetivos
              </p>
            ) : (
              <div className="divide-y divide-border/30">
                {store.goals.map((goal) => (
                  <GoalRow key={goal.id} goal={goal} />
                ))}
              </div>
            )}
            {store.goals.length > 0 && (
              <div className="pt-3 mt-2 border-t border-border/50">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor restante total</span>
                  <span className="font-bold text-foreground">
                    {money(totalGoalsRemaining)}
                  </span>
                </div>
                {monthlyAvailable > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Com {money(monthlyAvailable)}/mês de sobra,
                    você atingiria tudo em ~{monthsToAllGoals} meses
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground mt-1">
                  Estimativa com renda e despesas atuais constantes, sem juros ou inflação.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

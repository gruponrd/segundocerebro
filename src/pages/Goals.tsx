import { useState, useMemo } from "react";
import { useFinanceStore } from "@/stores/financeStore";
import { Target, Plus, ArrowRight, Check, X, Pencil, Trash2, CalendarClock, TrendingUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DolphinEffect } from "@/components/DolphinEffect";
import { DreamBoard } from "@/components/DreamBoard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ─── Wave Fill Card ─── */
function WaveFillCard({
  percent,
  color,
  children,
  className = "",
}: {
  percent: number;
  color: string;
  children: React.ReactNode;
  className?: string;
}) {
  const clampedPct = Math.min(Math.max(percent, 0), 100);
  const fillHeight = clampedPct;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Wave fill background */}
      <div
        className="absolute inset-x-0 bottom-0 transition-all duration-1000 ease-out"
        style={{ height: `${fillHeight}%` }}
      >
        {/* Gradient fill */}
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            background: `linear-gradient(to top, hsl(${color}), hsl(${color} / 0.3))`,
          }}
        />
        {/* Animated wave on top */}
        <div className="absolute inset-x-0 -top-3 h-6 overflow-hidden">
          <svg
            className="w-[200%] h-full animate-wave"
            viewBox="0 0 1200 30"
            preserveAspectRatio="none"
          >
            <path
              d="M0,15 C150,0 350,30 600,15 C850,0 1050,30 1200,15 L1200,30 L0,30 Z"
              fill={`hsl(${color} / 0.15)`}
            />
            <path
              d="M0,18 C200,8 400,28 600,18 C800,8 1000,28 1200,18 L1200,30 L0,30 Z"
              fill={`hsl(${color} / 0.1)`}
            />
          </svg>
        </div>
        {/* Subtle shimmer */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `linear-gradient(180deg, hsl(${color} / 0.05) 0%, transparent 40%)`,
          }}
        />
      </div>
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* ─── Projection Calculator ─── */
function ProjectionBadge({
  remaining,
  monthlySavings,
  color,
}: {
  remaining: number;
  monthlySavings: number;
  color: string;
}) {
  const projection = useMemo(() => {
    if (remaining <= 0) return { text: "Meta atingida! 🎉", months: 0, date: "" };
    if (monthlySavings <= 0) return { text: "Defina uma meta de economia", months: 0, date: "" };

    const monthsNeeded = Math.ceil(remaining / monthlySavings);
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + monthsNeeded);

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const dateStr = `${monthNames[targetDate.getMonth()]}/${targetDate.getFullYear()}`;

    return { text: dateStr, months: monthsNeeded, date: dateStr };
  }, [remaining, monthlySavings]);

  if (remaining <= 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-income/10 border border-income/20">
        <Sparkles className="w-4 h-4 text-income" />
        <span className="text-xs font-medium text-income">{projection.text}</span>
      </div>
    );
  }

  if (monthlySavings <= 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50">
        <CalendarClock className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground">{projection.text}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/60 border border-border/30">
      <CalendarClock className="w-3.5 h-3.5" style={{ color: `hsl(${color})` }} />
      <div>
        <p className="text-[11px] text-muted-foreground leading-tight">Projeção de conquista</p>
        <p className="text-sm font-semibold text-foreground">
          {projection.text}
          <span className="text-[11px] font-normal text-muted-foreground ml-1.5">
            ({projection.months} {projection.months === 1 ? "mês" : "meses"})
          </span>
        </p>
      </div>
    </div>
  );
}

/* ─── Overall Progress Bar ─── */
function OverallProgressBar({ percent, saved, total }: { percent: number; saved: number; total: number }) {
  return (
    <div className="glass-card rounded-2xl p-6 mt-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Progresso Geral</p>
          <p className="text-3xl text-money text-foreground mt-1">{percent.toFixed(0)}%</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-money text-income">R$ {saved.toLocaleString("pt-BR")}</p>
          <p className="text-xs text-muted-foreground">de R$ {total.toLocaleString("pt-BR")}</p>
        </div>
      </div>
      <div className="relative h-3 rounded-full bg-secondary overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 ease-out"
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-bar"
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function GoalsPage() {
  const { goals, depositToGoal, addGoal, removeGoal, updateGoal, savingsGoalMonth } = useFinanceStore();
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [addingGoal, setAddingGoal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newEmoji, setNewEmoji] = useState("🎯");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTarget, setEditTarget] = useState("");

  const handleDeposit = () => {
    if (!depositGoalId || !depositAmount) return;
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) return;
    depositToGoal(depositGoalId, amount);
    setDepositGoalId(null);
    setDepositAmount("");
  };

  const handleAddGoal = () => {
    const val = parseFloat(newTarget);
    if (newTitle.trim() && !isNaN(val) && val > 0) {
      addGoal(newTitle.trim(), val);
      setNewTitle("");
      setNewTarget("");
      setNewEmoji("🎯");
      setAddingGoal(false);
    }
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const val = parseFloat(editTarget);
    if (editTitle.trim() && !isNaN(val) && val > 0) {
      updateGoal(editingId, { title: editTitle.trim(), targetAmount: val });
    }
    setEditingId(null);
  };

  const startEdit = (g: typeof goals[0]) => {
    setEditingId(g.id);
    setEditTitle(g.title);
    setEditTarget(String(g.targetAmount));
  };

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0);
  const overallPercent = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  const depositGoal = goals.find((g) => g.id === depositGoalId);

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-8 animate-float-in">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gradient tracking-tight">Objetivos</h1>
                <p className="text-muted-foreground text-sm">Seus sonhos, com prazo e projeção</p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => setAddingGoal(true)}>
            <Plus className="w-4 h-4" /> Novo Objetivo
          </Button>
        </div>

        <OverallProgressBar percent={overallPercent} saved={totalSaved} total={totalTarget} />
      </div>

      {/* Dream Board + Dolphin Effect */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <DreamBoard />
        <DolphinEffect />
      </div>

      {/* Goal Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 stagger-children">
        {goals.map((goal) => {
          const pct = goal.targetAmount > 0 ? (goal.savedAmount / goal.targetAmount) * 100 : 0;
          const remaining = Math.max(goal.targetAmount - goal.savedAmount, 0);
          const isEditing = editingId === goal.id;
          const isComplete = remaining <= 0;

          return (
            <WaveFillCard
              key={goal.id}
              percent={pct}
              color={goal.color}
              className="glass-card rounded-2xl group"
            >
              <div className="p-5">
                {/* Top row: emoji + actions */}
                <div className="flex items-start justify-between mb-3">
                  <div className="text-4xl leading-none filter drop-shadow-sm">{goal.image}</div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(goal)}
                      className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeGoal(goal.id)}
                      className="p-1.5 rounded-lg hover:bg-expense/20 text-muted-foreground hover:text-expense transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Title */}
                {isEditing ? (
                  <div className="space-y-2 mb-4">
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-8 text-sm rounded-lg" autoFocus />
                    <Input type="number" value={editTarget} onChange={(e) => setEditTarget(e.target.value)} placeholder="Valor alvo" className="h-8 text-sm rounded-lg" />
                    <div className="flex gap-1">
                      <button onClick={handleSaveEdit} className="p-1 rounded hover:bg-income/20 text-income"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingId(null)} className="p-1 rounded hover:bg-expense/20 text-expense"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                ) : (
                  <h3 className="text-lg font-bold text-foreground mb-1 tracking-tight">{goal.title}</h3>
                )}

                {/* Progress display */}
                <div className="mb-4">
                  {/* Percentage + bar */}
                  <div className="flex items-end gap-2 mb-2">
                    <span
                      className="text-3xl text-money transition-colors"
                      style={{ color: isComplete ? "hsl(var(--income))" : `hsl(${goal.color})` }}
                    >
                      {pct.toFixed(0)}%
                    </span>
                    {isComplete && <Sparkles className="w-5 h-5 text-income mb-1" />}
                  </div>
                  <div className="relative h-2 rounded-full bg-secondary/80 overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        background: isComplete
                          ? "hsl(var(--income))"
                          : `linear-gradient(90deg, hsl(${goal.color}), hsl(${goal.color} / 0.7))`,
                      }}
                    />
                  </div>
                </div>

                {/* Money details */}
                <div className="space-y-1.5 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Guardado</span>
                    <span className="text-money text-income">R$ {goal.savedAmount.toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Faltam</span>
                    <span className="text-money text-foreground">R$ {remaining.toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Meta</span>
                    <span className="text-money text-foreground">R$ {goal.targetAmount.toLocaleString("pt-BR")}</span>
                  </div>
                </div>

                {/* Projection */}
                <div className="mb-4">
                  <ProjectionBadge
                    remaining={remaining}
                    monthlySavings={savingsGoalMonth}
                    color={goal.color}
                  />
                </div>

                {/* Deposit button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl border-border/50 hover:border-primary/50 gap-2 transition-all"
                  onClick={() => setDepositGoalId(goal.id)}
                  disabled={isComplete}
                >
                  {isComplete ? (
                    <>
                      <Sparkles className="w-4 h-4" /> Conquistado!
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Depositar
                    </>
                  )}
                </Button>
              </div>
            </WaveFillCard>
          );
        })}
      </div>

      {/* Deposit dialog */}
      <Dialog open={!!depositGoalId} onOpenChange={(open) => !open && setDepositGoalId(null)}>
        <DialogContent className="glass-card border-border/30 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Depositar no Objetivo</DialogTitle>
          </DialogHeader>
          {depositGoal && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40">
                <span className="text-3xl">{depositGoal.image}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{depositGoal.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Faltam R$ {Math.max(depositGoal.targetAmount - depositGoal.savedAmount, 0).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
              <Input
                type="number"
                placeholder="Valor (R$)"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="rounded-xl"
                min={0}
                autoFocus
              />
              <Button className="w-full rounded-xl gap-2" onClick={handleDeposit}>
                <ArrowRight className="w-4 h-4" /> Confirmar Depósito
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add goal dialog */}
      <Dialog open={addingGoal} onOpenChange={setAddingGoal}>
        <DialogContent className="glass-card border-border/30 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Novo Objetivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Input
                value={newEmoji}
                onChange={(e) => setNewEmoji(e.target.value)}
                className="rounded-xl w-16 text-center text-2xl"
                maxLength={2}
              />
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Nome do objetivo" className="rounded-xl flex-1" autoFocus />
            </div>
            <Input type="number" value={newTarget} onChange={(e) => setNewTarget(e.target.value)} placeholder="Valor alvo (R$)" className="rounded-xl" min={0} />
            {newTarget && parseFloat(newTarget) > 0 && savingsGoalMonth > 0 && (
              <div className="p-3 rounded-xl bg-secondary/40 border border-border/30">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <p className="text-xs text-muted-foreground">
                    Com R$ {savingsGoalMonth.toLocaleString("pt-BR")}/mês, você atingiria em{" "}
                    <span className="text-foreground font-semibold">
                      {Math.ceil(parseFloat(newTarget) / savingsGoalMonth)} meses
                    </span>
                  </p>
                </div>
              </div>
            )}
            <Button className="w-full rounded-xl gap-2" onClick={handleAddGoal}>
              <Plus className="w-4 h-4" /> Criar Objetivo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useEffect, useState } from "react";
import { PieChart } from "lucide-react";
import { useFinanceStore } from "@/stores/financeStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { equalGoalAllocation, goalMonthlyAmount, toCents, validateGoalPlan } from "@/lib/goalAllocation";
import { money } from "@/lib/planningTools";

export function GoalAllocation() {
  const { goals, savingsGoalMonth, saveGoalPlan, cloudReady, syncStatus } = useFinanceStore();
  const [budget, setBudget] = useState(String(savingsGoalMonth));
  const [values, setValues] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) { setBudget(String(savingsGoalMonth)); setValues(Object.fromEntries(goals.map(g => [g.id, String(goalMonthlyAmount(g))]))); }
  }, [goals, savingsGoalMonth, dirty]);
  const allocations = Object.fromEntries(goals.map(g => [g.id, Number(values[g.id] ?? 0)]));
  const error = validateGoalPlan(goals, Number(budget), allocations);
  const total = goals.reduce((sum, g) => sum + toCents(allocations[g.id] || 0), 0) / 100;
  const save = () => {
    try { saveGoalPlan(Number(budget), allocations); setDirty(false); setNotice("Divisão enviada para salvar. Os aportes já registrados permanecem iguais."); }
    catch (e) { setNotice(e instanceof Error ? e.message : "Não foi possível salvar."); }
  };
  return <section className="glass-card space-y-5 rounded-2xl p-5 sm:p-6" aria-labelledby="goal-budget-title">
    <div><h2 id="goal-budget-title" className="flex items-center gap-2 text-lg font-semibold"><PieChart className="h-5 w-5 text-primary" /> Sua economia, dividida entre sonhos</h2><p className="mt-2 text-sm text-muted-foreground">Defina quanto reservar por mês e distribua entre suas metas. Cada prazo considera apenas a parcela destinada àquela meta.</p></div>
    <label className="block max-w-sm space-y-2 text-sm"><span className="block font-medium">Economia mensal disponível (R$)</span><Input type="number" min="0" max="1000000" step="0.01" value={budget} onChange={e => { setBudget(e.target.value); setDirty(true); setNotice(""); }} /></label>
    {!goals.length ? <p className="text-sm text-muted-foreground">Crie seu primeiro objetivo para distribuir sua economia.</p> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{goals.map(g => <label key={g.id} className="rounded-xl border border-border/60 bg-secondary/20 p-4"><span className="mb-2 block break-words text-sm font-medium">{g.image} {g.title}</span><span className="mb-2 block text-xs text-muted-foreground">{g.savedAmount >= g.targetAmount ? "Meta concluída" : "Parcela mensal (R$)"}</span><Input aria-label={`Parcela mensal de ${g.title}`} type="number" min="0" max="1000000" step="0.01" disabled={g.savedAmount >= g.targetAmount} value={values[g.id] ?? "0"} onChange={e => { setValues(v => ({ ...v, [g.id]: e.target.value })); setDirty(true); setNotice(""); }} /></label>)}</div>}
    <div className="flex flex-wrap gap-3 text-sm"><span>Distribuído: <strong>{money(total)}</strong></span><span>Livre: <strong>{money(Number(budget) - total || 0)}</strong></span></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-3"><Button disabled={!!error || !dirty || !cloudReady || syncStatus !== "saved"} onClick={save}>Salvar divisão</Button><Button variant="outline" disabled={!goals.length || !Number.isFinite(Number(budget)) || Number(budget) < 0 || Number(budget) > 1000000} onClick={() => { setValues(Object.fromEntries(Object.entries(equalGoalAllocation(goals, Number(budget))).map(([id, v]) => [id, String(v)]))); setDirty(true); setNotice(""); }}>Dividir igualmente</Button>{dirty && <Button variant="ghost" onClick={() => { setDirty(false); setNotice(""); }}>Cancelar alterações</Button>}</div>
    {notice && <p role="status" className="text-sm">{notice}</p>}
    <p className="text-xs leading-relaxed text-muted-foreground">Este é um plano mensal, sem transferência automática de dinheiro. Metas concluídas deixam de consumir o orçamento; o valor liberado pode ser redistribuído.</p>
  </section>;
}

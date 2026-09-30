import { ArrowRight, CalendarClock, CheckCircle2, Target, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { useFinanceStore } from "@/stores/financeStore";
import { money, pendingPayments } from "@/lib/planningTools";
import { cn } from "@/lib/utils";

export function DashboardOverview() {
  const store = useFinanceStore();
  const payments = pendingPayments(store.currentCashflow, store.banks);
  const pending = payments.reduce((total, item) => total + Math.round(item.amount * 100), 0) / 100;
  const received = store.currentCashflow.incomes.filter(item => item.paid).reduce((sum, item) => sum + item.amount, 0);
  const paid = store.totalExpense - pending;
  const goals = store.goals.slice(0, 2);

  return (
    <section aria-label="Resumo e prioridades do período" className="mb-6 space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="glass-card overview-balance col-span-2 p-5 sm:p-6">
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet className="h-4 w-4" /> Saldo projetado do mês</p>
          <p className={cn("mt-3 text-money text-3xl sm:text-4xl", store.expectedBalance < 0 ? "text-expense" : "text-income")}>{money(store.expectedBalance)}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Receitas previstas menos todas as despesas do período. <span className="text-foreground/80">Não é o saldo da conta bancária.</span></p>
        </div>
        <Link to="/fluxo" className="data-surface min-w-0 p-4 transition-colors hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-ring sm:p-5">
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingUp className="h-4 w-4 text-income" /> Receitas previstas</p>
          <p className="mt-3 text-money text-base text-income sm:text-xl">{money(store.totalIncome)}</p>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{money(received)} marcadas como recebidas</p>
        </Link>
        <Link to="/fluxo" className="data-surface min-w-0 p-4 transition-colors hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-ring sm:p-5">
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingDown className="h-4 w-4 text-expense" /> Despesas previstas</p>
          <p className="mt-3 text-money text-base text-expense sm:text-xl">{money(store.totalExpense)}</p>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{money(paid)} marcadas como pagas · inclui cartões</p>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="data-surface p-5">
          <div className="flex items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-base font-semibold"><CalendarClock className="h-4 w-4 text-primary" /> Contas para revisar</h2><p className="mt-1 text-xs text-muted-foreground">{payments.length} pendência(s) · {money(pending)} no período</p></div><Link to="/ferramentas#review-title" className="inline-flex min-h-9 items-center gap-1 text-xs text-muted-foreground hover:text-foreground">Ver todas <ArrowRight className="h-3.5 w-3.5" /></Link></div>
          <div className="mt-3 space-y-1">
            {payments.slice(0, 3).map(item => <Link key={item.id} to={item.route} className="flex items-center gap-3 rounded-xl py-2.5 hover:bg-secondary/40 focus-visible:ring-2 focus-visible:ring-ring"><span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", item.overdue ? "bg-expense" : "bg-primary/50")} /><div className="min-w-0 flex-1"><p className="truncate text-sm">{item.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.source} · {item.dueDate ? new Date(`${item.dueDate}T00:00:00`).toLocaleDateString("pt-BR") : "sem vencimento informado"}{item.overdue && " · em atraso"}</p></div><span className="shrink-0 text-sm font-medium tabular-nums">{money(item.amount)}</span></Link>)}
            {!payments.length && <p className="flex items-center gap-2 py-5 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-income" /> Nenhuma pendência registrada neste período.</p>}
          </div>
        </div>
        <div className="data-surface p-5">
          <div className="flex items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-base font-semibold"><Target className="h-4 w-4 text-primary" /> Seus objetivos</h2><p className="mt-1 text-xs text-muted-foreground">Progresso dos valores guardados</p></div><Link to="/objetivos" className="inline-flex min-h-9 items-center gap-1 text-xs text-muted-foreground">Ver todos <ArrowRight className="h-3.5 w-3.5" /></Link></div>
          <div className="mt-4 space-y-5">
            {goals.map(goal => { const progress = goal.targetAmount > 0 ? Math.min(100, Math.max(0, goal.savedAmount / goal.targetAmount * 100)) : 0; return <Link key={goal.id} to="/objetivos" className="block rounded-lg focus-visible:ring-2 focus-visible:ring-ring"><div className="flex items-center justify-between gap-2 text-sm"><span className="truncate font-medium">{goal.title}</span><span className="text-muted-foreground">{Math.round(progress)}%</span></div><div role="progressbar" aria-label={`Progresso de ${goal.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-income" style={{width:`${progress}%`}} /></div><p className="mt-2 text-xs text-muted-foreground">{money(goal.savedAmount)} de {money(goal.targetAmount)}</p></Link>; })}
            {!goals.length && <Link to="/objetivos" className="block py-5 text-sm text-muted-foreground hover:text-foreground">Crie um objetivo para acompanhar seu progresso <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link>}
          </div>
        </div>
      </div>
    </section>
  );
}

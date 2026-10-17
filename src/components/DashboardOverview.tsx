import { ArrowRight, CalendarClock, CheckCircle2, Target, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { useFinanceStore } from "@/stores/financeStore";
import { money, pendingPayments } from "@/lib/planningTools";
import { cn } from "@/lib/utils";

export function DashboardOverview({ section = "all" }: { section?: "all" | "balance" | "priorities" }) {
  const store = useFinanceStore();
  const payments = pendingPayments(store.currentCashflow, store.banks);
  const pending = payments.reduce((total, item) => total + Math.round(item.amount * 100), 0) / 100;
  const received = store.currentCashflow.incomes.filter(item => item.paid).reduce((sum, item) => sum + item.amount, 0);
  const paid = store.totalExpense - pending;
  const goals = store.goals.slice(0, 2);

  return (
    <section aria-label={section === "balance" ? "Saldo projetado do período" : "Resumo e prioridades do período"} className={cn("mb-6", section === "balance" ? "overview-balance-only" : section === "priorities" ? "grid gap-4 lg:grid-cols-2" : "overview-grid")}>
      {section !== "priorities" && (
      <div data-balance={store.expectedBalance < 0 ? "negative" : "positive"} className="glass-card overview-balance min-w-0 p-5">
        <div className="flex items-center justify-between gap-3"><h2 className="overview-title">Saldo projetado</h2><Wallet aria-hidden className="h-4 w-4 text-muted-foreground" /></div>
        <p className={cn("overview-amount text-money mt-5",store.expectedBalance<0?"text-expense":"text-foreground")}>{money(store.expectedBalance)}</p>
        <p className="overview-caption mt-2">Após as despesas previstas do mês.<br /> Não representa saldo bancário.</p>
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4">
          <Link to="/fluxo" className="rounded-lg"><p className="overview-caption">Entradas previstas</p><p className="overview-money text-money mt-1 text-income">{money(store.totalIncome)}</p></Link>
          <Link to="/fluxo" className="rounded-lg"><p className="overview-caption">Saídas previstas</p><p className="overview-money text-money mt-1 text-expense">{money(store.totalExpense)}</p></Link>
        </div>
        <Link to="/divida" className="mt-4 flex items-center justify-between gap-2 text-xs"><span className="text-muted-foreground">Dívida em aberto</span><span className="text-money">{money(store.totalDebt)}</span></Link>
        <details className="mt-4 text-xs text-muted-foreground"><summary className="min-h-6 cursor-pointer">Recebimentos e pagamentos</summary><p className="mt-2 leading-6">{money(received)} recebidos e {money(paid)} pagos no período. As saídas incluem os cartões.</p></details>
      </div>
      )}
      {section !== "balance" && <>
        <div className="data-surface p-5">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="flex items-center gap-2 text-[13px] font-medium"><CalendarClock className="h-4 w-4 text-primary" /> Próximos vencimentos</h2><p className="mt-1 text-xs text-muted-foreground">{payments.length} pendência(s) · {money(pending)} no período</p></div><Link to="/ferramentas#review-title" className="inline-flex min-h-9 shrink-0 items-center gap-1 whitespace-nowrap text-xs text-muted-foreground hover:text-foreground">Ver todas <ArrowRight className="h-3.5 w-3.5" /></Link></div>
          <div className="mt-3 space-y-1">
            {payments.slice(0, 3).map(item => <Link key={item.id} to={item.route} className="flex items-center gap-3 rounded-xl py-2.5 hover:bg-secondary/40 focus-visible:ring-2 focus-visible:ring-ring"><span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", item.overdue ? "bg-expense" : "bg-primary/50")} /><div className="min-w-0 flex-1"><p className="truncate text-sm">{item.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.source} · {item.dueDate ? new Date(`${item.dueDate}T00:00:00`).toLocaleDateString("pt-BR") : "sem vencimento informado"}{item.overdue && " · em atraso"}</p></div><span className="shrink-0 text-sm font-medium tabular-nums">{money(item.amount)}</span></Link>)}
            {!payments.length && <p className="flex items-center gap-2 py-5 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-income" /> Nenhuma pendência registrada neste período.</p>}
          </div>
        </div>
        <div className="data-surface p-5">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="flex items-center gap-2 text-[13px] font-medium"><Target className="h-4 w-4 text-primary" /> Seus objetivos</h2><p className="mt-1 text-xs text-muted-foreground">Progresso dos valores guardados</p></div><Link to="/objetivos" className="inline-flex min-h-9 shrink-0 items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">Ver todos <ArrowRight className="h-3.5 w-3.5" /></Link></div>
          <div className="mt-4 space-y-5">
            {goals.map(goal => { const progress = goal.targetAmount > 0 ? Math.min(100, Math.max(0, goal.savedAmount / goal.targetAmount * 100)) : 0; return <Link key={goal.id} to="/objetivos" className="block rounded-lg focus-visible:ring-2 focus-visible:ring-ring"><div className="flex items-center justify-between gap-2 text-sm"><span className="truncate font-medium">{goal.title}</span><span className="text-muted-foreground">{Math.round(progress)}%</span></div><div role="progressbar" aria-label={`Progresso de ${goal.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="mt-2 h-1 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-accent" style={{width:`${progress}%`}} /></div><p className="mt-2 text-xs text-muted-foreground">{money(goal.savedAmount)} de {money(goal.targetAmount)}</p></Link>; })}
            {!goals.length && <Link to="/objetivos" className="block py-5 text-sm text-muted-foreground hover:text-foreground">Crie um objetivo para acompanhar seu progresso <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link>}
          </div>
        </div>
      </>}
    </section>
  );
}

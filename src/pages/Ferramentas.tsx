import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Calculator, CalendarClock, CheckCircle2, FlaskConical, RotateCcw, ShieldCheck, TrendingUp } from "lucide-react";
import { useFinanceStore } from "@/stores/financeStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { money, pendingPayments, projectScenario } from "@/lib/planningTools";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { AccountBackup } from "@/components/AccountBackup";

const EMPTY = { purchase: "", installments: "1", incomeChange: "", expenseReduction: "", startingBalance: "" };

export default function FerramentasPage() {
  const store = useFinanceStore();
  const location = useLocation();
  useEffect(() => {
    if (location.hash === "#review-title") document.getElementById("review-title")?.scrollIntoView({ block: "start" });
  }, [location.hash]);
  const [form, setForm] = useState(EMPTY);
  const [startIndex, setStartIndex] = useState(String(store.selectedMonth));
  const [reviewIndex, setReviewIndex] = useState(String(store.selectedMonth));
  const month = store.cashflowMonths[Number(reviewIndex)];
  const rows = useMemo(() => projectScenario(store.cashflowMonths, store.banks, {
    startIndex: Number(startIndex), purchase: Number(form.purchase), installments: Number(form.installments),
    incomeChange: Number(form.incomeChange), expenseReduction: Number(form.expenseReduction), startingBalance: Number(form.startingBalance),
  }), [store.cashflowMonths, store.banks, form, startIndex]);
  const payments = useMemo(() => month ? pendingPayments(month, store.banks) : [], [month, store.banks]);
  const totalPending = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const overdueCount = payments.filter(payment => payment.overdue).length;
  const final = rows[rows.length - 1];
  const worst = rows.length ? Math.min(...rows.map(row => row.simulated)) : 0;
  const affected = Number(form.purchase) > 0 || Number(form.incomeChange) !== 0 || Number(form.expenseReduction) > 0;
  const hasEntries = store.cashflowMonths.slice(Number(startIndex)).some(m => m.incomes.length || m.expenses.length)
    || rows.some(row => row.net !== 0);
  const outsideHorizon = Math.max(0, Number(form.installments) - rows.filter(row => row.purchaseInstallment).length);

  const renderMonthSelect = (value: string, onChange: (value: string) => void, label: string) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="w-full rounded-xl sm:w-48"><SelectValue /></SelectTrigger>
      <SelectContent>{store.cashflowMonths.map((m, i) => <SelectItem key={`${m.month}-${m.year}`} value={String(i)}>{m.month} {m.year}</SelectItem>)}</SelectContent>
    </Select>
  );

  return (
    <main className="page-container space-y-8">
      <PageHeader title="Ferramentas" description="Antecipe decisões, compare cenários e organize o próximo passo." icon={FlaskConical} />
      <AccountBackup />

      <section className="glass-card p-5 sm:p-6" aria-labelledby="scenario-title">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 id="scenario-title" className="flex items-center gap-2 text-lg font-semibold"><Calculator className="h-5 w-5 text-primary" /> E se…?</h2><p className="mt-1 text-sm text-muted-foreground">Teste uma compra, uma mudança de renda ou uma economia mensal.</p></div>
          <span className="flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> Simulação · não cria lançamentos</span>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[320px_1fr]">
          <div className="space-y-4 rounded-2xl border border-border/60 bg-secondary/20 p-4">
            <label className="block space-y-2 text-xs text-muted-foreground"><span>Começar em</span>{renderMonthSelect(startIndex, setStartIndex, "Mês inicial da simulação")}</label>
            <label className="block space-y-2 text-xs text-muted-foreground"><span>Saldo inicial hipotético (R$)</span><Input type="number" step="0.01" value={form.startingBalance} placeholder="0,00" onChange={e => setForm({ ...form, startingBalance: e.target.value })} className="rounded-xl" /></label>
            <div className="grid grid-cols-[1fr_80px] gap-2">
              <label className="block space-y-2 text-xs text-muted-foreground"><span>Compra simulada (R$)</span><Input type="number" min="0" step="0.01" value={form.purchase} placeholder="0,00" onChange={e => setForm({ ...form, purchase: e.target.value })} className="rounded-xl" /></label>
              <label className="block space-y-2 text-xs text-muted-foreground"><span>Parcelas</span><Select value={form.installments} onValueChange={value => setForm({ ...form, installments: value })}><SelectTrigger aria-label="Parcelas da simulação" className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: 36 }, (_, i) => <SelectItem key={i} value={String(i + 1)}>{i + 1}x</SelectItem>)}</SelectContent></Select></label>
            </div>
            <label className="block space-y-2 text-xs text-muted-foreground"><span>Mudança mensal de renda (R$)</span><Input type="number" step="0.01" value={form.incomeChange} placeholder="Ex.: 300 ou -300" onChange={e => setForm({ ...form, incomeChange: e.target.value })} className="rounded-xl" /></label>
            <label className="block space-y-2 text-xs text-muted-foreground"><span>Redução mensal de despesas (R$)</span><Input type="number" min="0" step="0.01" value={form.expenseReduction} placeholder="0,00" onChange={e => setForm({ ...form, expenseReduction: e.target.value })} className="rounded-xl" /></label>
            <Button variant="outline" className="w-full gap-2 rounded-xl" onClick={() => setForm(EMPTY)}><RotateCcw className="h-3.5 w-3.5" /> Limpar hipóteses</Button>
          </div>

          <div className="min-w-0 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3" aria-live="polite">
              {[
                { label: "Projeção atual no fim", value: final?.baseline ?? 0, tone: "text-foreground" },
                { label: "Com suas hipóteses", value: final?.simulated ?? 0, tone: (final?.simulated ?? 0) < 0 ? "text-expense" : "text-income" },
                { label: "Diferença no período", value: (final?.simulated ?? 0) - (final?.baseline ?? 0), tone: (final?.simulated ?? 0) < (final?.baseline ?? 0) ? "text-expense" : "text-income" },
              ].map(item => <div key={item.label} className="rounded-2xl border border-border/60 bg-secondary/20 p-4"><p className="text-xs text-muted-foreground">{item.label}</p><p className={cn("mt-2 text-money text-lg", item.tone)}>{money(item.value)}</p></div>)}
            </div>

            <div className={cn("rounded-xl border p-3 text-sm leading-relaxed", !hasEntries ? "border-border bg-secondary/20 text-muted-foreground" : worst < 0 ? "border-destructive/25 bg-destructive/5" : "border-primary/15 bg-primary/5")}>
              {!hasEntries ? "Ainda não há lançamentos para sustentar esta projeção. Cadastre suas receitas e despesas no Fluxo." : !affected ? "Adicione suas hipóteses para comparar com os lançamentos existentes." : worst < 0 ? `O cenário chega a um saldo acumulado negativo de ${money(worst)}. Veja em qual mês isso acontece abaixo.` : worst < store.safetyMargin ? `O menor saldo acumulado é ${money(worst)}, abaixo da margem de segurança de ${money(store.safetyMargin)}.` : `O menor saldo acumulado é ${money(worst)} e preserva sua margem de segurança de ${money(store.safetyMargin)}.`}
            </div>

            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full min-w-[470px] text-left text-xs">
                <caption className="sr-only">Comparação do saldo acumulado por mês</caption>
                <thead className="bg-secondary/30 text-muted-foreground"><tr><th className="p-3 font-medium">Mês</th><th className="p-3 text-right font-medium">Projeção atual</th><th className="p-3 text-right font-medium">Simulação</th><th className="p-3 text-right font-medium">Compra</th></tr></thead>
                <tbody>{rows.map(row => <tr key={row.fullLabel} className="border-t border-border/40"><th className="p-3 font-medium">{row.label}</th><td className="p-3 text-right tabular-nums">{money(row.baseline)}</td><td className={cn("p-3 text-right font-medium tabular-nums", row.simulated < 0 ? "text-expense" : "text-income")}>{money(row.simulated)}</td><td className="p-3 text-right tabular-nums text-muted-foreground">{row.purchasePayment ? money(row.purchasePayment) : "—"}</td></tr>)}</tbody>
              </table>
            </div>
            <p className="text-[11px] leading-5 text-muted-foreground">Saldo acumulado a partir do valor inicial informado; não representa o saldo bancário. Inclui receitas, despesas e parcelas cadastradas, mesmo as já pagas. Hipóteses de renda e redução se repetem mensalmente; a redução fica limitada às despesas fora do cartão. Compra sem juros.</p>
            {Number(form.purchase) > 0 && outsideHorizon > 0 && <p role="status" className="text-xs text-expense">{outsideHorizon} parcela(s) da compra caem em meses não cadastrados e não aparecem nesta comparação.</p>}
          </div>
        </div>
      </section>

      <section className="glass-card p-5 sm:p-6" aria-labelledby="review-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 id="review-title" className="flex items-center gap-2 text-lg font-semibold"><CalendarClock className="h-5 w-5 text-primary" /> Radar de pendências</h2><p className="mt-1 text-sm text-muted-foreground">Despesas e parcelas ainda não marcadas como pagas.</p></div>{renderMonthSelect(reviewIndex, setReviewIndex, "Mês das pendências")}</div>
        <div className="mt-5 flex flex-wrap gap-3 text-xs"><span className="rounded-full border border-border bg-secondary/20 px-3 py-2">{payments.length} pendência(s)</span><span className="rounded-full border border-border bg-secondary/20 px-3 py-2">Total: <strong>{money(totalPending)}</strong></span>{overdueCount > 0 && <span className="rounded-full border border-destructive/25 bg-destructive/5 px-3 py-2 text-expense">{overdueCount} parcela(s) com atraso</span>}</div>
        <div className="mt-4 divide-y divide-border/40">
          {!payments.length && <div className="py-8 text-center text-sm text-muted-foreground"><CheckCircle2 className="mx-auto mb-3 h-7 w-7 text-income" /> Nenhuma pendência registrada neste mês.</div>}
          {payments.map(payment => <Link key={payment.id} to={payment.route} onClick={() => store.setSelectedMonth(Number(reviewIndex))} className="flex items-center gap-3 rounded-xl px-2 py-4 transition-colors hover:bg-secondary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><span className={cn("h-2 w-2 shrink-0 rounded-full", payment.overdue ? "bg-destructive" : "bg-primary/40")} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{payment.title}</p><p className="mt-1 text-xs text-muted-foreground">{payment.source} · {payment.dueDate ? new Date(`${payment.dueDate}T00:00:00`).toLocaleDateString("pt-BR") : "sem data de vencimento"}{payment.overdue && " · em atraso"}</p></div><span className="text-money shrink-0 text-sm">{money(payment.amount)}</span><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" /></Link>)}
        </div>
        <p className="mt-3 text-[11px] leading-5 text-muted-foreground">Atualize os pagamentos no Fluxo ou na Carteira. Dívidas com credores são acompanhadas na seção Dívidas.</p>
      </section>

      <Link to="/renda" className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><TrendingUp className="h-4 w-4" /> Revisar fontes de renda <ArrowRight className="h-4 w-4" /></Link>
    </main>
  );
}

import { useMemo, useState } from "react";
import { CalendarDays, ListChecks, Target, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/planningTools";
import { normalizeDebtPlan, simulateDebtPlan, type DebtStrategy } from "@/lib/debtActionPlan";
import { DebtNextSteps } from "@/components/DebtNextSteps";
import { useFinanceStore } from "@/stores/financeStore";

const strategies: { id: DebtStrategy; name: string; description: string }[] = [
  { id: "smallest", name: "Menores primeiro", description: "Começa pelos menores saldos de credores." },
  { id: "interest", name: "Juros maiores", description: "Começa pelas taxas informadas mais altas." },
  { id: "custom", name: "Minha prioridade", description: "Você escolhe o primeiro credor." },
];
function label(period: number) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(Math.floor(period / 12), period % 12, 1)));
}

export function DebtActionPlan() {
  const store = useFinanceStore();
  const [draft, setDraft] = useState(() => store.debtPlan);
  const [amount, setAmount] = useState(() => store.debtPlan.monthlyExtra ? String(store.debtPlan.monthlyExtra).replace(".", ",") : "");
  const [error, setError] = useState("");
  const cleaned = amount.trim();
  const valid = !cleaned || /^\d+(?:[.,]\d{1,2})?$/.test(cleaned);
  const number = cleaned ? Number(cleaned.replace(",", ".")) : 0;
  const amountValid = valid && Number.isFinite(number) && number <= 999999999;
  const scenarioSettings = useMemo(() => normalizeDebtPlan({ ...draft, monthlyExtra: amountValid ? number : 0 }), [draft, amountValid, number]);
  const scenario = useMemo(() => simulateDebtPlan(store.banks, store.creditors, scenarioSettings), [store.banks, store.creditors, scenarioSettings]);
  const comparisons = useMemo(() => strategies.slice(0, 2).map(strategy => ({ ...strategy, result: simulateDebtPlan(store.banks, store.creditors, { ...scenarioSettings, strategy: strategy.id }) })), [store.banks, store.creditors, scenarioSettings]);
  const first = scenario.steps.find(step => step.allocations.length > 0 || step.scheduled > 0);
  const last = scenario.steps.at(-1);
  const activeCreditors = store.creditors.filter(c => c.totalDebt > c.amountPaid);
  const saved = JSON.stringify(scenarioSettings) === JSON.stringify(normalizeDebtPlan(store.debtPlan));
  const save = () => {
    if (!amountValid) { setError("Informe um valor positivo com até duas casas decimais."); return; }
    if (draft.strategy === "custom" && activeCreditors.length && !activeCreditors.some(c => c.id === draft.priorityId)) { setError("Escolha um credor para começar pela sua prioridade."); return; }
    store.saveDebtPlan(scenarioSettings); setError("");
  };
  return <section aria-labelledby="debt-plan-title" className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="debt-plan-title" className="text-xl font-bold flex items-center gap-2"><Target className="h-5 w-5 text-primary" aria-hidden />Plano de quitação</h2><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Organize as parcelas e simule um valor adicional para quitar seus credores. Seus pagamentos reais só mudam quando você os registra.</p></div><span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">Simulação</span></div>
    <DebtNextSteps onUse={(value, priorityId) => { setAmount(value.toFixed(2).replace(".", ",")); setDraft(previous => ({ ...previous, strategy: "custom", priorityId })); setError(""); }} />
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)]">
      <div className="rounded-xl bg-secondary/40 p-4 space-y-3"><label htmlFor="debt-plan-extra" className="block text-sm font-medium">Valor adicional por mês (R$)</label><Input id="debt-plan-extra" inputMode="decimal" placeholder="Ex.: 300,00" value={amount} onChange={event => { setAmount(event.target.value); setError(""); }} aria-describedby="debt-extra-hint" /><p id="debt-extra-hint" className="text-xs leading-relaxed text-muted-foreground">Além das contas e parcelas já previstas. Compare com a sugestão acima e confirme seu saldo bancário.</p></div>
      <fieldset><legend className="text-sm font-medium mb-3">Como priorizar os credores?</legend><div className="grid gap-2 sm:grid-cols-3">{strategies.map(item => <label key={item.id} className={`cursor-pointer rounded-xl border p-3 text-sm ${draft.strategy === item.id ? "border-primary bg-primary/10" : "border-border bg-background/40"}`}><span className="flex items-center gap-2 font-semibold"><input type="radio" name="debt-strategy" checked={draft.strategy === item.id} onChange={() => { setDraft({ ...draft, strategy: item.id }); setError(""); }} />{item.name}</span><span className="mt-2 block text-xs leading-relaxed text-muted-foreground">{item.description}</span></label>)}</div>
      {draft.strategy === "custom" && <label className="mt-3 block text-sm">Primeiro credor<select className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground" value={draft.priorityId} onChange={event => { setDraft({ ...draft, priorityId: event.target.value }); setError(""); }}><option value="">Selecione um credor</option>{activeCreditors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}</fieldset>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap items-center gap-3"><Button onClick={save} disabled={!store.cloudReady || store.localRecoveryAvailable || store.syncStatus === "conflict" || (saved && amountValid)}><ListChecks className="h-4 w-4 mr-2" />{saved && amountValid ? "Sem alterações" : "Salvar plano"}</Button><span className="text-xs text-muted-foreground">Alterar uma opção atualiza a prévia; salvar guarda suas escolhas na conta.</span></div>
    {!amountValid && <p role="alert" className="text-sm text-destructive">Informe um valor positivo com até duas casas decimais.</p>}
    {scenario.initial === 0 ? <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Nenhuma dívida em aberto encontrada. Cadastre parcelas em Carteira ou credores nesta página para montar seu plano.</div> : <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl bg-secondary/40 p-4"><p className="text-xs text-muted-foreground">Em aberto hoje</p><p className="mt-1 text-lg font-bold tabular-nums">{money(scenario.initial)}</p></div>
        <div className="rounded-xl bg-secondary/40 p-4"><p className="text-xs text-muted-foreground">Adicional mensal</p><p className="mt-1 text-lg font-bold tabular-nums">{amountValid ? money(scenarioSettings.monthlyExtra) : "—"}</p></div>
        <div className="rounded-xl bg-secondary/40 p-4"><p className="text-xs text-muted-foreground">Quitação estimada</p><p className="mt-1 text-lg font-bold">{!amountValid ? "—" : scenario.finishPeriod !== null ? label(scenario.finishPeriod) : "Não calculada"}</p></div>
        <div className="rounded-xl bg-secondary/40 p-4"><p className="text-xs text-muted-foreground">Saldo ao final da simulação</p><p className="mt-1 text-lg font-bold tabular-nums">{amountValid && last ? money(last.remaining) : "—"}</p></div>
      </div>
      {amountValid && <>
        <div className="grid gap-3 sm:grid-cols-2">{comparisons.map(item => <div key={item.id} className="rounded-xl border border-border p-4"><p className="text-sm font-semibold">{item.name}</p><p className="mt-1 text-sm">{item.result.finishPeriod !== null ? `Quitação estimada: ${label(item.result.finishPeriod)}` : "Sem data de quitação calculável"}</p><p className="mt-1 text-xs text-muted-foreground">{item.result.steps.find(step => step.allocations.length)?.allocations[0]?.name ? `Primeiro credor: ${item.result.steps.find(step => step.allocations.length)!.allocations[0].name}` : "Informe um valor adicional para comparar credores."}</p></div>)}</div>
        <p className="text-xs text-muted-foreground">As estratégias podem ter a mesma data: nesta simulação as taxas ajudam a definir a ordem, mas juros futuros não são acrescentados.</p>
        <div className="rounded-xl border border-border p-4"><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" aria-hidden/><h3 className="font-semibold">Seu próximo passo</h3></div>{first ? <div className="mt-2 space-y-1 text-sm"><p className="first-letter:uppercase">{label(first.period)}: {first.scheduled > 0 ? `${money(first.scheduled)} em parcelas previstas.` : "Sem parcelas previstas neste mês."}</p>{first.allocations.map((item,index) => <p key={`${item.name}-${index}`}>Simular {money(item.amount)} para {item.name}{item.cleared ? " · saldo estimado quitado" : ""}.</p>)}</div> : <p className="mt-2 text-sm text-muted-foreground">Defina um adicional mensal ou confira os vencimentos para formar um plano.</p>}</div>
        {scenario.steps.length > 0 && <details className="rounded-xl border border-border p-4"><summary className="cursor-pointer font-semibold text-sm">Ver evolução mês a mês ({scenario.steps.length} {scenario.steps.length === 1 ? "mês" : "meses"})</summary><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[420px] text-left text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="py-2 font-medium">Mês</th><th className="font-medium">Parcelas previstas</th><th className="font-medium">Adicional simulado</th><th className="font-medium">Saldo estimado</th></tr></thead><tbody>{scenario.steps.map(step => <tr key={step.period} className="border-t border-border"><th scope="row" className="py-2 font-medium capitalize">{label(step.period)}</th><td>{money(step.scheduled)}</td><td>{money(step.extra)}</td><td>{money(step.remaining)}</td></tr>)}</tbody></table></div></details>}
      </>}
      {scenario.unscheduledCount > 0 && <p className="rounded-lg bg-warning/10 p-3 text-sm text-foreground">{scenario.unscheduledCount} {scenario.unscheduledCount === 1 ? "parcela está atrasada ou sem data válida" : "parcelas estão atrasadas ou sem data válida"} ({money(scenario.unscheduled)}). Elas permanecem no saldo e não são abatidas automaticamente.</p>}
      {scenario.unknownRates > 0 && <p className="text-xs text-muted-foreground">{scenario.unknownRates} {scenario.unknownRates === 1 ? "credor não tem taxa informada" : "credores não têm taxa informada"}; na ordem por juros, {scenario.unknownRates === 1 ? "ele fica" : "eles ficam"} depois dos credores com taxa conhecida.</p>}
      <p className="text-xs leading-relaxed text-muted-foreground">A projeção considera as parcelas cadastradas como pagas no mês do vencimento e o adicional apenas para credores. Juros futuros, descontos, parcelas mínimas de credores e antecipações não são calculados. Confira se algum pagamento a credor já está no fluxo para evitar contá-lo duas vezes. Datas são estimativas, não pagamentos.</p>
      {!scenario.finishPeriod && <p className="text-xs text-muted-foreground">A simulação cobre até 60 meses; pode não haver quitação nesse intervalo ou faltarem dados para calculá-la.</p>}
    </>}
  </section>;
}

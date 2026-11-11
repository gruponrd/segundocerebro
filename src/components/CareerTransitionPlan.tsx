import { useEffect, useState } from "react";
import { ArrowRight, BriefcaseBusiness } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFinanceStore } from "@/stores/financeStore";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_CAREER_PLAN, careerPeriodLabel, careerProjection, type CareerPlan } from "@/lib/careerTransition";
import { money } from "@/lib/planningTools";

type Draft = Record<keyof CareerPlan, string>;
const draftOf = (p: CareerPlan): Draft => Object.fromEntries(Object.entries(p).map(([key, value]) => [key, String(value).replace(".", ",")])) as Draft;
const fields: { key: keyof CareerPlan; label: string; help: string; max?: number; integer?: boolean }[] = [
  { key: "savings", label: "Quanto tenho guardado hoje", help: "Reserva disponível para essa transição, sem incluir dinheiro comprometido." },
  { key: "severance", label: "Rescisão líquida estimada (opcional)", help: "Valor que espera receber uma única vez no mês da saída. Não inclua aqui um valor que já esteja na reserva nem parcelas do seguro-desemprego. Se não souber, informe zero." },
  { key: "currentIncome", label: "Renda líquida mensal enquanto trabalho", help: "Total que espera receber por mês enquanto continuar no trabalho." },
  { key: "monthlyExpenses", label: "Despesas mensais de referência", help: "Inclua custos de vida e pagamentos de empréstimos. Não inclua aqui as parcelas de cartão já cadastradas: elas são somadas separadamente." },
  { key: "newIncome", label: "Renda líquida mensal da nova atividade", help: "Uma estimativa conservadora, já descontados custos e impostos. Use zero se ainda não souber." },
  { key: "newIncomeDelay", label: "Meses até a nova renda começar", help: "Zero significa que a renda começa no mês da saída.", max: 24, integer: true },
  { key: "reserveMonths", label: "Meses de reserva que deseja preservar", help: "Aplicados às despesas mensais de referência durante toda a projeção.", max: 24, integer: true },
  { key: "insuranceAmount", label: "Parcela estimada do seguro-desemprego", help: "Opcional. Informe apenas para comparar uma hipótese de benefício elegível." },
  { key: "insuranceInstallments", label: "Número de parcelas do seguro", help: "Somente para a comparação hipotética, sujeito à confirmação.", max: 5, integer: true },
  { key: "insuranceDelay", label: "Meses até começar o seguro", help: "Zero significa no mês da saída. O primeiro pagamento pode demorar.", max: 12, integer: true },
];
function parseDraft(draft: Draft): CareerPlan | null {
  const result = {} as CareerPlan;
  for (const field of fields) {
    const raw = draft[field.key].trim().replace(",", ".");
    if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) return null;
    const value = Number(raw);
    if (!Number.isFinite(value) || value > (field.max ?? 99999999) || (field.integer && !Number.isInteger(value))) return null;
    result[field.key] = value;
  }
  return result.monthlyExpenses > 0 && result.reserveMonths >= 1 ? result : null;
}

function TransitionDashboard({ plan, result }: { plan: CareerPlan; result: ReturnType<typeof careerProjection> }) {
  const currentSurplus = plan.currentIncome - plan.monthlyExpenses;
  const gap = Math.max(0, result.reserveTarget - plan.savings);
  const percent = result.reserveTarget > 0 ? Math.min(100, Math.max(0, plan.savings / result.reserveTarget * 100)) : 0;
  const metrics = [
    { label: "Reserva disponível hoje", value: money(plan.savings), detail: "Valor informado para a transição" },
    { label: "Reserva mínima desejada", value: money(result.reserveTarget), detail: `${plan.reserveMonths} meses de despesas de referência` },
    { label: "Falta para a reserva mínima", value: money(gap), detail: gap === 0 ? "Mínimo atingido hoje" : "Antes de parcelas e gastos futuros" },
    { label: "Sobra mensal de referência", value: money(currentSurplus), detail: "Renda atual menos despesas, sem parcelas da carteira" },
  ];
  const highest = Math.max(result.reserveTarget, ...((result.first?.timeline ?? []).map(month => month.balance)), 1);
  return <div className="space-y-4" aria-label="Resumo visual da transição">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(metric => <div key={metric.label} className="min-w-0 rounded-xl border border-border bg-background/60 p-4"><p className="text-xs text-muted-foreground">{metric.label}</p><p className="mt-2 break-words text-xl font-bold tabular-nums">{metric.value}</p><p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p></div>)}</div>
    <div className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="font-semibold">Caminho até a reserva mínima</p><p className="text-sm tabular-nums">{money(plan.savings)} / {money(result.reserveTarget)}</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label="Reserva atual em relação ao mínimo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}><div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} /></div><p className="mt-2 text-xs text-muted-foreground">Compara apenas o valor guardado hoje com o mínimo. Não inclui obrigações futuras.</p></div>
    {result.first && <div className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-baseline justify-between gap-2"><div><h3 className="font-semibold">Os 12 meses após a saída</h3><p className="mt-1 text-xs text-muted-foreground">Cenário sem seguro · início em {careerPeriodLabel(result.first.period)} · valores estimados no fim de cada mês</p></div><span className="text-xs text-muted-foreground">Reserva mínima: {money(result.reserveTarget)}</span></div>
      <div className="mt-4 space-y-2">{result.first.timeline.map(month => <div key={month.period} className="grid grid-cols-[5.8rem_minmax(0,1fr)_auto] items-center gap-2 text-xs sm:grid-cols-[8rem_minmax(0,1fr)_auto]"><span className="capitalize text-muted-foreground">{careerPeriodLabel(month.period)}</span><div className="h-2 overflow-hidden rounded-full bg-secondary" aria-hidden="true"><div className="h-full rounded-full bg-primary/80" style={{ width: `${Math.max(0, month.balance) / highest * 100}%` }} /></div><span className="text-right font-medium tabular-nums">{money(month.balance)}</span></div>)}</div>
      <details className="mt-4 border-t border-border pt-3 text-sm"><summary className="cursor-pointer font-medium">Ver composição mês a mês</summary><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-xs"><thead className="text-muted-foreground"><tr><th className="pb-2 font-medium">Mês</th><th className="pb-2 font-medium">Renda</th><th className="pb-2 font-medium">Rescisão</th><th className="pb-2 font-medium">Despesas</th><th className="pb-2 font-medium">Parcelas</th><th className="pb-2 text-right font-medium">Reserva final</th></tr></thead><tbody>{result.first.timeline.map(month => <tr key={month.period} className="border-t border-border/60"><td className="py-2 capitalize">{careerPeriodLabel(month.period)}</td><td>{money(month.income)}</td><td>{money(month.severance)}</td><td>{money(month.expenses)}</td><td>{money(month.installments)}</td><td className="text-right font-medium">{money(month.balance)}</td></tr>)}</tbody></table></div></details>
    </div>}
  </div>;
}

export function CareerTransitionPlan() {
  const store = useFinanceStore();
  const { user } = useAuth();
  const [draft, setDraft] = useState<Draft>(() => draftOf(store.careerPlan ?? DEFAULT_CAREER_PLAN));
  const [error, setError] = useState("");
  useEffect(() => { setDraft(draftOf(store.careerPlan ?? DEFAULT_CAREER_PLAN)); setError(""); }, [store.careerPlan, user?.id]);
  const plan = store.careerPlan;
  const base = plan ? careerProjection(plan, store.banks) : null;
  const benefit = plan && plan.insuranceAmount > 0 && plan.insuranceInstallments > 0 ? careerProjection(plan, store.banks, true) : null;
  const isDirty = JSON.stringify(draft) !== JSON.stringify(draftOf(plan ?? DEFAULT_CAREER_PLAN));
  const save = () => {
    const parsed = parseDraft(draft);
    if (!parsed) { setError("Informe valores válidos, despesas maiores que zero e pelo menos um mês de reserva."); return; }
    setError(""); store.saveCareerPlan(parsed);
  };
  const fillFromFlow = () => {
    const total = (values: {amount: number}[]) => Math.round(values.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0) * 100) / 100;
    setDraft(d => ({ ...d, currentIncome: String(total(store.currentCashflow.incomes)).replace(".", ","), monthlyExpenses: String(total(store.currentCashflow.expenses)).replace(".", ",") }));
  };
  return <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-5" aria-labelledby="career-plan-title">
    <div className="flex flex-wrap justify-between gap-3"><div><h2 id="career-plan-title" className="flex items-center gap-2 text-xl font-bold"><BriefcaseBusiness className="h-5 w-5 text-primary" /> Planejar mudança de trabalho</h2><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Uma projeção para planejar a transição, com reserva e compromissos. Os valores são estimativas, não uma garantia de que será seguro sair.</p></div></div>
    {plan && base && <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-3" aria-live="polite">
      <p className="text-sm text-muted-foreground">Primeiro mês que atende à reserva escolhida · sem depender do seguro</p>
      <p className="text-2xl font-bold capitalize">{base.unknown ? "Revise as parcelas da Carteira" : base.first ? careerPeriodLabel(base.first.period) : "Ainda não encontrado nos próximos 36 meses"}</p>
      {base.first && <p className="text-sm">Reserva estimada ao sair: <strong>{money(base.first.starting)}</strong> · menor reserva nos 12 meses seguintes: <strong>{money(base.first.lowest)}</strong> · mínimo escolhido: <strong>{money(base.reserveTarget)}</strong>.</p>}
      {plan.severance > 0 && <p className="text-sm">Inclui {money(plan.severance)} de rescisão estimada, recebida uma vez no mês da saída.</p>}
      {base.unknown > 0 && <p className="text-sm text-destructive">Há {base.unknown} parcela(s) com valor ou vencimento inválido. Revise na Carteira para calcular.</p>}
      {base.overdue > 0 && <p className="text-xs text-muted-foreground">A projeção desconta {money(base.overdue)} de parcelas vencidas ou com vencimento até o mês atual no primeiro mês projetado.</p>}
      {!base.first && !base.unknown && <p className="text-sm text-muted-foreground">{plan.newIncome < plan.monthlyExpenses ? `A nova renda estimada fica ${money(plan.monthlyExpenses - plan.newIncome)} abaixo das despesas mensais, antes das parcelas. ` : ""}Revise os valores, aumente a reserva ou ajuste a expectativa de renda para comparar um novo cenário.</p>}
      {benefit && <div className="border-t border-border pt-3"><p className="text-sm font-semibold">Comparação hipotética com seguro: <span className="capitalize">{benefit.unknown ? "revise as parcelas sem data" : benefit.first ? careerPeriodLabel(benefit.first.period) : "nenhum mês encontrado em 36 meses"}</span></p><p className="mt-1 text-xs text-muted-foreground">Supõe benefício concedido nas condições informadas e não soma a renda da nova atividade nos meses de seguro.</p></div>}
      {isDirty && <p className="text-xs text-primary">Há alterações não salvas. Salve para atualizar a projeção.</p>}
    </div>}
    {plan && base && <TransitionDashboard plan={plan} result={base} />}
    <div className="rounded-xl bg-secondary/40 p-4 text-sm space-y-2"><p className="font-semibold">Como calculamos</p><p className="text-muted-foreground">Simulamos uma saída no início de cada mês, a partir do próximo, e verificamos se a reserva fica acima do mínimo durante os 12 meses seguintes. Antes da saída, usamos a renda informada; depois, a renda da nova atividade. A rescisão informada entra uma vez no mês da saída. Parcelas de cartões e empréstimos cadastrados na Carteira entram nos vencimentos registrados.</p><p className="text-muted-foreground">A rescisão e a data de pagamento são estimativas informadas por você. A simulação não calcula automaticamente rescisão, FGTS, juros futuros nem dívidas sem parcelas cadastradas. Não soma valores já guardados em outras metas. Revise as despesas, parcelas e renda prevista antes de decidir.</p></div>
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Informações para a projeção</h3><Button type="button" variant="outline" size="sm" onClick={fillFromFlow} disabled={!store.cloudReady}>Usar valores de {store.currentCashflow.month}</Button></div>
    <p className="text-xs text-muted-foreground">O botão preenche renda e despesas manuais do mês selecionado no Fluxo. Confira os valores e evite duplicar parcelas de cartão; nada é salvo até você confirmar.</p>
    <div className="grid gap-4 md:grid-cols-2">{fields.map(field => <label key={field.key} className="block text-sm font-medium">{field.label}<Input className="mt-1" inputMode={field.integer ? "numeric" : "decimal"} value={draft[field.key]} onChange={e => setDraft(current => ({ ...current, [field.key]: e.target.value }))} /><span className="mt-1 block text-xs font-normal leading-relaxed text-muted-foreground">{field.help}</span></label>)}</div>
    <div className="rounded-xl border border-border p-4 text-sm leading-relaxed"><p className="font-semibold">Seguro-desemprego: cenário separado</p><p className="mt-1 text-muted-foreground">Em regra, o benefício exige dispensa sem justa causa e outros requisitos; um pedido de demissão não deve ser tratado como direito ao seguro. Nova renda ou emprego também podem afetar a elegibilidade. Confirme sua situação antes de considerar a hipótese.</p><a href="https://www.gov.br/pt-br/servicos/solicitar-o-seguro-desemprego" target="_blank" rel="noreferrer" className="mt-2 inline-block text-primary underline underline-offset-4">Consultar regras oficiais do seguro-desemprego</a></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button onClick={save} disabled={!store.cloudReady || store.syncStatus === "conflict" || store.localRecoveryAvailable} className="gap-2">Salvar e calcular <ArrowRight className="h-4 w-4" /></Button>
  </section>;
}

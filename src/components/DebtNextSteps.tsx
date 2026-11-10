import { ArrowDownLeft, ArrowUpRight, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/planningTools";
import { suggestDebtActions } from "@/lib/debtSuggestions";
import { useFinanceStore } from "@/stores/financeStore";

export function DebtNextSteps({ onUse }: { onUse: (amount: number, priorityId: string) => void }) {
  const store = useFinanceStore();
  const advice = suggestDebtActions(store.cashflowMonths, store.banks, store.creditors, store.safetyMargin);
  const period = advice.month ? `${advice.month.month} ${advice.month.year}` : new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date());
  return <section aria-labelledby="debt-advice-title" className="rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5 space-y-4">
    <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Lightbulb className="h-5 w-5" aria-hidden /></span><div><h3 id="debt-advice-title" className="font-bold">O que fazer neste mês</h3><p className="mt-1 text-sm text-muted-foreground">Sugestão para {period}, baseada nos lançamentos ainda não confirmados.</p></div></div>
    {!advice.evidence ? <p className="text-sm text-muted-foreground">Cadastre as entradas e saídas deste mês no Fluxo de caixa para receber uma sugestão.</p> : <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg bg-card p-3"><p className="text-xs text-muted-foreground flex items-center gap-1"><ArrowDownLeft className="h-3 w-3" aria-hidden/>A receber</p><p className="mt-1 font-semibold tabular-nums text-income">{money(advice.pendingIncome)}</p></div>
        <div className="rounded-lg bg-card p-3"><p className="text-xs text-muted-foreground flex items-center gap-1"><ArrowUpRight className="h-3 w-3" aria-hidden/>A pagar</p><p className="mt-1 font-semibold tabular-nums text-destructive">{money(advice.pendingOut)}</p></div>
        <div className="rounded-lg bg-card p-3"><p className="text-xs text-muted-foreground">Diferença prevista</p><p className="mt-1 font-semibold tabular-nums">{money(advice.projectedDifference)}</p></div>
        <div className="rounded-lg bg-card p-3"><p className="text-xs text-muted-foreground">Margem informada</p><p className="mt-1 font-semibold tabular-nums">{money(advice.reserve)}</p></div>
      </div>
      <p className="text-xs text-muted-foreground">A pagar: {money(advice.pendingExpense)} em saídas manuais + {money(advice.cards)} em parcelas do mês ainda não pagas.</p>
      <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
        {advice.urgentCard && <li>Confira {advice.urgentCard.name}: há uma parcela {advice.urgentCard.date ? "atrasada ou com vencimento anterior a hoje" : "sem data válida"} de {money(advice.urgentCard.amount)}. Revise o vencimento e o pagamento na Carteira.</li>}
        {advice.pendingIncome > 0 && <li>Confirme o recebimento dos {money(advice.pendingIncome)} previstos e separe os {money(advice.pendingOut)} de contas pendentes antes de assumir pagamentos adicionais.</li>}
        {advice.pendingIncome === 0 && <li>Não há entradas pendentes registradas para este mês. Confira o saldo bancário e os lançamentos antes de assumir um pagamento adicional.</li>}
        {advice.incompleteCount > 0 ? <li>Há {money(advice.unaccounted)} em parcelas de meses anteriores ou sem data válida. Atualize esses compromissos antes de definir uma sobra para quitar credores.</li> : advice.projectedDifference < 0 ? <li>As saídas pendentes superam as entradas pendentes em {money(Math.abs(advice.projectedDifference))}. Priorize as contas essenciais, revise as datas e avalie negociar vencimentos.</li> : advice.suggestedExtra > 0 && advice.priority ? <li>Depois de receber e pagar as contas previstas, considere destinar <strong>até {money(advice.suggestedExtra)}</strong> a {advice.priority.name}{advice.priority.rate !== null ? `, com taxa informada de ${advice.priority.rate}% ao mês` : "; a taxa de juros não foi informada"}. Confirme o saldo disponível antes de pagar.</li> : advice.priority ? <li>Não há valor adicional sugerido com os dados pendentes e a margem informada. Reavalie após confirmar entradas e saídas.</li> : <li>Não há credores com saldo em aberto para receber um adicional. Acompanhe as parcelas cadastradas na Carteira.</li>}
      </ol>
      {advice.suggestedExtra > 0 && advice.priority && <Button variant="outline" onClick={() => onUse(advice.suggestedExtra, advice.priority!.id)}>Simular {money(advice.suggestedExtra)} para {advice.priority.name}</Button>}
      <p className="text-xs leading-relaxed text-muted-foreground">A diferença não é saldo bancário: não inclui o dinheiro que já estava na conta ou foi recebido. Confira se pagamentos a credores já aparecem nas saídas para evitar duplicidade. Nenhum pagamento ou alteração é feito automaticamente.</p>
    </>}
  </section>;
}

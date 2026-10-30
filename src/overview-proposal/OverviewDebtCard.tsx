import { Link } from "react-router-dom";
import { ArrowUpRight, CreditCard } from "lucide-react";
import type { Bank, CashflowMonth, Creditor } from "@/data/financialData";
import { debtProjection } from "@/lib/debtProjection";
import { AnimatedAmount } from "./AnimatedAmount";
import { ProposalHealthScore } from "./ProposalHealthScore";

export function OverviewDebtCard({ banks, creditors, month }: { banks: Bank[]; creditors: Creditor[]; month: CashflowMonth }) {
  const debt = debtProjection(banks, creditors, month);
  const period = `${month.month}/${month.year}`;
  return <section className="cl-panel cl-primary-debt" aria-labelledby="cl-primary-debt-title">
    <div className="cl-panel-heading"><h2 id="cl-primary-debt-title">{debt.isCurrentMonth ? "Dívida total em aberto" : debt.isProjection ? "Dívida restante prevista" : "Dívida atual em aberto"}</h2><CreditCard size={17} /></div>
    {debt.isCurrentMonth ? <div className="cl-debt-current-values">
      <div role="group" aria-label="Dívida total hoje"><span>Em aberto hoje</span><AnimatedAmount value={debt.currentDebt} /></div>
      <div role="group" aria-label="Dívida prevista ao final do mês"><span>Prevista no fim do mês</span><AnimatedAmount value={debt.remaining} /></div>
    </div> : <AnimatedAmount value={debt.remaining} />}
    <p>{debt.isCurrentMonth ? `A previsão considera o pagamento das parcelas de ${period}.` : debt.isProjection ? `Após as parcelas previstas até ${period}, incluindo este mês.` : "Saldo atual. Não há histórico suficiente para reconstruir a dívida daquele mês."}</p>
    <dl><div><dt>{debt.isCurrentMonth ? "Em cartões hoje" : "Em cartões"}</dt><dd><AnimatedAmount value={debt.isCurrentMonth ? debt.cardsCurrent : debt.cardsRemaining} /></dd></div><div><dt>{debt.isCurrentMonth ? "Empréstimo/Crédito hoje" : "Empréstimo/Crédito"}</dt><dd><AnimatedAmount value={debt.isCurrentMonth ? debt.loansCurrent : debt.loansRemaining} /></dd></div><div><dt>Com credores</dt><dd><AnimatedAmount value={debt.creditorsRemaining} /></dd></div></dl>
    {debt.isProjection && <p>{!debt.isCurrentMonth && <span className="block">Em aberto hoje: <strong><AnimatedAmount value={debt.currentDebt} /></strong></span>}<span className="block">Redução prevista até {period}: <strong><AnimatedAmount value={debt.projectedPayments} /></strong></span></p>}
    <p className="cl-primary-debt-note">{debt.isProjection && "Projeção se as parcelas forem pagas; não confirma pagamentos. Atrasos anteriores e credores sem plano continuam em aberto. "}As parcelas já estão nas saídas e não são descontadas novamente da sobra.</p>
    <ProposalHealthScore />
    <Link to="/divida">Ver detalhes da dívida <ArrowUpRight size={14} /></Link>
  </section>;
}

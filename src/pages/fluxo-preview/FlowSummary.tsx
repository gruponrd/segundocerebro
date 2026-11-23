import { ArrowDownLeft, ArrowUpRight, CreditCard } from "lucide-react";
import { unpaidCardSpendingForMonth } from "@/lib/financeCalculations";
import { monthNumber } from "@/lib/planningTools";
import { useFinanceStore } from "@/stores/financeStore";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const flowMoney = (amount: number) => currency.format(Object.is(amount, -0) ? 0 : amount);

function SettlementLine({ direction, total, pending }: {
  direction: "income" | "expense";
  total: number;
  pending: number;
}) {
  const income = direction === "income";
  const settled = total - pending;
  const share = total > 0 ? Math.max(0, Math.min(100, settled / total * 100)) : 0;
  return (
    <div className={`flow-settlement-line ${direction}`}>
      <dl>
        <div><dt>{income ? "Recebido" : "Pago"}</dt><dd>{flowMoney(settled)}</dd></div>
        <div><dt>{income ? "A receber" : "A pagar"}</dt><dd>{flowMoney(pending)}</dd></div>
      </dl>
      <div className="flow-settlement-track" aria-hidden="true">
        <span style={{ width: `${share}%` }} />
      </div>
    </div>
  );
}

export function FlowSummary() {
  const { currentCashflow, banks, totalIncome, totalExpense, cardExpensesForMonth, expectedBalance } = useFinanceStore();
  const unsettledTotal = (items: typeof currentCashflow.expenses) => items
    .filter(item => !item.paid)
    .reduce((sum, item) => sum + Math.round(item.amount * 100), 0);
  const cardPending = unpaidCardSpendingForMonth(banks, monthNumber(currentCashflow.month), currentCashflow.year);
  const pendingIncome = unsettledTotal(currentCashflow.incomes) / 100;
  const pendingExpense = (unsettledTotal(currentCashflow.expenses) + Math.round(cardPending * 100)) / 100;
  const received = (Math.round(totalIncome * 100) - Math.round(pendingIncome * 100)) / 100;
  const coverage = (Math.round(received * 100) - Math.round(totalExpense * 100)) / 100;

  return (
    <div className="flow-summary">
      <section className="flow-projection" aria-labelledby="flow-projection-title">
        <h2 id="flow-projection-title">Saldo projetado do mês</h2>
        <strong className={`flow-projection-value ${expectedBalance < 0 ? "text-expense" : ""}`}>{flowMoney(expectedBalance)}</strong>
        <p>Entradas previstas menos despesas e parcelas do período.</p>
        <dl className="flow-equation">
          <div><dt><ArrowDownLeft aria-hidden size={15} />Entradas</dt><dd>{flowMoney(totalIncome)}</dd></div>
          <div><dt><ArrowUpRight aria-hidden size={15} />Despesas diretas</dt><dd>{flowMoney(totalExpense - cardExpensesForMonth)}</dd></div>
          <div><dt><CreditCard aria-hidden size={15} />Parcelas no cartão</dt><dd>{flowMoney(cardExpensesForMonth)}</dd></div>
        </dl>
      </section>
      <section className="flow-settlement" aria-labelledby="flow-settlement-title">
        <h2 id="flow-settlement-title">Situação dos lançamentos</h2>
        <SettlementLine direction="income" total={totalIncome} pending={pendingIncome} />
        <SettlementLine direction="expense" total={totalExpense} pending={pendingExpense} />
        <div className="flow-coverage">
          <div><span>Recebido menos saídas previstas</span><strong className={coverage < 0 ? "text-expense" : "text-income"}>{flowMoney(coverage)}</strong></div>
        </div>
      </section>
    </div>
  );
}

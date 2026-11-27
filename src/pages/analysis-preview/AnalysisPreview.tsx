import { Link, useSearchParams } from "react-router-dom";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Monitor, Smartphone, Wallet } from "lucide-react";
import { CashflowEntries, SmartEntryPanel } from "@/components/CashflowWorkspace";
import { CashflowDueDates } from "@/components/CashflowDueDates";
import { NextPaymentCard } from "@/components/NextPaymentCard";
import { PeriodPicker } from "@/components/PeriodPicker";
import { CashflowMonthStatus } from "@/components/MonthlyCashflowTrend";
import { cashflowMonthSummary } from "@/lib/cashflowMonthSummary";
import { money } from "@/lib/planningTools";
import { SurplusSparkline } from "@/overview-proposal/SurplusSparkline";
import { isDesignPreview } from "@/lib/previewMode";
import { useFinanceStore } from "@/stores/financeStore";
import "../fluxo-preview/flow.css";
import "./analysis.css";

export default function AnalysisPreview() {
  const { cashflowMonths, selectedMonth, setSelectedMonth, banks } = useFinanceStore();
  const [query, setQuery] = useSearchParams();
  const mobile = isDesignPreview && query.get("tela") === "mobile";
  const month = cashflowMonths[selectedMonth];
  const { totals, invalid } = cashflowMonthSummary(month, banks);
  const balance = totals ? Math.round((totals.income - totals.cost) * 100) / 100 : null;
  const balanceTone = balance === null || balance === 0 ? undefined : balance > 0 ? "text-income" : "text-expense";
  return <main className={`analysis-page${mobile ? " analysis-phone" : ""}`}>
    <header className="analysis-header">
      <Link className="analysis-back" to="/"><ArrowLeft size={16} aria-hidden="true" /> Visão geral</Link>
      {isDesignPreview && <button className="analysis-device" type="button" aria-pressed={mobile} onClick={() => {
        const next = new URLSearchParams(query);
        if (mobile) next.delete("tela");
        else next.set("tela", "mobile");
        setQuery(next, { replace: true });
      }}>{mobile ? <Monitor size={16} aria-hidden="true" /> : <Smartphone size={16} aria-hidden="true" />}
        {mobile ? "Tela ampla" : "Ver como no celular"}</button>}
    </header>
    <div className="analysis-title">
      <h1>Receitas e gastos</h1>
      <PeriodPicker months={cashflowMonths} selected={selectedMonth} onChange={setSelectedMonth} />
    </div>
    <dl className="analysis-totals" aria-label="Resumo do mês" aria-live="polite">
      <div className="analysis-balance">
        <dt>Saldo projetado</dt>
        <dd className={balanceTone}>
          {invalid ? "Indisponível" : balance === null ? "Sem lançamentos" : money(balance)}
        </dd>
      </div>
      <div className="income">
        <dt><ArrowDownLeft size={17} aria-hidden="true" />Receitas do mês</dt>
        <dd>
          {totals ? money(totals.income) : "—"}
          <dl className="analysis-income-breakdown" aria-label="Recebimentos do mês">
            <div>
              <dt>Já recebido</dt>
              <dd>{totals ? money(totals.status.received) : "—"}</dd>
            </div>
            <div>
              <dt>Falta receber</dt>
              <dd>{totals ? money(totals.status.receivable) : "—"}</dd>
            </div>
          </dl>
        </dd>
      </div>
      <div className="cost"><dt><ArrowUpRight size={17} aria-hidden="true" />Gastos do mês</dt><dd>{totals ? money(totals.cost) : "—"}</dd></div>
    </dl>
    <Link className="analysis-dues-jump" to={{ search: query.toString(), hash: "#vencimentos" }}>
      Ir para vencimentos e atrasos <ArrowDownLeft size={15} aria-hidden="true" />
    </Link>
    <div className="analysis-layout">
      <section className="analysis-chart-panel analysis-cashflow-trend" aria-labelledby="cashflow-trend-title">
        <h2 id="cashflow-trend-title">Entradas, saídas e saldo</h2>
        {month && <SurplusSparkline key={`${month.month}-${month.year}`} month={month} months={cashflowMonths} banks={banks} />}
        <CashflowMonthStatus totals={totals} showLive />
        <p className="analysis-note"><Wallet size={14} aria-hidden="true" />
          <span>O saldo projetado considera entradas e saídas do mês, incluindo as pendentes.
            {!!totals?.cards && ` Os gastos já incluem ${money(totals.cards)} em parcelas.`}
          </span>
        </p>
      </section>
      <CashflowDueDates />
      <CashflowEntries presentation="ledger" />
    </div>
    <NextPaymentCard months={cashflowMonths} banks={banks} />
    <div className="mt-4 max-w-2xl">
      <SmartEntryPanel proposal />
    </div>
  </main>;
}

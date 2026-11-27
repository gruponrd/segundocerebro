import { ArrowLeftRight } from "lucide-react";
import { CashflowEntries, SmartEntryPanel } from "@/components/CashflowWorkspace";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { PeriodPicker } from "@/components/PeriodPicker";
import { useFinanceStore } from "@/stores/financeStore";
import { NextPaymentCard } from "@/components/NextPaymentCard";
import { isDesignPreview } from "@/lib/previewMode";
import { FlowSummary } from "./fluxo-preview/FlowSummary";
import "./fluxo-preview/flow.css";

const FluxoPage = () => {
  const store = useFinanceStore();
  const [params] = useSearchParams();
  const proposal = isDesignPreview && params.get("visual") === "proposta";
  const periodPicker = <PeriodPicker months={store.cashflowMonths} selected={store.selectedMonth} onChange={store.setSelectedMonth} />;
  const entries = <CashflowEntries presentation={proposal ? "ledger" : isDesignPreview ? "compact-balances" : undefined} />;
  const nextPayment = <NextPaymentCard months={store.cashflowMonths} banks={store.banks} />;

  if (proposal) {
    return (
      <main className="flow-proposal">
        <header className="flow-page-header">
          <div>
            <h1>Fluxo de caixa</h1>
            <div className="flow-header-links">
              <Link to="/fluxo">Voltar à versão atual</Link>
              <a className="flow-quick-jump" href="#flow-quick-entry">Ir para lançamento rápido</a>
            </div>
          </div>
          {periodPicker}
        </header>
        <FlowSummary />
        {entries}
        {nextPayment}
        <div className="mt-4 max-w-2xl"><SmartEntryPanel proposal /></div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="page-container">
        <PageHeader title="Fluxo de caixa" description={`Entradas e saídas de ${store.currentCashflow.month} ${store.currentCashflow.year}. Entradas com data até o dia 7 do mês seguinte contam neste período.`} icon={ArrowLeftRight} className="mb-8" actions={periodPicker} />

        <div key={`cf-${store.selectedMonth}`} className="animate-float-in">
          {entries}
        </div>

        {nextPayment}
        <div className="mt-4 max-w-2xl"><SmartEntryPanel /></div>
      </div>
    </div>
  );
};

export default FluxoPage;

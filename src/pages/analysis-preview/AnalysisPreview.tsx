import { useId, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Monitor, Smartphone, Wallet } from "lucide-react";
import { CashflowEntries, SmartEntryPanel } from "@/components/CashflowWorkspace";
import { CashflowDueDates } from "@/components/CashflowDueDates";
import { PaymentSessions } from "@/components/PaymentSessions";
import { PeriodPicker } from "@/components/PeriodPicker";
import { monthlyCashflowChart } from "@/lib/monthlyCashflowChart";
import { money, monthNumber } from "@/lib/planningTools";
import { monthlyFlow } from "@/overview-proposal/monthlyFlow";
import { isDesignPreview } from "@/lib/previewMode";
import { useFinanceStore } from "@/stores/financeStore";
import "../fluxo-preview/flow.css";
import "./analysis.css";

const monthsShort = new Intl.DateTimeFormat("pt-BR", { month: "short" });
const unit = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
const series = [
  { key: "received", group: "income", label: "Recebido" },
  { key: "receivable", group: "income", label: "A receber" },
  { key: "paid", group: "cost", label: "Já pago" },
  { key: "payable", group: "cost", label: "A pagar" },
] as const;
const views = [{ key: "both", label: "Comparar" }, { key: "income", label: "Receitas" }, { key: "cost", label: "Gastos" }] as const;
type View = typeof views[number]["key"];
type Values = Record<typeof series[number]["key"], number>;
type Point = { index: number; label: string; full: string; invalid: boolean; totals: { income: number; cost: number; cards: number; status: Values } | null };

function Trend({ points, selected, onSelect, view }: {
  points: Point[]; selected: number; onSelect: (index: number) => void; view: View;
}) {
  const id = useId();
  const visible = series.filter(item => view === "both" || item.group === view);
  const values = points.flatMap(point => series.map(item => point.totals?.status[item.key] ?? 0));
  const maximum = Math.max(3, ...values);
  const stepBase = 10 ** Math.floor(Math.log10(maximum / 3));
  const step = Math.ceil(maximum / 3 / stepBase) * stepBase;
  const top = step * 3;
  const x = (slot: number) => 600 * (slot + .5) / points.length;
  const y = (value: number) => 188 - (value / top) * 170;
  const active = points.findIndex(point => point.index === selected);
  return <div className="analysis-trend">
    <div className="analysis-scale" aria-hidden="true">{[3, 2, 1, 0].map(tick => <span key={tick}>{tick ? unit.format(tick * step) : "R$ 0"}</span>)}</div>
    <div className="analysis-plot">
      <div className="analysis-plot-lines">
        <svg viewBox="0 0 600 190" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id={id} x2="0" y2="1" gradientUnits="objectBoundingBox"><stop stopOpacity=".16" /><stop offset="1" stopOpacity="0" /></linearGradient></defs>
          {[0, 1, 2, 3].map(tick => <line className="analysis-grid-line" key={tick} x1="0" x2="600" y1={y(step * tick)} y2={y(step * tick)} />)}
          {active >= 0 && <line className="analysis-month-line" x1={x(active)} x2={x(active)} y1="0" y2="188" />}
          {visible.map(item => <g key={item.key} className={`analysis-series ${item.key}`}>
            {points.slice(1).map((point, index) => {
              const previous = points[index].totals?.status[item.key];
              const value = point.totals?.status[item.key];
              if (previous === undefined || value === undefined) return null;
              const start = x(index);
              const end = x(index + 1);
              // Horizontal tangents keep each curve within its two monthly values.
              const middle = (start + end) / 2;
              const curve = `C ${middle},${y(previous)} ${middle},${y(value)} ${end},${y(value)}`;
              return <g key={point.index}>
                {item.key === "received" && <path d={`M ${start},188 L ${start},${y(previous)} ${curve} L ${end},188 Z`} fill={`url(#${id})`} />}
                <path className="analysis-segment" d={`M ${start},${y(previous)} ${curve}`} />
              </g>;
            })}
          </g>)}
        </svg>
        {visible.map(item => points.map((point, slot) => {
          const value = point.totals?.status[item.key];
          return value === undefined ? null : <span key={`${item.key}-${point.index}`} aria-hidden="true"
            className={`analysis-dot ${item.key}${slot === active ? " is-selected" : ""}`}
            style={{ left: `${x(slot) / 6}%`, top: `${y(value) / 1.9}%` }} />;
        }))}
      </div>
      <div className="analysis-months" role="group" aria-label="Consultar valores por mês">
        {points.map(point => <button type="button" key={point.index} aria-pressed={point.index === selected}
          aria-label={`${point.full}: ${point.invalid ? "valores indisponíveis" : !point.totals ? "sem lançamentos" : series.map(item => `${item.label}: ${money(point.totals!.status[item.key])}`).join(", ")}`}
          onClick={() => onSelect(point.index)}>{point.label}</button>)}
      </div>
    </div>
  </div>;
}

export default function AnalysisPreview() {
  const { cashflowMonths, selectedMonth, setSelectedMonth, banks } = useFinanceStore();
  const [query, setQuery] = useSearchParams();
  const [view, setView] = useState<View>("both");
  const mobile = isDesignPreview && query.get("tela") === "mobile";
  const start = Math.max(0, Math.min(selectedMonth - 3, cashflowMonths.length - 6));
  const points = cashflowMonths.slice(start, start + 6).map((item, offset) => {
    const flow = monthlyFlow(item, banks);
    const date = new Date(item.year, monthNumber(item.month) - 1, 1);
    const hasData = !flow.invalid && !!(item.incomes.length || item.expenses.length || flow.cost);
    const { entries } = monthlyCashflowChart(item, banks);
    const sums = entries.reduce((totals, entry) => {
      const cents = Math.round(entry.amount * 100);
      if (entry.paid) totals[entry.kind] += cents;
      if (entry.id.startsWith("card:")) totals.cards += cents;
      return totals;
    }, { incomes: 0, expenses: 0, cards: 0 });
    return {
      index: start + offset, label: monthsShort.format(date).replace(".", ""),
      full: `${item.month} ${item.year}`, invalid: flow.invalid,
      totals: hasData ? {
        income: flow.income, cost: flow.cost, cards: sums.cards / 100,
        status: {
          received: sums.incomes / 100,
          receivable: (Math.round(flow.income * 100) - sums.incomes) / 100,
          paid: sums.expenses / 100,
          payable: (Math.round(flow.cost * 100) - sums.expenses) / 100,
        },
      } : null,
    };
  });
  const current = points.find(point => point.index === selectedMonth);
  const totals = current?.totals;
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
          {current?.invalid ? "Indisponível" : balance === null ? "Sem lançamentos" : money(balance)}
        </dd>
      </div>
      <div className="income"><dt><ArrowDownLeft size={17} aria-hidden="true" />Receitas do mês</dt><dd>{totals ? money(totals.income) : "—"}</dd></div>
      <div className="cost"><dt><ArrowUpRight size={17} aria-hidden="true" />Gastos do mês</dt><dd>{totals ? money(totals.cost) : "—"}</dd></div>
    </dl>
    <Link className="analysis-dues-jump" to={{ search: query.toString(), hash: "#vencimentos" }}>
      Ir para vencimentos e atrasos <ArrowDownLeft size={15} aria-hidden="true" />
    </Link>
    <div className="analysis-layout">
      <section className="analysis-chart-panel" aria-label="Evolução mensal">
        <div className="analysis-chart-head">
          <h2>Evolução mensal</h2>
          <div className="analysis-filters" role="group" aria-label="Filtrar gráfico">
            {views.map(item => <button key={item.key} type="button" aria-pressed={view === item.key}
              onClick={() => setView(item.key)}>{item.label}</button>)}
          </div>
        </div>
        <Trend points={points} selected={selectedMonth} onSelect={setSelectedMonth} view={view} />
        <div className="analysis-status">
          <h3>Situação do mês</h3>
          <dl>
            {series.map(item => <div className={item.key} key={item.key}>
              <dt><i aria-hidden="true" />{item.label}</dt><dd>{totals ? money(totals.status[item.key]) : "—"}</dd>
            </div>)}
            {totals && <div className="analysis-live"><dt>Saldo Live <small>Recebido menos as saídas previstas</small></dt>
              <dd>{money(Math.round((totals.status.received - totals.cost) * 100) / 100)}</dd></div>}
          </dl>
        </div>
        <p className="analysis-note"><Wallet size={14} aria-hidden="true" />
          <span>O saldo projetado considera entradas e saídas do mês, incluindo as pendentes.
            {!!totals?.cards && ` Os gastos já incluem ${money(totals.cards)} em parcelas.`}
          </span>
        </p>
      </section>
      <CashflowDueDates />
      <CashflowEntries presentation="ledger" />
      <SmartEntryPanel proposal />
    </div>
    <details className="flow-payment-sessions">
      <summary>Previsão por período e sessões de pagamento</summary>
      <PaymentSessions />
    </details>
  </main>;
}

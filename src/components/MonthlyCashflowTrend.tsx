import { useId } from "react";
import type { Bank, CashflowMonth } from "@/data/financialData";
import { cashflowMonthSummary } from "@/lib/cashflowMonthSummary";
import { cashflowPeriod, emptyCashflowMonth } from "@/lib/cashflowMonths";
import { money } from "@/lib/planningTools";
import "./monthly-cashflow-trend.css";

const monthsShort = new Intl.DateTimeFormat("pt-BR", { month: "short" });
const unit = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
const paymentStatus = [
  { key: "received", label: "Recebido" },
  { key: "receivable", label: "A receber" },
  { key: "paid", label: "Já pago" },
  { key: "payable", label: "A pagar" },
] as const;
type Totals = NonNullable<ReturnType<typeof cashflowMonthSummary>["totals"]>;
const series = [
  { key: "received", label: "Recebido", value: (totals: Totals) => totals.status.received },
  { key: "outgoing", label: "Saídas do mês", value: (totals: Totals) => totals.cost },
] as const;
type Point = ReturnType<typeof cashflowMonthSummary> & { period: number; index: number | null; label: string; full: string };

function Trend({ points, selected, onSelect }: {
  points: Point[]; selected: number; onSelect: (index: number) => void;
}) {
  const values = points.flatMap(({ totals }) => totals ? series.map(item => item.value(totals)) : []);
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
          {[0, 1, 2, 3].map(tick => <line className="analysis-grid-line" key={tick} x1="0" x2="600" y1={y(step * tick)} y2={y(step * tick)} />)}
          {active >= 0 && <line className="analysis-month-line" x1={x(active)} x2={x(active)} y1="0" y2="188" />}
          {series.map(item => <g key={item.key} className={`analysis-series ${item.key}`}>
            {points.slice(1).map((point, index) => {
              const previous = points[index].totals;
              if (!previous || !point.totals) return null;
              const previousY = y(item.value(previous));
              const currentY = y(item.value(point.totals));
              const start = x(index);
              const end = x(index + 1);
              // Horizontal tangents keep each curve within its two monthly values.
              const middle = (start + end) / 2;
              return <path key={point.period} className="analysis-segment"
                d={`M ${start},${previousY} C ${middle},${previousY} ${middle},${currentY} ${end},${currentY}`} />;
            })}
          </g>)}
        </svg>
        {series.map(item => points.map((point, slot) => {
          return !point.totals ? null : <span key={`${item.key}-${point.period}`} aria-hidden="true"
            className={`analysis-dot ${item.key}${slot === active ? " is-selected" : ""}`}
            style={{ left: `${x(slot) / 6}%`, top: `${y(item.value(point.totals)) / 1.9}%` }} />;
        }))}
      </div>
      <div className="analysis-months" role="group" aria-label="Consultar valores por mês">
        {points.map(({ period, index, label, full, invalid, totals }) => {
          const values = totals ? series.map(item => `${item.label}: ${money(item.value(totals))}`).join(", ")
            : invalid ? "valores indisponíveis" : "sem lançamentos";
          return <button type="button" key={period} aria-pressed={index === selected} disabled={index === null}
            aria-label={`${full}: ${values}`} onClick={index === null ? undefined : () => onSelect(index)}>{label}</button>;
        })}
      </div>
    </div>
  </div>;
}

export function CashflowMonthStatus({ totals, showLive = false }: {
  totals: ReturnType<typeof cashflowMonthSummary>["totals"];
  showLive?: boolean;
}) {
  return (
    <div className="analysis-status">
      <h3>Situação do mês</h3>
      <dl>
        {paymentStatus.map(item => <div className={item.key} key={item.key}>
          <dt>{!showLive && <i aria-hidden="true" />}{item.label}</dt><dd>{totals ? money(totals.status[item.key]) : "—"}</dd>
        </div>)}
        {showLive && totals && <div className="analysis-live"><dt>Saldo Live <small>Recebido menos as saídas previstas</small></dt>
          <dd>{money(Math.round((totals.status.received - totals.cost) * 100) / 100)}</dd></div>}
      </dl>
    </div>
  );
}

export function MonthlyCashflowTrend({ months, banks, selected, onSelect }: {
  months: CashflowMonth[];
  banks: Bank[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  const titleId = useId();
  const reference = months[selected] ? cashflowPeriod(months[selected]) : undefined;
  const points: Point[] = reference === undefined ? [] : Array.from({ length: 7 }, (_, slot) => {
    const period = reference + slot - 3;
    const index = months.findIndex(month => cashflowPeriod(month) === period);
    const month = index < 0 ? emptyCashflowMonth(period) : months[index];
    const date = new Date(month.year, period % 12, 1);
    return {
      ...cashflowMonthSummary(month, banks),
      period,
      index: index < 0 ? null : index,
      label: monthsShort.format(date).replace(".", ""),
      full: `${month.month} ${month.year}`,
    };
  });
  const totals = points.find(point => point.index === selected)?.totals ?? null;

  return <section className="analysis-chart-panel cl-monthly-trend" aria-labelledby={titleId}>
    <div className="analysis-trend-heading">
      <h2 id={titleId}>Evolução mensal</h2>
      {points.length > 0 && <span>3 meses antes e 3 depois</span>}
    </div>
    {points.length > 0 && <Trend points={points} selected={selected} onSelect={onSelect} />}
    <dl className="analysis-trend-totals" aria-label="Valores do mês selecionado" aria-live="polite">
      {series.map(item => <div className={item.key} key={item.key}>
        <dt><i aria-hidden="true" />{item.label}</dt>
        <dd>{totals ? money(item.value(totals)) : "—"}</dd>
      </div>)}
    </dl>
  </section>;
}

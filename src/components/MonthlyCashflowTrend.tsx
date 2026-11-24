import { useId, useState } from "react";
import type { Bank, CashflowMonth } from "@/data/financialData";
import { cashflowMonthSummary } from "@/lib/cashflowMonthSummary";
import { money, monthNumber } from "@/lib/planningTools";
import "./monthly-cashflow-trend.css";

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
type Point = ReturnType<typeof cashflowMonthSummary> & { index: number; label: string; full: string };

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

export function CashflowMonthStatus({ totals, showLive = false }: {
  totals: ReturnType<typeof cashflowMonthSummary>["totals"];
  showLive?: boolean;
}) {
  return (
    <div className="analysis-status">
      <h3>Situação do mês</h3>
      <dl>
        {series.map(item => <div className={item.key} key={item.key}>
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
  const [view, setView] = useState<View>("both");
  const start = Math.max(0, Math.min(selected - 3, months.length - 6));
  const points = months.slice(start, start + 6).map((month, offset) => {
    const date = new Date(month.year, monthNumber(month.month) - 1, 1);
    return {
      ...cashflowMonthSummary(month, banks),
      index: start + offset,
      label: monthsShort.format(date).replace(".", ""),
      full: `${month.month} ${month.year}`,
    };
  });
  const totals = points.find(point => point.index === selected)?.totals ?? null;

  return <section className="analysis-chart-panel cl-monthly-trend" aria-labelledby={titleId}>
    <div className="analysis-chart-head">
      <h2 id={titleId}>Evolução mensal</h2>
      <div className="analysis-filters" role="group" aria-label="Filtrar gráfico">
        {views.map(item => <button key={item.key} type="button" aria-pressed={view === item.key}
          onClick={() => setView(item.key)}>{item.label}</button>)}
      </div>
    </div>
    <Trend points={points} selected={selected} onSelect={onSelect} view={view} />
    <CashflowMonthStatus totals={totals} />
  </section>;
}

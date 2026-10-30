import { useState } from "react";
import type { Bank, CashflowMonth } from "@/data/financialData";
import { money, monthNumber } from "@/lib/planningTools";
import { AnimatedAmount } from "./AnimatedAmount";
import { monthlyFlow } from "./monthlyFlow";

export function SurplusSparkline({ month, months, banks }: { month: CashflowMonth; months: CashflowMonth[]; banks: Bank[] }) {
  const [focused, setFocused] = useState<number | null>(null);
  const base = month.year * 12 + monthNumber(month.month) - 1;
  const points = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Math.floor(base / 12), base % 12 + index - 3, 1);
    const record = months.find(item => item.year === date.getFullYear() && monthNumber(item.month) === date.getMonth() + 1);
    const flow = monthlyFlow(record ?? { month: date.toLocaleDateString("pt-BR", { month: "long" }), year: date.getFullYear(), incomes: [], expenses: [] }, banks);
    const hasData = !flow.invalid && (!!record?.incomes.length || !!record?.expenses.length || flow.cost > 0);
    return { income: hasData ? flow.income : null, cost: hasData ? flow.cost : null, label: date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""), full: date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) };
  });
  const high = Math.max(1, ...points.flatMap(point => point.income === null ? [] : [point.income, point.cost!]));
  const x = (index: number) => 16 + index * 32;
  const y = (value: number) => 58 - value / high * 42;
  const active = focused ?? 3;
  const current = points[active];
  const series = [{ key: "income" as const, color: "var(--cl-green)" }, { key: "cost" as const, color: "var(--cl-red)" }];
  return <div className="cl-surplus-spark">
    <div className="cl-spark-caption"><span className="cl-spark-legend"><span className="cl-green">Entradas</span><span className="cl-red">Saídas</span></span><strong>−3 / +3 meses</strong></div>
    <svg viewBox="0 0 224 70" preserveAspectRatio="none" role="img" aria-label="Entradas em verde e saídas em vermelho: três meses anteriores, mês de referência e três seguintes. Futuro tracejado; meses sem registros não são estimados.">
      <line x1="16" x2="208" y1={y(0)} y2={y(0)} stroke="#353b43" strokeDasharray="2 4" />
      <line x1={x(active)} x2={x(active)} y1="8" y2="64" stroke="#535e6d" strokeDasharray="2 4" />
      {series.map(line => <g key={line.key}>{points.slice(1).map((point, index) => point[line.key] !== null && points[index][line.key] !== null ? <line key={index} x1={x(index)} y1={y(points[index][line.key]!)} x2={x(index + 1)} y2={y(point[line.key]!)} stroke={line.color} strokeWidth="2" strokeLinecap="round" strokeDasharray={index >= 3 ? "3 4" : undefined} /> : null)}{points.map((point, index) => point[line.key] !== null ? <g key={index}>{index === active && <circle cx={x(index)} cy={y(point[line.key]!)} r="6" fill={line.color} fillOpacity=".15" />}<circle cx={x(index)} cy={y(point[line.key]!)} r={index === active ? 3 : 1.8} fill={line.color} /></g> : null)}</g>)}
    </svg>
    <div className="cl-spark-months">{points.map((point, index) => <button key={point.full} aria-label={`${point.full}: ${point.income === null ? "sem registros" : `entradas ${money(point.income)}, saídas ${money(point.cost!)}`}${index === 3 ? ", mês de referência" : index > 3 ? ", previsto" : ""}`} aria-pressed={active === index} onMouseEnter={() => setFocused(index)} onMouseLeave={() => setFocused(null)} onFocus={() => setFocused(index)} onBlur={() => setFocused(null)} onClick={() => setFocused(index)}>{point.label}</button>)}</div>
    <div className="cl-spark-values" aria-live="polite"><span>{current.label}</span>{current.income === null ? <span>Sem registros</span> : <><strong className="cl-green"><AnimatedAmount value={current.income} /></strong><strong className="cl-red"><AnimatedAmount value={current.cost!} /></strong></>}</div>
  </div>;
}

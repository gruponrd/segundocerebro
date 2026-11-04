import { useState } from "react";
import type { Bank, CashflowMonth } from "@/data/financialData";
import { money, monthNumber } from "@/lib/planningTools";
import { AnimatedAmount } from "./AnimatedAmount";
import { monthlyFlow } from "./monthlyFlow";

export function buildSparklinePoints(month: CashflowMonth, months: CashflowMonth[], banks: Bank[]) {
  const base = month.year * 12 + monthNumber(month.month) - 1;
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Math.floor(base / 12), base % 12 + index - 3, 1);
    const record = months.find(item => item.year === date.getFullYear() && monthNumber(item.month) === date.getMonth() + 1);
    const flow = monthlyFlow(record ?? { month: date.toLocaleDateString("pt-BR", { month: "long" }), year: date.getFullYear(), incomes: [], expenses: [] }, banks);
    const hasData = !flow.invalid && (!!record?.incomes.length || !!record?.expenses.length || flow.cost > 0);
    return { income: hasData ? flow.income : null, cost: hasData ? flow.cost : null, balance: hasData ? flow.balance : null, label: date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""), full: date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) };
  });
}

export function SurplusSparkline({ month, months, banks }: { month: CashflowMonth; months: CashflowMonth[]; banks: Bank[] }) {
  const [focused, setFocused] = useState<number | null>(null);
  const points = buildSparklinePoints(month, months, banks);
  const values = points.flatMap(point => point.income === null ? [] : [point.income, point.cost!, point.balance!]);
  const low = Math.min(0, ...values), high = Math.max(1, ...values);
  const x = (index: number) => 16 + index * 32;
  const y = (value: number) => 60 - (value - low) / (high - low) * 48;
  const active = focused ?? 3;
  const current = points[active];
  const series = [{ key: "income" as const, color: "#32bd79" }, { key: "cost" as const, color: "#e75459" }, { key: "balance" as const, color: "#ec9a28" }];
  return <div className="cl-surplus-spark">
    <div className="cl-spark-caption"><span className="cl-spark-legend"><span className="cl-spark-income">Entradas</span><span className="cl-spark-cost">Saídas</span><span className="cl-spark-balance">Saldo</span></span><strong>−3 / +3 meses</strong></div>
    <svg viewBox="0 0 224 70" preserveAspectRatio="none" role="img" aria-label="Entradas em verde, saídas em vermelho e saldo em laranja: três meses anteriores, mês de referência e três seguintes. Trechos após o mês de referência tracejados; meses sem registros não são estimados.">
      <line x1="16" x2="208" y1={y(0)} y2={y(0)} stroke="#858585" strokeOpacity=".45" strokeDasharray="2 4" />
      <line x1={x(active)} x2={x(active)} y1="8" y2="64" stroke="#858585" strokeOpacity=".6" strokeDasharray="2 4" />
      {series.map(line => <g key={line.key}>{points.slice(1).map((point, index) => {
        const previous = points[index][line.key], next = point[line.key];
        if (previous === null || next === null) return null;
        const middle = (x(index) + x(index + 1)) / 2;
        return <path key={index} d={`M ${x(index)} ${y(previous)} C ${middle} ${y(previous)}, ${middle} ${y(next)}, ${x(index + 1)} ${y(next)}`} fill="none" stroke={line.color} strokeWidth="2" strokeLinecap="round" strokeDasharray={index >= 3 ? "3 4" : undefined} />;
      })}{points.map((point, index) => point[line.key] !== null ? <g key={index}>{index === active && <circle cx={x(index)} cy={y(point[line.key]!)} r="5" fill={line.color} fillOpacity=".18" />}<circle cx={x(index)} cy={y(point[line.key]!)} r={index === active ? 2.6 : 1.6} fill={line.color} /></g> : null)}</g>)}
    </svg>
    <div className="cl-spark-months">{points.map((point, index) => <button key={point.full} aria-label={`${point.full}: ${point.income === null ? "sem registros" : `entradas ${money(point.income)}, saídas ${money(point.cost!)}, saldo ${money(point.balance!)}`}${index === 3 ? ", mês de referência" : ""}`} aria-pressed={active === index} onMouseEnter={() => setFocused(index)} onMouseLeave={() => setFocused(null)} onFocus={() => setFocused(index)} onBlur={() => setFocused(null)} onClick={() => setFocused(index)}>{point.label}</button>)}</div>
    <div className="cl-spark-values" aria-live="polite"><span>{current.label}</span>{current.income === null ? <span>Sem registros</span> : <><strong className="cl-spark-income"><AnimatedAmount value={current.income} /></strong><strong className="cl-spark-cost"><AnimatedAmount value={current.cost!} /></strong><strong className="cl-spark-balance"><AnimatedAmount value={current.balance!} /></strong></>}</div>
  </div>;
}

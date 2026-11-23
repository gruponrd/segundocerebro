import { useId, useRef } from "react";
import { CalendarDays, Check, ClockAlert } from "lucide-react";
import type { BankId } from "@/data/financialData";
import { money } from "@/lib/planningTools";

interface CalendarItem {
  id: string;
  description: string;
  installmentAmount: number;
  due: Date;
  dueDate: string;
  bankId: BankId;
  bankName: string;
}

const dateLabel = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
const visibleCount = 3;

export function CalendarCard({ installments, overdue = false, onPay }: {
  installments: CalendarItem[];
  overdue?: boolean;
  onPay?: (bankId: BankId, id: string) => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const Icon = overdue ? ClockAlert : CalendarDays;
  const total = installments.reduce((sum, item) => sum + Math.round(item.installmentAmount * 100), 0) / 100;
  const row = (item: CalendarItem) => <li key={`${item.bankId}:${item.id}`} className="analysis-due-row">
    <span className="analysis-due-name">
      <strong>{item.description}</strong>
      <small>{item.bankName} · {Number.isFinite(item.due.getTime()) ? <time dateTime={item.dueDate}>{dateLabel.format(item.due)}</time> : "Sem data"}</small>
    </span>
    <strong className="analysis-due-amount">{money(item.installmentAmount)}</strong>
    {onPay && <button type="button" aria-label={`Marcar parcela de ${item.description} como paga`} title="Marcar como paga"
      onClick={() => { onPay(item.bankId, item.id); heading.current?.focus({ preventScroll: true }); }}>
      <Check size={16} aria-hidden="true" />
    </button>}
  </li>;

  return <section className={`analysis-due-card${overdue && installments.length ? " is-overdue" : ""}`} aria-labelledby={id}>
    <h3 id={id} tabIndex={-1} ref={heading}><Icon size={17} aria-hidden="true" />{overdue ? "Parcelas em atraso" : "Próximos 7 dias"}</h3>
    {installments.length ? <>
      <p className="analysis-due-total" aria-live="polite"><strong>{money(total)}</strong>
        <span>{installments.length} {installments.length === 1 ? "parcela" : "parcelas"}</span></p>
      <ul>{installments.slice(0, visibleCount).map(row)}</ul>
      {installments.length > visibleCount && <details className="analysis-due-more">
        <summary>Mais {installments.length - visibleCount} {installments.length - visibleCount === 1 ? "parcela" : "parcelas"}</summary>
        <ul>{installments.slice(visibleCount).map(row)}</ul>
      </details>}
    </> : <p className="analysis-due-empty" aria-live="polite">{overdue ? "Nenhuma parcela em atraso." : "Nenhuma parcela a vencer neste intervalo."}</p>}
  </section>;
}

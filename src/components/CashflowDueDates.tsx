import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { addDays, startOfDay } from "date-fns";
import { ChevronDown } from "lucide-react";
import { CalendarCard } from "@/components/CalendarCard";
import { InstallmentTimeline } from "@/components/InstallmentTimeline";
import { monthNumber } from "@/lib/planningTools";
import { useFinanceStore } from "@/stores/financeStore";

export function CashflowDueDates() {
  const { allInstallments, banks, currentCashflow, updateInstallment, removeInstallment } = useFinanceStore();
  const activeBanks = new Set(banks.filter(bank => bank.status !== "cancelado").map(bank => bank.id));
  const today = startOfDay(new Date());
  const nextWeek = addDays(today, 7);
  const selectedMonth = monthNumber(currentCashflow.month) - 1;
  const items = allInstallments.filter(item => activeBanks.has(item.bankId)).map(item => {
    const due = new Date(`${item.dueDate}T00:00:00`);
    return { ...item, due, overdue: item.status === "atrasado" || due < today };
  });
  const overdue = items.filter(item => item.overdue);
  const upcoming = items.filter(item => !item.overdue && item.due >= today && item.due < nextWeek);
  const schedule = items.filter(item => item.due.getMonth() === selectedMonth && item.due.getFullYear() === currentCashflow.year);
  const { hash, key } = useLocation();
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    if (hash !== "#vencimentos") return;
    const frame = requestAnimationFrame(() => {
      section.current?.focus({ preventScroll: true });
      section.current?.scrollIntoView();
    });
    return () => cancelAnimationFrame(frame);
  }, [hash, key]);

  return <section className="analysis-dues" id="vencimentos" ref={section} tabIndex={-1} aria-labelledby="analysis-dues-title">
    <h2 id="analysis-dues-title">Vencimentos</h2>
    <div className="analysis-due-pair">
      <CalendarCard installments={overdue} overdue onPay={(bankId, id) => updateInstallment(bankId, id, { status: "pago" })} />
      <CalendarCard installments={upcoming} />
    </div>
    <details className="analysis-due-schedule">
      <summary><span>Cronograma de parcelas <small>{currentCashflow.month} {currentCashflow.year}</small></span>
        <strong>{schedule.length} {schedule.length === 1 ? "pendente" : "pendentes"}</strong>
        <ChevronDown size={16} aria-hidden="true" />
      </summary>
      <InstallmentTimeline installments={schedule} onUpdate={updateInstallment} onRemove={removeInstallment} />
    </details>
  </section>;
}

import type { CashflowMonth } from "@/data/financialData";
import { Input } from "@/components/ui/input";
import { INCOME_CLOSING_DAY, incomeReferencePeriod, shortCashflowDate } from "@/lib/cashflowDates";
import { emptyCashflowMonth } from "@/lib/cashflowMonths";

export function CashflowDateInput({ value, onChange, month, label = "Data prevista do recebimento", inputLabel = "Dia e mês do recebimento" }: { value: string; onChange: (value: string) => void; month: CashflowMonth; label?: string; inputLabel?: string }) {
  const date = shortCashflowDate(value, month);
  const invalid = value.length > 0 && !date;
  const period = date ? incomeReferencePeriod(date) : null;
  const reference = period === null ? null : emptyCashflowMonth(period);
  return <label className="block text-xs text-muted-foreground">{label} (opcional)
    <Input type="text" inputMode="numeric" autoComplete="off" placeholder="DD/MM" aria-label={inputLabel} aria-invalid={invalid} value={value} maxLength={5} onChange={e => {
      const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
      onChange(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
    }} className="mt-1 h-10" />
    <span className="mt-1 block">{date && reference ? `Ano automático: ${date.slice(0, 4)} · contará em ${reference.month} ${reference.year}.` : `Entradas até o dia ${INCOME_CLOSING_DAY} contam no mês anterior.`}</span>
    {invalid && <span className="mt-1 block text-destructive">Use uma data do mês selecionado ou até 07 do mês seguinte (DD/MM).</span>}
  </label>;
}

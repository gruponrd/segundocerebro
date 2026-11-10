import type { CashflowMonth } from "@/data/financialData";
import { Input } from "@/components/ui/input";
import { shortCashflowDate } from "@/lib/cashflowDates";

export function CashflowDateInput({ value, onChange, month, label = "Data prevista do recebimento", inputLabel = "Dia e mês do recebimento" }: { value: string; onChange: (value: string) => void; month: CashflowMonth; label?: string; inputLabel?: string }) {
  const invalid = value.length > 0 && !shortCashflowDate(value, month);
  return <label className="block text-xs text-muted-foreground">{label} (opcional)
    <Input type="text" inputMode="numeric" autoComplete="off" placeholder="DD/MM" aria-label={inputLabel} aria-invalid={invalid} value={value} maxLength={5} onChange={e => {
      const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
      onChange(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
    }} className="mt-1 h-10" />
    <span className="mt-1 block">Ano automático: {month.year} · período selecionado: {month.month}.</span>
    {invalid && <span className="mt-1 block text-destructive">Informe dia e mês válidos para {month.month} {month.year} (DD/MM).</span>}
  </label>;
}

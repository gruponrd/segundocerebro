import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CashflowMonth } from "@/data/financialData";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function PeriodPicker({ months, selected, onChange }: { months: CashflowMonth[]; selected: number; onChange: (index: number) => void }) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Selecionar período">
      <Button type="button" variant="ghost" size="icon" className="h-10 w-9 shrink-0 rounded-xl" disabled={selected <= 0} onClick={() => onChange(selected - 1)} aria-label="Mês anterior"><ChevronLeft className="h-4 w-4" /></Button>
      <Select value={String(selected)} onValueChange={value => onChange(Number(value))}>
        <SelectTrigger aria-label="Mês e ano" className="h-10 w-[190px] rounded-xl bg-card"><SelectValue /></SelectTrigger>
        <SelectContent>{months.map((month, index) => <SelectItem key={`${month.month}-${month.year}`} value={String(index)}>{month.month} {month.year}</SelectItem>)}</SelectContent>
      </Select>
      <Button type="button" variant="ghost" size="icon" className="h-10 w-9 shrink-0 rounded-xl" disabled={selected >= months.length - 1} onClick={() => onChange(selected + 1)} aria-label="Próximo mês"><ChevronRight className="h-4 w-4" /></Button>
    </div>
  );
}

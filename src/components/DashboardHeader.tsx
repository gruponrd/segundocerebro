import { useMemo } from "react";
import { type CashflowMonth } from "@/data/financialData";
import { ExportXlsxButton } from "@/components/ExportXlsxButton";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PeriodPicker } from "@/components/PeriodPicker";
import { Button } from "@/components/ui/button";
import { openTransactionMenu } from "@/lib/transactionMenu";

interface DashboardHeaderProps {
  totalDebt: number;
  expectedBalance: number;
  monthLabel: string;
  selectedMonth: number;
  totalMonths: number;
  onMonthChange: (month: number) => void;
  cashflowMonths: CashflowMonth[];
}

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

export function DashboardHeader({
  monthLabel,
  selectedMonth,
  onMonthChange,
  cashflowMonths,
}: DashboardHeaderProps) {
  const greeting = useMemo(() => getGreeting(), []);
  const { displayName } = useAuth();
  const name = displayName || "Gabriel";

  return (
    <header className="mb-6 animate-float-in">
      <div className="flex flex-col gap-4 border-b border-border/70 pb-6">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Visão geral</span>
            <span className="text-border">/</span>
            <span>{monthLabel}</span>
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            {greeting}, {name.split(" ")[0]}.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Confira seu mês, revise as contas e acompanhe seus objetivos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodPicker months={cashflowMonths} selected={selectedMonth} onChange={onMonthChange} />
          <Button onClick={openTransactionMenu} className="hidden h-10 gap-2 rounded-xl md:inline-flex"><Plus className="h-4 w-4" /> Novo lançamento</Button>
          <ExportXlsxButton compact />
        </div>
      </div>

    </header>
  );
}

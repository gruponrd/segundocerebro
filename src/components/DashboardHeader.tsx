import { useMemo } from "react";
import { type CashflowMonth } from "@/data/financialData";
import { ExportXlsxButton } from "@/components/ExportXlsxButton";
import { useAuth } from "@/hooks/useAuth";
import { PeriodPicker } from "@/components/PeriodPicker";

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
  const name = displayName.trim().split(/\s+/)[0];

  return (
    <header className="mb-6 dashboard-heading">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span>Visão geral</span>
            <span className="text-border">/</span>
            <span>{monthLabel}</span>
          </div>
          <h1 className="font-display text-2xl font-medium sm:text-[28px] tracking-tight text-foreground">
            {greeting}{name ? `, ${name}` : ""}.
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            Confira seu mês, revise as contas e acompanhe seus objetivos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodPicker months={cashflowMonths} selected={selectedMonth} onChange={onMonthChange} />
          <ExportXlsxButton compact />
        </div>
      </div>

    </header>
  );
}

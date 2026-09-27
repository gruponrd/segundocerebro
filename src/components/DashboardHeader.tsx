import { useMemo } from "react";
import { type CashflowMonth } from "@/data/financialData";
import { ExportXlsxButton } from "@/components/ExportXlsxButton";
import { CalendarDays, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

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
    <header className="mb-8 animate-float-in">
      <div className="flex flex-col gap-6 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Visão geral</span>
            <span className="text-border">/</span>
            <span>{monthLabel}</span>
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
            {greeting}, {name.split(" ")[0]}.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Seu dinheiro em uma única vista, com espaço para decidir o próximo passo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground sm:flex">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Período atual</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </div>
          <ExportXlsxButton compact />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="label-mono hidden shrink-0 sm:inline">Selecionar mês</span>
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto scrollbar-none">
          {cashflowMonths.map((m, i) => (
            <button
              key={i}
              onClick={() => onMonthChange(i)}
              className={`shrink-0 rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                i === selectedMonth
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {m.month.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

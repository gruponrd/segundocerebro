import { ArrowRight, Calculator, CalendarClock, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { openCommandMenu } from "@/lib/commandMenu";

export function QuickTools() {
  return (
    <div className="mb-10 grid gap-3 sm:grid-cols-3" aria-label="Ferramentas rápidas">
      <Link to="/ferramentas" className="glass-card group flex items-center gap-3 p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
        <Calculator className="h-5 w-5 shrink-0 text-primary" /><div className="flex-1"><p className="text-sm font-medium">E se…?</p><p className="mt-1 text-xs text-muted-foreground">Simule antes de decidir</p></div><ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </Link>
      <Link to="/ferramentas#review-title" className="glass-card group flex items-center gap-3 p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
        <CalendarClock className="h-5 w-5 shrink-0 text-primary" /><div className="flex-1"><p className="text-sm font-medium">Radar de pendências</p><p className="mt-1 text-xs text-muted-foreground">Revise o que falta pagar</p></div><ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </Link>
      <button type="button" onClick={openCommandMenu} className="glass-card flex items-center gap-3 p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
        <Search className="h-5 w-5 shrink-0 text-primary" /><div className="flex-1"><p className="text-sm font-medium">Encontrar no app</p><p className="mt-1 text-xs text-muted-foreground">Busque páginas e registros</p></div><kbd className="hidden rounded border border-border px-1.5 py-1 text-[10px] text-muted-foreground lg:inline">Ctrl K</kbd>
      </button>
    </div>
  );
}

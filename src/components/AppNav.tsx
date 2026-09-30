import { NavLink } from "react-router-dom";
import {
  ArrowLeftRight,
  Contrast,
  Calculator,
  Search,
  Brain,
  Plus,
  DollarSign,
  Gamepad2,
  LayoutDashboard,
  Link2,
  Moon,
  Settings2,
  Sparkles,
  Sun,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { isPreviewMode } from "@/lib/previewMode";
import { openCommandMenu } from "@/lib/commandMenu";
import { openTransactionMenu } from "@/lib/transactionMenu";

const THEME_LABELS: Record<string, string> = {
  dark: "Escuro",
  light: "Claro",
  monochrome: "P&B",
};

const groups = [
  {
    label: "Visão geral",
    items: [
      { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
      { to: "/fluxo", icon: ArrowLeftRight, label: "Fluxo de caixa" },
      { to: "/renda", icon: DollarSign, label: "Renda" },
    ],
  },
  {
    label: "Planejamento",
    items: [
      { to: "/objetivos", icon: Target, label: "Objetivos" },
      { to: "/divida", icon: TrendingDown, label: "Dívidas" },
      { to: "/carteira", icon: Wallet, label: "Carteira" },
      { to: "/ferramentas", icon: Calculator, label: "Ferramentas" },
    ],
  },
  {
    label: "Explorar",
    items: [
      { to: "/trade", icon: TrendingUp, label: "Trade" },
      { to: "/lifegame", icon: Gamepad2, label: "LifeGame" },
      { to: "/desejos", icon: Sparkles, label: "Desejos" },
      { to: "/integracoes", icon: Link2, label: "Integrações" },
    ],
  },
] as const;

export function AppNav() {
  const { theme, toggleTheme } = useTheme();
  const ThemeIcon = theme === "dark" ? Sun : theme === "light" ? Moon : Contrast;

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border/70 bg-card/80 px-4 py-5 backdrop-blur-xl md:flex">
      <div className="flex items-center gap-3 px-3 pb-5">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/10">
          <Brain aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight text-foreground">Segundo Cérebro</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Finanças e vida em equilíbrio</p>
        </div>
      </div>

      <button type="button" onClick={openTransactionMenu} className="mb-2 flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"><Plus className="h-4 w-4" /> Novo lançamento</button>
      <button type="button" onClick={openCommandMenu} className="mb-5 flex items-center gap-2 rounded-xl border border-border/70 bg-secondary/40 px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <Search className="h-4 w-4" /> Buscar no app
        <kbd className="ml-auto text-[10px] opacity-60">Ctrl K</kbd>
      </button>
      <div className="flex-1 space-y-7 overflow-y-auto pr-1">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-2 text-xs font-medium text-muted-foreground">{group.label}</p>
            <nav className="space-y-1" aria-label={group.label}>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={cn("h-4 w-4", isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100")} />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>

      <div className="space-y-3 border-t border-border/70 pt-4">
        {isPreviewMode && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Preview local
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Dados salvos somente neste dispositivo</p>
          </div>
        )}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
          title={THEME_LABELS[theme]}
        >
          <ThemeIcon className="h-4 w-4" />
          <span>{THEME_LABELS[theme]}</span>
          <Settings2 className="ml-auto h-3.5 w-3.5 opacity-50" />
        </button>
      </div>
    </aside>
  );
}

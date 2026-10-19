import { NavLink } from "react-router-dom";
import {
  ArrowLeftRight,
  Contrast,
  Calculator,
  Brain,
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
import { LogoutButton } from "@/components/LogoutButton";

const THEME_LABELS: Record<string, string> = {
  dark: "Escuro",
  light: "Claro",
  monochrome: "P&B",
};

const groups = [
  {
    label: "Visão geral",
    items: [
      { to: "/", icon: LayoutDashboard, label: "Visão geral", end: true },
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
    <aside className="app-sidebar fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-sidebar-border px-4 py-6 md:flex">
      <div className="flex items-center gap-2 px-1 pb-5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-accent">
          <Brain aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight whitespace-nowrap text-foreground">Segundo Cérebro</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Seu espaço, com clareza</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
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
                    "group flex min-h-10 items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-[13px] transition-colors",
                    isActive
                      ? "border-accent/15 bg-sidebar-accent text-sidebar-accent-foreground"
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
        <LogoutButton />
      </div>
    </aside>
  );
}

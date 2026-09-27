import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Target, TrendingDown, Wallet, MoreHorizontal, Sun, Moon, Contrast } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { DollarSign, TrendingUp, Gamepad2, X, Sparkles, ArrowLeftRight } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";

const THEME_LABELS = {
  dark: "Escuro",
  light: "Claro",
  monochrome: "P&B",
};

const mainTabs = [
  { to: "/", icon: LayoutDashboard, label: "Home", end: true },
  { to: "/objetivos", icon: Target, label: "Metas" },
  { to: "/divida", icon: TrendingDown, label: "Dívida" },
  { to: "/carteira", icon: Wallet, label: "Carteira" },
];

const moreTabs = [
  { to: "/fluxo", icon: ArrowLeftRight, label: "Fluxo" },
  { to: "/desejos", icon: Sparkles, label: "Desejos" },
  { to: "/renda", icon: DollarSign, label: "Renda" },
  { to: "/trade", icon: TrendingUp, label: "Trade" },
  { to: "/lifegame", icon: Gamepad2, label: "LifeGame" },
];

export function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isMoreActive = moreTabs.some(t => location.pathname === t.to);
  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Contrast;

  return (
    <>
      {/* Overlay for "more" menu */}
      {moreOpen && (
        <div className="fixed inset-0 z-[98] bg-background/60 backdrop-blur-sm md:hidden" onClick={() => setMoreOpen(false)} />
      )}

      {/* Expanded more menu */}
      {moreOpen && (
        <div className="fixed bottom-20 left-4 right-4 z-[99] md:hidden animate-in slide-in-from-bottom-4 duration-200">
          <div className="bg-card border border-border/50 rounded-2xl p-3">
            <div className="grid grid-cols-4 gap-2">
              {moreTabs.map(tab => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) => cn(
                    "flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-xs font-medium transition-all",
                    isActive ? "bg-primary/15 text-primary" : "text-muted-foreground"
                  )}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </NavLink>
              ))}
            </div>
            <div className="mt-2 border-t border-border/50 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={toggleTheme}
                className="h-11 w-full justify-between rounded-xl px-3 text-muted-foreground"
                aria-label={`Tema atual: ${THEME_LABELS[theme]}. Toque para alterar`}
              >
                <span className="flex items-center gap-2 text-xs font-medium">
                  <ThemeIcon className="h-4 w-4" /> Tema
                </span>
                <span className="font-mono text-[10px] uppercase text-foreground">{THEME_LABELS[theme]}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-[100] md:hidden">
        <div className="bg-card/95 backdrop-blur-xl border-t border-border/50 px-2 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-around h-16">
            {mainTabs.map(tab => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) => cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[60px]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground active:scale-95"
                )}
              >
                {({ isActive }) => (
                  <>
                    <div className={cn(
                      "p-1.5 rounded-xl transition-all duration-300",
                      isActive && "bg-primary/15 shadow-sm shadow-primary/20"
                    )}>
                      <tab.icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110")} />
                    </div>
                    <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>{tab.label}</span>
                  </>
                )}
              </NavLink>
            ))}

            {/* More button */}
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[60px]",
                (moreOpen || isMoreActive) ? "text-primary" : "text-muted-foreground active:scale-95"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-all duration-300",
                (moreOpen || isMoreActive) && "bg-primary/15"
              )}>
                {moreOpen ? <X className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
              </div>
              <span className="text-[10px] font-medium">Mais</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}

import { useState } from "react";
import { useRoutineStore } from "@/stores/routineStore";
import { Battery, BatteryLow, BatteryMedium, BatteryFull, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const levels = [
  { value: 1, label: "Exausto", icon: BatteryLow, color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", desc: "Dia leve, poucas tarefas" },
  { value: 2, label: "Cansado", icon: BatteryLow, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30", desc: "Tarefas simples apenas" },
  { value: 3, label: "Normal", icon: BatteryMedium, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", desc: "Rotina equilibrada" },
  { value: 4, label: "Bem", icon: BatteryFull, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", desc: "Pronto para desafios" },
  { value: 5, label: "Máxima!", icon: Zap, color: "text-primary", bg: "bg-primary/10 border-primary/30", desc: "Dia de alta performance" },
];

export function EnergyCheck() {
  const store = useRoutineStore();
  const [selected, setSelected] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);

  const handleConfirm = () => {
    if (selected === null) return;
    setAnimating(true);
    setTimeout(() => store.setEnergyLevel(selected), 600);
  };

  return (
    <div className={cn(
      "min-h-screen bg-background flex items-center justify-center px-4 transition-all duration-500",
      animating && "opacity-0 scale-95"
    )}>
      <div className="max-w-lg w-full space-y-8 text-center">
        <div className="space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto">
            <Battery className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Como está sua energia hoje?</h1>
          <p className="text-muted-foreground">Sua rotina será adaptada ao seu nível de energia</p>
        </div>

        <div className="grid gap-3">
          {levels.map((level) => {
            const Icon = level.icon;
            return (
              <button
                key={level.value}
                onClick={() => setSelected(level.value)}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 text-left",
                  selected === level.value
                    ? cn(level.bg, "scale-[1.02] shadow-lg")
                    : "border-border/50 hover:border-border bg-card/50 hover:bg-card"
                )}
              >
                <Icon className={cn("w-6 h-6", level.color)} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("font-bold", selected === level.value ? level.color : "text-foreground")}>
                      {level.value} — {level.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{level.desc}</p>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-2 h-6 rounded-full transition-colors",
                        i < level.value ? (selected === level.value ? "bg-current " + level.color : "bg-muted-foreground/30") : "bg-muted/50"
                      )}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {selected !== null && (
          <button
            onClick={handleConfirm}
            className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-lg transition-all hover:opacity-90 active:scale-[0.98]"
          >
            Gerar Minha Rotina →
          </button>
        )}

        {store.tasks.length === 0 && (
          <p className="text-xs text-muted-foreground/60">
            Dica: configure suas tarefas no ícone ⚙️ após gerar a rotina
          </p>
        )}
      </div>
    </div>
  );
}

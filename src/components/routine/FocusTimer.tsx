import { useRoutineStore } from "@/stores/routineStore";
import { Check, Pause, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

export function FocusTimer() {
  const store = useRoutineStore();
  const { taskId, remaining, minutes } = store.focusMode;
  const task = store.currentDay?.tasks.find(t => t.id === taskId);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const progress = minutes > 0 ? ((minutes * 60 - remaining) / (minutes * 60)) * 100 : 0;
  const isAlmostDone = remaining <= 60;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Modo Foco</h2>
          <h1 className="text-xl font-bold text-foreground">{task?.title || "Tarefa"}</h1>
        </div>

        {/* Circular timer */}
        <div className="relative w-56 h-56 mx-auto">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" />
            <circle
              cx="50" cy="50" r="45" fill="none"
              stroke={isAlmostDone ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
              strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn(
              "text-5xl font-mono font-bold tabular-nums",
              isAlmostDone ? "text-destructive animate-pulse" : "text-foreground"
            )}>
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </span>
            <span className="text-xs text-muted-foreground mt-1">{minutes}min sessão</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => taskId && store.completeTask(taskId, "done")}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500/10 text-emerald-400 font-medium hover:bg-emerald-500/20 transition-colors"
          >
            <Check className="w-4 h-4" /> Concluído
          </button>
          <button
            onClick={() => taskId && store.completeTask(taskId, "partial")}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-yellow-500/10 text-yellow-400 font-medium hover:bg-yellow-500/20 transition-colors"
          >
            <Pause className="w-4 h-4" /> Parcial
          </button>
          <button
            onClick={() => store.stopFocus()}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

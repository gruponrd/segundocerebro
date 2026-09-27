import { useRoutineStore, DailyTask } from "@/stores/routineStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Check, SkipForward, Clock, Zap, BookOpen, Heart, Briefcase, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const categoryIcons: Record<string, import("lucide-react").LucideIcon> = {
  work: Briefcase,
  health: Heart,
  learning: BookOpen,
  personal: Zap,
  finance: Wallet,
};

const categoryColors: Record<string, string> = {
  work: "text-blue-400 bg-blue-500/10",
  health: "text-emerald-400 bg-emerald-500/10",
  learning: "text-purple-400 bg-purple-500/10",
  personal: "text-amber-400 bg-amber-500/10",
  finance: "text-cyan-400 bg-cyan-500/10",
};

const difficultyLabels: Record<string, { label: string; color: string }> = {
  easy: { label: "Fácil", color: "text-emerald-400" },
  medium: { label: "Médio", color: "text-yellow-400" },
  hard: { label: "Difícil", color: "text-red-400" },
};

function TaskCard({ task }: { task: DailyTask }) {
  const store = useRoutineStore();
  const [showComplete, setShowComplete] = useState(false);
  const Icon = categoryIcons[task.category] || Zap;
  const catColor = categoryColors[task.category] || "text-muted-foreground bg-muted";
  const diff = difficultyLabels[task.difficulty];

  const statusStyles: Record<string, string> = {
    pending: "border-border/50 bg-card",
    in_progress: "border-primary/50 bg-primary/5 ring-1 ring-primary/20",
    done: "border-emerald-500/30 bg-emerald-500/5 opacity-80",
    partial: "border-yellow-500/30 bg-yellow-500/5 opacity-80",
    skipped: "border-red-500/20 bg-red-500/5 opacity-60",
  };

  return (
    <div className={cn("rounded-xl border p-4 transition-all duration-300", statusStyles[task.status])}>
      <div className="flex items-start gap-3">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", catColor)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={cn("font-semibold text-sm truncate", task.status === "done" && "line-through text-muted-foreground")}>{task.title}</h4>
            <span className={cn("text-[10px] font-medium", diff.color)}>{diff.label}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{task.estimatedMinutes}min</span>
          </div>
        </div>

        {task.status === "pending" && (
          <div className="flex gap-1.5">
            <button
              onClick={() => store.startFocus(task.id, task.estimatedMinutes >= 40 ? 50 : 25)}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-1"
            >
              <Play className="w-3 h-3" /> Foco
            </button>
            <button
              onClick={() => setShowComplete(!showComplete)}
              className="px-2 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs hover:bg-secondary/80 transition-colors"
            >
              ···
            </button>
          </div>
        )}

        {task.status === "in_progress" && (
          <button
            onClick={() => setShowComplete(!showComplete)}
            className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors"
          >
            Finalizar
          </button>
        )}

        {(task.status === "done" || task.status === "partial" || task.status === "skipped") && (
          <span className={cn("text-xs font-medium px-2 py-1 rounded-lg",
            task.status === "done" && "bg-emerald-500/10 text-emerald-400",
            task.status === "partial" && "bg-yellow-500/10 text-yellow-400",
            task.status === "skipped" && "bg-red-500/10 text-red-400",
          )}>
            {task.status === "done" ? "✓ Concluído" : task.status === "partial" ? "◐ Parcial" : "✕ Pulado"}
          </span>
        )}
      </div>

      {showComplete && (task.status === "pending" || task.status === "in_progress") && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-border/30">
          <button onClick={() => { store.completeTask(task.id, "done"); setShowComplete(false); }}
            className="flex-1 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 flex items-center justify-center gap-1">
            <Check className="w-3 h-3" /> Concluído
          </button>
          <button onClick={() => { store.completeTask(task.id, "partial"); setShowComplete(false); }}
            className="flex-1 py-2 rounded-lg bg-yellow-500/10 text-yellow-400 text-xs font-medium hover:bg-yellow-500/20">
            ◐ Parcial
          </button>
          <button onClick={() => { store.completeTask(task.id, "skipped"); setShowComplete(false); }}
            className="flex-1 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 flex items-center justify-center gap-1">
            <SkipForward className="w-3 h-3" /> Não feito
          </button>
        </div>
      )}
    </div>
  );
}

export function TimeBlockView() {
  const store = useRoutineStore();
  const tasks = store.currentDay?.tasks || [];

  // Group by time block
  const blocks = new Map<string, DailyTask[]>();
  for (const t of tasks) {
    const list = blocks.get(t.timeBlock) || [];
    list.push(t);
    blocks.set(t.timeBlock, list);
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Nenhuma tarefa configurada. Use o ⚙️ para adicionar tarefas à sua rotina.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
        <Clock className="w-5 h-5 text-primary" />
        Blocos de Tempo — Energia: {store.currentDay?.energyLevel}/5
      </h3>
      {Array.from(blocks.entries()).map(([block, blockTasks]) => (
        <div key={block} className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-xs font-mono text-muted-foreground">{block}</span>
          </div>
          <div className="space-y-2 ml-3 pl-3 border-l border-border/30">
            {blockTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

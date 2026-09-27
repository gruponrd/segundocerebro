import { useState } from "react";
import { useRoutineStore, RoutineTask } from "@/stores/routineStore";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { X, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const categories = [
  { value: "work", label: "Trabalho" },
  { value: "health", label: "Saúde" },
  { value: "learning", label: "Estudo" },
  { value: "personal", label: "Pessoal" },
  { value: "finance", label: "Finanças" },
] as const;

const difficulties = [
  { value: "easy", label: "Fácil", color: "text-emerald-400 bg-emerald-500/10" },
  { value: "medium", label: "Médio", color: "text-yellow-400 bg-yellow-500/10" },
  { value: "hard", label: "Difícil", color: "text-red-400 bg-red-500/10" },
] as const;

export function TaskManager({ onClose }: { onClose: () => void }) {
  const store = useRoutineStore();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<RoutineTask["category"]>("work");
  const [difficulty, setDifficulty] = useState<RoutineTask["difficulty"]>("medium");
  const [minutes, setMinutes] = useState(25);

  const handleAdd = () => {
    if (!title.trim()) return;
    store.addTask({ title: title.trim(), category, difficulty, estimatedMinutes: minutes, isRecurring: true });
    setTitle("");
  };

  return (
    <Card className="border-primary/20">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-foreground">Gerenciar Tarefas</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Add form */}
        <div className="space-y-3 p-4 rounded-xl bg-secondary/30 border border-border/30">
          <Input
            placeholder="Nome da tarefa..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            className="bg-background"
          />
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <button key={c.value} onClick={() => setCategory(c.value)}
                className={cn("px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                  category === c.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                )}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {difficulties.map(d => (
              <button key={d.value} onClick={() => setDifficulty(d.value)}
                className={cn("px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                  difficulty === d.value ? d.color + " ring-1 ring-current" : "bg-secondary text-muted-foreground"
                )}>
                {d.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1">
              <Input type="number" value={minutes} onChange={e => setMinutes(+e.target.value)} className="w-16 h-8 text-xs bg-background" />
              <span className="text-xs text-muted-foreground">min</span>
            </div>
          </div>
          <button onClick={handleAdd} disabled={!title.trim()}
            className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:opacity-90 flex items-center justify-center gap-1">
            <Plus className="w-4 h-4" /> Adicionar Tarefa
          </button>
        </div>

        {/* Task list */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {store.tasks.map(task => (
            <div key={task.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/30">
              <div>
                <span className="text-sm font-medium text-foreground">{task.title}</span>
                <div className="flex gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">{categories.find(c => c.value === task.category)?.label}</span>
                  <span className={cn("text-[10px]", difficulties.find(d => d.value === task.difficulty)?.color)}>{difficulties.find(d => d.value === task.difficulty)?.label}</span>
                  <span className="text-[10px] text-muted-foreground">{task.estimatedMinutes}min</span>
                </div>
              </div>
              <button onClick={() => store.removeTask(task.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
          {store.tasks.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tarefa cadastrada</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

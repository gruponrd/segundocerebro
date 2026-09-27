import { useState } from "react";
import { useRoutineStore } from "@/stores/routineStore";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Flame, Trophy } from "lucide-react";

function getRateColor(rate: number): string {
  if (rate === 0) return "bg-secondary";
  if (rate <= 25) return "bg-red-500/40";
  if (rate <= 50) return "bg-yellow-500/40";
  if (rate <= 75) return "bg-emerald-500/40";
  return "bg-emerald-500";
}

export function HeatmapCalendar() {
  const store = useRoutineStore();
  const data = store.getHeatmapData();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const selectedRecord = selectedDay ? store.dayRecords.find(d => d.date === selectedDay) : null;

  // Group by weeks
  const weeks: { date: string; rate: number }[][] = [];
  let currentWeek: { date: string; rate: number }[] = [];
  
  // Pad first week
  const firstDay = new Date(data[0]?.date);
  const startPad = firstDay.getDay();
  for (let i = 0; i < startPad; i++) currentWeek.push({ date: "", rate: -1 });

  for (const d of data) {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const days = ["D", "S", "T", "Q", "Q", "S", "S"];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex gap-4">
        <Card className="flex-1">
          <CardContent className="p-4 flex items-center gap-3">
            <Flame className="w-8 h-8 text-orange-500" />
            <div>
              <div className="text-2xl font-bold text-foreground">{store.streak}</div>
              <div className="text-xs text-muted-foreground">Sequência atual</div>
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="p-4 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-primary" />
            <div>
              <div className="text-2xl font-bold text-foreground">{store.bestStreak}</div>
              <div className="text-xs text-muted-foreground">Melhor sequência</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-bold text-sm text-foreground mb-4">Mapa de Consistência</h3>
          
          <div className="overflow-x-auto">
            <div className="flex gap-[3px] min-w-[700px]">
              <div className="flex flex-col gap-[3px] mr-1">
                {days.map((d, i) => (
                  <div key={i} className="w-3 h-3 text-[8px] text-muted-foreground flex items-center">{i % 2 === 1 ? d : ""}</div>
                ))}
              </div>
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day, di) => (
                    <button
                      key={di}
                      onClick={() => day.date && day.rate >= 0 && setSelectedDay(day.date)}
                      disabled={!day.date || day.rate < 0}
                      className={cn(
                        "w-3 h-3 rounded-[2px] transition-all duration-200",
                        day.rate < 0 ? "invisible" : getRateColor(day.rate),
                        selectedDay === day.date && "ring-1 ring-foreground scale-150"
                      )}
                      title={day.date ? `${day.date}: ${day.rate}%` : ""}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-4 text-[10px] text-muted-foreground">
            <span>Menos</span>
            <div className="w-3 h-3 rounded-[2px] bg-secondary" />
            <div className="w-3 h-3 rounded-[2px] bg-red-500/40" />
            <div className="w-3 h-3 rounded-[2px] bg-yellow-500/40" />
            <div className="w-3 h-3 rounded-[2px] bg-emerald-500/40" />
            <div className="w-3 h-3 rounded-[2px] bg-emerald-500" />
            <span>Mais</span>
          </div>
        </CardContent>
      </Card>

      {/* Selected day detail */}
      {selectedRecord && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <h4 className="font-bold text-sm text-foreground">
              {new Date(selectedRecord.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </h4>
            <p className="text-sm text-muted-foreground">
              Você completou {selectedRecord.tasks.filter(t => t.status === "done").length} de {selectedRecord.tasks.length} tarefas.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Energia:</span>
              <span className="font-bold text-foreground">{selectedRecord.energyLevel}/5</span>
              <span className="text-xs text-muted-foreground ml-4">Conclusão:</span>
              <span className={cn("font-bold", selectedRecord.completionRate >= 50 ? "text-emerald-400" : "text-red-400")}>
                {selectedRecord.completionRate}%
              </span>
            </div>
            <div className="space-y-1">
              {selectedRecord.tasks.map(t => (
                <div key={t.id} className="flex items-center gap-2 text-xs">
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    t.status === "done" ? "bg-emerald-400" : t.status === "partial" ? "bg-yellow-400" : t.status === "skipped" ? "bg-red-400" : "bg-muted"
                  )} />
                  <span className={cn(t.status === "done" && "line-through text-muted-foreground")}>{t.title}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

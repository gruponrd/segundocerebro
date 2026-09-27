import { useRoutineStore } from "@/stores/routineStore";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function DailySummary() {
  const store = useRoutineStore();
  const rate = store.getTodayRate();
  const message = store.getDailySummaryMessage();
  const tasks = store.currentDay?.tasks || [];
  const done = tasks.filter(t => t.status === "done").length;
  const partial = tasks.filter(t => t.status === "partial").length;
  const skipped = tasks.filter(t => t.status === "skipped").length;
  const pending = tasks.filter(t => t.status === "pending" || t.status === "in_progress").length;

  const rateColor = rate >= 76 ? "text-emerald-400" : rate >= 51 ? "text-green-400" : rate >= 26 ? "text-yellow-400" : rate > 0 ? "text-red-400" : "text-muted-foreground";

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm text-foreground">Resumo do Dia</h3>
        </div>

        <div className="text-center py-3">
          <div className={cn("text-4xl font-bold font-mono", rateColor)}>{rate}%</div>
          <p className="text-xs text-muted-foreground mt-1">taxa de conclusão</p>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500 rounded-full" style={{ width: `${rate}%` }} />
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-lg bg-emerald-500/10"><div className="text-lg font-bold text-emerald-400">{done}</div><div className="text-[10px] text-muted-foreground">Feito</div></div>
          <div className="p-2 rounded-lg bg-yellow-500/10"><div className="text-lg font-bold text-yellow-400">{partial}</div><div className="text-[10px] text-muted-foreground">Parcial</div></div>
          <div className="p-2 rounded-lg bg-red-500/10"><div className="text-lg font-bold text-red-400">{skipped}</div><div className="text-[10px] text-muted-foreground">Pulado</div></div>
          <div className="p-2 rounded-lg bg-secondary"><div className="text-lg font-bold text-foreground">{pending}</div><div className="text-[10px] text-muted-foreground">Restam</div></div>
        </div>

        <p className="text-sm text-muted-foreground text-center leading-relaxed">{message}</p>
      </CardContent>
    </Card>
  );
}

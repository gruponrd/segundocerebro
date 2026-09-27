import { useRoutineStore } from "@/stores/routineStore";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

export function WeeklyInsights() {
  const store = useRoutineStore();
  const insights = store.getWeeklyInsights();

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-400" />
          <h3 className="font-bold text-sm text-foreground">Insights Semanais</h3>
        </div>
        <div className="space-y-2">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="text-primary mt-0.5">•</span>
              <span>{insight}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

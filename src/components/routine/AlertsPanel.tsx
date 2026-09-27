import { useRoutineStore } from "@/stores/routineStore";
import { AlertTriangle } from "lucide-react";

export function AlertsPanel() {
  const store = useRoutineStore();
  const alerts = store.getAlerts();

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-200/80">{alert}</p>
        </div>
      ))}
    </div>
  );
}

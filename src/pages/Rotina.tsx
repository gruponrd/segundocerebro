import { useState, useEffect } from "react";
import { useRoutineStore } from "@/stores/routineStore";
import { EnergyCheck } from "@/components/routine/EnergyCheck";
import { TimeBlockView } from "@/components/routine/TimeBlockView";
import { FocusTimer } from "@/components/routine/FocusTimer";
import { DailySummary } from "@/components/routine/DailySummary";
import { HeatmapCalendar } from "@/components/routine/HeatmapCalendar";
import { TaskManager } from "@/components/routine/TaskManager";
import { WeeklyInsights } from "@/components/routine/WeeklyInsights";
import { AlertsPanel } from "@/components/routine/AlertsPanel";
import { Brain, Flame, Trophy, Calendar, Settings2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RotinaPage() {
  const store = useRoutineStore();
  const focusActive = store.focusMode.active;
  const tickFocus = store.tickFocus;
  const [showTaskManager, setShowTaskManager] = useState(false);

  // Focus timer tick
  useEffect(() => {
    if (!focusActive) return;
    const interval = setInterval(() => tickFocus(), 1000);
    return () => clearInterval(interval);
  }, [focusActive, tickFocus]);

  // Show focus overlay
  if (store.focusMode.active) {
    return <FocusTimer />;
  }

  // Show energy check if not done today
  if (!store.energyCheckedToday) {
    return <EnergyCheck />;
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Rotina Inteligente</h1>
            <p className="text-sm text-muted-foreground">Consistência transforma rotina em resultado</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-bold text-orange-500">{store.streak} dias</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-primary">Recorde: {store.bestStreak}</span>
          </div>
          <button
            onClick={() => setShowTaskManager(!showTaskManager)}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Settings2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Alerts */}
      <AlertsPanel />

      {/* Task manager modal */}
      {showTaskManager && (
        <TaskManager onClose={() => setShowTaskManager(false)} />
      )}

      <Tabs defaultValue="today" className="space-y-6">
        <TabsList className="bg-secondary/50 p-1">
          <TabsTrigger value="today" className="gap-2">
            <Brain className="w-4 h-4" /> Hoje
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Calendar className="w-4 h-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            <TimeBlockView />
            <div className="space-y-6">
              <DailySummary />
              <WeeklyInsights />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <HeatmapCalendar />
        </TabsContent>
      </Tabs>
    </div>
  );
}

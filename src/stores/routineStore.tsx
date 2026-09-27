import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { readAccountJson, writeAccountJson } from "@/lib/accountStorage";

export interface RoutineTask {
  id: string;
  title: string;
  category: "work" | "health" | "learning" | "personal" | "finance";
  difficulty: "easy" | "medium" | "hard";
  estimatedMinutes: number;
  preferredTime?: string;
  isRecurring: boolean;
}

export interface DailyTask extends RoutineTask {
  status: "pending" | "in_progress" | "done" | "partial" | "skipped";
  startedAt?: string;
  completedAt?: string;
  timeBlock: string;
}

export interface DayRecord {
  date: string;
  energyLevel: number;
  tasks: DailyTask[];
  completionRate: number;
  summary?: string;
}

export interface RoutinePattern {
  taskId: string;
  taskTitle: string;
  skipCount: number;
  bestHour?: number;
  worstHour?: number;
}

interface RoutineState {
  tasks: RoutineTask[];
  dayRecords: DayRecord[];
  currentDay: DayRecord | null;
  energyCheckedToday: boolean;
  focusMode: { active: boolean; taskId: string | null; minutes: number; remaining: number };
  streak: number;
  bestStreak: number;
  patterns: RoutinePattern[];
  // Actions
  addTask: (task: Omit<RoutineTask, "id">) => void;
  removeTask: (id: string) => void;
  updateTask: (id: string, updates: Partial<RoutineTask>) => void;
  setEnergyLevel: (level: number) => void;
  startTask: (taskId: string) => void;
  completeTask: (taskId: string, status: "done" | "partial" | "skipped") => void;
  startFocus: (taskId: string, minutes: number) => void;
  stopFocus: () => void;
  tickFocus: () => void;
  getHeatmapData: () => { date: string; rate: number }[];
  getWeeklyInsights: () => string[];
  getTodayRate: () => number;
  getDailySummaryMessage: () => string;
  getAlerts: () => string[];
}

const STORAGE_KEY = "routine-store-v1";

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

const timeBlocks = [
  { label: "06:00 - 08:00", start: 6 },
  { label: "08:00 - 10:00", start: 8 },
  { label: "10:00 - 12:00", start: 10 },
  { label: "13:00 - 15:00", start: 13 },
  { label: "15:00 - 17:00", start: 15 },
  { label: "17:00 - 19:00", start: 17 },
  { label: "19:00 - 21:00", start: 19 },
];

function generateDailyRoutine(tasks: RoutineTask[], energy: number, patterns: RoutinePattern[]): DailyTask[] {
  let filtered = [...tasks];
  
  // Filter by energy
  if (energy <= 2) {
    filtered = filtered.filter(t => t.difficulty !== "hard").slice(0, 4);
  } else if (energy <= 4) {
    filtered = filtered.slice(0, 6);
  }
  // energy 5: all tasks, hard first
  
  // Sort: hard tasks when energy is high
  if (energy >= 4) {
    filtered.sort((a, b) => {
      const order = { hard: 0, medium: 1, easy: 2 };
      return order[a.difficulty] - order[b.difficulty];
    });
  } else {
    filtered.sort((a, b) => {
      const order = { easy: 0, medium: 1, hard: 2 };
      return order[a.difficulty] - order[b.difficulty];
    });
  }

  // Check patterns for repositioning
  const patternMap = new Map(patterns.map(p => [p.taskId, p]));
  
  return filtered.map((task, i) => {
    const pattern = patternMap.get(task.id);
    let blockIndex = Math.min(i, timeBlocks.length - 1);
    
    if (pattern?.bestHour) {
      const best = timeBlocks.findIndex(b => b.start <= pattern.bestHour! && b.start + 2 > pattern.bestHour!);
      if (best >= 0) blockIndex = best;
    }
    
    return {
      ...task,
      status: "pending" as const,
      timeBlock: timeBlocks[blockIndex]?.label || timeBlocks[0].label,
    };
  });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadState(userId: string): { tasks: RoutineTask[]; dayRecords: DayRecord[]; patterns: RoutinePattern[] } | null {
  return readAccountJson(userId, STORAGE_KEY, null);
}

const RoutineContext = createContext<RoutineState | null>(null);

export function RoutineProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [saved] = useState(() => loadState(userId));
  
  const [tasks, setTasks] = useState<RoutineTask[]>(saved?.tasks || []);
  const [dayRecords, setDayRecords] = useState<DayRecord[]>(saved?.dayRecords || []);
  const [currentDay, setCurrentDay] = useState<DayRecord | null>(null);
  const [energyCheckedToday, setEnergyCheckedToday] = useState(false);
  const [focusMode, setFocusMode] = useState({ active: false, taskId: null as string | null, minutes: 25, remaining: 0 });
  const [patterns, setPatterns] = useState<RoutinePattern[]>(saved?.patterns || []);

  // Load today
  useEffect(() => {
    const today = todayKey();
    const existing = dayRecords.find(d => d.date === today);
    if (existing) {
      setCurrentDay(existing);
      setEnergyCheckedToday(true);
    }
  }, [dayRecords]);

  // Persist
  useEffect(() => {
    const data = { tasks, dayRecords, patterns };
    if (userId) writeAccountJson(userId, STORAGE_KEY, data);
  }, [tasks, dayRecords, patterns, userId]);

  // Sync currentDay back to dayRecords
  useEffect(() => {
    if (!currentDay) return;
    setDayRecords(prev => {
      const idx = prev.findIndex(d => d.date === currentDay.date);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = currentDay;
        return next;
      }
      return [...prev, currentDay];
    });
  }, [currentDay]);

  // Calculate streaks
  const { streak, bestStreak } = useMemo(() => {
    const sorted = [...dayRecords].sort((a, b) => b.date.localeCompare(a.date));
    let current = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const rec = sorted.find(r => r.date === key);
      if (rec && rec.completionRate >= 50) {
        current++;
      } else if (i > 0) break;
    }
    let best = 0, run = 0;
    const allSorted = [...dayRecords].sort((a, b) => a.date.localeCompare(b.date));
    for (const rec of allSorted) {
      if (rec.completionRate >= 50) { run++; best = Math.max(best, run); }
      else run = 0;
    }
    return { streak: current, bestStreak: Math.max(best, current) };
  }, [dayRecords]);

  // Update patterns when tasks complete
  const updatePatterns = useCallback((taskId: string, taskTitle: string, status: string) => {
    setPatterns(prev => {
      const existing = prev.find(p => p.taskId === taskId);
      if (status === "skipped") {
        if (existing) {
          return prev.map(p => p.taskId === taskId ? { ...p, skipCount: p.skipCount + 1 } : p);
        }
        return [...prev, { taskId, taskTitle, skipCount: 1 }];
      }
      if (status === "done" && existing) {
        const hour = new Date().getHours();
        return prev.map(p => p.taskId === taskId ? { ...p, bestHour: hour } : p);
      }
      return prev;
    });
  }, []);

  const addTask = useCallback((task: Omit<RoutineTask, "id">) => {
    setTasks(prev => [...prev, { ...task, id: generateId() }]);
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<RoutineTask>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const setEnergyLevel = useCallback((level: number) => {
    const today = todayKey();
    const dailyTasks = generateDailyRoutine(tasks, level, patterns);
    const totalTasks = dailyTasks.length;
    const day: DayRecord = {
      date: today,
      energyLevel: level,
      tasks: dailyTasks,
      completionRate: 0,
    };
    setCurrentDay(day);
    setEnergyCheckedToday(true);
  }, [tasks, patterns]);

  const startTask = useCallback((taskId: string) => {
    setCurrentDay(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map(t => t.id === taskId ? { ...t, status: "in_progress", startedAt: new Date().toISOString() } : t),
      };
    });
  }, []);

  const completeTask = useCallback((taskId: string, status: "done" | "partial" | "skipped") => {
    setCurrentDay(prev => {
      if (!prev) return prev;
      const task = prev.tasks.find(t => t.id === taskId);
      if (task) updatePatterns(taskId, task.title, status);
      const updated = prev.tasks.map(t => t.id === taskId ? { ...t, status, completedAt: new Date().toISOString() } : t);
      const done = updated.filter(t => t.status === "done").length;
      const partial = updated.filter(t => t.status === "partial").length;
      const total = updated.length;
      const rate = total > 0 ? Math.round(((done + partial * 0.5) / total) * 100) : 0;
      return { ...prev, tasks: updated, completionRate: rate };
    });
    setFocusMode({ active: false, taskId: null, minutes: 25, remaining: 0 });
  }, [updatePatterns]);

  const startFocus = useCallback((taskId: string, minutes: number) => {
    setFocusMode({ active: true, taskId, minutes, remaining: minutes * 60 });
    startTask(taskId);
  }, [startTask]);

  const stopFocus = useCallback(() => {
    setFocusMode({ active: false, taskId: null, minutes: 25, remaining: 0 });
  }, []);

  const tickFocus = useCallback(() => {
    setFocusMode(prev => {
      if (!prev.active || prev.remaining <= 0) return prev;
      return { ...prev, remaining: prev.remaining - 1 };
    });
  }, []);

  const getHeatmapData = useCallback(() => {
    const data: { date: string; rate: number }[] = [];
    const today = new Date();
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const rec = dayRecords.find(r => r.date === key);
      data.push({ date: key, rate: rec?.completionRate || 0 });
    }
    return data;
  }, [dayRecords]);

  const getTodayRate = useCallback(() => currentDay?.completionRate || 0, [currentDay]);

  const getDailySummaryMessage = useCallback(() => {
    const rate = currentDay?.completionRate || 0;
    if (rate >= 80) return "🔥 Você completou " + rate + "% da sua rotina. Isso te aproxima das suas metas!";
    if (rate >= 50) return "💪 Bom progresso hoje (" + rate + "%). Continue assim amanhã!";
    if (rate > 0) return "⚡ Hoje não foi o melhor dia (" + rate + "%), mas você ainda está no jogo. O próximo dia é o que importa.";
    return "Comece sua rotina para ver seu progresso!";
  }, [currentDay]);

  const getAlerts = useCallback(() => {
    const alerts: string[] = [];
    for (const p of patterns) {
      if (p.skipCount >= 3) {
        alerts.push(`Você está evitando "${p.taskTitle}". Deseja reduzir o tempo ou mudar o horário?`);
      }
    }
    if (streak > 0 && dayRecords.length > 0) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yKey = yesterday.toISOString().slice(0, 10);
      const yRec = dayRecords.find(d => d.date === yKey);
      if (yRec && yRec.completionRate < 50 && streak === 0) {
        alerts.push(`Você quebrou uma sequência de ${bestStreak} dias. Recomeçar agora é mais fácil do que desistir.`);
      }
    }
    return alerts;
  }, [patterns, streak, bestStreak, dayRecords]);

  const getWeeklyInsights = useCallback(() => {
    const insights: string[] = [];
    const last7 = dayRecords.filter(d => {
      const diff = (Date.now() - new Date(d.date).getTime()) / 86400000;
      return diff <= 7;
    });
    if (last7.length === 0) return ["Complete alguns dias para ver seus insights semanais."];

    const avgRate = Math.round(last7.reduce((s, d) => s + d.completionRate, 0) / last7.length);
    insights.push(`Sua taxa média de conclusão esta semana foi de ${avgRate}%.`);

    const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const byDay = last7.map(d => ({ day: new Date(d.date).getDay(), rate: d.completionRate }));
    const best = byDay.sort((a, b) => b.rate - a.rate)[0];
    if (best) insights.push(`Você foi mais produtivo na ${dayNames[best.day]}.`);

    const skippedTasks = patterns.filter(p => p.skipCount >= 2);
    if (skippedTasks.length > 0) {
      insights.push(`Você tende a procrastinar: ${skippedTasks.map(t => t.taskTitle).join(", ")}.`);
    }

    return insights;
  }, [dayRecords, patterns]);

  const value: RoutineState = {
    tasks, dayRecords, currentDay, energyCheckedToday, focusMode,
    streak, bestStreak, patterns,
    addTask, removeTask, updateTask, setEnergyLevel,
    startTask, completeTask, startFocus, stopFocus, tickFocus,
    getHeatmapData, getWeeklyInsights, getTodayRate, getDailySummaryMessage, getAlerts,
  };

  return <RoutineContext.Provider value={value}>{children}</RoutineContext.Provider>;
}

export function useRoutineStore() {
  const ctx = useContext(RoutineContext);
  if (!ctx) throw new Error("useRoutineStore must be used within RoutineProvider");
  return ctx;
}

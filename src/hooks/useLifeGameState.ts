import { useCallback, useEffect, useState } from "react";
import { accountStorageKey, readAccountJson, writeAccountJson } from "@/lib/accountStorage";

export const LIFE_GAME_STORAGE_KEY = "neuro-recovery-v1";
export interface NeuroState {
  startDate: string | null;
  defeatedBosses: string[];
  bestStreakDays: number;
  claimedCoins?: number[];
}
const emptyState: NeuroState = { startDate: null, defeatedBosses: [], bestStreakDays: 0, claimedCoins: [] };
function readState(userId: string): NeuroState {
  const state = readAccountJson<NeuroState>(userId, LIFE_GAME_STORAGE_KEY, emptyState);
  return { ...state, claimedCoins: state.claimedCoins ?? [] };
}

/** Read on mount. Each mutation merges the latest account copy, never a stale tab. */
export function useLifeGameState(userId: string) {
  const [state, setState] = useState(() => readState(userId));
  useEffect(() => {
    setState(readState(userId));
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === accountStorageKey(userId, LIFE_GAME_STORAGE_KEY)) setState(readState(userId));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [userId]);
  const updateState = useCallback((update: NeuroState | ((current: NeuroState) => NeuroState)) => {
    if (!userId) return;
    const latest = readState(userId);
    const next = typeof update === "function" ? update(latest) : update;
    if (JSON.stringify(next) !== JSON.stringify(latest)) writeAccountJson(userId, LIFE_GAME_STORAGE_KEY, next);
    setState(next);
  }, [userId]);
  return [state, updateState] as const;
}

import type { Json } from "@/integrations/supabase/types";
import { validJourneyDate } from "@/lib/lifeGameDates";

/** Resolve only fields whose meaning is known; refuse to discard unfamiliar conflicts. */
export function mergeLifeGameCopies(local: unknown, remote: unknown, date: string): Json {
  if (!validJourneyDate(date) || !local || !remote || typeof local !== "object" || typeof remote !== "object" || Array.isArray(local) || Array.isArray(remote)) throw new Error("Não foi possível validar as cópias do LifeGame.");
  const left = local as Record<string, unknown>, right = remote as Record<string, unknown>;
  const special = new Set(["startDate", "defeatedBosses", "bestStreakDays", "claimedCoins"]);
  const result: Record<string, Json> = {};
  for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
    if (special.has(key)) continue;
    if (key in left && key in right && JSON.stringify(left[key]) !== JSON.stringify(right[key])) throw new Error("As cópias contêm informações diferentes que precisam de revisão manual.");
    result[key] = (key in left ? left[key] : right[key]) as Json;
  }
  const bosses = (value: unknown) => Array.isArray(value) && value.every(item => typeof item === "string");
  const coins = (value: unknown) => value === undefined || (Array.isArray(value) && value.every(item => Number.isInteger(item) && item >= 0));
  if (!bosses(left.defeatedBosses) || !bosses(right.defeatedBosses) || !coins(left.claimedCoins) || !coins(right.claimedCoins) || typeof left.bestStreakDays !== "number" || typeof right.bestStreakDays !== "number" || !Number.isFinite(left.bestStreakDays) || !Number.isFinite(right.bestStreakDays)) throw new Error("As cópias precisam de revisão manual antes de serem sincronizadas.");
  return { ...result, startDate: date, defeatedBosses: [...new Set([...(left.defeatedBosses as string[]), ...(right.defeatedBosses as string[])])], bestStreakDays: Math.max(left.bestStreakDays as number, right.bestStreakDays as number), claimedCoins: [...new Set([...((left.claimedCoins ?? []) as number[]), ...((right.claimedCoins ?? []) as number[])])].sort((a, b) => a - b) };
}

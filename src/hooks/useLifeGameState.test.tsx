import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/lib/previewMode", () => ({ isAccountPreview: false }));
import { accountStorageKey } from "@/lib/accountStorage";
import { LIFE_GAME_STORAGE_KEY, useLifeGameState } from "./useLifeGameState";
const key = accountStorageKey("owner", LIFE_GAME_STORAGE_KEY);
const original = { startDate: "2026-09-19T03:00:00.000Z", defeatedBosses: ["b1"], bestStreakDays: 40, claimedCoins: [1, 3] };
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

it("never rewrites a saved legacy date on mount", () => {
  localStorage.setItem(key, JSON.stringify(original));
  const write = vi.spyOn(Storage.prototype, "setItem");
  const { result } = renderHook(() => useLifeGameState("owner"));
  expect(result.current[0]).toEqual(original);
  expect(write).not.toHaveBeenCalled();
});
it("merges an action with the newest stored journey instead of overwriting its date", () => {
  localStorage.setItem(key, JSON.stringify(original));
  const { result } = renderHook(() => useLifeGameState("owner"));
  const newer = { ...original, startDate: "2026-10-25", claimedCoins: [1] };
  localStorage.setItem(key, JSON.stringify(newer));
  act(() => result.current[1](latest => ({ ...latest, defeatedBosses: [...latest.defeatedBosses, "b2"] })));
  expect(JSON.parse(localStorage.getItem(key)!)).toEqual({ ...newer, defeatedBosses: ["b1", "b2"] });
});
it("refreshes another-tab changes only for the active account", () => {
  localStorage.setItem(key, JSON.stringify(original));
  const { result } = renderHook(() => useLifeGameState("owner"));
  const newer = { ...original, startDate: "2026-10-25" };
  localStorage.setItem(key, JSON.stringify(newer));
  act(() => window.dispatchEvent(new StorageEvent("storage", { key: accountStorageKey("other", LIFE_GAME_STORAGE_KEY) })));
  expect(result.current[0]).toEqual(original);
  act(() => window.dispatchEvent(new StorageEvent("storage", { key })));
  expect(result.current[0]).toEqual(newer);
});
it("stores newly chosen dates literally and leaves other accounts intact", () => {
  const other = accountStorageKey("other", LIFE_GAME_STORAGE_KEY);
  localStorage.setItem(other, JSON.stringify(original));
  const { result } = renderHook(() => useLifeGameState("owner"));
  act(() => result.current[1]({ ...original, startDate: "2026-10-29" }));
  expect(JSON.parse(localStorage.getItem(key)!).startDate).toBe("2026-10-29");
  expect(JSON.parse(localStorage.getItem(other)!)).toEqual(original);
});

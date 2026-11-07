import { expect, it } from "vitest";
import { mergeLifeGameCopies } from "./lifeGameReconcile";

it("aplica a data escolhida e preserva conquistas e recordes de ambas as cópias", () => {
  const local = { startDate: "2026-10-29", defeatedBosses: ["b1", "b2"], bestStreakDays: 9, claimedCoins: [1, 3] };
  const cloud = { startDate: "2026-10-31", defeatedBosses: ["b1", "b3"], bestStreakDays: 7, claimedCoins: [1, 7] };
  expect(mergeLifeGameCopies(local, cloud, "2026-10-31")).toEqual({ startDate: "2026-10-31", defeatedBosses: ["b1", "b2", "b3"], bestStreakDays: 9, claimedCoins: [1, 3, 7] });
  expect(local.startDate).toBe("2026-10-29");
  expect(cloud.claimedCoins).toEqual([1, 7]);
});
it("recusa dados incompatíveis sem tentar combiná-los", () => {
  const base = { startDate: "2026-10-31", defeatedBosses: [], bestStreakDays: 1, claimedCoins: [] };
  expect(() => mergeLifeGameCopies({ ...base, extra: "a" }, { ...base, extra: "b" }, "2026-10-31")).toThrow();
  expect(() => mergeLifeGameCopies(base, { ...base, claimedCoins: "wrong" }, "2026-10-31")).toThrow();
  expect(() => mergeLifeGameCopies(base, base, "2026-02-30")).toThrow();
});

import { webcrypto } from "node:crypto";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { accountStorageKey } from "@/lib/accountStorage";

const { cloud, saved, mutate } = vi.hoisted(() => ({ cloud: { data: { startDate: "2026-10-31", defeatedBosses: ["b2"], bestStreakDays: 3, claimedCoins: [3] }, revision: "original" }, saved: vi.fn(), mutate: { conflict: false } }));
vi.mock("@/lib/previewMode", () => ({ isAccountPreview: false }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) }, from: () => ({
  select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: cloud, error: null }) }) }) }),
  update: (value: unknown) => ({ eq: () => ({ eq: () => ({ eq: () => ({ select: () => ({ maybeSingle: async () => { if (mutate.conflict) return { data: null, error: null }; saved(value); return { data: { revision: "new" }, error: null }; } }) }) }) }) }),
}) } }));
import { LifeGameConflictResolver } from "./LifeGameConflictResolver";
beforeEach(() => { localStorage.clear(); saved.mockReset(); mutate.conflict = false; Object.defineProperty(globalThis.crypto, "subtle", { value: webcrypto.subtle, configurable: true }); });
afterEach(cleanup);
it("guarda as duas cópias e salva a data escolhida preservando conquistas", async () => {
  const local = { startDate: "2026-10-29", defeatedBosses: ["b1"], bestStreakDays: 9, claimedCoins: [1] };
  localStorage.setItem(accountStorageKey("owner", "neuro-recovery-v1"), JSON.stringify(local));
  const done = vi.fn();
  render(<LifeGameConflictResolver userId="owner" onResolved={done} />);
  fireEvent.click(screen.getByRole("button", { name: "Corrigir data do LifeGame" }));
  fireEvent.change(screen.getByLabelText("Data correta do LifeGame"), { target: { value: "2026-10-31" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar data e sincronizar" }));
  await waitFor(() => expect(done).toHaveBeenCalledOnce());
  const result = JSON.parse(localStorage.getItem(accountStorageKey("owner", "neuro-recovery-v1"))!);
  expect(result).toEqual({ startDate: "2026-10-31", defeatedBosses: ["b1", "b2"], bestStreakDays: 9, claimedCoins: [1, 3] });
  expect(saved).toHaveBeenCalledOnce();
  const backupKey = Object.keys(localStorage).find(key => key.startsWith("fin_lifegame_conflict_backup_owner_"))!;
  expect(JSON.parse(localStorage.getItem(backupKey)!).local).toEqual(local);
});
it("não substitui a cópia local se a nuvem mudar durante a confirmação", async () => {
  const local = { startDate: "2026-10-29", defeatedBosses: [], bestStreakDays: 3, claimedCoins: [] };
  localStorage.setItem(accountStorageKey("owner", "neuro-recovery-v1"), JSON.stringify(local));
  mutate.conflict = true;
  render(<LifeGameConflictResolver userId="owner" onResolved={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Corrigir data do LifeGame" }));
  fireEvent.change(screen.getByLabelText("Data correta do LifeGame"), { target: { value: "2026-10-31" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar data e sincronizar" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("cópia da nuvem mudou");
  expect(JSON.parse(localStorage.getItem(accountStorageKey("owner", "neuro-recovery-v1"))!)).toEqual(local);
  expect(saved).not.toHaveBeenCalled();
});

import { webcrypto } from "node:crypto";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { accountStorageKey } from "@/lib/accountStorage";
import { writeAccountJson } from "@/lib/accountStorage";

const { rows, writes } = vi.hoisted(() => ({ rows: new Map<string, { data: unknown; revision: string }>(), writes: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "owner" }, loading: false }) }));
vi.mock("@/lib/previewMode", () => ({ isPreviewMode: false, isAccountPreview: false }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({
  select: () => ({ eq: () => ({ eq: (_field: string, key: string) => ({ maybeSingle: async () => ({ data: rows.get(key) ?? null, error: null }) }) }) }),
  insert: (payload: { module_key: string; data: unknown; revision: string }) => ({ select: () => ({ maybeSingle: async () => { writes(); rows.set(payload.module_key, payload); return { data: { revision: payload.revision }, error: null }; } }) }),
  update: (payload: { data: unknown; revision: string }) => ({ eq: () => ({ eq: (_field: string, key: string) => ({ eq: (_field2: string, revision: string) => ({ select: () => ({ maybeSingle: async () => { if (rows.get(key)?.revision !== revision) return { data: null, error: null }; writes(); rows.set(key, payload); return { data: { revision: payload.revision }, error: null }; } }) }) }) }) }),
}) } }));
import { PersonalModulesGate } from "./PersonalModulesGate";

beforeEach(() => { localStorage.clear(); rows.clear(); writes.mockReset(); Object.defineProperty(globalThis.crypto, "subtle", { value: webcrypto.subtle, configurable: true }); });
afterEach(cleanup);
it("recupera os módulos da conta antes de abrir a aplicação", async () => {
  rows.set("fin_wishes_v1", { data: [{ id: "one" }], revision: "v1" });
  render(<PersonalModulesGate><p>Aplicação aberta</p></PersonalModulesGate>);
  expect(await screen.findByText("Aplicação aberta")).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(accountStorageKey("owner", "fin_wishes_v1"))!)).toEqual([{ id: "one" }]);
  expect(writes).not.toHaveBeenCalled();
});
it("preserva versões divergentes e não grava na nuvem", async () => {
  const key = accountStorageKey("owner", "fin_wishes_v1");
  localStorage.setItem(key, '[{"id":"local"}]');
  rows.set("fin_wishes_v1", { data: [{ id: "cloud" }], revision: "v1" });
  render(<PersonalModulesGate><p>Aplicação aberta</p></PersonalModulesGate>);
  await waitFor(() => expect(screen.getByText(/Existem versões diferentes em Desejos/)).toBeInTheDocument());
  expect(localStorage.getItem(key)).toBe('[{"id":"local"}]');
  expect(rows.get("fin_wishes_v1")?.data).toEqual([{ id: "cloud" }]);
  expect(writes).not.toHaveBeenCalled();
});
it("envia uma alteração da conta depois de estabelecer uma base comum", async () => {
  const key = accountStorageKey("owner", "fin_wishes_v1");
  localStorage.setItem(key, '[{"id":"one"}]');
  rows.set("fin_wishes_v1", { data: [{ id: "one" }], revision: "v1" });
  render(<PersonalModulesGate><p>Aplicação aberta</p></PersonalModulesGate>);
  expect(await screen.findByText("Aplicação aberta")).toBeInTheDocument();
  writeAccountJson("owner", "fin_wishes_v1", [{ id: "one" }, { id: "two" }]);
  await waitFor(() => expect(rows.get("fin_wishes_v1")?.data).toEqual([{ id: "one" }, { id: "two" }]));
});

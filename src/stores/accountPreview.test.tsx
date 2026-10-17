import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
const account = vi.hoisted(() => ({ session: { user: { id: "test-account", user_metadata: { display_name: "Conta de teste" } } } as { user: { id: string; user_metadata: { display_name: string } } } | null, cloud: {} as Record<string, unknown>, insert: vi.fn(), update: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/previewMode", () => ({ isPreviewMode: true, isDesignPreview: true, isAccountPreview: true }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: account.from,
  auth: {
    getSession: async () => ({ data: { session: account.session } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
  },
} }));
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { FinanceProvider, useFinanceStore } from "./financeStore";
import { createDesignPreviewData } from "@/lib/designPreviewData";
import { accountStorageKey, writeAccountJson } from "@/lib/accountStorage";
import { restoreMigratedModules } from "@/lib/migratedModules";
const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider><FinanceProvider>{children}</FinanceProvider></AuthProvider>;
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks();
  account.session = { user: { id: "test-account", user_metadata: { display_name: "Conta de teste" } } };
  account.cloud = createDesignPreviewData() as unknown as Record<string, unknown>;
  account.from.mockImplementation((table: string) => {
    const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: table === "profiles" ? { display_name: "Conta de teste" } : { data: account.cloud, updated_at: "2026-10-17T00:00:00Z" }, error: null }), insert: account.insert, update: account.update };
    return query;
  });
});
afterEach(cleanup);

it("requires a real session instead of granting access to a preview user", async () => {
  account.session = null;
  const hook = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  expect(hook.result.current.user).toBeNull();
  expect(account.from).not.toHaveBeenCalled();
});

it("loads the cloud copy, isolates edits and reloads current cloud data without writes", async () => {
  const original = JSON.stringify({ banks: [{ id: "untouched-cache" }] });
  localStorage.setItem("fin_user_test-account", original);
  localStorage.setItem("fin_design_account_test-account", JSON.stringify({ salary: 999999 }));
  const first = renderHook(() => ({ auth: useAuth(), store: useFinanceStore() }), { wrapper });
  await waitFor(() => expect(first.result.current.store.cloudReady).toBe(true));
  expect(first.result.current.auth.user?.id).toBe("test-account");
  expect(first.result.current.auth.displayName).toBe("Conta de teste");
  expect(first.result.current.store.salary).not.toBe(999999);
  const month = first.result.current.store.selectedMonth;
  act(() => first.result.current.store.addCashflowItem(month, "expenses", "Somente prévia", 1.23));
  await waitFor(() => expect(localStorage.getItem("fin_design_account_test-account")).toContain("Somente prévia"));
  expect(localStorage.getItem("fin_user_test-account")).toBe(original);
  expect(account.insert).not.toHaveBeenCalled();
  expect(account.update).not.toHaveBeenCalled();
  first.unmount();
  const second = renderHook(() => useFinanceStore(), { wrapper });
  await waitFor(() => expect(second.result.current.cloudReady).toBe(true));
  expect(second.result.current.cashflowMonths[month].expenses.some(item => item.label === "Somente prévia")).toBe(false);
  expect(account.insert).not.toHaveBeenCalled();
  expect(account.update).not.toHaveBeenCalled();
});

it("keeps module data and migration flags outside the account's normal namespaces", () => {
  localStorage.setItem("fin_account_test-account_fin_wishes_v1", "[1]");
  writeAccountJson("test-account", "fin_wishes_v1", [2]);
  expect(accountStorageKey("test-account", "fin_wishes_v1")).toBe("fin_design_account_test-account_fin_wishes_v1");
  expect(localStorage.getItem("fin_account_test-account_fin_wishes_v1")).toBe("[1]");
  restoreMigratedModules("test-account", { fin_trades: "[]" }, localStorage);
  expect(localStorage.getItem("fin_migrated_modules_restored_test-account")).toBeNull();
  expect(localStorage.getItem("fin_design_migrated_modules_restored_test-account")).toBe("1");
});

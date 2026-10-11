import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { accountStorageKey } from "@/lib/accountStorage";
import { PAYMENT_SESSION_STORAGE_KEY } from "@/lib/monthlyCashflowChart";

const auth = vi.hoisted(() => ({ id: "a" as string | null }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: auth.id ? { id: auth.id } : null }) }));
import { usePaymentSessionMap } from "./usePaymentSessionMap";

beforeEach(() => { localStorage.clear(); auth.id = "a"; });
it("reutiliza atribuições existentes, atualiza ambos os consumidores e isola outra conta", () => {
  const keyA = accountStorageKey("a", PAYMENT_SESSION_STORAGE_KEY);
  const keyB = accountStorageKey("b", PAYMENT_SESSION_STORAGE_KEY);
  localStorage.setItem(keyA, JSON.stringify({ old: "s5" }));
  localStorage.setItem(keyB, JSON.stringify({ other: "s30" }));
  const editor = renderHook(usePaymentSessionMap);
  const chart = renderHook(usePaymentSessionMap);
  expect(chart.result.current.map).toEqual({ old: "s5" });
  act(() => editor.result.current.assign("next", "s20"));
  expect(chart.result.current.map).toEqual({ old: "s5", next: "s20" });
  expect(JSON.parse(localStorage.getItem(keyA)!)).toEqual({ old: "s5", next: "s20" });
  auth.id = "b";
  chart.rerender();
  expect(chart.result.current.map).toEqual({ other: "s30" });
  expect(localStorage.getItem(keyB)).toBe('{"other":"s30"}');
  auth.id = null;
  chart.rerender();
  expect(chart.result.current.map).toEqual({});
});

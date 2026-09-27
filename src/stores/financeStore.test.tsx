import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  userId: "account-a",
  updates: vi.fn(),
  inserts: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mock.userId ? { id: mock.userId } : null }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      let selectedUser = "";
      const query = {
        select: () => query,
        eq: (column: string, value: string) => {
          if (column === "user_id") selectedUser = value;
          return query;
        },
        maybeSingle: () => selectedUser === "account-b"
          ? new Promise(() => undefined)
          : Promise.resolve({ data: { data: {}, updated_at: "2026-09-21T00:00:00.000Z" }, error: null }),
        update: mock.updates,
        insert: mock.inserts,
      };
      return query;
    },
  },
}));

import { FinanceProvider, useFinanceStore } from "./financeStore";

const wrapper = ({ children }: { children: ReactNode }) => <FinanceProvider>{children}</FinanceProvider>;

describe("isolamento financeiro por conta", () => {
  beforeEach(() => {
    mock.userId = "account-a";
    mock.updates.mockClear();
    mock.inserts.mockClear();
    localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it("não grava o estado da conta anterior enquanto a próxima conta carrega", async () => {
    const { result, rerender } = renderHook(() => useFinanceStore(), { wrapper });
    await waitFor(() => expect(result.current.cloudReady).toBe(true));
    expect(result.current.banks).toEqual([]);
    expect(result.current.creditors).toEqual([]);
    expect(result.current.incomeSources).toEqual([]);

    vi.useFakeTimers();
    act(() => result.current.addGoal("Meta nova", 100));
    act(() => {
      mock.userId = "account-b";
      rerender();
    });
    await act(async () => vi.advanceTimersByTimeAsync(3000));

    expect(result.current.cloudReady).toBe(false);
    expect(mock.updates).not.toHaveBeenCalled();
    expect(mock.inserts).not.toHaveBeenCalled();
  });
});

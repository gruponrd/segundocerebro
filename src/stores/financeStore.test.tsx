import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  userId: "account-a",
  updates: vi.fn(),
  inserts: vi.fn(),
  cloudData: {} as Record<string, unknown>,
  revision: "2026-09-21T00:00:00.000Z",
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
          : Promise.resolve({ data: { data: mock.cloudData, updated_at: mock.revision }, error: null }),
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
    mock.cloudData = {};
    mock.revision = "2026-09-21T00:00:00.000Z";
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

  it("recebe lançamentos externos quando não há edições locais, sem gravar de volta", async () => {
    const { result } = renderHook(() => useFinanceStore(), { wrapper });
    await waitFor(() => expect(result.current.cloudReady).toBe(true));
    mock.cloudData = { goals: [{ id: "remote", title: "Meta na nuvem", targetAmount: 100, savedAmount: 0, image: "", color: "" }] };
    mock.revision = "2026-09-22T00:00:00.000Z";
    act(() => window.dispatchEvent(new Event("segundo-cerebro:finance-refresh")));
    await waitFor(() => expect(result.current.goals[0]?.id).toBe("remote"));
    expect(mock.updates).not.toHaveBeenCalled();
    expect(mock.inserts).not.toHaveBeenCalled();
  });

  it("preserva uma edição local e sinaliza conflito quando o bot altera a nuvem", async () => {
    const { result } = renderHook(() => useFinanceStore(), { wrapper });
    await waitFor(() => expect(result.current.cloudReady).toBe(true));
    act(() => result.current.addGoal("Meta local", 100));
    mock.cloudData = { goals: [] };
    mock.revision = "2026-09-22T00:00:00.000Z";
    act(() => window.dispatchEvent(new Event("segundo-cerebro:finance-refresh")));
    await waitFor(() => expect(result.current.syncStatus).toBe("conflict"));
    expect(result.current.goals[0]?.title).toBe("Meta local");
  });

  it("reabrir o app aceita a nuvem mais recente quando o backup local estava salvo", async () => {
    const first = renderHook(() => useFinanceStore(), { wrapper });
    await waitFor(() => expect(first.result.current.cloudReady).toBe(true));
    first.unmount();
    mock.cloudData = { goals: [{ id: "bot", title: "Dados atualizados", targetAmount: 200, savedAmount: 0, image: "", color: "" }] };
    mock.revision = "2026-09-22T00:00:00.000Z";
    const second = renderHook(() => useFinanceStore(), { wrapper });
    await waitFor(() => expect(second.result.current.cloudReady).toBe(true));
    expect(second.result.current.localRecoveryAvailable).toBe(false);
    expect(second.result.current.goals[0]?.id).toBe("bot");
  });
});

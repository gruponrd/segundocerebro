import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  userId: "account-a",
  updates: vi.fn(),
  inserts: vi.fn(),
  cloudData: {} as Record<string, unknown> | null,
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
          : Promise.resolve({ data: mock.cloudData === null ? null : { data: mock.cloudData, updated_at: mock.revision }, error: null }),
        update: mock.updates,
        insert: mock.inserts,
      };
      return query;
    },
  },
}));

import { FinanceProvider, useFinanceStore } from "./financeStore";
import { parseStatementCsv, previewStatement, suggestMapping } from "@/lib/statementImport";

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

  it("salva o plano das metas junto do orçamento, mantendo saldos e identificadores", async () => {
    const original = [{ id:"a",title:"A",targetAmount:1000,savedAmount:123,image:"a",color:"c" },{ id:"b",title:"B",targetAmount:2000,savedAmount:234,image:"b",color:"d" }];
    mock.cloudData = {goals:original,savingsGoalMonth:100};
    const {result} = renderHook(()=>useFinanceStore(),{wrapper});
    await waitFor(()=>expect(result.current.cloudReady).toBe(true));
    act(()=>result.current.saveGoalPlan(150,{a:50,b:100}));
    expect(result.current.savingsGoalMonth).toBe(150);
    expect(result.current.goals).toEqual(original.map((g,i)=>({...g,monthlyAllocation:i?100:50})));
    expect(()=>result.current.saveGoalPlan(150,{a:151,b:0})).toThrow();
    expect(result.current.savingsGoalMonth).toBe(150);
    expect(result.current.goals[0].savedAmount).toBe(123);
  });

  it("salva o logo no mesmo cartão e preserva limites, parcelas e identificadores", async () => {
    const original = {
      id: "my-card",
      name: "Meu cartão",
      color: "bank-other",
      glowClass: "",
      limitTotal: 8000,
      limitUsed: 1200,
      debtFinal: 900,
      status: "pendente",
      installments: [{ id: "parcel-1", description: "Compra existente", totalAmount: 900, installmentAmount: 300, currentInstallment: 1, totalInstallments: 3, dueDate: "2026-10-20", status: "pendente" }],
    };
    mock.cloudData = { banks: [original] };
    const { result } = renderHook(() => useFinanceStore(), { wrapper });
    await waitFor(() => expect(result.current.cloudReady).toBe(true));
    const before = result.current.banks[0];

    const logoDataUrl = "data:image/png;base64,optimized-logo";
    act(() => result.current.updateBank("my-card", { logoDataUrl }));
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem("fin_user_account-a")!);
      expect(saved.banks[0]).toEqual({ ...original, logoDataUrl });
    });
    expect(result.current.banks[0].limitUsed).toBe(before.limitUsed);
    expect(result.current.banks[0].installments).toEqual(before.installments);
  });

  it("navega até a última fatura e edita o mês certo mesmo depois de inserir meses anteriores", async () => {
    const year = new Date().getFullYear();
    const originalMonth = { month: "Outubro", year, incomes: [{ id: "original-income", label: "Original", amount: 1000, paid: true }], expenses: [] };
    const installment = { id: "future-bill", description: "Compra", totalAmount: 100, installmentAmount: 100, currentInstallment: 1, totalInstallments: 1, dueDate: `${year + 2}-08-20`, status: "pendente" as const };
    const bank = { id: "card", name: "Meu cartão", color: "bank-other", glowClass: "", limitTotal: 1000, limitUsed: 100, debtFinal: 100, status: "pendente", installments: [installment] };
    mock.cloudData = { banks: [bank], cashflowMonths: [originalMonth] };
    const { result } = renderHook(() => useFinanceStore(), { wrapper });
    await waitFor(() => expect(result.current.cloudReady).toBe(true));

    expect(result.current.cashflowMonths.at(-1)).toMatchObject({ month: "Agosto", year: year + 2 });
    expect(JSON.parse(localStorage.getItem("fin_user_account-a")!).cashflowMonths.some((month: { year: number }) => month.year === year + 2)).toBe(false);
    expect(mock.updates).not.toHaveBeenCalled();
    expect(mock.inserts).not.toHaveBeenCalled();

    act(() => result.current.setSelectedMonth(result.current.cashflowMonths.length - 1));
    expect(result.current.cardExpensesForMonth).toBe(100);
    act(() => result.current.addCashflowItem(result.current.selectedMonth, "incomes", "Entrada futura", 300));
    expect(result.current.currentCashflow.incomes[0]).toMatchObject({ label: "Entrada futura", amount: 300 });

    act(() => result.current.addInstallment("card", { ...installment, description: "Parcela antiga", dueDate: `${year - 1}-06-10` }));
    expect(result.current.currentCashflow).toMatchObject({ month: "Agosto", year: year + 2 });
    act(() => result.current.updateCashflowItem(result.current.selectedMonth, "incomes", 0, "Entrada revisada", 350));
    act(() => result.current.toggleCashflowPaid(result.current.selectedMonth, "incomes", 0));
    expect(result.current.currentCashflow.incomes[0]).toMatchObject({ label: "Entrada revisada", amount: 350, paid: true });
    expect(result.current.cashflowMonths.find(month => month.month === "Outubro" && month.year === year)).toEqual(originalMonth);
    const saved = JSON.parse(localStorage.getItem("fin_user_account-a")!);
    expect(saved.cashflowMonths.find((month: { month: string; year: number }) => month.month === "Agosto" && month.year === year + 2).incomes[0]).toMatchObject({ label: "Entrada revisada", amount: 350, paid: true });
    act(() => result.current.prevMonth());
    expect(result.current.currentCashflow).toMatchObject({ month: "Julho", year: year + 2 });
    act(() => result.current.nextMonth());
    expect(result.current.currentCashflow).toMatchObject({ month: "Agosto", year: year + 2 });
  });

  it("importa e desfaz somente o lote novo, preservando os lançamentos originais", async () => {
    const original = {month:"Outubro",year:2026,incomes:[],expenses:[{label:"Original",amount:20,paid:true}]};
    mock.cloudData = {cashflowMonths:[original]};
    const {result} = renderHook(()=>useFinanceStore(),{wrapper});
    await waitFor(()=>expect(result.current.cloudReady).toBe(true));
    const csv=parseStatementCsv("data;descricao;valor\n10/10/2026;Compra nova;-10");
    const entry=previewStatement(csv,suggestMapping(csv[0]),"br","signed",result.current.cashflowMonths)[0].entry!;
    act(()=>result.current.importStatement([entry],"batch",true));
    expect(result.current.cashflowMonths.find(m=>m.month==="Outubro")?.expenses).toHaveLength(2);
    act(()=>result.current.importStatement([entry],"second",true));
    expect(result.current.cashflowMonths.find(m=>m.month==="Outubro")?.expenses).toHaveLength(2);
    act(()=>result.current.undoStatementImport("batch"));
    expect(result.current.cashflowMonths.find(m=>m.month==="Outubro")).toEqual(original);
  });

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

  it("conta nova começa vazia apesar de dados de outra conta e dados antigos no navegador", async () => {
    mock.cloudData = null;
    const original = JSON.stringify({ banks: [{ id: "existing", limitUsed: 900 }], salary: 5000 });
    localStorage.setItem("fin_user_other", original);
    localStorage.setItem("fin_banks", '[{"id":"unowned","limitUsed":1200}]');
    localStorage.setItem("fin_wishes_v1", '[{"id":"old-wish"}]');
    const { result } = renderHook(() => useFinanceStore(), { wrapper });
    await waitFor(() => expect(result.current.cloudReady).toBe(true));
    expect(result.current.banks).toEqual([]);
    expect(result.current.creditors).toEqual([]);
    expect(result.current.goals).toEqual([]);
    expect(result.current.salary).toBe(0);
    expect(result.current.totalDebt).toBe(0);
    expect(result.current.totalIncome).toBe(0);
    expect(result.current.lifeXp).toBe(0);
    expect(result.current.cashflowMonths.every(month => !month.incomes.length && !month.expenses.length)).toBe(true);
    expect(localStorage.getItem("fin_user_other")).toBe(original);
    expect(localStorage.getItem("fin_banks")).toContain("unowned");
    expect(localStorage.getItem("fin_account_account-a_fin_wishes_v1")).toBeNull();
    expect(JSON.parse(localStorage.getItem("fin_user_account-a")!).banks).toEqual([]);
  });

  it("conta existente mantém dados da nuvem mesmo com dados sem dono no navegador", async () => {
    const original = { banks: [{ id: "mine", name: "Meu cartão", limitUsed: 100, installments: [] }], salary: 3500,
      goals: [{ id: "mine-goal", title: "Minha meta", targetAmount: 1000, savedAmount: 50 }] };
    mock.cloudData = original;
    localStorage.setItem("fin_banks", '[{"id":"unowned"}]');
    localStorage.setItem("fin_trades", '[{"id":"unowned-trade"}]');
    const { result } = renderHook(() => useFinanceStore(), { wrapper });
    await waitFor(() => expect(result.current.cloudReady).toBe(true));
    expect(result.current.banks[0].id).toBe("mine");
    expect(result.current.salary).toBe(3500);
    expect(result.current.goals).toEqual(original.goals);
    expect(mock.updates).not.toHaveBeenCalled();
    expect(mock.inserts).not.toHaveBeenCalled();
  });
});

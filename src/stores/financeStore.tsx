import { useState, useEffect, useCallback, useRef, createContext, useContext, type ReactNode, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cardSpendingForMonth, remainingBankDebt } from "@/lib/financeCalculations";
import { mergeCashflowMonths } from "@/lib/cashflowMonths";
import type { Json } from "@/integrations/supabase/types";
import { hasLegacyModuleData, importLegacyModuleData } from "@/lib/accountStorage";
import { isPreviewMode } from "@/lib/previewMode";
import {
  type Bank,
  type BankId,
  type CashflowMonth,
  type CashflowItem,
  type Creditor,
  type Goal,
  type MonthlySnapshot,
  type Installment,
} from "@/data/financialData";

export interface IncomeSource {
  id: string;
  label: string;
  amount: number;
}

export type TripDirection = "ida" | "volta";

export interface TransportEntry {
  id: string;
  service: string;
  direction: TripDirection;
  amount: number;
  date: string;
}

export interface LifeTask {
  id: string;
  title: string;
  xpReward: number;
  completedThisWeek: boolean;
}

interface PersistedData {
  banks: Bank[];
  cashflowMonths: CashflowMonth[];
  creditors: Creditor[];
  goals: Goal[];
  incomeSources: IncomeSource[];
  savingsGoalMonth: number;
  salary: number;
  monthlyHours: number;
  safetyMargin: number;
  lifeXp: number;
  lifeTasks: LifeTask[];
  transportEntries: TransportEntry[];
  transportBalance: number;
}

export interface FinanceStore {
  banks: Bank[];
  cashflowMonths: CashflowMonth[];
  creditors: Creditor[];
  goals: Goal[];
  monthlySnapshots: MonthlySnapshot[];
  incomeSources: IncomeSource[];
  selectedMonth: number;
  selectedBank: Bank | null;
  currentCashflow: CashflowMonth;
  totalDebt: number;
  totalIncome: number;
  totalExpense: number;
  cardExpensesForMonth: number;
  expectedBalance: number;
  totalCreditorsDebt: number;
  totalCreditorsPaid: number;
  savingsGoalMonth: number;
  allInstallments: (Installment & { bankId: BankId; bankName: string; bankColor: string })[];
  setSelectedMonth: (m: number) => void;
  setSelectedBank: (b: Bank | null) => void;
  nextMonth: () => void;
  prevMonth: () => void;
  updateBankBalance: (bankId: BankId, newUsed: number) => void;
  toggleCashflowPaid: (monthIdx: number, type: "incomes" | "expenses", itemIdx: number) => void;
  depositToGoal: (goalId: string, amount: number) => void;
  addCashflowItem: (monthIdx: number, type: "incomes" | "expenses", label: string, amount: number, category?: string) => void;
  removeCashflowItem: (monthIdx: number, type: "incomes" | "expenses", itemIdx: number) => void;
  updateCashflowItem: (monthIdx: number, type: "incomes" | "expenses", itemIdx: number, label: string, amount: number, category?: string) => void;
  setCashflowItemFixed: (monthIdx: number, type: "incomes" | "expenses", itemIdx: number, fixed: boolean) => void;
  replicateFixedItem: (monthIdx: number, type: "incomes" | "expenses", itemIdx: number) => void;
  addCreditor: (name: string, totalDebt: number) => void;
  removeCreditor: (id: string) => void;
  updateCreditor: (id: string, updates: Partial<Pick<Creditor, "name" | "totalDebt" | "amountPaid" | "interestRate" | "dueDate">>) => void;
  addGoal: (title: string, targetAmount: number) => void;
  removeGoal: (id: string) => void;
  updateGoal: (id: string, updates: Partial<Pick<Goal, "title" | "targetAmount" | "image">>) => void;
  updateBank: (bankId: BankId, updates: Partial<Pick<Bank, "name" | "limitTotal" | "status" | "color" | "glowClass">>) => void;
  removeBank: (bankId: BankId) => void;
  addBank: (name: string, limitTotal: number, color: string, glowClass: string) => void;
  moveBank: (bankId: BankId, targetId: BankId) => void;
  addInstallment: (bankId: BankId, inst: Omit<import("@/data/financialData").Installment, "id">) => void;
  removeInstallment: (bankId: BankId, installmentId: string) => void;
  updateInstallment: (bankId: BankId, installmentId: string, updates: Partial<Omit<import("@/data/financialData").Installment, "id">>) => void;
  setSavingsGoalMonth: (v: number) => void;
  addIncomeSource: (label: string, amount: number) => void;
  removeIncomeSource: (id: string) => void;
  updateIncomeSource: (id: string, updates: Partial<Pick<IncomeSource, "label" | "amount">>) => void;
  salary: number;
  monthlyHours: number;
  hourlyRate: number;
  safetyMargin: number;
  dailySavings: number;
  phantomBalance: number;
  survivalDays: number;
  setSalary: (v: number) => void;
  setMonthlyHours: (v: number) => void;
  setSafetyMargin: (v: number) => void;
  lifeXp: number;
  lifeTasks: LifeTask[];
  addLifeTask: (title: string, xpReward: number) => void;
  removeLifeTask: (id: string) => void;
  completeLifeTask: (id: string) => void;
  resetWeeklyTasks: () => void;
  transportEntries: TransportEntry[];
  transportBalance: number;
  addTransportEntry: (entry: Omit<TransportEntry, "id">) => void;
  removeTransportEntry: (id: string) => void;
  setTransportBalance: (v: number) => void;
  cloudLoading: boolean;
  cloudReady: boolean;
  syncStatus: "saved" | "saving" | "error" | "conflict";
  syncError: string | null;
  retryCloudLoad: () => void;
  retryCloudSave: () => void;
  legacyImportAvailable: boolean;
  importLegacyData: () => void;
  dismissLegacyImport: () => void;
  localRecoveryAvailable: boolean;
  useLocalRecovery: () => void;
  useCloudRecovery: () => void;
  legacyModuleImportAvailable: boolean;
  importLegacyModules: () => void;
  dismissLegacyModules: () => void;
}

const DEFAULTS: PersistedData = {
  banks: [],
  cashflowMonths: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].map(
    (month) => ({ month, year: new Date().getFullYear(), incomes: [], expenses: [] }),
  ),
  creditors: [],
  goals: [],
  incomeSources: [],
  savingsGoalMonth: 0,
  salary: 0,
  monthlyHours: 220,
  safetyMargin: 0,
  lifeXp: 0,
  lifeTasks: [],
  transportEntries: [],
  transportBalance: 0,
};

const MONTH_MAP: Record<string, number> = {
  Janeiro: 1, Fevereiro: 2, "Março": 3, Abril: 4, Maio: 5, Junho: 6,
  Julho: 7, Agosto: 8, Setembro: 9, Outubro: 10, Novembro: 11, Dezembro: 12,
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function getLocalData(): PersistedData {
  return {
    banks: loadFromStorage("fin_banks", DEFAULTS.banks),
    cashflowMonths: mergeCashflowMonths(loadFromStorage("fin_cashflow", DEFAULTS.cashflowMonths), DEFAULTS.cashflowMonths),
    creditors: loadFromStorage("fin_creditors", DEFAULTS.creditors),
    goals: loadFromStorage("fin_goals", DEFAULTS.goals),
    incomeSources: loadFromStorage("fin_incomeSources", DEFAULTS.incomeSources),
    savingsGoalMonth: loadFromStorage("fin_savingsGoal", DEFAULTS.savingsGoalMonth),
    salary: loadFromStorage("fin_salary", DEFAULTS.salary),
    monthlyHours: loadFromStorage("fin_monthlyHours", DEFAULTS.monthlyHours),
    safetyMargin: loadFromStorage("fin_safetyMargin", DEFAULTS.safetyMargin),
    lifeXp: loadFromStorage("fin_lifeXp", DEFAULTS.lifeXp),
    lifeTasks: loadFromStorage("fin_lifeTasks", DEFAULTS.lifeTasks),
    transportEntries: loadFromStorage("fin_transportEntries", DEFAULTS.transportEntries),
    transportBalance: loadFromStorage("fin_transportBalance", DEFAULTS.transportBalance),
  };
}

function hasLegacyFinanceData(): boolean {
  return [
    "fin_banks",
    "fin_cashflow",
    "fin_creditors",
    "fin_goals",
    "fin_incomeSources",
    "fin_savingsGoal",
    "fin_salary",
  ].some((key) => localStorage.getItem(key) !== null);
}

function userStorageKey(userId: string): string {
  return `fin_user_${userId}`;
}

function legacyReviewKey(userId: string): string {
  return `fin_legacy_modules_reviewed_${userId}`;
}

function saveToLocal(userId: string, data: PersistedData) {
  try {
    localStorage.setItem(userStorageKey(userId), JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save local backup:", error);
  }
}

function rememberCloudSnapshot(userId: string, snapshot: string) {
  try { localStorage.setItem(`fin_cloud_checkpoint_${userId}`, snapshot); }
  catch { /* Cloud sync remains available when the local quota is exhausted. */ }
}

function isCleanLocalCopy(userId: string, data: PersistedData) {
  try { return localStorage.getItem(`fin_cloud_checkpoint_${userId}`) === JSON.stringify(data); }
  catch { return false; }
}

function normalizeData(data: Partial<PersistedData>): PersistedData {
  return {
    banks: Array.isArray(data.banks) ? data.banks : DEFAULTS.banks,
    cashflowMonths: Array.isArray(data.cashflowMonths)
      ? mergeCashflowMonths(data.cashflowMonths, DEFAULTS.cashflowMonths)
      : DEFAULTS.cashflowMonths,
    creditors: Array.isArray(data.creditors) ? data.creditors : DEFAULTS.creditors,
    goals: Array.isArray(data.goals) ? data.goals : DEFAULTS.goals,
    incomeSources: Array.isArray(data.incomeSources) ? data.incomeSources : DEFAULTS.incomeSources,
    savingsGoalMonth: data.savingsGoalMonth ?? DEFAULTS.savingsGoalMonth,
    salary: data.salary ?? DEFAULTS.salary,
    monthlyHours: data.monthlyHours ?? DEFAULTS.monthlyHours,
    safetyMargin: data.safetyMargin ?? DEFAULTS.safetyMargin,
    lifeXp: data.lifeXp ?? DEFAULTS.lifeXp,
    lifeTasks: Array.isArray(data.lifeTasks) ? data.lifeTasks : DEFAULTS.lifeTasks,
    transportEntries: Array.isArray(data.transportEntries) ? data.transportEntries : DEFAULTS.transportEntries,
    transportBalance: data.transportBalance ?? DEFAULTS.transportBalance,
  };
}

function useFinanceStoreInternal(): FinanceStore {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [cloudLoading, setCloudLoading] = useState(true);
  const [banksRaw, setBanks] = useState<Bank[]>(DEFAULTS.banks);
  const [cashflowMonths, setCashflowMonths] = useState<CashflowMonth[]>(DEFAULTS.cashflowMonths);
  const [creditors, setCreditors] = useState<Creditor[]>(DEFAULTS.creditors);
  const [goals, setGoals] = useState<Goal[]>(DEFAULTS.goals);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    const now = new Date();
    const idx = DEFAULTS.cashflowMonths.findIndex(
      (m) => m.month === MONTHS_PT[now.getMonth()] && m.year === now.getFullYear()
    );
    return idx >= 0 ? idx : 0;
  });
  const [selectedBankId, setSelectedBankId] = useState<BankId | null>(null);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>(DEFAULTS.incomeSources);
  const [savingsGoalMonth, setSavingsGoalMonth] = useState(DEFAULTS.savingsGoalMonth);
  const [salary, setSalary] = useState(DEFAULTS.salary);
  const [monthlyHours, setMonthlyHours] = useState(DEFAULTS.monthlyHours);
  const [safetyMargin, setSafetyMargin] = useState(DEFAULTS.safetyMargin);
  const [lifeXp, setLifeXp] = useState(DEFAULTS.lifeXp);
  const [lifeTasks, setLifeTasks] = useState<LifeTask[]>(DEFAULTS.lifeTasks);
  const [transportEntries, setTransportEntries] = useState<TransportEntry[]>(DEFAULTS.transportEntries);
  const [transportBalance, setTransportBalance] = useState(DEFAULTS.transportBalance);
  const [hydratedUserId, setHydratedUserId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<FinanceStore["syncStatus"]>("saved");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [legacyImportAvailable, setLegacyImportAvailable] = useState(false);
  const [localRecoveryAvailable, setLocalRecoveryAvailable] = useState(false);
  const [legacyModuleImportAvailable, setLegacyModuleImportAvailable] = useState(false);
  const [loadNonce, setLoadNonce] = useState(0);
  const [saveNonce, setSaveNonce] = useState(0);
  const activeUserIdRef = useRef<string | null>(null);
  const remoteUpdatedAtRef = useRef<string | null>(null);
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const latestSnapshotRef = useRef<string | null>(null);
  const recoveryLocalRef = useRef<PersistedData | null>(null);
  const recoveryCloudRef = useRef<PersistedData | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyData = useCallback((data: PersistedData) => {
    setBanks(data.banks);
    setCashflowMonths(data.cashflowMonths);
    setCreditors(data.creditors);
    setGoals(data.goals);
    setIncomeSources(data.incomeSources);
    setSavingsGoalMonth(data.savingsGoalMonth);
    setSalary(data.salary);
    setMonthlyHours(data.monthlyHours);
    setSafetyMargin(data.safetyMargin);
    setLifeXp(data.lifeXp);
    setLifeTasks(data.lifeTasks);
    setTransportEntries(data.transportEntries);
    setTransportBalance(data.transportBalance);
    setSelectedMonth((month) => Math.min(month, data.cashflowMonths.length - 1));
  }, []);

  const retryCloudLoad = useCallback(() => setLoadNonce((nonce) => nonce + 1), []);
  const retryCloudSave = useCallback(() => setSaveNonce((nonce) => nonce + 1), []);

  const finishHydration = useCallback((accountId: string, status: FinanceStore["syncStatus"]) => {
    setSyncStatus(status);
    if (isPreviewMode) {
      setHydratedUserId(accountId);
      return;
    }
    if (hasLegacyModuleData() && localStorage.getItem(legacyReviewKey(accountId)) !== "1") {
      setLegacyModuleImportAvailable(true);
    } else {
      setHydratedUserId(accountId);
    }
  }, []);

  const importLegacyModules = useCallback(() => {
    if (!userId) return;
    importLegacyModuleData(userId);
    localStorage.setItem(legacyReviewKey(userId), "1");
    setLegacyModuleImportAvailable(false);
    setHydratedUserId(userId);
  }, [userId]);

  const dismissLegacyModules = useCallback(() => {
    if (!userId) return;
    localStorage.setItem(legacyReviewKey(userId), "1");
    setLegacyModuleImportAvailable(false);
    setHydratedUserId(userId);
  }, [userId]);

  const importLegacyData = useCallback(() => {
    if (!userId) return;
    const data = normalizeData(getLocalData());
    applyData(data);
    lastSavedSnapshotRef.current = null;
    setLegacyImportAvailable(false);
    finishHydration(userId, "saving");
  }, [applyData, userId, finishHydration]);

  const dismissLegacyImport = useCallback(() => {
    if (!userId) return;
    applyData(DEFAULTS);
    lastSavedSnapshotRef.current = null;
    setLegacyImportAvailable(false);
    finishHydration(userId, "saving");
  }, [applyData, userId, finishHydration]);

  const useLocalRecovery = useCallback(() => {
    if (!userId || !recoveryLocalRef.current) return;
    applyData(recoveryLocalRef.current);
    lastSavedSnapshotRef.current = null;
    setLocalRecoveryAvailable(false);
    finishHydration(userId, "saving");
  }, [applyData, userId, finishHydration]);

  const useCloudRecovery = useCallback(() => {
    if (!userId || !recoveryCloudRef.current) return;
    applyData(recoveryCloudRef.current);
    saveToLocal(userId, recoveryCloudRef.current);
    lastSavedSnapshotRef.current = JSON.stringify(recoveryCloudRef.current);
    rememberCloudSnapshot(userId, lastSavedSnapshotRef.current);
    setLocalRecoveryAvailable(false);
    finishHydration(userId, "saved");
  }, [applyData, userId, finishHydration]);

  // Hydrate each account separately. Never write data before this load completes.
  useEffect(() => {
    activeUserIdRef.current = userId;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setHydratedUserId(null);
    setLegacyImportAvailable(false);
    setLocalRecoveryAvailable(false);
    setLegacyModuleImportAvailable(false);
    setSyncError(null);
    remoteUpdatedAtRef.current = null;
    lastSavedSnapshotRef.current = null;
    recoveryLocalRef.current = null;
    recoveryCloudRef.current = null;
    if (!userId) {
      applyData(DEFAULTS);
      setCloudLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setCloudLoading(true);
      try {
        if (isPreviewMode && userId === "preview-user") {
          const scoped = loadFromStorage<PersistedData | null>(userStorageKey(userId), null);
          // The first preview after the redesign can reuse the finance keys
          // created by the previous project. Once copied, the preview uses a
          // stable account-scoped backup so it will not repeat the import.
          const restored = scoped
            ? normalizeData(scoped)
            : hasLegacyFinanceData()
              ? normalizeData(getLocalData())
              : null;
          applyData(restored ?? DEFAULTS);
          if (restored) {
            saveToLocal(userId, restored);
            lastSavedSnapshotRef.current = JSON.stringify(restored);
          } else {
            lastSavedSnapshotRef.current = null;
          }
          finishHydration(userId, restored ? "saved" : "saving");
          setCloudLoading(false);
          return;
        }
        const { data, error } = await supabase
          .from("user_financial_data")
          .select("data, updated_at")
          .eq("user_id", userId)
          .maybeSingle();
        if (cancelled) return;
        if (error) throw error;
        if (data?.data) {
          const normalized = normalizeData(data.data as Partial<PersistedData>);
          remoteUpdatedAtRef.current = data.updated_at;
          const local = loadFromStorage<PersistedData | null>(userStorageKey(userId), null);
          const localData = local ? normalizeData(local) : null;
          if (localData && JSON.stringify(localData) !== JSON.stringify(normalized) && !isCleanLocalCopy(userId, localData) && !isPreviewMode) {
            recoveryLocalRef.current = localData;
            recoveryCloudRef.current = normalized;
            setLocalRecoveryAvailable(true);
            setCloudLoading(false);
            return;
          }
          // In local preview, prefer the previous project's device copy for
          // inspection. The save effect below is disabled in preview mode, so
          // this never replaces the cloud version.
          const selectedData = isPreviewMode && localData ? localData : normalized;
          applyData(selectedData);
          lastSavedSnapshotRef.current = JSON.stringify(selectedData);
          if (!isPreviewMode) {
            saveToLocal(userId, selectedData);
            rememberCloudSnapshot(userId, lastSavedSnapshotRef.current);
          }
        } else {
          const scoped = loadFromStorage<PersistedData | null>(userStorageKey(userId), null);
          if (scoped) {
            applyData(normalizeData(scoped));
          } else if (localStorage.getItem("fin_banks") !== null) {
            // Legacy keys have no owner, so ask before importing them into an account.
            setLegacyImportAvailable(true);
            setCloudLoading(false);
            return;
          } else {
            applyData(DEFAULTS);
          }
        }
        finishHydration(userId, data?.data ? "saved" : "saving");
      } catch (e) {
        console.error("Failed to load cloud data:", e);
        if (!cancelled) {
          setSyncError("Não foi possível carregar os dados financeiros. Tente novamente.");
          setSyncStatus("error");
        }
      }
      if (!cancelled) setCloudLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId, loadNonce, applyData, finishHydration]);

  // Save to localStorage on changes
  const getPersistedData = useCallback((): PersistedData => ({
    banks: banksRaw,
    cashflowMonths,
    creditors,
    goals,
    incomeSources,
    savingsGoalMonth,
    salary,
    monthlyHours,
    safetyMargin,
    lifeXp,
    lifeTasks,
    transportEntries,
    transportBalance,
  }), [banksRaw, cashflowMonths, creditors, goals, incomeSources, savingsGoalMonth, salary, monthlyHours, safetyMargin, lifeXp, lifeTasks, transportEntries, transportBalance]);

  // Keep a per-user local backup and serialize cloud writes with optimistic locking.
  useEffect(() => {
    if (!userId || hydratedUserId !== userId) return;
    const data = getPersistedData();
    const snapshot = JSON.stringify(data);
    latestSnapshotRef.current = snapshot;
    if (snapshot === lastSavedSnapshotRef.current) return;
    saveToLocal(userId, data);
    if (isPreviewMode) {
      lastSavedSnapshotRef.current = snapshot;
      setSyncStatus("saved");
      setSyncError(null);
      return;
    }
    setSyncStatus("saving");
    setSyncError(null);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveQueueRef.current = saveQueueRef.current.catch(() => undefined).then(async () => {
        if (activeUserIdRef.current !== userId || snapshot === lastSavedSnapshotRef.current) return;
        try {
          const revision = remoteUpdatedAtRef.current;
          const nextRevision = new Date().toISOString();
          const payload = data as unknown as Json;
          const result = revision
            ? await supabase.from("user_financial_data")
                .update({ data: payload, updated_at: nextRevision })
                .eq("user_id", userId).eq("updated_at", revision)
                .select("updated_at").maybeSingle()
            : await supabase.from("user_financial_data")
                .insert({ user_id: userId, data: payload })
                .select("updated_at").maybeSingle();
          if (activeUserIdRef.current !== userId) return;
          if (result.error?.code === "23505") {
            setSyncStatus("conflict");
            setSyncError("Os dados mudaram em outra sessão. Recarregue antes de continuar.");
            return;
          }
          if (result.error) throw result.error;
          if (!result.data) {
            setSyncStatus("conflict");
            setSyncError("Os dados mudaram em outra sessão. Recarregue antes de continuar.");
            return;
          }
          remoteUpdatedAtRef.current = result.data.updated_at;
          lastSavedSnapshotRef.current = snapshot;
          rememberCloudSnapshot(userId, snapshot);
          if (latestSnapshotRef.current === snapshot) setSyncStatus("saved");
        } catch (error) {
          if (activeUserIdRef.current !== userId) return;
          console.error("Failed to save to cloud:", error);
          setSyncStatus("error");
          setSyncError("Falha ao sincronizar. Uma cópia local foi mantida neste dispositivo.");
        }
      });
    }, 2000);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [getPersistedData, userId, hydratedUserId, saveNonce]);

  // Receive bot / other-device changes only when there are no unsaved local edits.
  useEffect(() => {
    if (isPreviewMode || !userId || hydratedUserId !== userId) return;
    let stopped = false;
    let reading = false;
    const refresh = async () => {
      if (reading || stopped || document.visibilityState === "hidden") return;
      reading = true;
      const queriedRevision = remoteUpdatedAtRef.current;
      try {
        const { data, error } = await supabase.from("user_financial_data")
          .select("data, updated_at").eq("user_id", userId).maybeSingle();
        if (stopped || activeUserIdRef.current !== userId || error || !data?.data
          || remoteUpdatedAtRef.current !== queriedRevision || data.updated_at === queriedRevision) return;
        if (latestSnapshotRef.current !== lastSavedSnapshotRef.current) {
          setSyncStatus("conflict");
          setSyncError("Há novos dados na nuvem e alterações neste dispositivo. Confira as duas versões antes de continuar.");
          return;
        }
        const normalized = normalizeData(data.data as Partial<PersistedData>);
        const snapshot = JSON.stringify(normalized);
        remoteUpdatedAtRef.current = data.updated_at;
        lastSavedSnapshotRef.current = snapshot;
        latestSnapshotRef.current = snapshot;
        saveToLocal(userId, normalized);
        rememberCloudSnapshot(userId, snapshot);
        applyData(normalized);
        setSyncStatus("saved");
        setSyncError(null);
      } finally { reading = false; }
    };
    const requestRefresh = () => { void refresh().catch(() => undefined); };
    window.addEventListener("focus", requestRefresh);
    window.addEventListener("segundo-cerebro:finance-refresh", requestRefresh);
    document.addEventListener("visibilitychange", requestRefresh);
    const timer = setInterval(requestRefresh, 60000);
    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener("focus", requestRefresh);
      window.removeEventListener("segundo-cerebro:finance-refresh", requestRefresh);
      document.removeEventListener("visibilitychange", requestRefresh);
    };
  }, [userId, hydratedUserId, applyData]);

  // Derive the full remaining plan balance from installments.
  const banks = banksRaw.map((b) => {
    if (b.status === "cancelado") {
      // Cancelled cards are hidden from calculations: zero out usage and installments
      return { ...b, limitUsed: 0, debtFinal: 0, installments: [] as typeof b.installments };
    }
    const usedFromInstallments = remainingBankDebt(b);
    return { ...b, limitUsed: usedFromInstallments, debtFinal: usedFromInstallments };
  });

  const selectedBank = selectedBankId ? banks.find((b) => b.id === selectedBankId) ?? null : null;
  const setSelectedBank = useCallback((b: Bank | null) => setSelectedBankId(b?.id ?? null), []);

  const currentCashflow = cashflowMonths[selectedMonth];
  const hourlyRate = monthlyHours > 0 ? salary / monthlyHours : 0;
  const dailySavings = savingsGoalMonth > 0 ? savingsGoalMonth / 30 : 0;

  // Compute card installments total for the current cashflow month
  const cardExpensesForMonth = useMemo(() => {
    const monthNum = MONTH_MAP[currentCashflow.month];
    const year = currentCashflow.year;
    if (!monthNum) return 0;
    return cardSpendingForMonth(banks, monthNum, year);
  }, [banks, currentCashflow.month, currentCashflow.year]);

  const totalBankDebt = banks.reduce((sum, b) => sum + b.limitUsed, 0);
  const totalCreditorsDebt = creditors.reduce((s, c) => s + c.totalDebt, 0);
  const totalCreditorsPaid = creditors.reduce((s, c) => s + c.amountPaid, 0);
  const totalCreditorsRemaining = totalCreditorsDebt - totalCreditorsPaid;
  const totalDebt = totalBankDebt + totalCreditorsRemaining;
  const totalIncome = currentCashflow.incomes.reduce((s, i) => s + i.amount, 0);
  const manualExpenses = currentCashflow.expenses.reduce((s, e) => s + e.amount, 0);
  const totalExpense = manualExpenses + cardExpensesForMonth;
  const expectedBalance = totalIncome - totalExpense;
  const phantomBalance = expectedBalance - safetyMargin;
  const avgDailyExpense = totalExpense / 30;
  const survivalDays = avgDailyExpense > 0 ? Math.floor(expectedBalance / avgDailyExpense) : 0;

  const allInstallments = banks
    .flatMap((b) =>
      b.installments.map((inst) => ({ ...inst, bankId: b.id, bankName: b.name, bankColor: b.color }))
    )
    .filter((i) => i.status !== "pago")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const nextMonth = useCallback(() => {
    setSelectedMonth((m) => Math.min(m + 1, cashflowMonths.length - 1));
  }, [cashflowMonths.length]);

  const prevMonth = useCallback(() => {
    setSelectedMonth((m) => Math.max(m - 1, 0));
  }, []);

  const updateBankBalance = useCallback((_bankId: BankId, _newUsed: number) => {}, []);

  const toggleCashflowPaid = useCallback(
    (monthIdx: number, type: "incomes" | "expenses", itemIdx: number) => {
      setCashflowMonths((prev) =>
        prev.map((m, mi) => {
          if (mi !== monthIdx) return m;
          const items = [...m[type]];
          items[itemIdx] = { ...items[itemIdx], paid: !items[itemIdx].paid };
          return { ...m, [type]: items };
        })
      );
    },
    []
  );

  const depositToGoal = useCallback((goalId: string, amount: number) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId
          ? { ...g, savedAmount: Math.min(g.savedAmount + amount, g.targetAmount) }
          : g
      )
    );
  }, []);

  const addCashflowItem = useCallback((monthIdx: number, type: "incomes" | "expenses", label: string, amount: number, category?: string) => {
    setCashflowMonths((prev) =>
      prev.map((m, mi) => {
        if (mi !== monthIdx) return m;
        return { ...m, [type]: [...m[type], { label, amount, paid: false, category }] };
      })
    );
  }, []);

  const removeCashflowItem = useCallback((monthIdx: number, type: "incomes" | "expenses", itemIdx: number) => {
    setCashflowMonths((prev) =>
      prev.map((m, mi) => {
        if (mi !== monthIdx) return m;
        const items = m[type].filter((_, i) => i !== itemIdx);
        return { ...m, [type]: items };
      })
    );
  }, []);

  const updateCashflowItem = useCallback((monthIdx: number, type: "incomes" | "expenses", itemIdx: number, label: string, amount: number, category?: string) => {
    setCashflowMonths((prev) =>
      prev.map((m, mi) => {
        if (mi !== monthIdx) return m;
        const items = [...m[type]];
        items[itemIdx] = { ...items[itemIdx], label, amount, ...(category !== undefined ? { category } : {}) };
        return { ...m, [type]: items };
      })
    );
  }, []);

  const setCashflowItemFixed = useCallback((monthIdx: number, type: "incomes" | "expenses", itemIdx: number, fixed: boolean) => {
    setCashflowMonths((prev) =>
      prev.map((m, mi) => {
        if (mi !== monthIdx) return m;
        const items = [...m[type]];
        items[itemIdx] = { ...items[itemIdx], fixed };
        return { ...m, [type]: items };
      })
    );
  }, []);

  const replicateFixedItem = useCallback((monthIdx: number, type: "incomes" | "expenses", itemIdx: number) => {
    setCashflowMonths((prev) => {
      const source = prev[monthIdx]?.[type]?.[itemIdx];
      if (!source) return prev;
      return prev.map((m, mi) => {
        if (mi <= monthIdx) {
          if (mi === monthIdx) {
            const items = [...m[type]];
            items[itemIdx] = { ...items[itemIdx], fixed: true };
            return { ...m, [type]: items };
          }
          return m;
        }
        // skip if exact label already exists
        const exists = m[type].some((it) => it.label.trim().toLowerCase() === source.label.trim().toLowerCase());
        if (exists) return m;
        const newItem: CashflowItem = {
          label: source.label,
          amount: source.amount,
          category: source.category,
          fixed: true,
          paid: false,
        };
        return { ...m, [type]: [...m[type], newItem] };
      });
    });
  }, []);

  const addCreditor = useCallback((name: string, totalDebt: number) => {
    setCreditors((prev) => [...prev, { id: `cr-${Date.now()}`, name, totalDebt, amountPaid: 0 }]);
  }, []);

  const removeCreditor = useCallback((id: string) => {
    setCreditors((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateCreditor = useCallback((id: string, updates: Partial<Pick<Creditor, "name" | "totalDebt" | "amountPaid">>) => {
    setCreditors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  }, []);

  const addGoal = useCallback((title: string, targetAmount: number) => {
    const colors = ["265 80% 50%", "145 63% 42%", "45 100% 50%", "27 100% 50%", "200 80% 50%"];
    const emojis = ["🎯", "💰", "🌟", "🏆", "🚀"];
    const idx = goals.length % colors.length;
    setGoals((prev) => [
      ...prev,
      { id: `g-${Date.now()}`, title, targetAmount, savedAmount: 0, image: emojis[idx], color: colors[idx] },
    ]);
  }, [goals.length]);

  const removeGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const updateGoal = useCallback((id: string, updates: Partial<Pick<Goal, "title" | "targetAmount" | "image">>) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
    );
  }, []);

  const updateBank = useCallback((bankId: BankId, updates: Partial<Pick<Bank, "name" | "limitTotal" | "status" | "color" | "glowClass">>) => {
    setBanks((prev) => prev.map((b) => (b.id === bankId ? { ...b, ...updates } : b)));
  }, []);

  const removeBank = useCallback((bankId: BankId) => {
    setBanks((prev) => prev.filter((b) => b.id !== bankId));
  }, []);

  const addBank = useCallback((name: string, limitTotal: number, color: string, glowClass: string) => {
    const id = `bank-${Date.now()}` as BankId;
    setBanks((prev) => [...prev, {
      id, name, color, glowClass, limitTotal, limitUsed: 0, debtFinal: 0,
      status: "pendente" as const, installments: [],
    }]);
  }, []);

  const moveBank = useCallback((bankId: BankId, targetId: BankId) => {
    setBanks((prev) => {
      const from = prev.findIndex((b) => b.id === bankId);
      const to = prev.findIndex((b) => b.id === targetId);
      if (from < 0 || to < 0 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const addInstallment = useCallback((bankId: BankId, inst: Omit<import("@/data/financialData").Installment, "id">) => {
    setBanks((prev) => prev.map((b) => {
      if (b.id !== bankId) return b;
      const newInst = { ...inst, id: `${bankId}-${Date.now()}` };
      return { ...b, installments: [...b.installments, newInst] };
    }));
  }, []);

  const removeInstallment = useCallback((bankId: BankId, installmentId: string) => {
    setBanks((prev) => prev.map((b) => {
      if (b.id !== bankId) return b;
      return { ...b, installments: b.installments.filter((i) => i.id !== installmentId) };
    }));
  }, []);

  const updateInstallment = useCallback((bankId: BankId, installmentId: string, updates: Partial<Omit<import("@/data/financialData").Installment, "id">>) => {
    setBanks((prev) => prev.map((b) => {
      if (b.id !== bankId) return b;
      return { ...b, installments: b.installments.map((i) => (i.id === installmentId ? { ...i, ...updates } : i)) };
    }));
  }, []);

  const addIncomeSource = useCallback((label: string, amount: number) => {
    setIncomeSources((prev) => [...prev, { id: `inc-${Date.now()}`, label, amount }]);
  }, []);

  const removeIncomeSource = useCallback((id: string) => {
    setIncomeSources((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const updateIncomeSource = useCallback((id: string, updates: Partial<Pick<IncomeSource, "label" | "amount">>) => {
    setIncomeSources((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }, []);

  const addLifeTask = useCallback((title: string, xpReward: number) => {
    setLifeTasks((prev) => [...prev, { id: `lt-${Date.now()}`, title, xpReward, completedThisWeek: false }]);
  }, []);

  const removeLifeTask = useCallback((id: string) => {
    setLifeTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const completeLifeTask = useCallback((id: string) => {
    setLifeTasks((prev) => prev.map((t) => {
      if (t.id === id && !t.completedThisWeek) {
        setLifeXp((xp) => xp + t.xpReward);
        return { ...t, completedThisWeek: true };
      }
      return t;
    }));
  }, []);

  const resetWeeklyTasks = useCallback(() => {
    setLifeTasks((prev) => prev.map((t) => ({ ...t, completedThisWeek: false })));
  }, []);

  const addTransportEntry = useCallback((entry: Omit<TransportEntry, "id">) => {
    setTransportEntries((prev) => [{ ...entry, id: `t-${Date.now()}` }, ...prev]);
  }, []);

  const removeTransportEntry = useCallback((id: string) => {
    setTransportEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return {
    banks, cashflowMonths, creditors, goals, monthlySnapshots: [], incomeSources,
    selectedMonth, selectedBank, currentCashflow,
    totalDebt, totalIncome, totalExpense, cardExpensesForMonth, expectedBalance,
    totalCreditorsDebt, totalCreditorsPaid, savingsGoalMonth,
    allInstallments,
    setSelectedMonth, setSelectedBank, nextMonth, prevMonth,
    updateBankBalance, toggleCashflowPaid, depositToGoal,
    addCashflowItem, removeCashflowItem, updateCashflowItem, setCashflowItemFixed, replicateFixedItem,
    addCreditor, removeCreditor, updateCreditor,
    addGoal, removeGoal, updateGoal,
    updateBank, removeBank, addBank, moveBank, addInstallment, removeInstallment, updateInstallment,
    setSavingsGoalMonth, addIncomeSource, removeIncomeSource, updateIncomeSource,
    salary, monthlyHours, hourlyRate, safetyMargin, dailySavings,
    phantomBalance, survivalDays,
    setSalary, setMonthlyHours, setSafetyMargin,
    lifeXp, lifeTasks, addLifeTask, removeLifeTask, completeLifeTask, resetWeeklyTasks,
    transportEntries, transportBalance, addTransportEntry, removeTransportEntry, setTransportBalance,
    cloudLoading, cloudReady: hydratedUserId === userId, syncStatus, syncError, retryCloudLoad, retryCloudSave,
    legacyImportAvailable, importLegacyData, dismissLegacyImport,
    localRecoveryAvailable, useLocalRecovery, useCloudRecovery,
    legacyModuleImportAvailable, importLegacyModules, dismissLegacyModules,
  };
}

const FinanceContext = createContext<FinanceStore | null>(null as FinanceStore | null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const store = useFinanceStoreInternal();
  return <FinanceContext.Provider value={store}>{children}</FinanceContext.Provider>;
}

export function useFinanceStore(): FinanceStore {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinanceStore must be used within FinanceProvider");
  return ctx;
}

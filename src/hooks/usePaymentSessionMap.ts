import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useAuth } from "@/hooks/useAuth";
import { accountStorageKey, writeAccountJson } from "@/lib/accountStorage";
import { PAYMENT_SESSION_STORAGE_KEY, type PaymentSessionMap } from "@/lib/monthlyCashflowChart";

const CHANGED = "payment-session-map-changed";
/** Retains existing account keys; charts and assignment controls share live updates. */
export function usePaymentSessionMap() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const key = accountStorageKey(userId, PAYMENT_SESSION_STORAGE_KEY);
  const subscribe = useCallback((notify: () => void) => {
    const storage = (event: StorageEvent) => { if (event.key === key || event.key === null) notify(); };
    window.addEventListener(CHANGED, notify); window.addEventListener("storage", storage);
    return () => { window.removeEventListener(CHANGED, notify); window.removeEventListener("storage", storage); };
  }, [key]);
  const snapshot = useCallback(() => { try { return userId ? localStorage.getItem(key) ?? "{}" : "{}"; } catch { return "{}"; } }, [userId, key]);
  const raw = useSyncExternalStore(subscribe, snapshot, () => "{}");
  const map = useMemo<PaymentSessionMap>(() => { try { const parsed = JSON.parse(raw); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; } }, [raw]);
  const assign = useCallback((entryKey: string, session: PaymentSessionMap[string]) => {
    if (!userId) return;
    writeAccountJson(userId, PAYMENT_SESSION_STORAGE_KEY, { ...map, [entryKey]: session });
    window.dispatchEvent(new Event(CHANGED));
  }, [userId, map]);
  return { map, assign };
}

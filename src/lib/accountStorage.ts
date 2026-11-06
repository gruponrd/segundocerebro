import { isAccountPreview } from "@/lib/previewMode";

export const LEGACY_MODULE_KEYS = [
  "fin_trades",
  "fin_wishes_v1",
  "fin_dreamboard",
  "payment-session-income-map-v1",
  "neuro-recovery-v1",
  "routine-store-v1",
  "fin_mobile_notif_prefs",
] as const;

export function accountStorageKey(userId: string, key: string): string {
  return isAccountPreview ? `fin_design_account_${userId}_${key}` : `fin_account_${userId}_${key}`;
}

export function readAccountJson<T>(userId: string, key: string, fallback: T): T {
  if (!userId) return fallback;
  try {
    const raw = localStorage.getItem(accountStorageKey(userId, key));
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

export function writeAccountJson(userId: string, key: string, value: unknown): void {
  if (!userId) return;
  const storageKey = accountStorageKey(userId, key);
  const raw = JSON.stringify(value);
  if (localStorage.getItem(storageKey) === raw) return;
  localStorage.setItem(storageKey, raw);
  window.dispatchEvent(new CustomEvent("personal-module-changed", { detail: { userId, key } }));
}

export function hasLegacyModuleData(): boolean {
  return LEGACY_MODULE_KEYS.some((key) => localStorage.getItem(key) !== null);
}

export function importLegacyModuleData(userId: string): void {
  for (const key of LEGACY_MODULE_KEYS) {
    const legacy = localStorage.getItem(key);
    if (legacy !== null && localStorage.getItem(accountStorageKey(userId, key)) === null) {
      localStorage.setItem(accountStorageKey(userId, key), legacy);
    }
  }
}

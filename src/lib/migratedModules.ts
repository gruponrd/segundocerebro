import { accountStorageKey, LEGACY_MODULE_KEYS } from "@/lib/accountStorage";
import { isAccountPreview } from "@/lib/previewMode";

export function migratedModulesMarker(userId: string, name = "migrated_modules_restored") {
  return `${isAccountPreview ? "fin_design" : "fin"}_${name}_${userId}`;
}

export function restoreMigratedModules(userId: string, modules: unknown, storage: Pick<Storage, "getItem" | "setItem">) {
  if (!userId || !modules || typeof modules !== "object" || Array.isArray(modules)) throw new Error("Cópia de módulos inválida.");
  const pending: Array<[string, string]> = [];
  for (const key of LEGACY_MODULE_KEYS) {
    const raw = (modules as Record<string, unknown>)[key];
    if (raw === undefined) continue;
    if (typeof raw !== "string") throw new Error("Cópia de módulos inválida.");
    JSON.parse(raw);
    const target = accountStorageKey(userId, key);
    if (storage.getItem(target) === null) pending.push([target, raw]);
  }
  // Validate every entry first. Never replace newer data on this device.
  for (const [key, raw] of pending) storage.setItem(key, raw);
  storage.setItem(migratedModulesMarker(userId, "legacy_modules_reviewed"), "1");
  storage.setItem(migratedModulesMarker(userId), "1");
}

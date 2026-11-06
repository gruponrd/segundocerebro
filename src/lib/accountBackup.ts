import { accountStorageKey, LEGACY_MODULE_KEYS } from "@/lib/accountStorage";
import type { Json } from "@/integrations/supabase/types";

export interface FinancialBackupRow {
  user_id: string;
  data: Json;
  updated_at: string;
}

// Read only known data keys owned by this account. Never collect sessions,
// unassigned legacy data, or values belonging to a different user.
export function createAccountBackup(row: FinancialBackupRow, displayName: string, storage: Pick<Storage, "getItem">) {
  if (!row.user_id || !row.data || typeof row.data !== "object" || Array.isArray(row.data)) {
    throw new Error("Não foi possível obter os registros financeiros desta conta.");
  }
  const modules: Record<string, string> = {};
  for (const key of LEGACY_MODULE_KEYS) {
    const raw = storage.getItem(accountStorageKey(row.user_id, key));
    if (raw !== null) modules[key] = raw;
  }
  return {
    format: "segundo-cerebro-account-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    account: { userId: row.user_id, displayName },
    financial: row,
    local: { financialCache: storage.getItem(`fin_user_${row.user_id}`), modules },
    scope: {
      financial: "Cloud record preserved without normalization",
      modules: "Account data available in the exporting browser only",
      authentication: "Passwords, tokens and sessions are not included",
      files: "Referenced image URLs are preserved; image files are not embedded",
    },
  };
}

/** Inspect an export without changing either cloud or browser state. */
export function inspectAccountBackup(content: string, userId: string) {
  if (content.length > 10_000_000) throw new Error("O arquivo excede o limite de 10 MB.");
  let parsed: unknown;
  try { parsed = JSON.parse(content); } catch { throw new Error("O arquivo não contém JSON válido."); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Backup inválido.");
  const backup = parsed as { format?: unknown; version?: unknown; account?: { userId?: unknown }; financial?: { user_id?: unknown; data?: unknown }; local?: { modules?: unknown }; exportedAt?: unknown };
  if (backup.format !== "segundo-cerebro-account-backup" || backup.version !== 1 || backup.account?.userId !== userId || backup.financial?.user_id !== userId) throw new Error("Este backup não pertence à conta conectada ou tem formato incompatível.");
  if (!backup.financial.data || typeof backup.financial.data !== "object" || Array.isArray(backup.financial.data)) throw new Error("Os dados financeiros do backup são inválidos.");
  const source = backup.local?.modules;
  if (source !== undefined && (!source || typeof source !== "object" || Array.isArray(source))) throw new Error("Os módulos do backup são inválidos.");
  const modules: Record<string, string> = {};
  for (const key of LEGACY_MODULE_KEYS) {
    const raw = (source as Record<string, unknown> | undefined)?.[key];
    if (raw === undefined) continue;
    if (typeof raw !== "string") throw new Error("Um módulo do backup é inválido.");
    let value: unknown;
    try { value = JSON.parse(raw); } catch { throw new Error("Um módulo do backup é inválido."); }
    if (!value || typeof value !== "object") throw new Error("Um módulo do backup é inválido.");
    modules[key] = raw;
  }
  return { exportedAt: typeof backup.exportedAt === "string" ? backup.exportedAt : "", modules, financial: backup.financial.data };
}

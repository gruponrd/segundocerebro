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

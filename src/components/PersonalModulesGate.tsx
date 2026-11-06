import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { accountStorageKey } from "@/lib/accountStorage";
import { isPreviewMode } from "@/lib/previewMode";
import { decideModuleSync, moduleDigest, SYNCED_MODULE_KEYS, type ModuleKey } from "@/lib/personalModuleSync";
import type { Json } from "@/integrations/supabase/types";

const labels: Record<ModuleKey, string> = { fin_wishes_v1: "Desejos", fin_dreamboard: "Dream Board", "neuro-recovery-v1": "LifeGame", "routine-store-v1": "Rotina", "payment-session-income-map-v1": "Datas de pagamentos" };

export function PersonalModulesGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const userId = user?.id;
  const [ready, setReady] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ModuleKey[]>([]);
  const [offline, setOffline] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!userId || isPreviewMode) return;
    const id = userId;
    let active = true;
    let initialized = false;
    let running = false;
    const timeout = window.setTimeout(() => { if (active && !initialized) { active = false; setOffline(true); setReady(id); } }, 12000);
    const pending = new Set<ModuleKey>();
    const conflictKeys = new Set<ModuleKey>();
    const checkpointKey = (key: ModuleKey) => `fin_module_sync_${id}_${key}`;
    const saveCheckpoint = (key: ModuleKey, digest: string) => localStorage.setItem(checkpointKey(key), digest);
    const reconcile = async (key: ModuleKey) => {
      const storageKey = accountStorageKey(id, key);
      const { data: row, error } = await supabase.from("personal_module_data").select("data,revision").eq("user_id", id).eq("module_key", key).maybeSingle();
      if (error) throw error;
      if (!active) return;
      const localRaw = localStorage.getItem(storageKey);
      const remoteRaw = row ? JSON.stringify(row.data) : null;
      const localHash = localRaw === null ? null : await moduleDigest(localRaw);
      const remoteHash = remoteRaw === null ? null : await moduleDigest(remoteRaw);
      if (!active) return;
      const decision = decideModuleSync(localHash, remoteHash, localStorage.getItem(checkpointKey(key)));
      if (decision === "conflict") { conflictKeys.add(key); return; }
      if (decision === "equal") { if (localHash) saveCheckpoint(key, localHash); conflictKeys.delete(key); return; }
      if (decision === "empty") { conflictKeys.delete(key); return; }
      if (decision === "download") {
        // Mounted modules hold their own state. Never replace their storage behind
        // those components; a reload will hydrate the newer copy before mounting.
        if (initialized) { conflictKeys.add(key); return; }
        if (localStorage.getItem(storageKey) !== localRaw) { pending.add(key); return; }
        localStorage.setItem(storageKey, remoteRaw!);
        saveCheckpoint(key, remoteHash!);
        conflictKeys.delete(key);
        window.dispatchEvent(new StorageEvent("storage", { key: storageKey }));
        return;
      }
      if (localRaw === null) throw new Error("Cópia local indisponível");
      const revision = crypto.randomUUID();
      const payload = { data: JSON.parse(localRaw) as Json, revision, updated_at: new Date().toISOString() };
      const result = row
        ? await supabase.from("personal_module_data").update(payload).eq("user_id", id).eq("module_key", key).eq("revision", row.revision).select("revision").maybeSingle()
        : await supabase.from("personal_module_data").insert({ ...payload, user_id: id, module_key: key }).select("revision").maybeSingle();
      if (!active) return;
      if (result.error) {
        if (!row && result.error.code === "23505") { pending.add(key); return; }
        throw result.error;
      }
      if (!result.data) { pending.add(key); return; }
      saveCheckpoint(key, localHash!);
      conflictKeys.delete(key);
      if (localStorage.getItem(storageKey) !== localRaw) pending.add(key);
    };
    const drain = async () => {
      if (running || !active) return;
      running = true;
      try {
        while (active && pending.size) {
          const key = pending.values().next().value as ModuleKey;
          pending.delete(key);
          await reconcile(key);
        }
        if (active) { setOffline(false); setConflicts([...conflictKeys]); }
      } catch { if (active) setOffline(true); }
      finally { running = false; if (active && !initialized) { initialized = true; window.clearTimeout(timeout); setReady(id); } }
    };
    const changed = (event: Event) => {
      const { userId, key } = (event as CustomEvent<{ userId: string; key: string }>).detail;
      if (userId === id && SYNCED_MODULE_KEYS.includes(key as ModuleKey)) { pending.add(key as ModuleKey); void drain(); }
    };
    const storage = (event: StorageEvent) => {
      const key = SYNCED_MODULE_KEYS.find(item => event.key === accountStorageKey(id, item));
      if (key) { pending.add(key); void drain(); }
    };
    const focus = () => { for (const key of SYNCED_MODULE_KEYS) pending.add(key); void drain(); };
    setReady(null); setOffline(false); setConflicts([]);
    window.addEventListener("personal-module-changed", changed);
    window.addEventListener("storage", storage);
    window.addEventListener("focus", focus);
    for (const key of SYNCED_MODULE_KEYS) pending.add(key);
    void drain();
    return () => { active = false; window.clearTimeout(timeout); window.removeEventListener("personal-module-changed", changed); window.removeEventListener("storage", storage); window.removeEventListener("focus", focus); };
  }, [userId, retry]);
  if (!user || loading || isPreviewMode) return children;
  if (ready !== user.id) return <main className="flex min-h-screen items-center justify-center bg-background p-6">Carregando seus módulos pessoais…</main>;
  return <>{(offline || conflicts.length > 0) && <div role="status" className="bg-amber-100 px-4 py-3 text-center text-sm text-amber-950">{offline ? "Módulos pessoais ainda não sincronizados. Os dados deste dispositivo continuam aqui. " : `Existem versões diferentes em ${conflicts.map(key => labels[key]).join(", ")}. Nenhuma foi substituída. Faça uma cópia em Ferramentas e revise antes de trocar de dispositivo. `}<button type="button" className="underline" onClick={() => setRetry(value => value + 1)}>Tentar novamente</button></div>}{children}</>;
}

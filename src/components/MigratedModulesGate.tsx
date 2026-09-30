import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { restoreMigratedModules } from "@/lib/migratedModules";
import { isPreviewMode } from "@/lib/previewMode";

export function MigratedModulesGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [readyUser, setReadyUser] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const enabled = !isPreviewMode && import.meta.env.VITE_ACCOUNT_MODULE_BOOTSTRAP === "true";
  useEffect(() => {
    if (!enabled || !user) return;
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    setError(false);
    const load = async () => {
      try {
        if (localStorage.getItem(`fin_migrated_modules_restored_${user.id}`) !== "1") {
          const { data, error: fetchError } = await supabase.from("account_migration_modules")
            .select("modules").eq("user_id", user.id).abortSignal(controller.signal).maybeSingle();
          if (cancelled) return;
          if (fetchError) throw fetchError;
          if (data) restoreMigratedModules(user.id, data.modules, localStorage);
        }
        if (!cancelled) setReadyUser(user.id);
      } catch { if (!cancelled) setError(true); }
      finally { clearTimeout(timer); }
    };
    void load();
    return () => { cancelled = true; controller.abort(); clearTimeout(timer); };
  }, [enabled, user, retry]);
  if (!enabled || !user || loading || readyUser === user.id) return children;
  return <main className="flex min-h-screen items-center justify-center bg-background p-6">
    <div className="max-w-md space-y-4 rounded-2xl border border-border bg-card p-6 text-center">
      <p>{error ? "Não foi possível recuperar os dados migrados de Trade, Desejos e rotina neste dispositivo." : "Recuperando seus dados migrados…"}</p>
      {error && <button className="rounded-xl bg-primary px-4 py-2 text-primary-foreground" onClick={() => setRetry(value => value + 1)}>Tentar novamente</button>}
    </div>
  </main>;
}

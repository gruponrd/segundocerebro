import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { accountStorageKey } from "@/lib/accountStorage";
import { moduleDigest } from "@/lib/personalModuleSync";
import { mergeLifeGameCopies } from "@/lib/lifeGameReconcile";
import { journeyToday, validJourneyDate } from "@/lib/lifeGameDates";

const key = "neuro-recovery-v1";
export function LifeGameConflictResolver({ userId, onResolved }: { userId: string; onResolved: () => void }) {
  const [open, setOpen] = useState(false), [date, setDate] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const resolve = async () => {
    if (!validJourneyDate(date) || date > journeyToday() || busy) return;
    setBusy(true); setError("");
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user?.id !== userId) throw new Error("A conta mudou. Entre novamente e tente outra vez.");
      const storageKey = accountStorageKey(userId, key);
      const localRaw = localStorage.getItem(storageKey);
      const { data: row, error: readError } = await supabase.from("personal_module_data").select("data,revision").eq("user_id", userId).eq("module_key", key).maybeSingle();
      if (readError || !row || !localRaw) throw new Error("Não foi possível ler as duas cópias. Elas permanecem intactas.");
      const merged = mergeLifeGameCopies(JSON.parse(localRaw), row.data, date);
      const backupKey = `fin_lifegame_conflict_backup_${userId}_${crypto.randomUUID()}`;
      localStorage.setItem(backupKey, JSON.stringify({ local: JSON.parse(localRaw), cloud: row.data, cloudRevision: row.revision }));
      if (localStorage.getItem(storageKey) !== localRaw) throw new Error("Os dados deste dispositivo mudaram. Tente novamente para revisar a versão atual.");
      const revision = crypto.randomUUID();
      const { data, error: saveError } = await supabase.from("personal_module_data").update({ data: merged, revision, updated_at: new Date().toISOString() }).eq("user_id", userId).eq("module_key", key).eq("revision", row.revision).select("revision").maybeSingle();
      if (saveError || !data) throw new Error("A cópia da nuvem mudou ou não pôde ser salva. Tente novamente; as cópias foram preservadas.");
      if (localStorage.getItem(storageKey) !== localRaw) throw new Error("A cópia deste dispositivo mudou durante o salvamento. Tente novamente; as cópias foram preservadas.");
      const raw = JSON.stringify(merged);
      localStorage.setItem(storageKey, raw);
      localStorage.setItem(`fin_module_sync_${userId}_${key}`, await moduleDigest(raw));
      onResolved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível sincronizar o LifeGame."); }
    finally { setBusy(false); }
  };
  return <div className="mx-auto mt-2 max-w-xl">{!open ? <button type="button" className="underline" onClick={() => setOpen(true)}>Corrigir data do LifeGame</button> : <div className="flex flex-wrap items-end justify-center gap-2"><label className="text-left">Data correta de início<input aria-label="Data correta do LifeGame" className="ml-2 rounded border border-amber-800 bg-white px-2 py-1 text-black" type="date" max={journeyToday()} value={date} onChange={event => setDate(event.target.value)} /></label><button type="button" className="rounded bg-amber-950 px-3 py-2 text-white disabled:opacity-50" disabled={busy || !validJourneyDate(date) || date > journeyToday()} onClick={() => void resolve()}>{busy ? "Sincronizando…" : "Salvar data e sincronizar"}</button><button type="button" className="underline" disabled={busy} onClick={() => setOpen(false)}>Cancelar</button><p className="w-full">As conquistas e o recorde das duas cópias serão preservados. A data será atualizada nesta conta.</p>{error && <p role="alert" className="w-full font-semibold">{error}</p>}</div>}</div>;
}

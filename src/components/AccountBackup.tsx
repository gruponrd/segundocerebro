import { useState } from "react";
import { Copy, Download, FileJson, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFinanceStore } from "@/stores/financeStore";
import { toast } from "@/hooks/use-toast";
import { createAccountBackup } from "@/lib/accountBackup";
import { isPreviewMode } from "@/lib/previewMode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function AccountBackup() {
  const { user, displayName } = useAuth();
  const { cloudReady, syncStatus, localRecoveryAvailable } = useFinanceStore();
  const [busy, setBusy] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [visibleBackup, setVisibleBackup] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);
  const ready = !isPreviewMode && !!user && cloudReady && syncStatus === "saved" && !localRecoveryAvailable;

  async function download(mode: "download" | "copy" | "view" = "download") {
    if (!ready || !user || busy) return;
    setBusy(true);
    setDownloaded(false);
    setCopied(false);
    try {
      const { data: identity, error: authError } = await supabase.auth.getUser();
      if (authError || identity.user?.id !== user.id) throw new Error("Entre novamente antes de exportar seus dados.");
      const { data, error } = await supabase.from("user_financial_data")
        .select("user_id,data,updated_at").eq("user_id", user.id).single();
      if (error || !data) throw new Error("Não foi possível ler o backup salvo na nuvem. Tente novamente.");
      const backup = createAccountBackup(data, displayName, localStorage);
      const { data: current } = await supabase.auth.getSession();
      if (current.session?.user.id !== user.id) throw new Error("A conta mudou durante a exportação. Tente novamente.");
      const content = JSON.stringify(backup, null, 2);
      if (mode === "view") { setVisibleBackup(content); setViewerOpen(true); return; }
      if (mode === "copy") {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        toast({ title: "Backup JSON copiado", description: "Cole o conteúdo em um arquivo para guardar a cópia." });
        return;
      }
      const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `segundo-cerebro-backup-${backup.exportedAt.replace(/[:.]/g, "-")}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setDownloaded(true);
      toast({ title: "Download do backup iniciado", description: "Guarde o arquivo JSON para preservar seus registros." });
    } catch (error) {
      toast({ title: "Não foi possível exportar", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" });
    } finally { setBusy(false); }
  }

  return (
    <section className="glass-card p-5 sm:p-6" aria-labelledby="backup-title">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <h2 id="backup-title" className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="h-5 w-5 text-primary" /> Cópia dos seus dados</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Baixe os registros financeiros salvos na nuvem, incluindo cartões, parcelas, receitas, despesas e objetivos. A cópia preserva os identificadores e valores originais.</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Inclui também os dados de Trade, Desejos e rotina desta conta disponíveis neste navegador. Senhas e sessões não são incluídas. As imagens permanecem como links.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
        <Button onClick={() => void download()} disabled={!ready || busy} className="gap-2 rounded-xl">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{busy ? "Preparando…" : "Baixar backup JSON"}
        </Button>
        <Button variant="outline" onClick={() => void download("copy")} disabled={!ready || busy} className="gap-2 rounded-xl"><Copy className="h-4 w-4" /> Copiar backup JSON</Button>
        <Button variant="ghost" onClick={() => void download("view")} disabled={!ready || busy} className="gap-2 rounded-xl"><FileJson className="h-4 w-4" /> Visualizar backup</Button>
        </div>
      </div>
      {!ready && <p role="status" className="mt-4 text-xs text-muted-foreground">{isPreviewMode ? "A exportação está disponível no aplicativo publicado, após o login." : "Aguarde a sincronização ou resolva a recuperação de dados antes de baixar o backup."}</p>}
      {downloaded && <p role="status" className="mt-4 text-xs text-income">Download iniciado. Confira o arquivo na pasta de downloads do seu dispositivo.</p>}
      {copied && <p role="status" className="mt-4 text-xs text-income">Backup JSON copiado para a área de transferência.</p>}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogTitle>Backup da sua conta</DialogTitle>
          <DialogDescription>Conteúdo completo da cópia, para conferir ou salvar manualmente. Contém seus registros pessoais.</DialogDescription>
          <textarea aria-label="Conteúdo do backup JSON" readOnly value={visibleBackup} className="h-[55vh] w-full resize-none rounded-xl border border-border bg-background p-3 font-mono text-xs" />
        </DialogContent>
      </Dialog>
    </section>
  );
}

import { useState } from "react";
import { Copy, Download, FileJson, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFinanceStore } from "@/stores/financeStore";
import { toast } from "@/hooks/use-toast";
import { createAccountBackup, inspectAccountBackup } from "@/lib/accountBackup";
import { accountStorageKey } from "@/lib/accountStorage";
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
  const [review, setReview] = useState<ReturnType<typeof inspectAccountBackup> | null>(null);
  const [reviewError, setReviewError] = useState("");
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

  async function reviewFile(file: File | undefined) {
    setReview(null); setReviewError("");
    if (!file || !user) return;
    try {
      if (file.size > 10_000_000) throw new Error("O arquivo excede o limite de 10 MB.");
      const inspected = inspectAccountBackup(await file.text(), user.id);
      setReview(inspected);
    } catch (error) { setReviewError(error instanceof Error ? error.message : "Não foi possível abrir o backup."); }
  }

  function restoreMissingModules() {
    if (!review || !user) return;
    try {
      let restored = 0;
      for (const [key, raw] of Object.entries(review.modules)) {
        const target = accountStorageKey(user.id, key);
        if (localStorage.getItem(target) === null) { localStorage.setItem(target, raw); restored++; }
      }
      setReview(null);
      toast({ title: `${restored} módulo(s) recuperado(s) neste dispositivo`, description: "Atualize a página para carregar as informações recuperadas." });
    } catch { setReviewError("Não foi possível concluir a recuperação. Confira o espaço disponível neste dispositivo; as cópias existentes foram preservadas."); }
  }

  return (
    <section className="glass-card p-5 sm:p-6" aria-labelledby="backup-title">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <h2 id="backup-title" className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="h-5 w-5 text-primary" /> Cópia dos seus dados</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Baixe os registros financeiros salvos na nuvem, incluindo cartões, parcelas, receitas, despesas e objetivos. A cópia preserva os identificadores e valores originais.</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Inclui também os dados atuais e históricos dos módulos pessoais desta conta disponíveis neste navegador. Senhas e sessões não são incluídas. As imagens permanecem como links.</p>
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
      <div className="mt-5 border-t border-border pt-4">
        <h3 className="font-medium">Conferir uma cópia</h3>
        <p className="mt-1 text-sm text-muted-foreground">Escolha um backup desta conta para verificar seu conteúdo. A conferência não altera dados.</p>
        <input aria-label="Escolher backup JSON" className="mt-3 block max-w-full text-sm" type="file" accept=".json,application/json" onChange={event => void reviewFile(event.target.files?.[0])} />
        {reviewError && <p role="alert" className="mt-2 text-sm text-destructive">{reviewError}</p>}
        {review && <div className="mt-3 space-y-2 text-sm"><p>Backup da conta conectada{review.exportedAt ? ` · ${new Date(review.exportedAt).toLocaleString("pt-BR")}` : ""}. Contém dados financeiros e {Object.keys(review.modules).length} módulo(s) deste navegador.</p><p className="text-muted-foreground">Você pode recuperar apenas módulos ausentes neste dispositivo. Os registros existentes e os dados financeiros na nuvem não serão substituídos.</p><Button type="button" variant="outline" disabled={!Object.keys(review.modules).some(key => localStorage.getItem(accountStorageKey(user!.id, key)) === null)} onClick={restoreMissingModules}>Recuperar módulos ausentes</Button></div>}
      </div>
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

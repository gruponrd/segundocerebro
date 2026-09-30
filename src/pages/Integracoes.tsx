import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, ExternalLink, Link2, Loader2, MessageCircle, RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { isPreviewMode } from "@/lib/previewMode";
import { money } from "@/lib/planningTools";

interface TelegramHistory { id: string; kind: string; amount: number; label: string; month: number; year: number; saved_at: string }
interface ConnectionStatus { configured: boolean; connected: boolean; botUsername: string; username?: string; history: TelegramHistory[] }
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const FINANCE_REFRESH = "segundo-cerebro:finance-refresh";

async function accountAction<T>(action: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke("telegram-account", { body: { action } });
  if (error) {
    let message = "Não foi possível acessar o Telegram. A ativação no servidor pode ainda estar pendente.";
    if (error.context instanceof Response) {
      try { message = (await error.context.json()).error ?? message; } catch { /* Network failure has no JSON body. */ }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export default function IntegracoesPage() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pairing, setPairing] = useState<{ url: string; expiresAt: string } | null>(null);
  const [now, setNow] = useState(Date.now());
  const lastSavedId = useRef<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const next = isPreviewMode
        ? { configured: false, connected: false, botUsername: "SecondB2Bot", history: [] }
        : await accountAction<ConnectionStatus>("status");
      if (!mounted.current) return;
      setStatus(next);
      setError("");
      if (next.connected) setPairing(null);
      const latest = next.history[0]?.id ?? null;
      if (latest && lastSavedId.current !== latest) window.dispatchEvent(new Event(FINANCE_REFRESH));
      lastSavedId.current = latest;
    } catch (e) {
      if (mounted.current && !silent) setError(e instanceof Error ? e.message : "Não foi possível atualizar.");
    } finally { if (mounted.current && !silent) setLoading(false); }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const focus = () => { void refresh(true); };
    window.addEventListener("focus", focus);
    return () => { mounted.current = false; window.removeEventListener("focus", focus); };
  }, [refresh]);
  useEffect(() => {
    if (!pairing && !status?.connected) return;
    const timer = setInterval(() => { if (document.visibilityState === "visible") void refresh(true); }, 15000);
    return () => clearInterval(timer);
  }, [pairing, status?.connected, refresh]);
  useEffect(() => {
    if (!pairing) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [pairing]);

  const connect = async () => {
    setBusy(true); setError("");
    try {
      const next = await accountAction<{ url?: string; expiresAt?: string; configured?: boolean }>("connect");
      if (!next.url || !next.expiresAt) throw new Error("A ativação do bot no servidor ainda está pendente.");
      const url = new URL(next.url);
      if (url.origin !== "https://t.me" || !/^[a-f0-9]{64}$/.test(url.searchParams.get("start") ?? "")) throw new Error("Link de conexão inválido.");
      setNow(Date.now());
      setPairing({ url: next.url, expiresAt: next.expiresAt });
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível conectar."); }
    finally { setBusy(false); }
  };
  const disconnect = async () => {
    setBusy(true); setError("");
    try { await accountAction("disconnect"); setPairing(null); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível desconectar."); }
    finally { setBusy(false); }
  };
  const secondsLeft = pairing ? Math.max(0, Math.ceil((Date.parse(pairing.expiresAt) - now) / 1000)) : 0;

  return (
    <main className="page-container space-y-7">
      <PageHeader title="Integrações" description="Registre suas finanças onde sua rotina acontece." icon={Link2} />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="glass-card overflow-hidden p-5 sm:p-7" aria-labelledby="telegram-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-sky-400/20 bg-sky-400/10"><MessageCircle className="h-6 w-6 text-sky-400" /></div><div><h2 id="telegram-title" className="text-xl font-semibold">Telegram</h2><p className="mt-1 text-sm text-muted-foreground">@{status?.botUsername ?? "SecondB2Bot"}</p></div></div>
            <span className="rounded-full border border-border/60 bg-secondary/30 px-3 py-1.5 text-xs text-muted-foreground">{loading ? "Verificando…" : status?.connected ? "Conectado" : status?.configured ? "Pronto para conectar" : "Em preparação"}</span>
          </div>
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">Envie uma receita ou despesa por mensagem. Confira a prévia e confirme no Telegram para salvar no Fluxo de caixa.</p>
          <div className="mt-5 flex gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><p className="text-sm leading-relaxed">A conexão vale apenas para sua conta. Cada lançamento exige confirmação e a mesma mensagem não cria duplicatas.</p></div>
          {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
          {!loading && !status?.configured && <p className="mt-5 text-sm text-muted-foreground">A integração está em preparação. O bot só poderá registrar lançamentos após a ativação no servidor.</p>}
          {status?.connected && <div className="mt-5 flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-income" /> {status.username ? `Conectado a @${status.username}` : "Sua conta do Telegram está conectada"}</div>}
          {pairing && !status?.connected && <div className="mt-5 rounded-2xl border border-sky-400/20 bg-sky-400/5 p-4 space-y-3">
            {secondsLeft > 0 ? <><p className="text-sm font-medium">Seu link está pronto</p><p className="text-xs leading-relaxed text-muted-foreground">Abra o Telegram e toque em Iniciar. Este link conecta à sua conta; não o compartilhe.</p><Button asChild className="w-full gap-2 rounded-xl"><a href={pairing.url} target="_blank" rel="noopener noreferrer">Abrir Telegram <ExternalLink className="h-4 w-4" /></a></Button><p className="text-xs text-muted-foreground">Expira em {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</p></>
              : <p role="status" className="text-sm text-muted-foreground">O link expirou. Gere um novo para conectar.</p>}
          </div>}
          <div className="mt-6 flex flex-wrap gap-3">
            {!status?.connected ? <Button disabled={busy || loading || !status?.configured} onClick={connect} className="gap-2 rounded-xl">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} {pairing ? "Gerar novo link" : "Conectar Telegram"}</Button>
              : <AlertDialog><AlertDialogTrigger asChild><Button disabled={busy} variant="outline" className="gap-2 rounded-xl"><Unplug className="h-4 w-4" /> Desconectar</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Desconectar Telegram?</AlertDialogTitle><AlertDialogDescription>O bot deixa de acessar sua conta e as prévias pendentes são canceladas. Os lançamentos já salvos permanecem no aplicativo.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Manter conectado</AlertDialogCancel><AlertDialogAction onClick={disconnect}>Desconectar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
            <Button disabled={busy || loading} variant="outline" onClick={() => void refresh()} className="gap-2 rounded-xl"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar status</Button>
          </div>
        </section>
        <section className="glass-card p-5 sm:p-7" aria-labelledby="commands-title">
          <h2 id="commands-title" className="text-lg font-semibold">Uma mensagem, um lançamento</h2>
          <p className="mt-2 text-sm text-muted-foreground">Exemplos de comandos; nenhum dado abaixo é salvo.</p>
          <div className="mt-5 space-y-3">{[
            ["Despesa paga", "/gasto 45,90 mercado"], ["Receita recebida", "/receita 3000 salário"],
            ["Conta a pagar", "/gasto 120 internet | contas | pendente"], ["Outro mês", "/receita 500 freelance | 10/2026"], ["Consultar projeção", "/saldo"],
          ].map(([label, command]) => <div key={command} className="rounded-xl border border-border/60 bg-secondary/20 p-3"><p className="text-xs text-muted-foreground">{label}</p><code className="mt-2 block break-words text-sm text-foreground">{command}</code></div>)}</div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Por padrão, usamos o mês da mensagem no horário de Brasília e a situação pago/recebido. Categoria e mês são opcionais, separados por |. Crédito, parcelas, áudio e fotos ficam para uma próxima versão.</p>
        </section>
      </div>
      <section className="glass-card p-5 sm:p-6" aria-labelledby="telegram-history-title">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="telegram-history-title" className="text-lg font-semibold">Últimos lançamentos pelo bot</h2><Link to="/fluxo" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">Abrir Fluxo <ArrowRight className="h-4 w-4" /></Link></div>
        {status?.history.length ? <ul className="mt-5 divide-y divide-border/50">{status.history.map(item => <li key={item.id} className="flex items-center justify-between gap-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{item.label}</p><p className="mt-1 text-xs text-muted-foreground">{MONTHS[item.month - 1]} {item.year} · {item.kind === "expenses" ? "Despesa" : "Receita"}</p></div><span className={`shrink-0 text-sm font-semibold tabular-nums ${item.kind === "expenses" ? "text-expense" : "text-income"}`}>{money(Number(item.amount))}</span></li>)}</ul>
          : <p className="mt-4 text-sm text-muted-foreground">{status?.connected ? "Os lançamentos confirmados no Telegram aparecerão aqui." : "Conecte o Telegram para acompanhar seus lançamentos por aqui."}</p>}
      </section>
    </main>
  );
}

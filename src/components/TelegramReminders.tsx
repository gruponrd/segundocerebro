import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
export interface ReminderPreferences { enabled: boolean; daysAhead: number; hour: number; includeAmounts: boolean }
export interface ReminderStatus extends ReminderPreferences { ready: boolean; lastDelivery?: {day: string; status: string} }
export function TelegramReminders({status, connected, busy, save}: {status?: ReminderStatus; connected: boolean; busy: boolean; save: (pref: ReminderPreferences) => Promise<void>}) {
  const [values, setValues] = useState<ReminderPreferences>({enabled:false,daysAhead:3,hour:9,includeAmounts:false});
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => { if (status && !dirty) setValues({enabled:status.enabled,daysAhead:status.daysAhead,hour:status.hour,includeAmounts:status.includeAmounts}); },[status,dirty]);
  const change = (patch: Partial<ReminderPreferences>) => { setValues(v => ({...v,...patch})); setDirty(true); setNotice(""); };
  const submit = async () => {
    try { await save(values); setDirty(false); setNotice(values.enabled ? "Lembretes ativados para os próximos horários programados." : "Lembretes desativados."); }
    catch (e) { setNotice(e instanceof Error ? e.message : "Não foi possível salvar."); }
  };
  return <section className="glass-card space-y-5 p-5 sm:p-6" aria-labelledby="telegram-reminders-title">
    <div><h2 id="telegram-reminders-title" className="flex items-center gap-2 text-lg font-semibold"><BellRing className="h-5 w-5 text-primary" /> Lembretes de vencimento</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Receba um resumo diário no seu Telegram conectado, somente quando houver parcelas ou dívidas pendentes com data de vencimento no período escolhido.</p></div>
    {!status?.ready && <p role="status" className="text-sm text-muted-foreground">O agendamento está em preparação. Os lembretes permanecem desligados até a ativação no servidor.</p>}
    {!connected && <p className="text-sm text-muted-foreground">Conecte seu Telegram para ativar os lembretes.</p>}
    <label className="flex min-h-11 items-center gap-3 text-sm font-medium"><Checkbox checked={values.enabled} disabled={busy || (!values.enabled && (!connected || !status?.ready))} onCheckedChange={v => change({enabled:v === true})} /> Quero receber lembretes no Telegram</label>
    <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm"><span className="block font-medium">Avisar sobre vencimentos</span><select className="h-11 w-full rounded-xl border border-input bg-background px-3" value={values.daysAhead} disabled={busy} onChange={e => change({daysAhead:Number(e.target.value)})}><option value={0}>Somente hoje</option><option value={1}>Hoje e amanhã</option><option value={3}>Hoje e próximos 3 dias</option><option value={7}>Hoje e próximos 7 dias</option></select></label><label className="space-y-2 text-sm"><span className="block font-medium">Horário (Brasília)</span><select className="h-11 w-full rounded-xl border border-input bg-background px-3" value={values.hour} disabled={busy} onChange={e => change({hour:Number(e.target.value)})}>{Array.from({length:15},(_,i) => i + 7).map(h => <option key={h} value={h}>{String(h).padStart(2,"0")}:00</option>)}</select></label></div>
    <label className="flex min-h-11 items-center gap-3 text-sm"><Checkbox checked={values.includeAmounts} disabled={busy} onCheckedChange={v => change({includeAmounts:v === true})} /> Incluir valores nas mensagens</label>
    <p className="text-xs leading-relaxed text-muted-foreground">Até um resumo por dia. Não há alteração automática de pagamentos. Despesas do Fluxo sem vencimento não entram nos avisos. As preferências são salvas na sua conta e funcionam com o app fechado; ao desconectar o Telegram, os lembretes são desativados.</p>
    <Button disabled={!dirty || busy || (values.enabled && (!connected || !status?.ready))} onClick={() => void submit()}>{busy ? "Salvando…" : "Salvar lembretes"}</Button>
    {notice && <p role="status" className="text-sm">{notice}</p>}
    {status?.lastDelivery && <p className="text-xs text-muted-foreground">Última tentativa: {status.lastDelivery.day.split("-").reverse().join("/")} · {status.lastDelivery.status === "sent" ? "Enviado" : status.lastDelivery.status === "failed" ? "Não foi possível enviar; confira sua conexão com o bot" : "Envio iniciado; não será repetido para evitar duplicação"}</p>}
  </section>;
}

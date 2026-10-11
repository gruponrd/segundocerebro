export interface DueReminder { id: string; title: string; source: string; dueDate: string; amount: number }
type FinanceData = { banks?: Array<{ id: string; name: string; status: string; installments?: Array<{ id: string; description: string; dueDate: string; status: string; installmentAmount: number }> }>; creditors?: Array<{ id: string; name: string; totalDebt: number; amountPaid: number; dueDate?: string }> };
export function reminderClock(now = new Date()): { day: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return { day: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}
function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function dueReminders(data: FinanceData, day: string, daysAhead: number): DueReminder[] {
  if (!validDate(day) || ![0,1,3,7].includes(daysAhead)) throw new Error("Invalid reminder window");
  const end = new Date(`${day}T00:00:00Z`); end.setUTCDate(end.getUTCDate() + daysAhead);
  const last = end.toISOString().slice(0, 10); const items: DueReminder[] = [];
  const add = (item: DueReminder) => { if (validDate(item.dueDate) && item.dueDate >= day && item.dueDate <= last && Number.isFinite(item.amount) && item.amount > 0) items.push(item); };
  for (const bank of Array.isArray(data.banks) ? data.banks : []) {
    if (!bank || typeof bank !== "object") continue;
    if (bank.status === "cancelado") continue;
    for (const item of Array.isArray(bank.installments) ? bank.installments : []) if (item && item.status !== "pago") add({ id: `card:${bank.id}:${item.id}`, title: item.description, source: bank.name, dueDate: item.dueDate, amount: item.installmentAmount });
  }
  for (const creditor of Array.isArray(data.creditors) ? data.creditors : []) if (creditor) add({ id: `creditor:${creditor.id}`, title: creditor.name, source: "Dívidas", dueDate: creditor.dueDate ?? "", amount: Math.round((creditor.totalDebt - creditor.amountPaid) * 100) / 100 });
  return items.sort((a,b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id));
}
export function reminderMessage(items: DueReminder[], includeAmounts: boolean): string {
  const clean = (text: string) => Array.from(String(text), ch => ch.charCodeAt(0) < 32 ? " " : ch).join("").slice(0, 80);
  const lines = items.slice(0, 15).map(i => `• ${i.dueDate.split("-").reverse().join("/")} · ${clean(i.title)} (${clean(i.source)})${includeAmounts ? ` · ${i.amount.toLocaleString("pt-BR", {style:"currency", currency:"BRL"})}` : ""}`);
  return [`Segundo Cérebro · Próximos vencimentos`, "", ...lines, ...(items.length > 15 ? [`+ ${items.length - 15} pendência(s) no aplicativo.`] : []), "", "Confira os pagamentos antes de lançar. Este lembrete não altera seus dados.", "Ajuste ou desative em Integrações."].join("\n");
}

export interface ReminderCandidate { user_id: string; days_ahead: number }
export interface ReminderClaim { chatId: string | number; ticket: string }
export interface ReminderBackend {
  finance: (user: string) => Promise<FinanceData | null>;
  claim: (user: string, day: string, hour: number) => Promise<ReminderClaim | null>;
  live: (user: string) => Promise<{ enabled: boolean; hour: number; daysAhead: number; includeAmounts: boolean; chatId: string | number | null; finance: FinanceData | null }>;
  send: (chat: string | number, message: string) => Promise<boolean>;
  finish: (user: string, day: string, ticket: string, sent: boolean) => Promise<void>;
}
/** Injected I/O: dry runs never reserve or send. */
export async function processReminderBatch(candidates: ReminderCandidate[], clock: {day: string; hour: number}, dryRun: boolean, backend: ReminderBackend) {
  let sent=0, failed=0, eligible=0;
  for (const pref of candidates) {
    let claim: ReminderClaim | null = null; let delivered=false;
    try {
      const data=await backend.finance(pref.user_id);
      if (!data || !dueReminders(data,clock.day,pref.days_ahead).length) continue;
      eligible++;
      if (dryRun) continue;
      claim=await backend.claim(pref.user_id,clock.day,clock.hour);
      if (!claim) continue;
      const live=await backend.live(pref.user_id);
      const items=live.finance && live.enabled ? dueReminders(live.finance,clock.day,live.daysAhead) : [];
      if (live.enabled && live.hour===clock.hour && String(live.chatId)===String(claim.chatId) && items.length) delivered=await backend.send(claim.chatId,reminderMessage(items,live.includeAmounts));
    } catch { if (!claim) failed++; }
    if (claim) {
      try { await backend.finish(pref.user_id,clock.day,claim.ticket,delivered); }
      catch { failed++; continue; }
      if (delivered) sent++; else failed++;
    }
  }
  return {dryRun,eligible,sent,failed};
}

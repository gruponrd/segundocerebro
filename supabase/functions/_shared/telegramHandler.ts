import { parseTelegramCommand, selectTelegramCard, TelegramInputError, TELEGRAM_HELP, TELEGRAM_MONTHS, transactionPreview, type TelegramTransaction, type TelegramCard } from "./telegramCommands.ts";

export interface TelegramUpdate {
  update_id: number;
  message?: { message_id: number; date: number; text?: string; chat: { id: number; type: string }; from?: { id: number; username?: string; is_bot?: boolean } };
  callback_query?: { id: string; data?: string; from: { id: number; is_bot?: boolean }; message?: { message_id: number; chat: { id: number; type: string } } };
}
export type TelegramDraft = TelegramTransaction & { id: string; status: string; expires_at: string };
export interface TelegramBackend {
  claim: (token: string, sender: number, username?: string) => Promise<boolean>;
  connected: (sender: number) => Promise<boolean>;
  draft: (update: number, sender: number, entry: TelegramTransaction) => Promise<TelegramDraft>;
  resolve: (id: string, sender: number, confirm: boolean) => Promise<{ status: string; kind?: string; duplicate?: boolean; expired?: boolean; reason?: string }>;
  cards: (sender: number) => Promise<TelegramCard[]>;
  balance: (sender: number, month: number, year: number) => Promise<string>;
  telegram: (method: string, payload: Record<string, unknown>) => Promise<void>;
}

/** No account writes occur until the database resolves an explicit confirmation. */
export async function handleTelegramUpdate(update: TelegramUpdate, backend: TelegramBackend, appUrl: string) {
  if (!Number.isSafeInteger(update.update_id) || update.update_id < 0) return;
  const callback = update.callback_query;
  if (callback) {
    const sender = callback.from?.id;
    const message = callback.message;
    if (!Number.isSafeInteger(sender) || sender <= 0 || callback.from.is_bot || message?.chat.type !== "private" || message.chat.id !== sender) return;
    const match = /^(confirm|cancel):([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/.exec(callback.data ?? "");
    if (!match) return;
    if (!await backend.connected(sender)) {
      await backend.telegram("answerCallbackQuery", { callback_query_id: callback.id, text: "Conecte sua conta no aplicativo.", show_alert: true });
      return;
    }
    let result;
    try { result = await backend.resolve(match[2], sender, match[1] === "confirm"); }
    catch {
      await backend.telegram("answerCallbackQuery", { callback_query_id: callback.id, text: "Não foi possível salvar. Sua conta precisa continuar conectada e a prévia deve pertencer a você. Tente novamente.", show_alert: true });
      return;
    }
    const text = result.status === "saved"
      ? result.duplicate ? "Este lançamento já estava salvo. Nenhuma duplicata foi criada." : result.kind === "credit" ? "Compra salva na Carteira do Segundo Cérebro. As parcelas já entram nos meses correspondentes do Fluxo." : "Lançamento salvo no Fluxo do Segundo Cérebro."
      : result.reason === "card_unavailable" ? "O cartão foi removido ou cancelado. Nenhuma compra foi salva. Consulte /cartoes e envie um novo comando." : result.expired ? "Prévia expirada. Envie o comando novamente. Nenhum lançamento foi criado." : "Lançamento cancelado. Nenhum dado financeiro foi alterado.";
    await backend.telegram("editMessageText", { chat_id: sender, message_id: message.message_id, text, reply_markup: { inline_keyboard: [] } });
    await backend.telegram("answerCallbackQuery", { callback_query_id: callback.id, text: result.status === "saved" ? "Salvo" : "Cancelado" });
    return;
  }
  const message = update.message;
  const sender = message?.from?.id;
  if (!message || !Number.isSafeInteger(sender) || sender! <= 0 || message.from?.is_bot || message.chat.type !== "private" || message.chat.id !== sender) return;
  const send = (text: string, extra = {}) => backend.telegram("sendMessage", { chat_id: sender, text, ...extra });
  let command;
  try { command = parseTelegramCommand(message.text ?? "", new Date(message.date * 1000)); }
  catch (error) { await send(error instanceof Error ? error.message : "Envie /ajuda."); return; }
  if (command.command === "start" && command.token) {
    const claimed = await backend.claim(command.token, sender!, message.from?.username);
    await send(claimed ? "Telegram conectado ao Segundo Cérebro. Agora você pode enviar /gasto, /receita e /credito. Use /ajuda para exemplos."
      : `Link inválido, expirado ou já utilizado. Gere outro em ${appUrl}/integracoes. Se já estiver conectado, use /ajuda.`);
    return;
  }
  if (!await backend.connected(sender!)) { await send(`Conecte sua conta em ${appUrl}/integracoes para começar.`); return; }
  if (command.command === "help" || command.command === "start") { await send(TELEGRAM_HELP); return; }
  if (command.command === "balance") { await send(await backend.balance(sender!, command.month, command.year)); return; }
  if (command.command === "cards") {
    const cards = (await backend.cards(sender!)).filter(card => card.status !== "cancelado");
    // Keep messages inside Telegram's 4096-character limit, even for large accounts.
    if (!cards.length) { await send("Nenhum cartão disponível. Cadastre um cartão na Carteira do aplicativo para usar /credito."); return; }
    let chunk = "Seus cartões disponíveis (use nome completo ou ID):\n";
    for (const card of cards) {
      const line = `\n${card.name}\nID: ${card.id}\n`;
      if (chunk.length + line.length > 3500) { await send(chunk); chunk = "Cartões (continuação):\n"; }
      chunk += line;
    }
    await send(chunk + "\nExemplo: /credito 1200 celular | Nome do cartão | 3x | 15/10/2026");
    return;
  }
  let draft;
  try {
    if (command.transaction.kind === "credit") {
      const card = selectTelegramCard(await backend.cards(sender!), command.transaction.credit.card!);
      command.transaction.credit.bankId = card.id;
    }
    draft = await backend.draft(update.update_id, sender!, command.transaction);
  } catch (error) {
    if (!(error instanceof TelegramInputError)) throw error;
    await send(error.message); return;
  }
  if (draft.status !== "pending" || new Date(draft.expires_at).getTime() <= Date.now()) return;
  await send(transactionPreview(draft), {
    reply_markup: { inline_keyboard: [[
      { text: "Confirmar", callback_data: `confirm:${draft.id}` },
      { text: "Cancelar", callback_data: `cancel:${draft.id}` },
    ]] },
  });
}

interface SummaryItem { amount?: number; paid?: boolean }
interface SummaryMonth { month: string; year: number; incomes: SummaryItem[]; expenses: SummaryItem[] }
interface SummaryBank { status: string; installments: { dueDate: string; installmentAmount: number }[] }
export function telegramBalance(data: { cashflowMonths?: SummaryMonth[]; banks?: SummaryBank[] }, month: number, year: number) {
  const entry = data.cashflowMonths?.find(m => m.month === TELEGRAM_MONTHS[month - 1] && m.year === year);
  const sum = (items: SummaryItem[] = [], paidOnly = false) => items.reduce((total, item) => total + ((!paidOnly || item.paid) ? Number(item.amount) || 0 : 0), 0);
  const income = sum(entry?.incomes), expenses = sum(entry?.expenses);
  const cards = (data.banks ?? []).filter(b => b.status !== "cancelado").reduce((total, b) => total + (b.installments ?? []).reduce((subtotal, i) =>
    /^\d{4}-\d{2}-\d{2}$/.test(i.dueDate) && Number(i.dueDate.slice(0, 4)) === year && Number(i.dueDate.slice(5, 7)) === month ? subtotal + (Number(i.installmentAmount) || 0) : subtotal, 0), 0);
  const money = (amount: number) => amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return `${TELEGRAM_MONTHS[month - 1]} ${year}\nReceitas previstas: ${money(income)}\nRecebido: ${money(sum(entry?.incomes, true))}\nDespesas no fluxo: ${money(expenses)}\nParcelas dos cartões: ${money(cards)}\nSaldo projetado do mês: ${money(income - expenses - cards)}\n\nProjeção dos lançamentos cadastrados; não representa o saldo da sua conta bancária.`;
}

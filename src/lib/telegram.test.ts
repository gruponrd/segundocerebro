import { describe, expect, it, vi } from "vitest";
import { parseTelegramAmount, parseTelegramCommand, transactionPreview } from "../../supabase/functions/_shared/telegramCommands";
import { handleTelegramUpdate, telegramBalance, type TelegramBackend, type TelegramUpdate } from "../../supabase/functions/_shared/telegramHandler";

const date = new Date("2026-10-01T01:30:00Z"); // Still September in São Paulo.
const id = "11111111-1111-4111-8111-111111111111";
const entry = { kind: "expenses" as const, label: "Mercado", amount: 45.9, category: "alimentacao", paid: true, month: 9, year: 2026 };
const update: TelegramUpdate = { update_id: 123, message: { message_id: 1, date: date.getTime() / 1000, from: { id: 10 }, chat: { id: 10, type: "private" }, text: "/gasto 45,90 Mercado" } };
const callback: TelegramUpdate = { update_id: 124, callback_query: { id: "callback", from: { id: 10 }, data: `confirm:${id}`, message: { message_id: 2, chat: { id: 10, type: "private" } } } };
function backend(): TelegramBackend {
  return { claim: vi.fn().mockResolvedValue(true), connected: vi.fn().mockResolvedValue(true),
    draft: vi.fn().mockResolvedValue({ ...entry, id, status: "pending", expires_at: "2099-01-01T00:00:00Z" }),
    resolve: vi.fn().mockResolvedValue({ status: "saved" }), balance: vi.fn().mockResolvedValue("Resumo"), telegram: vi.fn().mockResolvedValue(undefined) };
}

describe("Telegram: interpretação sem IA", () => {
  it.each([["45,90", 45.9], ["1.234,56", 1234.56], ["1.000", 1000], ["45.901", 45901], ["45.90", 45.9], ["10", 10]])("interpreta %s", (text, amount) => expect(parseTelegramAmount(text)).toBe(amount));
  it.each(["-1", "0", "1,234", "NaN", "Infinity", "1.000.00", "1000001", "45.9012", "1e3"])("rejeita valor inválido %s", text => expect(() => parseTelegramAmount(text)).toThrow());
  it("usa mês de Brasília, categoria sugerida e pagamento efetuado", () => {
    expect(parseTelegramCommand("/gasto 45,90 Mercado", date)).toEqual({ command: "transaction", transaction: entry });
  });
  it("permite categoria, período e pendência explícitos", () => {
    expect(parseTelegramCommand("/receita@SecondB2Bot 1.234,56 freelance | 10/2026 | pendente | outros", date)).toMatchObject({ transaction: { kind: "incomes", amount: 1234.56, month: 10, year: 2026, paid: false } });
  });
  it.each(["/gasto 10 compra | 13/2026", "/gasto 10 compra | 09/2026 | 10/2026", "/gasto 10 compra | pendente | pago", "/gasto 10 compra | categoria-inventada", "/gasto 10 compra no crédito", "/gasto 10 compra parcelada"])('rejeita opções ambíguas: %s', text => expect(() => parseTelegramCommand(text, date)).toThrow());
  it("não inventa suporte a áudios ou linguagem livre", () => expect(() => parseTelegramCommand("gastei uns quarenta reais", date)).toThrow());
  it("mostra mês, valor e situação antes da confirmação", () => expect(transactionPreview(entry)).toContain("Setembro 2026\nSituação: Pago"));
});

describe("Telegram: autorização e confirmação", () => {
  it("cria somente uma prévia ao receber um comando", async () => {
    const db = backend(); await handleTelegramUpdate(update, db, "https://app.test");
    expect(db.draft).toHaveBeenCalledWith(123, 10, entry);
    expect(db.resolve).not.toHaveBeenCalled();
    expect(db.telegram).toHaveBeenCalledWith("sendMessage", expect.objectContaining({ reply_markup: { inline_keyboard: [[{ text: "Confirmar", callback_data: `confirm:${id}` }, { text: "Cancelar", callback_data: `cancel:${id}` }]] } }));
  });
  it("não aceita lançamento ou confirmação em grupos", async () => {
    const db = backend();
    await handleTelegramUpdate({ ...update, message: { ...update.message!, chat: { id: -1, type: "group" } } }, db, "https://app.test");
    await handleTelegramUpdate({ ...callback, callback_query: { ...callback.callback_query!, message: { message_id: 1, chat: { id: -1, type: "group" } } } }, db, "https://app.test");
    expect(db.connected).not.toHaveBeenCalled(); expect(db.draft).not.toHaveBeenCalled(); expect(db.resolve).not.toHaveBeenCalled();
  });
  it("bloqueia o Telegram desconectado", async () => {
    const db = backend(); vi.mocked(db.connected).mockResolvedValue(false);
    await handleTelegramUpdate(update, db, "https://app.test"); await handleTelegramUpdate(callback, db, "https://app.test");
    expect(db.draft).not.toHaveBeenCalled(); expect(db.resolve).not.toHaveBeenCalled();
  });
  it("confirma apenas com o id do Telegram do remetente", async () => {
    const db = backend(); await handleTelegramUpdate(callback, db, "https://app.test");
    expect(db.resolve).toHaveBeenCalledWith(id, 10, true);
  });
  it("não anuncia sucesso quando o banco recusa salvar", async () => {
    const db = backend(); vi.mocked(db.resolve).mockRejectedValue(new Error("Wrong owner"));
    await handleTelegramUpdate(callback, db, "https://app.test");
    expect(db.telegram).not.toHaveBeenCalledWith("editMessageText", expect.anything());
    expect(db.telegram).toHaveBeenCalledWith("answerCallbackQuery", expect.objectContaining({ show_alert: true }));
  });
  it("cancelamento nunca pede gravação financeira", async () => {
    const db = backend(); vi.mocked(db.resolve).mockResolvedValue({ status: "cancelled" });
    await handleTelegramUpdate({ ...callback, callback_query: { ...callback.callback_query!, data: `cancel:${id}` } }, db, "https://app.test");
    expect(db.resolve).toHaveBeenCalledWith(id, 10, false);
  });
  it("callbacks sem id válido são ignorados", async () => {
    const db = backend(); await handleTelegramUpdate({ ...callback, callback_query: { ...callback.callback_query!, data: "confirm:outro-usuario" } }, db, "https://app.test");
    expect(db.resolve).not.toHaveBeenCalled();
  });
  it("inclui parcelas pagas no total do mês e exclui cartões cancelados", () => {
    const summary = telegramBalance({ cashflowMonths: [{ month: "Setembro", year: 2026, incomes: [{ amount: 1000, paid: true }], expenses: [{ amount: 100 }] }], banks: [
      { status: "pendente", installments: [{ dueDate: "2026-09-01", installmentAmount: 200 }] },
      { status: "cancelado", installments: [{ dueDate: "2026-09-01", installmentAmount: 500 }] },
    ] }, 9, 2026);
    expect(summary).toContain("700,00");
  });
});

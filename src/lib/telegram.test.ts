import { describe, expect, it, vi } from "vitest";
import { creditSchedule, selectTelegramCard, parseTelegramAmount, parseTelegramCommand, transactionPreview } from "../../supabase/functions/_shared/telegramCommands";
import { handleTelegramUpdate, telegramBalance, type TelegramBackend, type TelegramUpdate } from "../../supabase/functions/_shared/telegramHandler";

const date = new Date("2026-10-01T01:30:00Z"); // Still September in São Paulo.
const id = "11111111-1111-4111-8111-111111111111";
const entry = { kind: "expenses" as const, label: "Mercado", amount: 45.9, category: "alimentacao", paid: true, month: 9, year: 2026 };
const update: TelegramUpdate = { update_id: 123, message: { message_id: 1, date: date.getTime() / 1000, from: { id: 10 }, chat: { id: 10, type: "private" }, text: "/gasto 45,90 Mercado" } };
const callback: TelegramUpdate = { update_id: 124, callback_query: { id: "callback", from: { id: 10 }, data: `confirm:${id}`, message: { message_id: 2, chat: { id: 10, type: "private" } } } };
function backend(): TelegramBackend {
  return { claim: vi.fn().mockResolvedValue(true), connected: vi.fn().mockResolvedValue(true),
    draft: vi.fn().mockResolvedValue({ ...entry, id, status: "pending", expires_at: "2099-01-01T00:00:00Z" }),
    resolve: vi.fn().mockResolvedValue({ status: "saved" }), cards: vi.fn().mockResolvedValue([{ id: "nubank", name: "Nubank", status: "pendente" }]), balance: vi.fn().mockResolvedValue("Resumo"), telegram: vi.fn().mockResolvedValue(undefined) };
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

describe("Telegram: compras no crédito", () => {
  const text = "/credito 100 compra | Nubank | 3x | 31/01/2028 | compras";
  it("interpreta total, cartão, parcelas e primeiro vencimento explícitos", () => {
    expect(parseTelegramCommand(text,date)).toMatchObject({ command:"transaction", transaction:{kind:"credit",amount:100,paid:false,month:1,year:2028,credit:{card:"Nubank",installments:3,firstDueDate:"2028-01-31"}} });
    expect(parseTelegramCommand("/credito 89,90 mercado | cartao=Nubank | 15/10/2026",date)).toMatchObject({transaction:{credit:{installments:1}}});
  });
  it("ajusta fevereiro bissexto e recupera dia 31 sem perder centavos", () => {
    expect(creditSchedule(100,3,"2028-01-31")).toEqual([
      {dueDate:"2028-01-31",amount:33.33,number:1}, {dueDate:"2028-02-29",amount:33.33,number:2}, {dueDate:"2028-03-31",amount:33.34,number:3},
    ]);
    expect(creditSchedule(0.01,1,"2026-12-31")[0].amount).toBe(0.01);
    expect(creditSchedule(10,3,"2026-03-31").map(i=>i.dueDate)).toEqual(["2026-03-31","2026-04-30","2026-05-31"]);
  });
  it.each([
    "/credito 100 compra | Nubank | 3x", "/credito 100 compra | 31/10/2026", "/credito 100 compra | Nubank | 31/02/2026",
    "/credito 100 compra | Nubank | 0x | 15/10/2026", "/credito 100 compra | Nubank | 61x | 15/10/2026",
    "/credito 0,01 compra | Nubank | 2x | 15/10/2026", "/credito 100 compra | Nubank | 3x | 31/12/2099",
    "/credito 100 compra | Nubank | 3x | 15/10/2026 | pago", "/credito 100 compra | Nubank | 3x | 15/10/2026 | 2x",
    "/credito 100 compra | Nubank | Inter | 15/10/2026",
  ])("não adivinha dados ou aceita opções inválidas: %s", command => expect(()=>parseTelegramCommand(command,date)).toThrow());
  it("seleciona apenas cartão próprio disponível e recusa nomes ambíguos", () => {
    const cards=[{id:"a",name:"Itaú",status:"pendente"},{id:"b",name:"Itaú",status:"pendente"},{id:"c",name:"Cancelado",status:"cancelado"}];
    expect(selectTelegramCard(cards,"b").id).toBe("b");
    expect(()=>selectTelegramCard(cards,"itau")).toThrow("mais de um");
    expect(()=>selectTelegramCard(cards,"c")).toThrow("cancelado");
    expect(()=>selectTelegramCard(cards,"foreign")).toThrow("não encontrado");
  });
  it("mostra na prévia o cartão e cada vencimento e valor", () => {
    const command=parseTelegramCommand(text,date);
    if(command.command!=="transaction") throw new Error("Expected purchase");
    const preview=transactionPreview(command.transaction);
    expect(preview).toContain("Cartão: Nubank"); expect(preview).toContain("29/02/2028"); expect(preview).toContain("33,34"); expect(preview).toContain("TOTAL");
  });
  it("consulta cartões sem criar uma prévia ou gravar dados financeiros",async()=>{
    const db=backend();
    await handleTelegramUpdate({...update,message:{...update.message!,text:"/cartoes"}},db,"https://app.test");
    expect(db.cards).toHaveBeenCalledWith(10); expect(db.draft).not.toHaveBeenCalled(); expect(db.resolve).not.toHaveBeenCalled();
    expect(db.telegram).toHaveBeenCalledWith("sendMessage",expect.objectContaining({text:expect.stringContaining("ID: nubank")}));
  });
  it("resolve o ID e cria somente uma prévia até haver confirmação",async()=>{
    const db=backend();
    const command=parseTelegramCommand(text,date);
    if(command.command!=="transaction" || command.transaction.kind!=="credit") throw new Error("Expected purchase");
    vi.mocked(db.draft).mockResolvedValue({...command.transaction,credit:{...command.transaction.credit,bankId:"nubank",bankName:"Nubank"},id,status:"pending",expires_at:"2099-01-01T00:00:00Z"});
    await handleTelegramUpdate({...update,message:{...update.message!,text}},db,"https://app.test");
    expect(db.draft).toHaveBeenCalledWith(123,10,expect.objectContaining({kind:"credit",credit:expect.objectContaining({bankId:"nubank"})}));
    expect(db.resolve).not.toHaveBeenCalled();
    expect(db.telegram).toHaveBeenCalledWith("sendMessage",expect.objectContaining({text:expect.stringContaining("salvar na Carteira")}));
  });
  it("responde com instruções quando o cartão não existe, sem deixar o webhook em erro",async()=>{
    const db=backend(); vi.mocked(db.cards).mockResolvedValue([]);
    await handleTelegramUpdate({...update,message:{...update.message!,text}},db,"https://app.test");
    expect(db.draft).not.toHaveBeenCalled(); expect(db.telegram).toHaveBeenCalledWith("sendMessage",expect.objectContaining({text:expect.stringContaining("/cartoes")}));
  });
  it("confirma na Carteira e informa cancelamento se o cartão ficou indisponível",async()=>{
    const db=backend(); vi.mocked(db.resolve).mockResolvedValue({status:"saved",kind:"credit"});
    await handleTelegramUpdate(callback,db,"https://app.test");
    expect(db.telegram).toHaveBeenCalledWith("editMessageText",expect.objectContaining({text:expect.stringContaining("Compra salva na Carteira")}));
    vi.mocked(db.resolve).mockResolvedValue({status:"cancelled",reason:"card_unavailable"});
    await handleTelegramUpdate(callback,db,"https://app.test");
    expect(db.telegram).toHaveBeenCalledWith("editMessageText",expect.objectContaining({text:expect.stringContaining("Nenhuma compra foi salva")}));
  });
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

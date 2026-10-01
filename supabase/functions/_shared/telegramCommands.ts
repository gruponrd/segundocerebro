export const TELEGRAM_MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export const TELEGRAM_CATEGORIES: Record<string, string> = {
  moradia: "Moradia", alimentacao: "Alimentação", transporte: "Transporte", lazer: "Lazer",
  saude: "Saúde", educacao: "Educação", assinaturas: "Assinaturas", compras: "Compras",
  contas: "Contas", investimento: "Investimento", outros: "Outros",
};

export interface TelegramCashTransaction {
  kind: "incomes" | "expenses";
  amount: number;
  label: string;
  category: string;
  month: number;
  year: number;
  paid: boolean;
}
export interface TelegramCreditDetails {
  card?: string;
  bankId?: string;
  bankName?: string;
  installments: number;
  firstDueDate: string;
  schedule?: { dueDate: string; amount: number; number: number }[];
}
export type TelegramTransaction = TelegramCashTransaction | (Omit<TelegramCashTransaction, "kind"> & { kind: "credit"; credit: TelegramCreditDetails });
export interface TelegramCard { id: string; name: string; status: string }
export class TelegramInputError extends Error {}
export type TelegramCommand =
  | { command: "start"; token?: string }
  | { command: "help" }
  | { command: "balance"; month: number; year: number }
  | { command: "cards" }
  | { command: "transaction"; transaction: TelegramTransaction };

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function selectTelegramCard(cards: TelegramCard[], reference: string): TelegramCard {
  const available = cards.filter(card => card.status !== "cancelado");
  const byId = available.filter(card => card.id === reference);
  const matches = byId.length ? byId : available.filter(card => normalize(card.name) === normalize(reference));
  if (!matches.length) throw new TelegramInputError("Cartão não encontrado ou cancelado. Envie /cartoes e use o nome completo ou ID do cartão.");
  if (matches.length !== 1) throw new TelegramInputError("Há mais de um cartão com esse nome. Envie /cartoes e use o ID do cartão.");
  return matches[0];
}

export function creditSchedule(amount: number, count: number, firstDueDate: string) {
  const cents = Math.round(amount * 100);
  if (!Number.isInteger(count) || count < 1 || count > 60 || count > cents) throw new Error("Use de 1 a 60 parcelas, com pelo menos R$ 0,01 por parcela.");
  const [year, month, day] = firstDueDate.split("-").map(Number);
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(firstDueDate) || new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) !== firstDueDate) throw new Error("Vencimento inválido. Use DD/MM/AAAA.");
  return Array.from({ length: count }, (_, index) => {
    const start = new Date(Date.UTC(year, month - 1 + index, 1));
    if (start.getUTCFullYear() > 2099) throw new Error("O último vencimento deve ocorrer até 2099.");
    const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
    start.setUTCDate(Math.min(day, lastDay));
    // Put the remainder in the last installment so the sum is exactly the total.
    return { dueDate: start.toISOString().slice(0, 10), amount: (Math.floor(cents / count) + (index === count - 1 ? cents % count : 0)) / 100, number: index + 1 };
  });
}

export function telegramCalendar(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "numeric" }).formatToParts(date);
  return { month: Number(parts.find(p => p.type === "month")!.value), year: Number(parts.find(p => p.type === "year")!.value) };
}

export function parseTelegramAmount(value: string): number {
  // Accept Brazilian currency and unambiguous decimal points. Never guess fractions of a cent.
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(value) && !/^\d+\.\d{1,2}$/.test(value)) {
    throw new Error("Valor inválido. Use, por exemplo, 45,90 ou 1.234,56.");
  }
  const normalized = value.includes(",") || /^\d{1,3}(?:\.\d{3})+$/.test(value)
    ? value.replace(/\./g, "").replace(",", ".") : value;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) throw new Error("O valor deve ser maior que zero e até R$ 1.000.000,00.");
  return Math.round(amount * 100) / 100;
}

function parsePeriod(value: string) {
  const match = /^(0?[1-9]|1[0-2])\/(20\d{2})$/.exec(value);
  if (!match) throw new Error("Mês inválido. Use MM/AAAA, por exemplo 09/2026.");
  return { month: Number(match[1]), year: Number(match[2]) };
}

function suggestCategory(label: string) {
  const text = normalize(label);
  const rules: [string, RegExp][] = [
    ["moradia", /aluguel|condom|iptu/], ["contas", /luz|agua|internet|energia|gas|conta/],
    ["alimentacao", /aliment|restaurante|ifood|delivery|comida|lanche|mercado/],
    ["transporte", /uber|99|posto|combust|gasolina|transporte|onibus|metr/],
    ["assinaturas", /netflix|spotify|disney|hbo|prime|youtube|icloud|assinatura/],
    ["educacao", /curso|livro|escola|faculdade|educa/], ["saude", /farmacia|hospital|consulta|medic|saude|plano/],
    ["compras", /roupa|tenis|loja|shopping|compra|magazine|amazon/], ["lazer", /cinema|show|bar|viagem|jogo|game|lazer|festa/],
    ["investimento", /investimento|aporte|previd|tesouro|cdb/],
  ];
  return rules.find(([, regex]) => regex.test(text))?.[0] ?? "outros";
}

export function parseTelegramCommand(text: string, date = new Date()): TelegramCommand {
  if (text.length > 600) throw new Error("Mensagem muito longa. Use uma descrição de até 240 caracteres.");
  const match = /^\/(\w+)(?:@[\w]+)?(?:\s+([\s\S]*))?$/.exec(text.trim());
  if (!match) throw new Error("Use /gasto, /receita, /credito, /cartoes, /saldo ou /ajuda.");
  const name = match[1].toLowerCase();
  const args = (match[2] ?? "").trim();
  if (name === "start") {
    if (args && !/^[a-f0-9]{64}$/.test(args)) throw new Error("Abra o link de conexão gerado no aplicativo.");
    return { command: "start", token: args || undefined };
  }
  if (["ajuda", "help"].includes(name)) return { command: "help" };
  if (name === "cartoes") return { command: "cards" };
  if (name === "saldo") return { command: "balance", ...(args ? parsePeriod(args) : telegramCalendar(date)) };
  if (!["gasto", "receita", "credito"].includes(name)) throw new Error("Comando desconhecido. Envie /ajuda.");
  const [entry, ...options] = args.split("|").map(s => s.trim());
  const entryMatch = /^(?:R\$\s*)?(\S+)\s+(.+)$/i.exec(entry);
  if (!entryMatch) throw new Error(`Use /${name} 45,90 descrição. Envie /ajuda para exemplos.`);
  const label = entryMatch[2].trim();
  if (label.length > 240 || [...label].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) throw new Error("Use uma descrição de 1 a 240 caracteres, em uma linha.");
  if (name === "gasto" && /\b(credito|parcelad[oa]s?|parcelas?)\b/.test(normalize(label))) {
    throw new Error("Para compras no cartão use /credito 120 compra | Nome do cartão | 1x | 15/10/2026. O comando /gasto registra despesas no Fluxo.");
  }
  if (name === "credito") {
    let card = "", firstDueDate = "", count = 1, category = suggestCategory(label);
    const seen = new Set<string>();
    for (const option of options) {
      const normalized = normalize(option);
      let field: string;
      if (/^cartao\s*=/i.test(option)) { field = "card"; card = option.replace(/^cartao\s*=\s*/i, "").trim(); }
      else if (/^\d+x$/i.test(option)) { field = "installments"; count = Number(option.slice(0, -1)); }
      else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(option)) {
        field = "date";
        const [day, month, year] = option.split("/");
        firstDueDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      } else if (Object.prototype.hasOwnProperty.call(TELEGRAM_CATEGORIES, normalized)) { field = "category"; category = normalized; }
      else if (["pago", "pendente", "recebido"].includes(normalized) || option.includes("/")) throw new Error("Crédito entra como parcelas pendentes. Informe o primeiro vencimento em DD/MM/AAAA.");
      else { field = "card"; card = option.replace(/^cartao\s*=\s*/i, "").trim(); }
      if (seen.has(field)) throw new Error("Não repita cartão, parcelas, vencimento ou categoria.");
      seen.add(field);
    }
    if (!card || card.length > 240 || !firstDueDate) throw new Error("Use /credito 1200 celular | Nubank | 3x | 15/10/2026. Informe o cartão e o primeiro vencimento. Envie /cartoes para consultar seus cartões.");
    const amount = parseTelegramAmount(entryMatch[1]);
    creditSchedule(amount, count, firstDueDate);
    return { command: "transaction", transaction: { kind: "credit", amount, label, category, paid: false,
      month: Number(firstDueDate.slice(5, 7)), year: Number(firstDueDate.slice(0, 4)), credit: { card, installments: count, firstDueDate } } };
  }
  const transaction: TelegramCashTransaction = {
    kind: name === "gasto" ? "expenses" : "incomes", amount: parseTelegramAmount(entryMatch[1]),
    label, category: name === "gasto" ? suggestCategory(label) : "outros", paid: true, ...telegramCalendar(date),
  };
  const seen = new Set<string>();
  for (const option of options) {
    let field: string;
    const normalized = normalize(option);
    if (option.includes("/")) { field = "period"; Object.assign(transaction, parsePeriod(option)); }
    else if (["pendente", "pago", "recebido"].includes(normalized)) { field = "paid"; transaction.paid = normalized !== "pendente"; }
    else if (Object.prototype.hasOwnProperty.call(TELEGRAM_CATEGORIES, normalized)) { field = "category"; transaction.category = normalized; }
    else throw new Error("Opção inválida. Use categoria, MM/AAAA ou pendente após |. Envie /ajuda.");
    if (seen.has(field)) throw new Error("Não repita categoria, mês ou situação no mesmo comando.");
    seen.add(field);
  }
  return { command: "transaction", transaction };
}

export function transactionPreview(transaction: TelegramTransaction) {
  const value = transaction.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  if (transaction.kind === "credit") {
    const credit = transaction.credit;
    const schedule = credit.schedule ?? creditSchedule(transaction.amount, credit.installments, credit.firstDueDate);
    const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const rows = schedule.map(item => `${item.number}/${credit.installments} · ${item.dueDate.split("-").reverse().join("/")} · ${money(item.amount)}`);
    return `Compra no crédito: ${value}\nCartão: ${credit.bankName ?? credit.card}\nDescrição: ${transaction.label}\nCategoria: ${TELEGRAM_CATEGORIES[transaction.category]}\nParcelas pendentes (${credit.installments}):\n${rows.join("\n")}\n\nConfira e confirme para salvar na Carteira. O valor informado é o TOTAL da compra, dividido sem juros. Não cria uma despesa duplicada no Fluxo. Esta prévia expira em 15 minutos.`;
  }
  return `${transaction.kind === "expenses" ? "Despesa" : "Receita"}: ${value}\nDescrição: ${transaction.label}\nCategoria: ${TELEGRAM_CATEGORIES[transaction.category]}\nMês: ${TELEGRAM_MONTHS[transaction.month - 1]} ${transaction.year}\nSituação: ${transaction.paid ? transaction.kind === "expenses" ? "Pago" : "Recebido" : "Pendente"}\n\nConfira e confirme para salvar no Fluxo. Esta prévia expira em 15 minutos.`;
}

export const TELEGRAM_HELP = `Segundo Cérebro · lançamentos pelo Telegram

/gasto 45,90 mercado
/receita 3000 salário
/gasto 120 internet | contas | pendente
/receita 500 freelance | 10/2026 | pendente
/cartoes
/credito 1200 celular | Nubank | 3x | 15/10/2026
/credito 89,90 mercado | Nubank | 1x | 15/10/2026 | alimentacao
/saldo ou /saldo 09/2026

Por padrão, usamos o mês da mensagem (horário de Brasília) e marcamos como pago/recebido. Use | pendente para previsões. Categoria e mês são opcionais, separados por |.

Para crédito, informe o TOTAL da compra, o nome completo ou ID do cartão, o número de parcelas (1x a 60x) e o PRIMEIRO vencimento (DD/MM/AAAA). As parcelas ficam pendentes na Carteira e entram nos respectivos meses do Fluxo sem duplicar uma despesa. Não calculamos fechamento de fatura ou juros; use o total final cobrado. Datas como dia 31 se ajustam ao último dia dos meses mais curtos.

Nada é salvo antes de você tocar em Confirmar. Áudios e fotos ainda não são aceitos.

Para conectar ou desconectar sua conta, abra Integrações no aplicativo.`;

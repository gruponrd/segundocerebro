export const TELEGRAM_MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export const TELEGRAM_CATEGORIES: Record<string, string> = {
  moradia: "Moradia", alimentacao: "Alimentação", transporte: "Transporte", lazer: "Lazer",
  saude: "Saúde", educacao: "Educação", assinaturas: "Assinaturas", compras: "Compras",
  contas: "Contas", investimento: "Investimento", outros: "Outros",
};

export interface TelegramTransaction {
  kind: "incomes" | "expenses";
  amount: number;
  label: string;
  category: string;
  month: number;
  year: number;
  paid: boolean;
}
export type TelegramCommand =
  | { command: "start"; token?: string }
  | { command: "help" }
  | { command: "balance"; month: number; year: number }
  | { command: "transaction"; transaction: TelegramTransaction };

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

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
  if (!match) throw new Error("Use /gasto, /receita, /saldo ou /ajuda.");
  const name = match[1].toLowerCase();
  const args = (match[2] ?? "").trim();
  if (name === "start") {
    if (args && !/^[a-f0-9]{64}$/.test(args)) throw new Error("Abra o link de conexão gerado no aplicativo.");
    return { command: "start", token: args || undefined };
  }
  if (["ajuda", "help"].includes(name)) return { command: "help" };
  if (name === "saldo") return { command: "balance", ...(args ? parsePeriod(args) : telegramCalendar(date)) };
  if (!["gasto", "receita"].includes(name)) throw new Error("Comando desconhecido. Envie /ajuda.");
  const [entry, ...options] = args.split("|").map(s => s.trim());
  const entryMatch = /^(?:R\$\s*)?(\S+)\s+(.+)$/i.exec(entry);
  if (!entryMatch) throw new Error(`Use /${name} 45,90 descrição. Envie /ajuda para exemplos.`);
  const label = entryMatch[2].trim();
  if (label.length > 240 || [...label].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) throw new Error("Use uma descrição de 1 a 240 caracteres, em uma linha.");
  if (name === "gasto" && /\b(credito|parcelad[oa]s?|parcelas?)\b/.test(normalize(label))) {
    throw new Error("Compras no crédito e parcelas devem ser lançadas na Carteira pelo aplicativo. O bot registra gastos no fluxo de caixa.");
  }
  const transaction: TelegramTransaction = {
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
  return `${transaction.kind === "expenses" ? "Despesa" : "Receita"}: ${value}\nDescrição: ${transaction.label}\nCategoria: ${TELEGRAM_CATEGORIES[transaction.category]}\nMês: ${TELEGRAM_MONTHS[transaction.month - 1]} ${transaction.year}\nSituação: ${transaction.paid ? transaction.kind === "expenses" ? "Pago" : "Recebido" : "Pendente"}\n\nConfira e confirme para salvar no Fluxo. Esta prévia expira em 15 minutos.`;
}

export const TELEGRAM_HELP = `Segundo Cérebro · lançamentos pelo Telegram

/gasto 45,90 mercado
/receita 3000 salário
/gasto 120 internet | contas | pendente
/receita 500 freelance | 10/2026 | pendente
/saldo ou /saldo 09/2026

Por padrão, usamos o mês da mensagem (horário de Brasília) e marcamos como pago/recebido. Use | pendente para previsões. Categoria e mês são opcionais, separados por |.

Nada é salvo antes de você tocar em Confirmar. Crédito e parcelas continuam na Carteira do aplicativo. Áudios e fotos ainda não são aceitos.

Para conectar ou desconectar sua conta, abra Integrações no aplicativo.`;

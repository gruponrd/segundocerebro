export interface ExpenseCategory {
  id: string;
  label: string;
  emoji: string;
  color: string; // tailwind text color class
  bg: string;    // tailwind bg color class
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: "moradia",      label: "Moradia",       emoji: "🏠", color: "text-amber-400",   bg: "bg-amber-500/15" },
  { id: "alimentacao",  label: "Alimentação",   emoji: "🍔", color: "text-orange-400",  bg: "bg-orange-500/15" },
  { id: "transporte",   label: "Transporte",    emoji: "🚗", color: "text-sky-400",     bg: "bg-sky-500/15" },
  { id: "lazer",        label: "Lazer",         emoji: "🎮", color: "text-fuchsia-400", bg: "bg-fuchsia-500/15" },
  { id: "saude",        label: "Saúde",         emoji: "❤️", color: "text-rose-400",    bg: "bg-rose-500/15" },
  { id: "educacao",     label: "Educação",      emoji: "📚", color: "text-indigo-400",  bg: "bg-indigo-500/15" },
  { id: "assinaturas",  label: "Assinaturas",   emoji: "📺", color: "text-purple-400",  bg: "bg-purple-500/15" },
  { id: "compras",      label: "Compras",       emoji: "🛍️", color: "text-pink-400",    bg: "bg-pink-500/15" },
  { id: "contas",       label: "Contas",        emoji: "💡", color: "text-yellow-400",  bg: "bg-yellow-500/15" },
  { id: "investimento", label: "Investimento",  emoji: "📈", color: "text-emerald-400", bg: "bg-emerald-500/15" },
  { id: "outros",       label: "Outros",        emoji: "•",  color: "text-muted-foreground", bg: "bg-secondary/60" },
];

export function getCategory(id?: string): ExpenseCategory {
  return EXPENSE_CATEGORIES.find((c) => c.id === id) ?? EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
}

// Heuristic auto-suggestion based on label keywords.
export function suggestCategory(label: string): string {
  const l = label.toLowerCase();
  if (/(aluguel|condom|iptu)/.test(l)) return "moradia";
  if (/(luz|água|agua|internet|energia|gás|gas|conta)/.test(l)) return "contas";
  if (/(aliment|restaurante|ifood|delivery|comida|lanche|mercado|supermercado)/.test(l)) return "alimentacao";
  if (/(uber|99|posto|combust|gasolina|transporte|ônibus|metr|onibus)/.test(l)) return "transporte";
  if (/(netflix|spotify|disney|hbo|prime|youtube|icloud|assinatura)/.test(l)) return "assinaturas";
  if (/(curso|livro|escola|faculdade|educa)/.test(l)) return "educacao";
  if (/(farmacia|farmácia|hospital|consulta|médic|medic|saúde|saude|plano)/.test(l)) return "saude";
  if (/(roupa|tênis|tenis|loja|shopping|compra|magazine|amazon)/.test(l)) return "compras";
  if (/(cinema|show|bar|viagem|jogo|game|lazer|festa)/.test(l)) return "lazer";
  if (/(investimento|aporte|brasilprev|previd|tesouro|cdb)/.test(l)) return "investimento";
  return "outros";
}

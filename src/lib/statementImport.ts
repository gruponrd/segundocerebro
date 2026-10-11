import type { CashflowItem, CashflowMonth } from "@/data/financialData";
import { mergeCashflowMonths } from "@/lib/cashflowMonths";

export const IMPORT_LIMIT = 1000;
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export interface StatementMapping { date: number; label: number; amount: number; kind: number }
export interface StatementEntry { row: number; date: string; label: string; amount: number; kind: "incomes" | "expenses"; key: string }
export interface StatementRow { row: number; entry?: StatementEntry; error?: string; duplicate?: string }
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");

/** RFC-style quoted fields, including delimiters and newlines within quotes. */
export function parseStatementCsv(text: string, delimiter?: string): string[][] {
  if (text.length > 1_000_000) throw new Error("O CSV deve ter até 1 MB.");
  text = text.replace(/^\uFEFF/, "");
  if (!delimiter) {
    const first = text.split(/\r?\n/)[0];
    const counts = [";", ",", "\t"].map(d => ({ d, count: first.split(d).length }));
    delimiter = counts.sort((a, b) => b.count - a.count)[0].d;
  }
  const rows: string[][] = []; let cells: string[] = []; let field = ""; let quoted = false; let closed = false;
  const cell = () => { cells.push(field.trim()); field = ""; closed = false; };
  const row = () => { cell(); if (cells.some(Boolean)) rows.push(cells); cells = []; if (rows.length > IMPORT_LIMIT + 1) throw new Error(`Importe até ${IMPORT_LIMIT} linhas por arquivo.`); };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { quoted = false; closed = true; }
      else field += ch;
    } else if (ch === '"') {
      if (field.trim() || closed) throw new Error("Aspas inválidas no CSV.");
      field = ""; quoted = true;
    } else if (ch === delimiter) cell();
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row(); }
    else { if (closed && ch.trim()) throw new Error("Texto inesperado depois das aspas."); field += ch; }
  }
  if (quoted) throw new Error("Uma célula do CSV está com aspas abertas.");
  if (field || cells.length) row();
  if (rows.length < 2) throw new Error("O arquivo precisa de cabeçalho e pelo menos um lançamento.");
  return rows;
}

export function suggestMapping(headers: string[]): StatementMapping {
  const find = (names: string[]) => headers.findIndex(h => names.includes(normalize(h)));
  return { date: find(["data", "date", "data lancamento", "data de lancamento"]), label: find(["descricao", "description", "title", "historico", "lancamento"]), amount: find(["valor", "amount", "value"]), kind: find(["tipo", "type", "natureza"]) };
}
export function statementDate(raw: string): string | null {
  const match = raw.trim().match(/^(?:(\d{4})-(\d{2})-(\d{2})|(\d{2})\/(\d{2})\/(\d{4}))$/);
  if (!match) return null;
  const y = Number(match[1] ?? match[6]), m = Number(match[2] ?? match[5]), d = Number(match[3] ?? match[4]);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (y < 2000 || y > 2099 || date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
export function statementAmount(raw: string, format: "br" | "decimal"): number | null {
  let s = raw.trim().replace(/^R\$\s*/, "").replace(/\s/g, "");
  if (/^\(.+\)$/.test(s)) s = `-${s.slice(1, -1)}`;
  const pattern = format === "br" ? /^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/ : /^[+-]?\d+(?:\.\d{1,2})?$/;
  if (!pattern.test(s)) return null;
  if (format === "br") s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) && Math.abs(n) <= 1_000_000 && n !== 0 ? Math.round(n * 100) / 100 : null;
}
const entryKey = (date: string, label: string, amount: number, kind: string) => JSON.stringify([date, normalize(label), Math.round(amount * 100), kind]);

function existingMatch(entry: StatementEntry, months: CashflowMonth[]): boolean {
  const year = Number(entry.date.slice(0, 4)), month = MONTHS[Number(entry.date.slice(5, 7)) - 1];
  return months.some(m => m.year === year && m.month === month && m[entry.kind].some(item =>
    item.importKey === entry.key || (normalize(item.label) === normalize(entry.label) && Math.round(item.amount * 100) === Math.round(entry.amount * 100) && (!item.date || item.date === entry.date))));
}
export function previewStatement(rows: string[][], mapping: StatementMapping, format: "br" | "decimal", mode: "signed" | "incomes" | "expenses", months: CashflowMonth[]): StatementRow[] {
  const seen = new Set<string>();
  return rows.slice(1).map((cells, index) => {
    const row = index + 2;
    const date = statementDate(cells[mapping.date] ?? "");
    const label = (cells[mapping.label] ?? "").trim();
    const value = statementAmount(cells[mapping.amount] ?? "", format);
    if (!date) return { row, error: "Data inválida: use DD/MM/AAAA ou AAAA-MM-DD." };
    if (!label || label.length > 240) return { row, error: "Descrição obrigatória, até 240 caracteres." };
    if (value === null) return { row, error: "Valor inválido para o formato selecionado." };
    let kind: StatementEntry["kind"] = mode === "signed" ? (value < 0 ? "expenses" : "incomes") : mode;
    if (mapping.kind >= 0) {
      const type = normalize(cells[mapping.kind] ?? "");
      if (["receita", "entrada", "credito", "credit", "income", "incomes"].includes(type)) kind = "incomes";
      else if (["despesa", "saida", "debito", "debit", "expense", "expenses"].includes(type)) kind = "expenses";
      else return { row, error: "Tipo inválido: informe receita/entrada ou despesa/saída." };
    }
    const amount = Math.abs(value), key = entryKey(date, label, amount, kind);
    const entry = { row, date, label, amount, kind, key };
    const duplicate = seen.has(key) ? "Repetido neste CSV" : existingMatch(entry, months) ? "Possível duplicata no Fluxo (data ou mês, descrição e valor)" : undefined;
    seen.add(key);
    return { row, entry, duplicate };
  });
}

/** Append only, with a second duplicate check against the latest state. */
export function appendStatement(months: CashflowMonth[], entries: StatementEntry[], batchId: string, paid: boolean): CashflowMonth[] {
  let next = [...months];
  for (const entry of entries) {
    if (existingMatch(entry, next)) continue;
    const date = statementDate(entry.date);
    if (!date || !entry.label.trim() || entry.label.length > 240 || !Number.isFinite(entry.amount) || entry.amount <= 0 || entry.amount > 1_000_000 || !["incomes", "expenses"].includes(entry.kind) || entry.key !== entryKey(date, entry.label, entry.amount, entry.kind)) throw new Error("Lançamento de importação inválido.");
    const month = MONTHS[Number(date.slice(5, 7)) - 1], year = Number(date.slice(0, 4));
    const item: CashflowItem = { id: `csv:${batchId}:${entry.row}`, date, label: entry.label, amount: entry.amount, paid, category: "outros", source: "csv", importBatchId: batchId, importKey: entry.key };
    next = mergeCashflowMonths(next, [{ month, year, incomes: [], expenses: [] }]).map(m => m.month === month && m.year === year ? { ...m, [entry.kind]: [...m[entry.kind], item] } : m);
  }
  return next;
}
export function undoStatement(months: CashflowMonth[], batchId: string): CashflowMonth[] {
  return months.map(m => ({ ...m, incomes: m.incomes.filter(i => i.importBatchId !== batchId), expenses: m.expenses.filter(i => i.importBatchId !== batchId) }));
}

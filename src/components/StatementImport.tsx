import { useMemo, useRef, useState } from "react";
import { FileUp, RotateCcw } from "lucide-react";
import { useFinanceStore } from "@/stores/financeStore";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { money } from "@/lib/planningTools";
import { parseStatementCsv, previewStatement, suggestMapping, type StatementMapping } from "@/lib/statementImport";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function StatementImport() {
  const store = useFinanceStore();
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<StatementMapping>({ date: -1, label: -1, amount: -1, kind: -1 });
  const [format, setFormat] = useState<"br" | "decimal">("br");
  const [mode, setMode] = useState<"signed" | "incomes" | "expenses">("signed");
  const [paid, setPaid] = useState(true);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reading, setReading] = useState(false);
  const submitted = useRef(false);
  const fileGeneration = useRef(0);
  const ready = mapping.date >= 0 && mapping.label >= 0 && mapping.amount >= 0;
  const preview = useMemo(() => ready && rows.length ? previewStatement(rows, mapping, format, mode, store.cashflowMonths) : [], [ready, rows, mapping, format, mode, store.cashflowMonths]);
  const selected = preview.filter(r => r.entry && !r.error && !r.duplicate && !excluded.has(r.row)).map(r => r.entry!);
  const duplicates = preview.filter(r => r.duplicate).length;
  const invalid = preview.filter(r => r.error).length;
  const blocked = !store.cloudReady || store.syncStatus !== "saved" || reading;
  const batches = useMemo(() => {
    const counts = new Map<string, number>();
    store.cashflowMonths.forEach(m => [...m.incomes, ...m.expenses].forEach(i => { if (i.importBatchId) counts.set(i.importBatchId, (counts.get(i.importBatchId) ?? 0) + 1); }));
    return [...counts.entries()].reverse();
  }, [store.cashflowMonths]);

  const read = async (file?: File) => {
    if (!file) return;
    const generation = ++fileGeneration.current;
    setError(""); setNotice(""); setRows([]); setReading(true); submitted.current = false;
    try {
      if (!/\.csv$/i.test(file.name) || file.size > 1_000_000) throw new Error("Escolha um arquivo .csv de até 1 MB.");
      const bytes = await file.arrayBuffer();
      let text: string;
      try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
      catch { text = new TextDecoder("windows-1252").decode(bytes); }
      const parsed = parseStatementCsv(text);
      if (generation !== fileGeneration.current) return;
      setRows(parsed); setMapping(suggestMapping(parsed[0])); setExcluded(new Set());
    } catch (e) { if (generation === fileGeneration.current) setError(e instanceof Error ? e.message : "Não foi possível ler o CSV."); }
    finally { if (generation === fileGeneration.current) setReading(false); }
  };
  const confirm = () => {
    if (blocked || !selected.length || submitted.current) return;
    submitted.current = true;
    try {
      store.importStatement(selected, crypto.randomUUID(), paid);
      setNotice(`${selected.length} lançamento(s) enviado(s) para salvar. Aguarde a confirmação de sincronização no topo. Nenhum registro anterior foi substituído.`);
      setRows([]);
    } catch (e) { submitted.current = false; setError(e instanceof Error ? e.message : "Falha ao importar."); }
  };
  const column = (key: keyof StatementMapping, label: string) => <label className="space-y-2 text-sm"><span className="block font-medium">{label}</span><select className="h-11 w-full rounded-xl border border-input bg-background px-3" value={mapping[key]} onChange={e => { setMapping(m => ({ ...m, [key]: Number(e.target.value) })); setExcluded(new Set()); }}><option value={-1}>{key === "kind" ? "Usar regra abaixo" : "Selecione a coluna"}</option>{rows[0]?.map((h, i) => <option key={i} value={i}>{h || `Coluna ${i + 1}`}</option>)}</select></label>;

  return <section className="glass-card space-y-5 p-5 sm:p-6" aria-labelledby="csv-title">
    <div><h2 id="csv-title" className="flex items-center gap-2 text-lg font-semibold"><FileUp className="h-5 w-5 text-primary" /> Importar extrato CSV</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Revise os lançamentos antes de salvar no Fluxo. O arquivo é lido neste dispositivo. Duplicatas por data ou mês, descrição e valor ficam fora da importação.</p></div>
    <label className="block space-y-2 text-sm font-medium"><span>Arquivo do extrato (até 1 MB, 1.000 linhas)</span><input type="file" accept=".csv,text/csv" disabled={reading} className="block w-full rounded-xl border border-input p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2" onChange={e => { void read(e.target.files?.[0]); e.target.value = ""; }} /></label>
    <p className="text-xs leading-relaxed text-muted-foreground">Cabeçalhos usuais: data, descrição e valor. Datas em DD/MM/AAAA ou AAAA-MM-DD. Compras de cartão importadas aqui entram como despesas no Fluxo; não importe parcelas que já estão na Carteira.</p>
    {reading && <p role="status" className="text-sm">Lendo arquivo…</p>}
    {rows.length > 0 && <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{column("date", "Data")}{column("label", "Descrição")}{column("amount", "Valor")}{column("kind", "Tipo (opcional)")}</div>
      <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm"><span className="block font-medium">Formato do valor</span><select value={format} onChange={e => setFormat(e.target.value as typeof format)} className="h-11 w-full rounded-xl border border-input bg-background px-3"><option value="br">Brasileiro: 1.234,56</option><option value="decimal">Decimal: 1234.56</option></select></label><label className="space-y-2 text-sm"><span className="block font-medium">Regra quando não há coluna de tipo</span><select value={mode} onChange={e => setMode(e.target.value as typeof mode)} className="h-11 w-full rounded-xl border border-input bg-background px-3"><option value="signed">Negativo = despesa; positivo = receita</option><option value="expenses">Todos são despesas (ex.: fatura)</option><option value="incomes">Todos são receitas</option></select></label></div>
      <label className="flex min-h-11 items-center gap-3 text-sm"><Checkbox checked={paid} onCheckedChange={v => setPaid(v === true)} /> Marcar como pagos / recebidos</label>
      {!ready ? <p role="status" className="text-sm">Selecione as colunas obrigatórias para ver a prévia.</p> : <>
        <p role="status" className="text-sm">{selected.length} selecionado(s) · {duplicates} possível(is) duplicata(s) · {invalid} inválido(s)</p>
        <div className="max-h-96 overflow-auto rounded-xl border border-border"><table className="w-full min-w-[640px] text-left text-sm"><caption className="sr-only">Prévia dos lançamentos do CSV</caption><thead className="sticky top-0 bg-card"><tr>{["Incluir", "Linha", "Data", "Descrição", "Tipo", "Valor", "Situação"].map(h => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead><tbody>{preview.map(r => <tr key={r.row} className="border-t border-border/50"><td className="p-3"><Checkbox aria-label={`Incluir linha ${r.row}`} checked={!!r.entry && !r.duplicate && !excluded.has(r.row)} disabled={!r.entry || !!r.duplicate} onCheckedChange={v => setExcluded(prev => { const next = new Set(prev); if (v) next.delete(r.row); else next.add(r.row); return next; })} /></td><td className="p-3">{r.row}</td><td className="whitespace-nowrap p-3">{r.entry?.date.split("-").reverse().join("/") ?? "—"}</td><td className="max-w-64 break-words p-3">{r.entry?.label ?? "—"}</td><td className="p-3">{r.entry ? r.entry.kind === "incomes" ? "Receita" : "Despesa" : "—"}</td><td className="whitespace-nowrap p-3 tabular-nums">{r.entry ? money(r.entry.amount) : "—"}</td><td className="p-3 text-xs text-muted-foreground">{r.error ?? r.duplicate ?? (excluded.has(r.row) ? "Excluído" : "Pronto")}</td></tr>)}</tbody></table></div>
        <div className="flex flex-wrap gap-3"><Button onClick={confirm} disabled={blocked || !selected.length}>Confirmar importação de {selected.length} lançamento(s)</Button><Button variant="outline" onClick={() => { setRows([]); setError(""); }}>Cancelar prévia</Button></div>
        {blocked && <p className="text-sm text-muted-foreground">Aguarde a sincronização dos dados antes de importar.</p>}
      </>}
    </>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
    {batches.length > 0 && <details className="rounded-xl border border-border p-4"><summary className="cursor-pointer text-sm font-medium">Importações salvas ({batches.length})</summary><ul className="mt-3 space-y-3">{batches.map(([id, count], index) => <li key={id} className="flex flex-wrap items-center justify-between gap-3 text-sm"><span>Lote {batches.length - index} · {count} lançamento(s)</span><AlertDialog><AlertDialogTrigger asChild><Button variant="outline" size="sm" disabled={blocked} className="gap-2"><RotateCcw className="h-4 w-4" /> Desfazer lote</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Desfazer esta importação?</AlertDialogTitle><AlertDialogDescription>Serão removidos somente os {count} lançamentos deste lote, incluindo eventuais edições feitas neles. Seus outros registros serão preservados. O CSV pode ser importado novamente.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Manter lançamentos</AlertDialogCancel><AlertDialogAction onClick={() => store.undoStatementImport(id)}>Desfazer lote</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></li>)}</ul></details>}
  </section>;
}

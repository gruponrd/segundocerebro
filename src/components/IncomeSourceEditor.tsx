import { useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { incomeBreakdown, updateIncomeSourceValues, type IncomeSource } from "@/lib/incomeSources";
import { money } from "@/lib/planningTools";

type DraftDeduction = { id: string; label: string; value: string };
export function IncomeSourceEditor({ source, onRemove, onUpdate }: {
  source: IncomeSource;
  onRemove: () => void;
  onUpdate: (updates: Partial<Pick<IncomeSource, "label" | "amount" | "grossAmount" | "deductions">>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [gross, setGross] = useState("");
  const [deductions, setDeductions] = useState<DraftDeduction[]>([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const current = incomeBreakdown(source);
  const resetDraft = () => {
    setGross(String(source.grossAmount ?? source.amount));
    setDeductions((source.deductions ?? []).map(item => ({ id: item.id, label: item.label, value: String(item.amount) })));
    setError(""); setSaved(false);
  };
  const draftTotal = deductions.reduce((sum, item) => sum + Math.round(Number(item.value) * 100), 0) / 100;
  const previewNet = Math.round((Number(gross) - draftTotal) * 100) / 100;

  return <div className="rounded-xl border border-border/60 p-4 space-y-3">
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <label className="mb-1 block text-xs text-muted-foreground" htmlFor={`${source.id}-name`}>Fonte de renda</label>
        <Input id={`${source.id}-name`} aria-label="Nome da fonte de renda" value={source.label} onChange={event => onUpdate({ label: event.target.value })} placeholder="Ex: Salário CLT" className="h-10 rounded-xl" />
      </div>
      <Button variant="ghost" size="icon" className="mt-5 shrink-0 text-muted-foreground hover:text-destructive" aria-label={`Excluir fonte de renda ${source.label || "sem nome"}`} onClick={onRemove}><Trash2 aria-hidden="true" className="h-4 w-4" /></Button>
    </div>
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div><p className="text-xs text-muted-foreground">Líquido mensal</p><p className="text-xl font-bold tabular-nums text-income">{money(current.net)}</p></div>
      {!editing && <Button variant="outline" size="sm" onClick={() => { resetDraft(); setEditing(true); }} aria-expanded={editing} aria-controls={`${source.id}-payroll`}><Pencil aria-hidden="true" className="mr-2 h-3.5 w-3.5" />Bruto e descontos</Button>}
    </div>
    {!editing && <p className="text-xs text-muted-foreground">{source.grossAmount === undefined ? "Valor existente preservado como líquido. Informe o bruto para detalhar os descontos." : `Bruto ${money(current.gross)} · Descontos ${money(current.deductions)}`}</p>}
    {editing && <form id={`${source.id}-payroll`} className="purchase-preview space-y-4 border-t border-border/50 pt-4" onSubmit={event => {
      event.preventDefault();
      try {
        if (gross.trim() === "" || deductions.some(item => item.value.trim() === "")) throw new Error("Preencha o valor bruto e o valor de cada desconto.");
        const next = updateIncomeSourceValues(source, { grossAmount: Number(gross), deductions: deductions.map(item => ({ id: item.id, label: item.label.trim(), amount: Number(item.value) })) });
        onUpdate({ grossAmount: next.grossAmount, deductions: next.deductions, amount: next.amount });
        setEditing(false); setSaved(true); setError("");
      } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar a composição."); }
    }}>
      <div><label htmlFor={`${source.id}-gross`} className="mb-1.5 block text-sm font-medium">Valor bruto mensal</label><Input id={`${source.id}-gross`} type="number" inputMode="decimal" min="0" step="0.01" value={gross} onChange={event => setGross(event.target.value)} required aria-describedby={error ? `${source.id}-error` : undefined} /></div>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Descontos mensais</legend>
        {deductions.length === 0 && <p className="text-xs text-muted-foreground">Nenhum desconto. Adicione os valores do seu comprovante, como INSS, IRRF ou benefícios.</p>}
        {deductions.map((item, index) => <div key={item.id} className="flex items-end gap-2">
          <div className="min-w-0 flex-1"><label className="mb-1 block text-xs text-muted-foreground" htmlFor={`${item.id}-label`}>Desconto {index + 1}</label><Input id={`${item.id}-label`} value={item.label} placeholder="Ex: INSS" onChange={event => setDeductions(previous => previous.map(row => row.id === item.id ? { ...row, label: event.target.value } : row))} required /></div>
          <div className="w-28 shrink-0"><label className="mb-1 block text-xs text-muted-foreground" htmlFor={`${item.id}-amount`}>Valor (R$)</label><Input id={`${item.id}-amount`} aria-label={`Valor do desconto ${index + 1}`} type="number" inputMode="decimal" min="0" step="0.01" value={item.value} onChange={event => setDeductions(previous => previous.map(row => row.id === item.id ? { ...row, value: event.target.value } : row))} required /></div>
          <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label={`Remover desconto ${index + 1}`} onClick={() => setDeductions(previous => previous.filter(row => row.id !== item.id))}><Trash2 aria-hidden="true" className="h-4 w-4" /></Button>
        </div>)}
        <Button type="button" variant="ghost" size="sm" onClick={() => setDeductions(previous => [...previous, { id: crypto.randomUUID(), label: "", value: "" }])}><Plus aria-hidden="true" className="mr-1 h-4 w-4" />Adicionar desconto</Button>
      </fieldset>
      <div className="flex flex-wrap justify-between gap-2 rounded-lg bg-income/10 p-3 text-sm"><span>Líquido após descontos</span><strong className="tabular-nums">{Number.isFinite(previewNet) && previewNet >= 0 ? money(previewNet) : "Revise os valores"}</strong></div>
      <p className="text-xs leading-relaxed text-muted-foreground">O líquido será usado em Renda e na comparação de Renda Ideal Sugerida. Lançamentos já feitos no Fluxo de caixa são mantidos.</p>
      {error && <p role="alert" id={`${source.id}-error`} className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2"><Button type="submit">Salvar composição</Button><Button type="button" variant="outline" onClick={() => { setEditing(false); setError(""); }}>Cancelar</Button></div>
    </form>}
    {saved && <p role="status" className="text-xs text-income">Composição atualizada. O líquido já é a base da renda cadastrada.</p>}
  </div>;
}

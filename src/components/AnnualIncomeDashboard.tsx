import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/planningTools";
import { annualGoalsForYear, confirmedAnnualIncome, INCOME_MONTHS } from "@/lib/annualIncome";
import { AnnualIncomeChart } from "@/components/AnnualIncomeChart";
import { useFinanceStore } from "@/stores/financeStore";

const sum = (values: number[]) => Math.round(values.reduce((total, value) => total + Math.round(value * 100), 0)) / 100;
const toInput = (value: number) => value ? value.toFixed(2).replace(".", ",") : "";
function parseGoal(value: string): number | null {
  const clean = value.trim().replace(/\s/g, "");
  if (!clean) return 0;
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(clean)) return null;
  const amount = Number(clean.replace(",", "."));
  return Number.isFinite(amount) && amount <= 999999999 ? amount : null;
}

export function AnnualIncomeDashboard() {
  const store = useFinanceStore();
  const [year, setYear] = useState(() => Math.max(2027, new Date().getFullYear()));
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [sameValue, setSameValue] = useState("");
  const [error, setError] = useState("");
  const goals = useMemo(() => annualGoalsForYear(store.annualIncomeGoals[String(year)]), [store.annualIncomeGoals, year]);
  const received = useMemo(() => confirmedAnnualIncome(store.cashflowMonths, year), [store.cashflowMonths, year]);
  const target = sum(goals);
  const total = sum(received);
  const percentage = target > 0 ? Math.round(total / target * 100) : 0;
  const maxBar = Math.max(...goals, ...received, 1);
  const startEditing = () => { setDraft(goals.map(toInput)); setSameValue(""); setError(""); setOpen(true); };
  const save = () => {
    const parsed = draft.map(parseGoal);
    if (parsed.some(value => value === null)) { setError("Informe valores positivos, com até duas casas decimais."); return; }
    store.setAnnualIncomeGoal(year, parsed as number[]);
    setOpen(false);
  };
  const fill = () => {
    const value = parseGoal(sameValue);
    if (value === null || !sameValue.trim()) { setError("Informe um valor mensal válido para aplicar aos meses."); return; }
    setDraft(Array(12).fill(toInput(value))); setError("");
  };
  return (
    <section aria-labelledby="annual-income-title" className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Planejamento anual</p>
          <h2 id="annual-income-title" className="mt-1 text-xl font-bold">Rendimentos do ano</h2>
          <p className="mt-1 text-sm text-muted-foreground">Somente entradas marcadas como recebidas no fluxo de caixa.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-border bg-background">
            <Button variant="ghost" size="icon" aria-label="Ano anterior" disabled={year <= 2027} onClick={() => setYear(year - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="min-w-12 text-center text-sm font-semibold tabular-nums">{year}</span>
            <Button variant="ghost" size="icon" aria-label="Próximo ano" disabled={year >= 2100} onClick={() => setYear(year + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <Button variant="outline" onClick={startEditing} disabled={!store.cloudReady || store.syncStatus === "conflict" || store.localRecoveryAvailable} className="gap-2"><Pencil className="h-4 w-4" />{target ? "Editar metas" : "Definir metas"}</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl bg-secondary/50 p-4"><p className="text-xs text-muted-foreground">Recebido em {year}</p><p className="mt-2 text-lg font-bold tabular-nums text-income sm:text-2xl">{money(total)}</p></div>
        <div className="rounded-xl bg-secondary/50 p-4"><p className="text-xs text-muted-foreground">Meta anual</p><p className="mt-2 text-lg font-bold tabular-nums sm:text-2xl">{target ? money(target) : "Não definida"}</p></div>
        <div className="rounded-xl bg-secondary/50 p-4"><p className="text-xs text-muted-foreground">Progresso</p><p className="mt-2 text-lg font-bold tabular-nums sm:text-2xl">{target ? `${percentage}%` : "—"}</p></div>
        <div className="rounded-xl bg-secondary/50 p-4"><p className="text-xs text-muted-foreground">Falta para a meta</p><p className="mt-2 text-lg font-bold tabular-nums sm:text-2xl">{target ? money(Math.max(0, target - total)) : "—"}</p></div>
      </div>
      <AnnualIncomeChart received={received} target={target} year={year} />
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Mês a mês</h3><span className="text-xs text-muted-foreground">Referência: mês do lançamento no fluxo</span></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {INCOME_MONTHS.map((month, index) => <div key={month} className="min-w-0 rounded-xl border border-border/70 p-3">
          <div className="flex justify-between gap-1"><span className="text-xs text-muted-foreground">{month.slice(0, 3)}</span>{goals[index] > 0 && <span className="text-xs text-muted-foreground">{Math.round(received[index] / goals[index] * 100)}%</span>}</div>
          <p className="mt-2 break-words text-sm font-semibold tabular-nums">{money(received[index])}</p>
          <p className="mt-1 text-xs text-muted-foreground">{goals[index] ? `Meta ${money(goals[index])}` : "Sem meta"}</p>
          <div aria-hidden="true" className="mt-3 h-1 rounded-full bg-secondary"><div className="h-full rounded-full bg-income" style={{ width: `${Math.max(0, Math.min(received[index] / maxBar * 100, 100))}%` }} /></div>
        </div>)}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">Ao marcar ou desmarcar uma entrada como recebida no Fluxo de caixa, os valores são atualizados. Valores previstos e fontes de renda não confirmadas não são somados.</p>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" />Metas de renda · {year}</DialogTitle><DialogDescription>Defina quanto pretende receber em cada mês. A soma será sua meta anual; você pode ajustar os valores depois.</DialogDescription></DialogHeader>
        <div className="flex flex-wrap items-end gap-2"><label className="flex-1 min-w-40 text-sm">Mesmo valor para todos os meses<Input inputMode="decimal" className="mt-1" value={sameValue} onChange={event => setSameValue(event.target.value)} placeholder="Ex.: 5000,00" /></label><Button variant="secondary" onClick={fill}>Aplicar aos 12 meses</Button></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{INCOME_MONTHS.map((month, index) => <label key={month} className="text-sm">{month}<Input className="mt-1" inputMode="decimal" value={draft[index] ?? ""} placeholder="0,00" onChange={event => setDraft(previous => previous.map((value, i) => i === index ? event.target.value : value))} /></label>)}</div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar metas</Button></DialogFooter>
      </DialogContent></Dialog>
    </section>
  );
}

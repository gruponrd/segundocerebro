import { useId, useMemo, useRef, useState } from "react";
import type { Installment } from "@/data/financialData";
import { useFinanceStore } from "@/stores/financeStore";
import { buildPurchasePlan, buildRemainingPlan, partitionInstallments } from "@/lib/installmentPlan";
import { money } from "@/lib/planningTools";
import { EXPENSE_CATEGORIES } from "@/data/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function CardPurchaseForm({ bankId: initialBankId, initialDate, source, onDone, onCancel }: {
  bankId?: string; initialDate?: string; source?: Installment; onDone: () => void; onCancel: () => void;
}) {
  const store = useFinanceStore();
  const id = useId();
  const [purchaseId] = useState(() => crypto.randomUUID());
  const activeBanks = store.banks.filter(bank => bank.status !== "cancelado");
  const [bankId, setBankId] = useState(initialBankId ?? activeBanks[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [count, setCount] = useState("1");
  const [mode, setMode] = useState<"installment" | "total">("installment");
  const [date, setDate] = useState(initialDate ?? new Date().toLocaleDateString("en-CA"));
  const [category, setCategory] = useState("outros");
  const [review, setReview] = useState(!!source);
  const saving = useRef(false);
  const bank = activeBanks.find(item => item.id === bankId);
  const plan = useMemo(() => {
    try {
      const candidates = source ? buildRemainingPlan(source, purchaseId, bank?.installments) : buildPurchasePlan({ description, amount: Number(amount), count: Number(count), amountMode: mode, firstDueDate: date, category, purchaseId });
      return { candidates, error: "" };
    } catch (error) { return { candidates: [], error: (error as Error).message }; }
  }, [source, purchaseId, description, amount, count, mode, date, category, bank]);
  const { missing, duplicates } = partitionInstallments(bank?.installments ?? [], plan.candidates);
  const sourceChanged = !!source && !bank?.installments.some(item => item.id === source.id && JSON.stringify(item) === JSON.stringify(source));
  const error = !bank ? "Selecione um cartão ativo." : sourceChanged ? "A parcela original mudou. Feche esta janela e confira os dados antes de tentar novamente." : plan.error;
  const selectStyle = "min-h-11 w-full rounded-xl border border-input bg-background px-3 text-base sm:text-sm";
  const save = () => {
    if (error || !missing.length || saving.current) return;
    saving.current = true;
    store.addInstallmentBatch(bankId, missing, source);
    onDone();
  };

  return <div className="space-y-4">
    {!review && <>
      <div><label htmlFor={`${id}-bank`} className="text-sm">Cartão</label><select id={`${id}-bank`} value={bankId} onChange={event => setBankId(event.target.value)} className={selectStyle}>{!activeBanks.length && <option value="">Cadastre um cartão primeiro</option>}{activeBanks.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      <div><label htmlFor={`${id}-description`} className="text-sm">Descrição da compra</label><Input id={`${id}-description`} value={description} onChange={event => setDescription(event.target.value)} placeholder="Ex.: Notebook" className="min-h-11 text-base" /></div>
      <div><label htmlFor={`${id}-mode`} className="text-sm">Como deseja informar o valor?</label><select id={`${id}-mode`} value={mode} onChange={event => setMode(event.target.value as typeof mode)} className={selectStyle}><option value="installment">Valor de cada parcela</option><option value="total">Valor total da compra</option></select></div>
      <div className="grid grid-cols-2 gap-3"><div><label htmlFor={`${id}-amount`} className="text-sm">{mode === "installment" ? "Valor por parcela (R$)" : "Valor total (R$)"}</label><Input id={`${id}-amount`} type="number" min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} className="min-h-11 text-base" /></div><div><label htmlFor={`${id}-count`} className="text-sm">Quantidade de parcelas</label><Input id={`${id}-count`} type="number" min="1" max="120" step="1" value={count} onChange={event => setCount(event.target.value)} className="min-h-11 text-base" /></div></div>
      <div><label htmlFor={`${id}-date`} className="text-sm">Vencimento da primeira parcela</label><Input id={`${id}-date`} type="date" value={date} onInput={event => setDate(event.currentTarget.value)} onChange={event => setDate(event.target.value)} className="min-h-11 text-base" /></div>
      <div><label htmlFor={`${id}-category`} className="text-sm">Categoria</label><select id={`${id}-category`} value={category} onChange={event => setCategory(event.target.value)} className={selectStyle}>{EXPENSE_CATEGORIES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
    </>}
    {review && <>
      <div className="rounded-xl border border-border bg-secondary/30 p-3 text-sm"><p className="font-medium">{bank?.name} · {source?.description ?? description}</p><p className="mt-1">{missing.length} {missing.length === 1 ? "parcela a criar" : "parcelas a criar"} · {money(missing.reduce((sum, item) => sum + Math.round(item.installmentAmount * 100), 0) / 100)}</p><p className="mt-1 text-xs text-muted-foreground">Os registros existentes e os pagamentos já realizados serão preservados.</p></div>
      {!!duplicates.length && <p role="status" className="text-sm text-muted-foreground">{duplicates.length} {duplicates.length === 1 ? "possível parcela já cadastrada. Ela será ignorada" : "possíveis parcelas já cadastradas. Elas serão ignoradas"} para evitar duplicação. Se forem compras diferentes, confira a descrição e as datas.</p>}
      <div className="max-h-56 overflow-auto rounded-xl border border-border"><table className="w-full text-left text-sm"><caption className="sr-only">Prévia das parcelas que serão criadas</caption><thead><tr><th scope="col" className="p-2">Parcela</th><th scope="col" className="p-2">Vencimento</th><th scope="col" className="p-2 text-right">Valor</th></tr></thead><tbody>{missing.map(item => <tr key={item.currentInstallment} className="border-t border-border"><td className="p-2">{item.currentInstallment}/{item.totalInstallments}</td><td className="p-2 whitespace-nowrap">{new Date(`${item.dueDate}T00:00:00`).toLocaleDateString("pt-BR")}</td><td className="p-2 text-right whitespace-nowrap tabular-nums">{money(item.installmentAmount)}</td></tr>)}</tbody></table></div>
      {!missing.length && !error && <p role="status" className="text-sm">Todas as parcelas desta sequência já estão cadastradas.</p>}
    </>}
    {error && review && <p role="alert" className="text-sm text-expense">{error}</p>}
    <div className="flex flex-wrap gap-2">
      {review ? <Button type="button" onClick={save} disabled={!!error || !missing.length} className="min-h-11">Criar {missing.length} {missing.length === 1 ? "parcela" : "parcelas"}</Button> : <Button type="button" onClick={() => setReview(true)} disabled={!activeBanks.length} className="min-h-11">Conferir parcelas</Button>}
      {review && !source && <Button type="button" variant="outline" onClick={() => setReview(false)} className="min-h-11">Editar</Button>}
      <Button type="button" variant="ghost" onClick={onCancel} className="min-h-11">Cancelar</Button>
    </div>
  </div>;
}

export function CardPurchaseButton({ bankId, initialDate, source, children }: { bankId?: string; initialDate?: string; source?: Installment; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button type="button" variant="outline" size="sm" className="min-h-11 h-auto whitespace-normal">{children ?? (source ? "Gerar parcelas restantes" : "Adicionar compra parcelada")}</Button></DialogTrigger><DialogContent className="max-h-[85dvh] overflow-y-auto rounded-2xl sm:max-w-lg"><DialogHeader><DialogTitle>{source ? "Gerar parcelas restantes" : "Compra no cartão"}</DialogTitle><DialogDescription>{source ? "Confira as próximas parcelas. Nenhum registro existente será substituído." : "Informe o valor por parcela ou o total e confira os vencimentos antes de salvar."}</DialogDescription></DialogHeader><CardPurchaseForm bankId={bankId} initialDate={initialDate} source={source} onDone={() => setOpen(false)} onCancel={() => setOpen(false)} /></DialogContent></Dialog>;
}

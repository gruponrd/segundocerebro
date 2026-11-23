import { useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { type BankId, type Installment } from "@/data/financialData";
import { EXPENSE_CATEGORIES, getCategory, suggestCategory } from "@/data/categories";

interface InstallmentItem {
  id: string;
  description: string;
  installmentAmount: number;
  currentInstallment: number;
  totalInstallments: number;
  dueDate: string;
  overdue: boolean;
  bankName: string;
  bankColor: string;
  bankId?: BankId;
  category?: string;
}

interface InstallmentTimelineProps {
  installments: InstallmentItem[];
  onUpdate?: (bankId: BankId, installmentId: string, updates: Partial<Omit<Installment, "id">>) => void;
  onRemove?: (bankId: BankId, installmentId: string) => void;
}

const bankDotColor: Record<string, string> = {
  "bank-nubank": "bg-bank-nubank",
  "bank-inter": "bg-bank-inter",
  "bank-c6": "bg-muted-foreground",
  "bank-itau": "bg-bank-itau",
  "bank-bb": "bg-bank-bb",
  "bank-other": "bg-bank-other",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function EditableInstallment({ item, onUpdate, onRemove }: {
  item: InstallmentItem;
  onUpdate?: (bankId: BankId, id: string, updates: Partial<Omit<Installment, "id">>) => void;
  onRemove?: (bankId: BankId, id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(item.description);
  const [amount, setAmount] = useState(String(item.installmentAmount));
  const [date, setDate] = useState(item.dueDate);
  const [category, setCategory] = useState(item.category ?? suggestCategory(item.description));

  const save = () => {
    if (!onUpdate || !item.bankId) return;
    const amt = parseFloat(amount);
    if (isNaN(amt)) return;
    onUpdate(item.bankId, item.id, { description: desc, installmentAmount: amt, dueDate: date, category });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="installment-editor p-3 rounded-xl bg-secondary/40 space-y-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-2">
          <Input aria-label="Descrição da parcela" value={desc} onChange={(e) => setDesc(e.target.value)} className="h-9 text-base min-w-0 flex-1" placeholder="Descrição" autoFocus />
          <Input aria-label="Valor da parcela em reais" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-7 text-xs w-24" placeholder="Valor" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input aria-label="Vencimento da parcela" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-7 text-xs w-36" />
          <select aria-label="Categoria da parcela" value={category} onChange={(e) => setCategory(e.target.value)} className="h-7 text-xs rounded-lg bg-secondary border border-border/50 px-2 text-foreground">
            {EXPENSE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
          </select>
          <button onClick={save} aria-label="Salvar parcela" className="icon-action hover:bg-income/20 text-income"><Check className="w-3.5 h-3.5" /></button>
          <button onClick={() => setEditing(false)} aria-label="Cancelar edição de parcela" className="icon-action hover:bg-expense/20 text-expense"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="installment-row flex flex-wrap items-center gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors group/item">
      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${bankDotColor[item.bankColor] || "bg-muted-foreground"}`} />
      <div className="installment-description flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{item.description}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {item.overdue && <span className="rounded bg-expense/10 px-1.5 py-0.5 text-xs text-expense">Em atraso</span>}
          <p className="text-xs text-muted-foreground">
            {item.bankName} · {item.totalInstallments > 1 ? `${item.currentInstallment}/${item.totalInstallments}` : "Avulsa"} · {formatDate(item.dueDate)}
          </p>
          {(() => {
            const c = getCategory(item.category ?? suggestCategory(item.description));
            return (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${c.bg} ${c.color}`}>
                {c.emoji} {c.label}
              </span>
            );
          })()}
        </div>
      </div>
      <span className="installment-amount text-sm text-money text-foreground shrink-0">
        R$ {item.installmentAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
      </span>
      {onUpdate && (
        <div className="installment-actions flex gap-1 shrink-0">
          <button onClick={() => { setDesc(item.description); setAmount(String(item.installmentAmount)); setDate(item.dueDate); setCategory(item.category ?? suggestCategory(item.description)); setEditing(true); }} aria-label={`Editar parcela ${item.description}`} className="icon-action text-muted-foreground">
            <Pencil className="w-3 h-3" />
          </button>
          {onRemove && item.bankId && (
            <button onClick={() => onRemove(item.bankId!, item.id)} aria-label={`Excluir parcela ${item.description}`} className="icon-action hover:bg-expense/20 text-expense">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function InstallmentTimeline({ installments, onUpdate, onRemove }: InstallmentTimelineProps) {
  return (
    <div className="space-y-2">
      {installments.length ? installments.map(item => (
        <EditableInstallment key={`${item.bankId}:${item.id}`} item={item} onUpdate={onUpdate} onRemove={onRemove} />
      )) : <p className="analysis-due-empty">Nenhuma parcela pendente no mês selecionado.</p>}
    </div>
  );
}

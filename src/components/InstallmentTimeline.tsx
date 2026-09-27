import { useState } from "react";
import { Calendar, Pencil, Trash2, Check, X, Plus } from "lucide-react";
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
  status: string;
  bankName: string;
  bankColor: string;
  bankId?: BankId;
  category?: string;
}

interface InstallmentTimelineProps {
  installments: InstallmentItem[];
  onUpdate?: (bankId: BankId, installmentId: string, updates: Partial<Omit<Installment, "id">>) => void;
  onRemove?: (bankId: BankId, installmentId: string) => void;
  onAdd?: (bankId: BankId, inst: Omit<Installment, "id">) => void;
  banks?: { id: BankId; name: string }[];
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

function filterCurrentMonth(items: InstallmentItem[]) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  return items.filter((item) => {
    const d = new Date(item.dueDate + "T00:00:00");
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
}

function groupByMonth(items: InstallmentItem[]) {
  const groups: Record<string, InstallmentItem[]> = {};
  items.forEach((item) => {
    const d = new Date(item.dueDate + "T00:00:00");
    const key = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return groups;
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
      <div className="p-3 rounded-xl bg-secondary/40 space-y-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-2">
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} className="h-7 text-xs flex-1" placeholder="Descrição" autoFocus />
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-7 text-xs w-24" placeholder="Valor" />
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-7 text-xs w-36" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-7 text-xs rounded-lg bg-secondary border border-border/50 px-2 text-foreground">
            {EXPENSE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
          </select>
          <button onClick={save} className="p-1 rounded hover:bg-income/20 text-income"><Check className="w-3.5 h-3.5" /></button>
          <button onClick={() => setEditing(false)} className="p-1 rounded hover:bg-expense/20 text-expense"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors group/item">
      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${bankDotColor[item.bankColor] || "bg-muted-foreground"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{item.description}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
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
      <span className="text-sm text-money text-foreground shrink-0">
        R$ {item.installmentAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
      </span>
      {onUpdate && (
        <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0">
          <button onClick={() => { setDesc(item.description); setAmount(String(item.installmentAmount)); setDate(item.dueDate); setCategory(item.category ?? suggestCategory(item.description)); setEditing(true); }} className="p-1 rounded hover:bg-secondary text-muted-foreground">
            <Pencil className="w-3 h-3" />
          </button>
          {onRemove && item.bankId && (
            <button onClick={() => onRemove(item.bankId!, item.id)} className="p-1 rounded hover:bg-expense/20 text-expense">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AddInstallmentRow({ banks, onAdd }: { banks: { id: BankId; name: string }[]; onAdd: (bankId: BankId, inst: Omit<Installment, "id">) => void }) {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [total, setTotal] = useState("12");
  const [bankId, setBankId] = useState<BankId>(banks[0]?.id || "nubank");
  const [category, setCategory] = useState("outros");

  const save = () => {
    const amt = parseFloat(amount);
    const tot = parseInt(total);
    if (!desc || isNaN(amt) || !date || isNaN(tot)) return;
    onAdd(bankId, {
      description: desc,
      totalAmount: amt * tot,
      installmentAmount: amt,
      currentInstallment: 1,
      totalInstallments: tot,
      dueDate: date,
      status: "pendente" as const,
      category,
    });
    setDesc(""); setAmount(""); setDate(""); setTotal("12"); setCategory("outros");
    setOpen(false);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full flex items-center justify-center gap-1.5 text-xs text-primary/70 hover:text-primary py-2 rounded-lg hover:bg-primary/5 transition-colors mt-2">
        <Plus className="w-3.5 h-3.5" /> Adicionar parcela
      </button>
    );
  }

  return (
    <div className="p-3 rounded-xl bg-secondary/40 space-y-2 mt-2">
      <div className="flex gap-2">
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} className="h-7 text-xs flex-1" placeholder="Descrição" autoFocus />
        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-7 text-xs w-20" placeholder="Valor" />
      </div>
      <div className="flex items-center gap-2">
        <select value={bankId} onChange={(e) => setBankId(e.target.value as BankId)} className="h-7 text-xs rounded-lg bg-secondary border border-border/50 px-2 text-foreground">
          {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-7 text-xs w-32" />
        <Input type="number" value={total} onChange={(e) => setTotal(e.target.value)} className="h-7 text-xs w-14" placeholder="Parcelas" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-7 text-xs rounded-lg bg-secondary border border-border/50 px-2 text-foreground">
          {EXPENSE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
        </select>
        <button onClick={save} className="p-1 rounded hover:bg-income/20 text-income"><Check className="w-3.5 h-3.5" /></button>
        <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-expense/20 text-expense"><X className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

export function InstallmentTimeline({ installments, onUpdate, onRemove, onAdd, banks }: InstallmentTimelineProps) {
  const currentMonthItems = filterCurrentMonth(installments);
  const grouped = groupByMonth(currentMonthItems);

  return (
    <div className="glass-card rounded-2xl p-5 animate-float-in" style={{ animationDelay: "200ms" }}>
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Cronograma de Parcelas</h3>
      </div>

      <div className="space-y-5">
        {Object.entries(grouped).map(([month, items]) => (
          <div key={month}>
            <p className="text-xs font-semibold text-foreground uppercase mb-3 capitalize">{month}</p>
            <div className="space-y-2">
              {items.map((item) => (
                <EditableInstallment key={item.id} item={item} onUpdate={onUpdate} onRemove={onRemove} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {onAdd && banks && banks.length > 0 && (
        <AddInstallmentRow banks={banks} onAdd={onAdd} />
      )}
    </div>
  );
}

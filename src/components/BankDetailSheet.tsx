import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Pencil, Check, X, Trash2, Plus, Copy, Wifi, CalendarClock, CheckCircle2, Clock, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type Bank, type Installment, type BankId } from "@/data/financialData";
import { CardColorPicker } from "@/components/CardColorPicker";
import { getCardColor } from "@/data/cardColors";
import { cardSpendingForMonth, remainingInstallments } from "@/lib/financeCalculations";

interface BankDetailSheetProps {
  bank: Bank | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateInstallment: (bankId: BankId, installmentId: string, updates: Partial<Omit<Installment, "id">>) => void;
  onRemoveInstallment: (bankId: BankId, installmentId: string) => void;
  onAddInstallment: (bankId: BankId, inst: Omit<Installment, "id">) => void;
  onUpdateBank?: (bankId: BankId, updates: Partial<Pick<Bank, "name" | "limitTotal" | "status" | "color" | "glowClass">>) => void;
  onRemoveBank?: (bankId: BankId) => void;
}

const statusStyles = {
  pendente: "bg-expense/20 text-expense border-expense/30",
  pago: "bg-income/20 text-income border-income/30",
  atrasado: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const statusCycle: Installment["status"][] = ["pendente", "pago", "atrasado"];

const brl = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function EditableInstallment({ inst, bankId, onUpdate, onRemove, onDuplicate }: {
  inst: Installment;
  bankId: BankId;
  onUpdate: BankDetailSheetProps["onUpdateInstallment"];
  onRemove: BankDetailSheetProps["onRemoveInstallment"];
  onDuplicate: (inst: Installment) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(inst.description);
  const [amount, setAmount] = useState(String(inst.installmentAmount));
  const [total, setTotal] = useState(String(inst.totalAmount));
  const [current, setCurrent] = useState(String(inst.currentInstallment));
  const [totalInst, setTotalInst] = useState(String(inst.totalInstallments));
  const [due, setDue] = useState(inst.dueDate);

  const handleSave = () => {
    const a = parseFloat(amount);
    const t = parseFloat(total);
    const c = parseInt(current);
    const ti = parseInt(totalInst);
    if (desc.trim() && Number.isFinite(a) && a >= 0 && Number.isFinite(t) && t >= 0 && Number.isInteger(c) && c >= 0 && Number.isInteger(ti) && ti >= 0 && (ti === 0 || c <= ti) && due) {
      onUpdate(bankId, inst.id, { description: desc.trim(), installmentAmount: a, totalAmount: t, currentInstallment: c, totalInstallments: ti, dueDate: due });
    }
    setEditing(false);
  };

  const cycleStatus = () => {
    const idx = statusCycle.indexOf(inst.status);
    onUpdate(bankId, inst.id, { status: statusCycle[(idx + 1) % statusCycle.length] });
  };

  if (editing) {
    return (
      <div className="p-4 rounded-xl bg-secondary/40 space-y-2">
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descrição" className="h-7 text-xs rounded-lg" autoFocus />
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Valor parcela" className="h-7 text-xs rounded-lg" />
          <Input type="number" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="Valor total" className="h-7 text-xs rounded-lg" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Input type="number" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Parcela atual" className="h-7 text-xs rounded-lg" />
          <Input type="number" value={totalInst} onChange={(e) => setTotalInst(e.target.value)} placeholder="Total parcelas" className="h-7 text-xs rounded-lg" />
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="h-7 text-xs rounded-lg" />
        </div>
        <div className="flex gap-1 justify-end">
          <button onClick={handleSave} className="p-1 rounded hover:bg-income/20 text-income"><Check className="w-3.5 h-3.5" /></button>
          <button onClick={() => setEditing(false)} className="p-1 rounded hover:bg-expense/20 text-expense"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    );
  }

  const progress = inst.totalInstallments > 0 ? (inst.currentInstallment / inst.totalInstallments) * 100 : 0;
  const remaining = remainingInstallments(inst);
  const dueDate = new Date(inst.dueDate + "T00:00:00");
  const isPaid = inst.status === "pago";
  const accent = isPaid ? "bg-income" : inst.status === "atrasado" ? "bg-amber-400" : "bg-primary";

  return (
    <div className={`relative overflow-hidden p-4 pl-5 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group ${isPaid ? "opacity-70" : ""}`}>
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${accent}`} />

      <div className="flex justify-between items-start gap-2">
        <div className="cursor-pointer min-w-0" onClick={() => { setDesc(inst.description); setAmount(String(inst.installmentAmount)); setTotal(String(inst.totalAmount)); setCurrent(String(inst.currentInstallment)); setTotalInst(String(inst.totalInstallments)); setDue(inst.dueDate); setEditing(true); }}>
          <p className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate">
            {inst.description}
            <Pencil className="w-3 h-3 inline ml-1.5 opacity-0 group-hover:opacity-50" />
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
            <span className="text-money">{inst.totalInstallments > 1 ? `${inst.currentInstallment}/${inst.totalInstallments}` : "Avulsa"}</span>
            <span className="opacity-40">•</span>
            <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" />{dueDate.toLocaleDateString("pt-BR")}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Badge
            variant="outline"
            className={`text-[10px] cursor-pointer ${statusStyles[inst.status]}`}
            onClick={cycleStatus}
          >
            {inst.status === "pago" ? "Pago" : inst.status === "atrasado" ? "Atrasado" : "Pendente"}
          </Badge>
          <button
            onClick={() => onDuplicate(inst)}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all"
            title="Duplicar fatura"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button onClick={() => onRemove(bankId, inst.id)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-expense/20 text-muted-foreground hover:text-expense transition-all">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="flex-1">
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className={`h-full ${accent} rounded-full transition-all`} style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {progress.toFixed(0)}% pago · faltam {remaining} de R$ {brl(inst.installmentAmount)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Parcela</p>
          <p className="text-base text-money font-bold text-foreground leading-tight">R$ {brl(inst.installmentAmount)}</p>
          <p className="text-[10px] text-muted-foreground">total R$ {brl(inst.totalAmount)}</p>
        </div>
      </div>
    </div>
  );
}

function AddInstallmentRow({ bankId, onAdd }: { bankId: BankId; onAdd: BankDetailSheetProps["onAddInstallment"] }) {
  const [adding, setAdding] = useState(false);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [totalAmt, setTotalAmt] = useState("");
  const [totalInst, setTotalInst] = useState("12");
  const [due, setDue] = useState("");

  const handleAdd = () => {
    const a = parseFloat(amount);
    const t = parseFloat(totalAmt);
    const ti = parseInt(totalInst);
    if (desc.trim() && !isNaN(a) && !isNaN(t) && !isNaN(ti) && due) {
      onAdd(bankId, { description: desc.trim(), installmentAmount: a, totalAmount: t, currentInstallment: 1, totalInstallments: ti, dueDate: due, status: "pendente" });
      setDesc(""); setAmount(""); setTotalAmt(""); setTotalInst("12"); setDue("");
      setAdding(false);
    }
  };

  if (!adding) return (
    <button onClick={() => setAdding(true)} className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mt-3 py-2.5 rounded-xl border border-dashed border-border/60 hover:border-primary/40">
      <Plus className="w-3.5 h-3.5" /> Adicionar parcela
    </button>
  );

  return (
    <div className="p-3 rounded-xl bg-secondary/30 space-y-2 mt-3">
      <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descrição" className="h-7 text-xs rounded-lg" autoFocus />
      <div className="grid grid-cols-2 gap-2">
        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Valor parcela" className="h-7 text-xs rounded-lg" />
        <Input type="number" value={totalAmt} onChange={(e) => setTotalAmt(e.target.value)} placeholder="Valor total" className="h-7 text-xs rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input type="number" value={totalInst} onChange={(e) => setTotalInst(e.target.value)} placeholder="Nº parcelas" className="h-7 text-xs rounded-lg" />
        <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="h-7 text-xs rounded-lg" />
      </div>
      <div className="flex gap-1 justify-end">
        <button onClick={handleAdd} className="p-1 rounded hover:bg-income/20 text-income"><Check className="w-3.5 h-3.5" /></button>
        <button onClick={() => setAdding(false)} className="p-1 rounded hover:bg-expense/20 text-expense"><X className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

type FilterKey = "todas" | "pendente" | "pago";

export function BankDetailSheet({ bank, open, onOpenChange, onUpdateInstallment, onRemoveInstallment, onAddInstallment, onUpdateBank, onRemoveBank }: BankDetailSheetProps) {
  const [filter, setFilter] = useState<FilterKey>("todas");

  const stats = useMemo(() => {
    if (!bank) return null;
    const open = bank.installments.filter((i) => i.status !== "pago");
    const paid = bank.installments.filter((i) => i.status === "pago");
    const late = bank.installments.filter((i) => i.status === "atrasado");
    const now = new Date();
    const monthly = cardSpendingForMonth([bank], now.getMonth() + 1, now.getFullYear());
    const paidTotal = paid.reduce((s, i) => s + i.installmentAmount, 0);
    const nextDue = [...open].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
    return { open, paid, late, monthly, paidTotal, nextDue };
  }, [bank]);

  if (!bank || !stats) return null;

  const isOverLimit = bank.limitUsed > bank.limitTotal;
  const freeAmount = bank.limitTotal - bank.limitUsed;
  const usagePercent = Math.min((bank.limitUsed / bank.limitTotal) * 100, 100);
  const cardColor = getCardColor(bank.color);

  const handleDuplicate = (inst: Installment) => {
    onAddInstallment(bank.id, {
      description: `${inst.description} (cópia)`,
      installmentAmount: inst.installmentAmount,
      totalAmount: inst.totalAmount,
      currentInstallment: inst.currentInstallment,
      totalInstallments: inst.totalInstallments,
      dueDate: inst.dueDate,
      status: "pendente",
    });
  };

  const handleColorChange = (colorId: string, glow: string) => {
    if (onUpdateBank) onUpdateBank(bank.id, { color: colorId, glowClass: glow });
  };

  const handleDeleteBank = () => {
    if (onRemoveBank) {
      onRemoveBank(bank.id);
      onOpenChange(false);
    }
  };

  const filtered = [...bank.installments]
    .filter((i) => filter === "todas" || (filter === "pago" ? i.status === "pago" : i.status !== "pago"))
    .sort((a, b) => {
      if (a.status === "pago" && b.status !== "pago") return 1;
      if (a.status !== "pago" && b.status === "pago") return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });

  const filters: { key: FilterKey; label: string; count: number }[] = [
    { key: "todas", label: "Todas", count: bank.installments.length },
    { key: "pendente", label: "Em aberto", count: stats.open.length },
    { key: "pago", label: "Pagas", count: stats.paid.length },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="glass-card border-l-border/30 w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="sr-only">{bank.name}</SheetTitle>
        </SheetHeader>

        {/* Visual card preview */}
        <div
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${cardColor.gradient} ${cardColor.text} p-4 flex flex-col justify-between`}
          style={{ aspectRatio: "1.9/1", ...cardColor.style }}
        >
          <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{
            backgroundImage: `radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }} />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">Cartão de crédito</p>
              <h2 className="text-xl font-bold tracking-wide">{bank.name}</h2>
            </div>
            <Wifi className="w-5 h-5 opacity-40 rotate-90" />
          </div>
          <div className="relative">
            <div className="flex justify-between text-[10px] opacity-70 mb-1">
              <span>Limite usado</span>
              <span className="text-money">{usagePercent.toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full rounded-full bg-white/85 transition-all" style={{ width: `${usagePercent}%` }} />
            </div>
            <div className="flex justify-between items-end mt-2">
              <div>
                <p className="text-[10px] opacity-60">Usado</p>
                <p className="text-base text-money font-bold">R$ {brl(bank.limitUsed)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] opacity-60">{isOverLimit ? "Excedido" : "Disponível"}</p>
                <p className="text-base text-money font-bold">R$ {brl(Math.abs(freeAmount))}</p>
              </div>
            </div>
          </div>
        </div>

        {isOverLimit && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-expense/10 border border-expense/20 mt-4 animate-pulse-danger">
            <AlertTriangle className="w-5 h-5 text-expense shrink-0" />
            <span className="text-sm text-expense font-medium">
              Limite excedido em R$ {brl(bank.limitUsed - bank.limitTotal)}
            </span>
          </div>
        )}

        {/* Quick KPIs */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="p-3 rounded-xl bg-secondary/40 border border-border/40">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <TrendingDown className="w-3 h-3" />
              <span className="text-[10px] uppercase tracking-wider">Por mês</span>
            </div>
            <p className="text-sm text-money font-bold text-foreground">R$ {brl(stats.monthly)}</p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/40 border border-border/40">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Clock className="w-3 h-3" />
              <span className="text-[10px] uppercase tracking-wider">Em aberto</span>
            </div>
            <p className="text-sm text-money font-bold text-foreground">{stats.open.length} parcelas</p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/40 border border-border/40">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <CheckCircle2 className="w-3 h-3" />
              <span className="text-[10px] uppercase tracking-wider">Pagas</span>
            </div>
            <p className="text-sm text-money font-bold text-income">{stats.paid.length}</p>
          </div>
        </div>

        {/* Dívida total + próximo vencimento */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="p-3 rounded-xl bg-expense/10 border border-expense/20">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Dívida total</p>
            <p className="text-base text-money font-bold text-expense">R$ {brl(bank.debtFinal)}</p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/40 border border-border/40">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Próximo vencimento</p>
            <p className="text-base text-money font-bold text-foreground">
              {stats.nextDue ? new Date(stats.nextDue.dueDate + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
            </p>
          </div>
        </div>

        {/* Cor do cartão */}
        {onUpdateBank && (
          <div className="mt-5">
            <CardColorPicker value={bank.color} onChange={handleColorChange} />
          </div>
        )}

        {/* Filtros */}
        <div className="flex items-center gap-1 mt-6 mb-3">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-[11px] uppercase tracking-wider transition-colors border ${
                filter === f.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/40 text-muted-foreground border-border/40 hover:text-foreground"
              }`}
            >
              {f.label} <span className="text-money">{f.count}</span>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhuma parcela nesta visão.</p>
          ) : filtered.map((inst) => (
            <EditableInstallment
              key={inst.id}
              inst={inst}
              bankId={bank.id}
              onUpdate={onUpdateInstallment}
              onRemove={onRemoveInstallment}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>

        <AddInstallmentRow bankId={bank.id} onAdd={onAddInstallment} />

        {onRemoveBank && (
          <div className="mt-8 pt-4 border-t border-border/30">
            <Button variant="destructive" className="w-full" onClick={handleDeleteBank}>
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Cartão
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

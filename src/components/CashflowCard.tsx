import { useState, useMemo } from "react";
import { ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, Check, Plus, X, CreditCard, Pin, PinOff, Radio } from "lucide-react";
import { type CashflowMonth } from "@/data/financialData";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXPENSE_CATEGORIES, getCategory, suggestCategory } from "@/data/categories";
import { CardFlowHub } from "@/components/CardFlowHub";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { useFinanceStore } from "@/stores/financeStore";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CashflowCardProps {
  cashflow: CashflowMonth;
  totalIncome: number;
  totalExpense: number;
  cardExpensesForMonth: number;
  expectedBalance: number;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  monthIndex: number;
  onTogglePaid: (monthIdx: number, type: "incomes" | "expenses", itemIdx: number) => void;
  onAddItem: (monthIdx: number, type: "incomes" | "expenses", label: string, amount: number, category?: string) => void;
  onRemoveItem: (monthIdx: number, type: "incomes" | "expenses", itemIdx: number) => void;
  onUpdateItem: (monthIdx: number, type: "incomes" | "expenses", itemIdx: number, label: string, amount: number, category?: string) => void;
  onSetFixed: (monthIdx: number, type: "incomes" | "expenses", itemIdx: number, fixed: boolean) => void;
  onReplicateFixed: (monthIdx: number, type: "incomes" | "expenses", itemIdx: number) => void;
}

function CategoryBadge({ categoryId }: { categoryId?: string }) {
  if (!categoryId) return null;
  const c = getCategory(categoryId);
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${c.bg} ${c.color}`}>
      <span className="text-[10px] leading-none">{c.emoji}</span>
      {c.label}
    </span>
  );
}

function EditableItem({
  item, idx, type, monthIndex, onTogglePaid, onRemoveItem, onUpdateItem, onSetFixed, onReplicateFixed,
}: {
  item: { label: string; amount: number; paid?: boolean; category?: string; fixed?: boolean };
  idx: number;
  type: "incomes" | "expenses";
  monthIndex: number;
  onTogglePaid: CashflowCardProps["onTogglePaid"];
  onRemoveItem: CashflowCardProps["onRemoveItem"];
  onUpdateItem: CashflowCardProps["onUpdateItem"];
  onSetFixed: CashflowCardProps["onSetFixed"];
  onReplicateFixed: CashflowCardProps["onReplicateFixed"];
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(item.label);
  const [amount, setAmount] = useState(String(item.amount));
  const [category, setCategory] = useState<string>(item.category ?? suggestCategory(item.label));
  const [confirmFixedOpen, setConfirmFixedOpen] = useState(false);
  const isIncome = type === "incomes";

  const handleSave = () => {
    const val = parseFloat(amount);
    if (label.trim() && !isNaN(val) && val > 0) {
      onUpdateItem(monthIndex, type, idx, label.trim(), val, isIncome ? undefined : category);
    }
    setEditing(false);
  };

  const handlePinClick = () => {
    if (item.fixed) {
      onSetFixed(monthIndex, type, idx, false);
    } else {
      setConfirmFixedOpen(true);
    }
  };

  if (editing) {
    return (
      <div className="space-y-1.5 p-2 rounded-lg bg-secondary/40">
        <div className="flex items-center gap-1.5">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-7 text-xs rounded-lg flex-1" autoFocus />
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-7 text-xs rounded-lg w-24" />
        </div>
        {!isIncome && (
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-7 text-xs rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.emoji} {c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex justify-end gap-1">
          <button onClick={handleSave} className="p-1 rounded hover:bg-income/20 text-income"><Check className="w-3.5 h-3.5" /></button>
          <button onClick={() => setEditing(false)} className="p-1 rounded hover:bg-expense/20 text-expense"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 text-sm group">
        <Checkbox
          checked={item.paid}
          onCheckedChange={() => onTogglePaid(monthIndex, type, idx)}
          className={`h-4 w-4 rounded border-border ${isIncome ? "data-[state=checked]:bg-income data-[state=checked]:border-income" : "data-[state=checked]:bg-expense data-[state=checked]:border-expense"}`}
        />
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <span
            className={`truncate cursor-pointer hover:text-foreground transition-colors ${item.paid ? "text-muted-foreground line-through" : "text-muted-foreground"}`}
            onClick={() => { setLabel(item.label); setAmount(String(item.amount)); setEditing(true); }}
          >
            {item.label}
          </span>
          {item.fixed && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-primary/15 text-primary">
              <Pin className="w-2.5 h-2.5" /> FIXO
            </span>
          )}
          {!isIncome && <CategoryBadge categoryId={item.category ?? suggestCategory(item.label)} />}
        </div>
        <span
          className={`text-money cursor-pointer hover:text-foreground transition-colors ${item.paid ? "text-muted-foreground line-through" : "text-foreground"}`}
          onClick={() => { setLabel(item.label); setAmount(String(item.amount)); setEditing(true); }}
        >
          R$ {item.amount.toLocaleString("pt-BR")}
        </span>
        {item.paid && <Check className={`w-3.5 h-3.5 ${isIncome ? "text-income" : "text-expense"}`} />}
        <button
          onClick={handlePinClick}
          title={item.fixed ? "Desmarcar como fixo" : "Marcar como fixo e replicar"}
          className={`p-0.5 rounded transition-all ${item.fixed ? "text-primary opacity-100" : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary"} hover:bg-primary/10`}
        >
          {item.fixed ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
        </button>
        <button
          onClick={() => onRemoveItem(monthIndex, type, idx)}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-expense/20 text-muted-foreground hover:text-expense transition-all"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <AlertDialog open={confirmFixedOpen} onOpenChange={setConfirmFixedOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replicar "{item.label}" para os próximos meses?</AlertDialogTitle>
            <AlertDialogDescription>
              Esse custo se mantém nos meses seguintes? Se sim, vamos adicionar R$ {item.amount.toLocaleString("pt-BR")} em cada mês posterior (sem duplicar onde já existir).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => onSetFixed(monthIndex, type, idx, true)}>
              Só marcar como fixo
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => onReplicateFixed(monthIndex, type, idx)}>
              Sim, replicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function AddItemRow({ type, monthIndex, onAdd }: {
  type: "incomes" | "expenses";
  monthIndex: number;
  onAdd: CashflowCardProps["onAddItem"];
}) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("outros");
  const isIncome = type === "incomes";

  const handleAdd = () => {
    const val = parseFloat(amount);
    if (label.trim() && !isNaN(val) && val > 0) {
      onAdd(monthIndex, type, label.trim(), val, isIncome ? undefined : category);
      setLabel(""); setAmount(""); setCategory("outros"); setAdding(false);
    }
  };

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mt-1"
      >
        <Plus className="w-3 h-3" /> Adicionar {isIncome ? "entrada" : "saída"}
      </button>
    );
  }

  return (
    <div className="space-y-1.5 mt-1 p-2 rounded-lg bg-secondary/40">
      <div className="flex items-center gap-1.5">
        <Input
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            if (!isIncome && e.target.value.length >= 3) {
              const s = suggestCategory(e.target.value);
              if (s !== "outros") setCategory(s);
            }
          }}
          placeholder="Descrição"
          className="h-7 text-xs rounded-lg flex-1"
          autoFocus
        />
        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Valor" className="h-7 text-xs rounded-lg w-24" />
      </div>
      {!isIncome && (
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-7 text-xs rounded-lg"><SelectValue /></SelectTrigger>
          <SelectContent>
            {EXPENSE_CATEGORIES.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.emoji} {c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <div className="flex justify-end gap-1">
        <button onClick={handleAdd} className="p-1 rounded hover:bg-income/20 text-income"><Check className="w-3.5 h-3.5" /></button>
        <button onClick={() => { setAdding(false); setLabel(""); setAmount(""); }} className="p-1 rounded hover:bg-expense/20 text-expense"><X className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

type ExpenseFilter = "todas" | string; // "todas" or category id

function ExpenseSection({ cashflow, monthIndex, onTogglePaid, onRemoveItem, onUpdateItem, onAddItem, onSetFixed, onReplicateFixed }: {
  cashflow: CashflowMonth;
  monthIndex: number;
  onTogglePaid: CashflowCardProps["onTogglePaid"];
  onRemoveItem: CashflowCardProps["onRemoveItem"];
  onUpdateItem: CashflowCardProps["onUpdateItem"];
  onAddItem: CashflowCardProps["onAddItem"];
  onSetFixed: CashflowCardProps["onSetFixed"];
  onReplicateFixed: CashflowCardProps["onReplicateFixed"];
}) {
  const [filter, setFilter] = useState<ExpenseFilter>("todas");

  // Build category totals + used set
  const { categoryTotals, usedCategories } = useMemo(() => {
    const totals = new Map<string, number>();
    cashflow.expenses.forEach((e) => {
      const cat = e.category ?? suggestCategory(e.label);
      totals.set(cat, (totals.get(cat) || 0) + e.amount);
    });
    return {
      categoryTotals: totals,
      usedCategories: EXPENSE_CATEGORIES.filter((c) => totals.has(c.id)),
    };
  }, [cashflow.expenses]);

  const filtered = useMemo(() => {
    if (filter === "todas") return cashflow.expenses.map((item, idx) => ({ item, idx }));
    return cashflow.expenses
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => (item.category ?? suggestCategory(item.label)) === filter);
  }, [cashflow.expenses, filter]);

  const filteredTotal = filtered.reduce((s, { item }) => s + item.amount, 0);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <ArrowDownRight className="w-4 h-4 text-expense" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Saídas (manuais)</span>
        <span className="ml-auto text-sm text-money text-expense">R$ {filteredTotal.toLocaleString("pt-BR")}</span>
      </div>

      <div className="flex gap-1.5 mb-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1">
        <button
          onClick={() => setFilter("todas")}
          className={`shrink-0 px-2.5 py-1 text-[10px] rounded-lg font-medium transition-colors ${filter === "todas" ? "bg-primary/20 text-primary" : "bg-secondary/50 text-muted-foreground hover:text-foreground"}`}
        >
          Todas
        </button>
        {usedCategories.map((c) => {
          const active = filter === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className={`shrink-0 px-2 py-1 text-[10px] rounded-lg font-medium transition-colors inline-flex items-center gap-1 ${
                active ? `${c.bg} ${c.color}` : "bg-secondary/50 text-muted-foreground hover:text-foreground"
              }`}
              title={`R$ ${(categoryTotals.get(c.id) ?? 0).toLocaleString("pt-BR")}`}
            >
              <span>{c.emoji}</span>
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-1.5">
        {filtered.map(({ item, idx }) => (
          <EditableItem
            key={`${item.label}-${idx}`}
            item={item}
            idx={idx}
            type="expenses"
            monthIndex={monthIndex}
            onTogglePaid={onTogglePaid}
            onRemoveItem={onRemoveItem}
            onUpdateItem={onUpdateItem}
            onSetFixed={onSetFixed}
            onReplicateFixed={onReplicateFixed}
          />
        ))}
        <AddItemRow type="expenses" monthIndex={monthIndex} onAdd={onAddItem} />
      </div>
    </div>
  );
}

export function CashflowCard({
  cashflow, totalIncome, totalExpense, cardExpensesForMonth, expectedBalance,
  onPrev, onNext, canPrev, canNext, monthIndex,
  onTogglePaid, onAddItem, onRemoveItem, onUpdateItem, onSetFixed, onReplicateFixed,
}: CashflowCardProps) {
  const manualExpenses = totalExpense - cardExpensesForMonth;
  const { banks } = useFinanceStore();

  // Live (caixa real): o mês nasce negativo com todas as obrigações e vai sendo
  // abatido conforme as entradas são efetivamente recebidas (check nas Entradas).
  const live = useMemo(() => {
    const MONTHS: Record<string, number> = {
      "Janeiro": 1, "Fevereiro": 2, "Março": 3, "Abril": 4, "Maio": 5, "Junho": 6,
      "Julho": 7, "Agosto": 8, "Setembro": 9, "Outubro": 10, "Novembro": 11, "Dezembro": 12,
    };
    const m = MONTHS[cashflow.month];
    const y = cashflow.year;
    const received = cashflow.incomes.filter((i) => i.paid).reduce((s, i) => s + i.amount, 0);
    const paidManual = cashflow.expenses.filter((e) => e.paid).reduce((s, e) => s + e.amount, 0);
    const paidCard = banks.reduce((t, b) => t + b.installments
      .filter((inst) => {
        const d = new Date(inst.dueDate + "T00:00:00");
        return d.getMonth() + 1 === m && d.getFullYear() === y && inst.status === "pago";
      })
      .reduce((s, inst) => s + inst.installmentAmount, 0), 0);
    const obligations = manualExpenses + cardExpensesForMonth;
    return {
      received,
      toReceive: totalIncome - received,
      settled: paidManual + paidCard,
      open: obligations - (paidManual + paidCard),
      obligations,
      value: received - obligations,
    };
  }, [banks, cashflow, manualExpenses, cardExpensesForMonth, totalIncome]);


  return (
    <div className="glass-card rounded-2xl p-5 animate-float-in">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Fluxo de Caixa</h3>
        <div className="flex items-center gap-1">
          <button onClick={onPrev} disabled={!canPrev} className="p-1 rounded-lg hover:bg-secondary disabled:opacity-30 transition-colors">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-semibold text-foreground px-2 min-w-[100px] text-center">
            {cashflow.month} {cashflow.year}
          </span>
          <button onClick={onNext} disabled={!canNext} className="p-1 rounded-lg hover:bg-secondary disabled:opacity-30 transition-colors">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Saldo Final breakdown */}
      <div className="mb-5 py-4 px-4 rounded-xl bg-secondary/50 relative overflow-hidden group/balance">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent opacity-0 group-hover/balance:opacity-100 transition-opacity duration-500" />
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest text-center mb-1">Saldo Final do Mês</p>
        <p className={`text-3xl text-money text-center ${expectedBalance >= 0 ? "text-income" : "text-expense"}`}>
          R$ {expectedBalance.toLocaleString("pt-BR")}
        </p>
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/30">
          <div className="text-center rounded-lg bg-income/5 py-2.5 px-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Receitas</p>
            <p className="text-lg sm:text-xl text-income text-money font-semibold">+ {totalIncome.toLocaleString("pt-BR")}</p>
          </div>
          <div className="text-center rounded-lg bg-expense/5 py-2.5 px-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Despesas</p>
            <p className="text-lg sm:text-xl text-expense text-money font-semibold">− {manualExpenses.toLocaleString("pt-BR")}</p>
          </div>
          <div className="text-center rounded-lg bg-expense/5 py-2.5 px-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              <CreditCard className="w-3 h-3" /> Cartão
            </p>
            <p className="text-lg sm:text-xl text-expense text-money font-semibold">− {cardExpensesForMonth.toLocaleString("pt-BR")}</p>
          </div>
        </div>

        {/* LIVE — caixa real do mês */}
        <div className="mt-4 pt-4 border-t border-border/30">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="relative flex items-center">
              <span className="absolute w-2 h-2 rounded-full bg-expense/60 animate-ping" />
              <span className="w-2 h-2 rounded-full bg-expense" />
            </span>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-1">
              <Radio className="w-3 h-3" /> Saldo Live (caixa real)
            </p>
          </div>
          <AnimatedNumber
            value={live.value}
            prefix="R$ "
            className={`block text-2xl text-money text-center ${live.value >= 0 ? "text-income" : "text-expense"}`}
          />
          <p className="text-[10px] text-muted-foreground text-center mt-1">
            O mês começa negativo em R$ {live.obligations.toLocaleString("pt-BR")} e sobe a cada entrada recebida.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            <div className="text-center rounded-lg bg-income/5 py-2 px-1">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Recebido</p>
              <p className="text-sm text-income text-money">+ {live.received.toLocaleString("pt-BR")}</p>
            </div>
            <div className="text-center rounded-lg bg-secondary/60 py-2 px-1">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">A receber</p>
              <p className="text-sm text-money text-foreground">{live.toReceive.toLocaleString("pt-BR")}</p>
            </div>
            <div className="text-center rounded-lg bg-secondary/60 py-2 px-1">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Já pago</p>
              <p className="text-sm text-money text-muted-foreground">{live.settled.toLocaleString("pt-BR")}</p>
            </div>
            <div className="text-center rounded-lg bg-expense/5 py-2 px-1">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">A pagar</p>
              <p className="text-sm text-expense text-money">− {live.open.toLocaleString("pt-BR")}</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/80 text-center mt-2">
            Marcar uma conta como paga só consolida o valor (sai de “A pagar” para “Já pago”) — não altera o saldo.
          </p>
        </div>

      </div>

      {/* Income */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <ArrowUpRight className="w-4 h-4 text-income" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Entradas</span>
          <span className="ml-auto text-sm text-money text-income">R$ {totalIncome.toLocaleString("pt-BR")}</span>
        </div>
        <div className="space-y-1.5">
          {cashflow.incomes.map((item, idx) => (
            <EditableItem key={`${item.label}-${idx}`} item={item} idx={idx} type="incomes" monthIndex={monthIndex} onTogglePaid={onTogglePaid} onRemoveItem={onRemoveItem} onUpdateItem={onUpdateItem} onSetFixed={onSetFixed} onReplicateFixed={onReplicateFixed} />
          ))}
          <AddItemRow type="incomes" monthIndex={monthIndex} onAdd={onAddItem} />
        </div>
      </div>

      {/* Central de Cartões: parcelas detalhadas por cartão + lançamento rápido */}
      <CardFlowHub />

      {/* Manual Expenses with category filters */}
      <ExpenseSection
        cashflow={cashflow}
        monthIndex={monthIndex}
        onTogglePaid={onTogglePaid}
        onRemoveItem={onRemoveItem}
        onUpdateItem={onUpdateItem}
        onAddItem={onAddItem}
        onSetFixed={onSetFixed}
        onReplicateFixed={onReplicateFixed}
      />
    </div>
  );
}

import { useState, useMemo } from "react";
import { ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, Check, Plus, X, CreditCard, Pin, PinOff, Radio, Pencil, Ellipsis } from "lucide-react";
import { type CashflowMonth } from "@/data/financialData";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXPENSE_CATEGORIES, getCategory, suggestCategory } from "@/data/categories";
import { CardFlowHub } from "@/components/CardFlowHub";
import { CardPurchaseButton } from "@/components/CardPurchaseForm";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { useFinanceStore } from "@/stores/financeStore";
import { displayCashflowDate, shortCashflowDate, validCashflowDate } from "@/lib/cashflowDates";
import { CashflowDateInput } from "@/components/CashflowDateInput";
import { CashflowCategoryIcon } from "@/components/CashflowCategoryIcon";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { monthNumber } from "@/lib/planningTools";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CashflowCardProps {
  presentation?: "ledger" | "compact-balances";
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
  onAddItem: (monthIdx: number, type: "incomes" | "expenses", label: string, amount: number, category?: string, date?: string) => void;
  onRemoveItem: (monthIdx: number, type: "incomes" | "expenses", itemIdx: number) => void;
  onUpdateItem: (monthIdx: number, type: "incomes" | "expenses", itemIdx: number, label: string, amount: number, category?: string, date?: string | null) => void;
  onSetFixed: (monthIdx: number, type: "incomes" | "expenses", itemIdx: number, fixed: boolean) => void;
  onReplicateFixed: (monthIdx: number, type: "incomes" | "expenses", itemIdx: number) => void;
}

function CategoryBadge({ categoryId, ledger, description }: { categoryId?: string; ledger?: boolean; description?: string }) {
  if (!categoryId) return null;
  const c = getCategory(categoryId);
  const repeatedLabel = ledger && description?.trim().toLocaleLowerCase("pt-BR") === c.label.toLocaleLowerCase("pt-BR");
  return (
    <span className={`flow-item-tag inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${c.bg} ${c.color}`} title={repeatedLabel ? c.label : undefined}>
      {ledger ? <CashflowCategoryIcon category={categoryId} /> : <span className="text-[10px] leading-none">{c.emoji}</span>}
      {!repeatedLabel && c.label}
    </span>
  );
}

function EditableItem({
  item, idx, type, monthIndex, cashflow, onTogglePaid, onRemoveItem, onUpdateItem, onSetFixed, onReplicateFixed, ledger = false,
}: {
  ledger?: boolean;
  item: { label: string; amount: number; paid?: boolean; category?: string; fixed?: boolean; date?: string };
  cashflow: CashflowMonth;
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
  const [date, setDate] = useState(displayCashflowDate(item.date, cashflow));
  const [confirmFixedOpen, setConfirmFixedOpen] = useState(false);
  const isIncome = type === "incomes";
  const beginEditing = () => {
    setLabel(item.label);
    setAmount(String(item.amount));
    setDate(displayCashflowDate(item.date, cashflow));
    setCategory(item.category ?? suggestCategory(item.label));
    setEditing(true);
  };

  const handleSave = () => {
    const val = parseFloat(amount);
    if (label.trim() && !isNaN(val) && val > 0 && (!isIncome || !date || shortCashflowDate(date, cashflow))) {
      onUpdateItem(monthIndex, type, idx, label.trim(), val, isIncome ? undefined : category, isIncome ? date ? shortCashflowDate(date, cashflow) : null : undefined);
      setEditing(false);
    }
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
          <Input aria-label="Descrição" value={label} onChange={(e) => setLabel(e.target.value)} className="h-7 text-xs rounded-lg flex-1" autoFocus />
          <Input aria-label="Valor" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-7 text-xs rounded-lg w-24" />
        </div>
        {!isIncome && (
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger aria-label="Categoria" className="h-7 text-xs rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.emoji} {c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {isIncome && <CashflowDateInput value={date} onChange={setDate} month={cashflow} />}
        <div className="flex justify-end gap-1">
          <button aria-label="Salvar edição" onClick={handleSave} className="p-1 rounded hover:bg-income/20 text-income"><Check className="w-3.5 h-3.5" /></button>
          <button aria-label="Cancelar edição" onClick={() => setEditing(false)} className="p-1 rounded hover:bg-expense/20 text-expense"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="cashflow-item flex items-center gap-2 text-sm group" data-ledger-row={ledger || undefined}>
        <Checkbox
          aria-label={`${item.paid ? "Desmarcar" : "Confirmar"} ${isIncome ? "recebimento" : "pagamento"} de ${item.label}`}
          checked={item.paid}
          onCheckedChange={() => onTogglePaid(monthIndex, type, idx)}
          className={`h-6 w-6 shrink-0 rounded-md border-border ${isIncome ? "data-[state=checked]:bg-income data-[state=checked]:border-income" : "data-[state=checked]:bg-expense data-[state=checked]:border-expense"}`}
        />
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5">
          {ledger ? <span className="flow-item-name">{item.label} <span className="flow-item-status" data-settled={!!item.paid}>{item.paid ? isIncome ? "Recebido" : "Pago" : "Pendente"}</span></span> : <span
            className={`truncate cursor-pointer hover:text-foreground transition-colors ${item.paid ? "text-muted-foreground line-through" : "text-muted-foreground"}`}
            onClick={beginEditing}
          >{item.label}</span>}
          {item.fixed && (
            <span className="flow-item-tag inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-primary/15 text-primary">
              <Pin className="w-2.5 h-2.5" /> FIXO
            </span>
          )}
          {isIncome && <span className="text-xs text-muted-foreground">{item.date && validCashflowDate(item.date, cashflow, true) ? displayCashflowDate(item.date, cashflow) : "sem data"}</span>}
          {!isIncome && <CategoryBadge categoryId={item.category ?? suggestCategory(item.label)} ledger={ledger} description={item.label} />}
        </div>
        {ledger ? <>
          <span className="flow-item-value text-money">{item.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger className="flow-item-menu" aria-label={`Opções de ${item.label}`}>
              <Ellipsis size={17} aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={beginEditing} className="gap-2"><Pencil size={14} aria-hidden="true" /> Editar lançamento</DropdownMenuItem>
              <DropdownMenuItem onSelect={handlePinClick} className="gap-2">
                {item.fixed ? <PinOff size={14} aria-hidden="true" /> : <Pin size={14} aria-hidden="true" />}
                {item.fixed ? "Desmarcar como fixo" : "Marcar como fixo"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onRemoveItem(monthIndex, type, idx)} className="gap-2 text-expense">
                <X size={14} aria-hidden="true" /> Excluir lançamento
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </> : <>
          <span
            className={`text-money cursor-pointer hover:text-foreground transition-colors ${item.paid ? "text-muted-foreground line-through" : "text-foreground"}`}
            onClick={beginEditing}
          >
            R$ {item.amount.toLocaleString("pt-BR")}
          </span>
          {item.paid && <Check className={`w-3.5 h-3.5 ${isIncome ? "text-income" : "text-expense"}`} />}
          {isIncome && <button type="button" aria-label={`Editar entrada: ${item.label}`} title="Editar entrada" onClick={beginEditing} className="p-1.5 min-h-8 min-w-8 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>}
          <button
            onClick={handlePinClick}
            aria-label={`${item.fixed ? "Desmarcar como fixo" : "Marcar como fixo"}: ${item.label}`}
            title={item.fixed ? "Desmarcar como fixo" : "Marcar como fixo e replicar"}
            className={`p-1.5 min-h-8 min-w-8 rounded-lg transition-colors ${item.fixed ? "text-primary opacity-100" : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary"} hover:bg-primary/10`}
          >
            {item.fixed ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
          </button>
          <button
            onClick={() => onRemoveItem(monthIndex, type, idx)}
            aria-label={`Excluir ${isIncome ? "entrada" : "saída"}: ${item.label}`}
            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1.5 min-h-8 min-w-8 rounded-lg hover:bg-expense/20 text-muted-foreground hover:text-expense transition-all"
          >
            <X className="w-3 h-3" />
          </button>
        </>}
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

function AddItemRow({ type, monthIndex, cashflow, onAdd }: {
  type: "incomes" | "expenses";
  monthIndex: number;
  cashflow: CashflowMonth;
  onAdd: CashflowCardProps["onAddItem"];
}) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("outros");
  const [date, setDate] = useState("");
  const isIncome = type === "incomes";

  const handleAdd = () => {
    const val = parseFloat(amount);
    if (label.trim() && !isNaN(val) && val > 0 && (!isIncome || !date || shortCashflowDate(date, cashflow))) {
      onAdd(monthIndex, type, label.trim(), val, isIncome ? undefined : category, isIncome && date ? shortCashflowDate(date, cashflow) ?? undefined : undefined);
      setLabel(""); setAmount(""); setDate(""); setCategory("outros"); setAdding(false);
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
          aria-label="Descrição do novo lançamento"
          className="h-7 text-xs rounded-lg flex-1"
          autoFocus
        />
        <Input type="number" aria-label="Valor do novo lançamento" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Valor" className="h-7 text-xs rounded-lg w-24" />
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
      {isIncome && <CashflowDateInput value={date} onChange={setDate} month={cashflow} />}
      <div className="flex justify-end gap-1">
        <button aria-label="Salvar novo lançamento" onClick={handleAdd} className="p-1 rounded hover:bg-income/20 text-income"><Check className="w-3.5 h-3.5" /></button>
        <button aria-label="Cancelar novo lançamento" onClick={() => { setAdding(false); setLabel(""); setAmount(""); }} className="p-1 rounded hover:bg-expense/20 text-expense"><X className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

type ExpenseFilter = "todas" | string; // "todas" or category id

function ExpenseSection({ cashflow, monthIndex, onTogglePaid, onRemoveItem, onUpdateItem, onAddItem, onSetFixed, onReplicateFixed, ledger }: {
  ledger?: boolean;
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
        {ledger ? <h3>Saídas diretas</h3> : <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Saídas (manuais)</span>}
        <span className="ml-auto text-sm text-money text-expense">R$ {filteredTotal.toLocaleString("pt-BR")}</span>
      </div>

      <div className="flex gap-1.5 mb-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1">
        <button
          onClick={() => setFilter("todas")}
          aria-pressed={ledger ? filter === "todas" : undefined}
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
              aria-pressed={ledger ? active : undefined}
              className={`shrink-0 px-2 py-1 text-[10px] rounded-lg font-medium transition-colors inline-flex items-center gap-1 ${
                active ? `${c.bg} ${c.color}` : "bg-secondary/50 text-muted-foreground hover:text-foreground"
              }`}
              title={`R$ ${(categoryTotals.get(c.id) ?? 0).toLocaleString("pt-BR")}`}
            >
              {ledger ? <CashflowCategoryIcon category={c.id} /> : <span>{c.emoji}</span>}
              {c.label}
            </button>
          );
        })}
      </div>

      <div className={ledger ? "flow-ledger-items" : "space-y-1.5"}>
        {ledger && !filtered.length && <p className="flow-ledger-empty">{filter === "todas" ? "Nenhuma despesa direta neste mês." : "Nenhuma despesa nesta categoria."}</p>}
        {filtered.map(({ item, idx }) => (
          <EditableItem
            key={item.id ?? `${item.label}-${idx}`}
            ledger={ledger}
            item={item}
            cashflow={cashflow}
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
        <AddItemRow type="expenses" monthIndex={monthIndex} cashflow={cashflow} onAdd={onAddItem} />
      </div>
    </div>
  );
}

export function CashflowCard({
  cashflow, totalIncome, totalExpense, cardExpensesForMonth, expectedBalance, presentation,
  onPrev, onNext, canPrev, canNext, monthIndex,
  onTogglePaid, onAddItem, onRemoveItem, onUpdateItem, onSetFixed, onReplicateFixed,
}: CashflowCardProps) {
  const manualExpenses = totalExpense - cardExpensesForMonth;
  const { banks } = useFinanceStore();
  const ledger = presentation === "ledger";
  const compactBalances = presentation === "compact-balances";
  const incomeList = (
    <div className={ledger ? "flow-ledger-group" : "mb-4"}>
      <div className="flex items-center gap-2 mb-2">
        <ArrowUpRight aria-hidden className="w-4 h-4 text-income" />
        {ledger ? <h3>Entradas</h3> : <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Entradas</span>}
        <span className="ml-auto text-sm text-money text-income">R$ {totalIncome.toLocaleString("pt-BR")}</span>
      </div>
      <div className={ledger ? "flow-ledger-items" : "space-y-1.5"}>
        {ledger && !cashflow.incomes.length && <p className="flow-ledger-empty">Nenhuma entrada registrada neste mês.</p>}
        {cashflow.incomes.map((item, idx) => ({ item, idx })).sort((a, b) => (validCashflowDate(a.item.date ?? "", cashflow, true) ? a.item.date! : "9999").localeCompare(validCashflowDate(b.item.date ?? "", cashflow, true) ? b.item.date! : "9999") || a.idx - b.idx).map(({ item, idx }) => (
          <EditableItem key={item.id ?? `${item.label}-${idx}`} item={item} idx={idx} cashflow={cashflow} type="incomes" monthIndex={monthIndex} onTogglePaid={onTogglePaid} onRemoveItem={onRemoveItem} onUpdateItem={onUpdateItem} onSetFixed={onSetFixed} onReplicateFixed={onReplicateFixed} ledger={ledger} />
        ))}
        <AddItemRow type="incomes" monthIndex={monthIndex} cashflow={cashflow} onAdd={onAddItem} />
      </div>
    </div>
  );
  const expenseList = (
    <ExpenseSection cashflow={cashflow} monthIndex={monthIndex} onTogglePaid={onTogglePaid}
      onRemoveItem={onRemoveItem} onUpdateItem={onUpdateItem} onAddItem={onAddItem}
      onSetFixed={onSetFixed} onReplicateFixed={onReplicateFixed} ledger={ledger} />
  );

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

  if (ledger) {
    return <section className="flow-ledger" aria-labelledby="flow-ledger-title">
      <div className="flow-ledger-heading">
        <h2 id="flow-ledger-title">Lançamentos do mês</h2>
        <CardPurchaseButton initialDate={`${cashflow.year}-${String(monthNumber(cashflow.month)).padStart(2, "0")}-10`}>
          Lançar compra no cartão
        </CardPurchaseButton>
      </div>
      {incomeList}
      <div className="flow-ledger-group">{expenseList}</div>
      <div className="flow-ledger-cards"><CardFlowHub ledger /></div>
    </section>;
  }

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
      <div className={`mb-5 py-4 px-4 rounded-xl bg-secondary/50 relative overflow-hidden group/balance ${compactBalances ? "cashflow-compact-balances" : ""}`}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent opacity-0 group-hover/balance:opacity-100 transition-opacity duration-500" />
        <section className="cashflow-projected-summary" aria-label="Saldo Final do Mês">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest text-center mb-1">Saldo Final do Mês</p>
          <p className={`text-3xl text-money text-center ${expectedBalance >= 0 ? "text-income" : "text-expense"}`}>
            R$ {expectedBalance.toLocaleString("pt-BR")}
          </p>
          <div className="cashflow-summary-grid grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/30">
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
        </section>

        {/* LIVE — caixa real do mês */}
        <section className="cashflow-live-summary mt-4 pt-4 border-t border-border/30" aria-label="Saldo Live">
          <div className="flex items-center justify-center gap-2 mb-1">
            {!compactBalances && <span className="relative flex items-center">
              <span className="absolute w-2 h-2 rounded-full bg-expense/60 animate-ping" />
              <span className="w-2 h-2 rounded-full bg-expense" />
            </span>}
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-1">
              {!compactBalances && <Radio className="w-3 h-3" />} {compactBalances ? "Saldo Live" : "Saldo Live (caixa real)"}
            </p>
          </div>
          <AnimatedNumber
            value={live.value}
            prefix="R$ "
            className={`block text-2xl text-money text-center ${live.value >= 0 ? "text-income" : "text-expense"}`}
          />
          {!compactBalances && <p className="text-[10px] text-muted-foreground text-center mt-1">
            O mês começa negativo em R$ {live.obligations.toLocaleString("pt-BR")} e sobe a cada entrada recebida.
          </p>}
          <div className="cashflow-live-grid grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
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
          {!compactBalances && <p className="text-[10px] text-muted-foreground/80 text-center mt-2">
            Marcar uma conta como paga só consolida o valor (sai de “A pagar” para “Já pago”) — não altera o saldo.
          </p>}
        </section>
        {compactBalances && <p className="cashflow-balance-note">Saldo Live = recebido menos todas as saídas previstas.</p>}

      </div>

      {incomeList}

      {/* Central de Cartões: parcelas detalhadas por cartão + lançamento rápido */}
      <CardFlowHub />

      {expenseList}
    </div>
  );
}

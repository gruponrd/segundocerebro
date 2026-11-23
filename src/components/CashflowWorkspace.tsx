import { useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Check, Plus, Sparkles, Zap } from "lucide-react";
import { CashflowCard } from "@/components/CashflowCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXPENSE_CATEGORIES, getCategory, suggestCategory } from "@/data/categories";
import { toast } from "@/hooks/use-toast";
import { incomeReferencePeriod, shortCashflowDate } from "@/lib/cashflowDates";
import { cashflowPeriod, emptyCashflowMonth } from "@/lib/cashflowMonths";
import { CashflowDateInput } from "@/components/CashflowDateInput";
import { useFinanceStore } from "@/stores/financeStore";

const brl = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Single-line smart entry: description, value, direction, origin and instant
 * confirmation. Confirmed items are marked as received/paid right away so the
 * real (live) balance updates without breaking the monthly projection.
 */
export function SmartEntryPanel({ proposal = false }: { proposal?: boolean }) {
  const {
    selectedMonth, currentCashflow, addCashflowItem,
    totalIncome, totalExpense, expectedBalance, cardExpensesForMonth,
  } = useFinanceStore();

  const [kind, setKind] = useState<"expenses" | "incomes">("expenses");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("outros");
  const [origin, setOrigin] = useState("Débito");
  const [confirmed, setConfirmed] = useState(true);

  const val = parseFloat(amount) || 0;
  const isExpense = kind === "expenses";
  const enteredDate = !isExpense && date ? shortCashflowDate(date, currentCashflow) : null;
  const referencePeriod = enteredDate ? incomeReferencePeriod(enteredDate) : null;
  const referenceMonth = referencePeriod === null ? currentCashflow : emptyCashflowMonth(referencePeriod);
  const changesSelectedMonth = referencePeriod === null || referencePeriod === cashflowPeriod(currentCashflow);
  const valid = label.trim().length > 0 && val > 0 && (isExpense || !date || !!enteredDate);

  // Real cash position: only what was actually received minus every obligation.
  const live = useMemo(() => {
    const received = currentCashflow.incomes.filter((i) => i.paid).reduce((s, i) => s + i.amount, 0);
    return { received, obligations: totalExpense, value: received - totalExpense };
  }, [currentCashflow, totalExpense]);

  const nextExpected = expectedBalance + (changesSelectedMonth ? isExpense ? -val : val : 0);
  const nextLive = live.value + (changesSelectedMonth ? isExpense ? -val : confirmed ? val : 0 : 0);

  const handleAdd = () => {
    if (!valid) return;
    const finalLabel = isExpense ? `${origin} — ${label.trim()}` : label.trim();
    addCashflowItem(selectedMonth, kind, finalLabel, val, isExpense ? category : undefined, enteredDate ?? undefined, confirmed);
    const cat = getCategory(category);
    toast({
      title: isExpense
        ? confirmed ? "Saída paga registrada" : "Saída prevista registrada"
        : confirmed ? "Entrada recebida" : "Entrada prevista",
      description: `${isExpense ? cat.emoji : "💰"} ${label.trim()} • ${brl(val)} em ${referenceMonth.month} ${referenceMonth.year}`,
    });
    setLabel(""); setAmount(""); setDate(""); setCategory("outros");
  };

  return (
    <div id={proposal ? "flow-quick-entry" : undefined} tabIndex={proposal ? -1 : undefined}
      className={proposal ? "flow-quick-entry space-y-4" : "glass-card rounded-2xl p-4 sm:p-5 space-y-4"}>
      <div className="flex items-center gap-2">
        {proposal ? <h2>Lançamento rápido</h2> : <>
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Lançamento inteligente</h3>
          <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground">
            {currentCashflow.month} {currentCashflow.year}
          </span>
        </>}
      </div>

      {!isExpense && <CashflowDateInput value={date} onChange={setDate} month={currentCashflow} inputLabel="Dia e mês da entrada no lançamento inteligente" />}

      {/* Direction */}
      <div className="flex gap-1.5">
        <button
          onClick={() => setKind("expenses")}
          aria-pressed={proposal ? isExpense : undefined}
          className={`flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl text-sm font-medium border transition-colors ${isExpense ? "border-expense text-expense bg-expense/10" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          <ArrowDownCircle className="w-3.5 h-3.5" /> Saída
        </button>
        <button
          onClick={() => setKind("incomes")}
          aria-pressed={proposal ? !isExpense : undefined}
          className={`flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl text-sm font-medium border transition-colors ${!isExpense ? "border-income text-income bg-income/10" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          <ArrowUpCircle className="w-3.5 h-3.5" /> Entrada
        </button>
      </div>

      {/* Single line: description + value + action */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        {proposal && <label className="col-span-2" htmlFor="flow-entry-description">Descrição</label>}
        <Input
          id={proposal ? "flow-entry-description" : undefined}
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            if (isExpense && e.target.value.length >= 3) {
              const s = suggestCategory(e.target.value);
              if (s !== "outros") setCategory(s);
            }
          }}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder={isExpense ? proposal ? "Ex.: Supermercado" : "O que você gastou? (ex: Supermercado)" : proposal ? "Ex.: Salário" : "De onde veio? (ex: Salário)"}
          aria-label={isExpense ? "Descrição da saída" : "Descrição da entrada"}
          className="col-span-2 rounded-xl h-11 text-sm"
        />
        {proposal && <label className="col-span-2" htmlFor="flow-entry-amount">Valor em reais</label>}
        <Input
          id={proposal ? "flow-entry-amount" : undefined}
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder={proposal ? "0,00" : "Valor"}
          min={0}
          aria-label="Valor do lançamento"
          className="rounded-xl h-11 text-sm text-money"
        />
        <Button className="rounded-full h-11 gap-1.5" onClick={handleAdd} disabled={!valid}>
          <Plus className="w-4 h-4" /> {proposal ? "Registrar" : "Lançar"}
        </Button>
      </div>

      {/* Origin / category / confirmation */}
      <div className="flex flex-wrap items-center gap-2">
        {isExpense && (
          <>
            <Select value={origin} onValueChange={setOrigin}>
              <SelectTrigger aria-label="Forma de pagamento" className="h-8 rounded-lg text-xs w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Débito">Débito</SelectItem>
                <SelectItem value="Pix">Pix</SelectItem>
                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                <SelectItem value="Boleto">Boleto</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger aria-label="Categoria da saída" className="h-8 rounded-lg text-xs w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.emoji} {c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
        <button
          onClick={() => setConfirmed((c) => !c)}
          aria-pressed={proposal ? confirmed : undefined}
          className={`h-8 px-3 rounded-lg text-xs font-medium border inline-flex items-center gap-1.5 transition-colors ${confirmed ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          <Check className="w-3.5 h-3.5" />
          {isExpense ? (confirmed ? "Já paguei" : "Ainda vou pagar") : confirmed ? "Já recebi" : "Ainda vou receber"}
        </button>
      </div>

      {/* Live impact */}
      {proposal ? valid && changesSelectedMonth && (
        <dl className="flow-quick-impact">
          <div><dt>Saldo projetado após registrar</dt><dd>{brl(nextExpected)}</dd></div>
          <div><dt>Recebido menos saídas previstas</dt><dd>{brl(nextLive)}</dd></div>
        </dl>
      ) : <>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="rounded-xl border border-border/60 bg-secondary/30 p-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Projeção do mês</p>
          <p className={`text-money text-sm mt-1 ${nextExpected < 0 ? "text-expense" : "text-income"}`}>{brl(nextExpected)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {brl(totalIncome)} entradas − {brl(totalExpense)} saídas
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-secondary/30 p-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1">
            <Zap className="w-3 h-3" /> Caixa real
          </p>
          <p className={`text-money text-sm mt-1 ${nextLive < 0 ? "text-expense" : "text-income"}`}>{brl(nextLive)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {brl(live.received)} recebido − {brl(live.obligations)} a honrar
          </p>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Cartões do mês ({brl(cardExpensesForMonth)}) já entram nas saídas automaticamente.
      </p>
      </>}
      {proposal && !isExpense && <p className="flow-entry-note">
        Entradas datadas até o dia 7 do mês seguinte entram no período anterior.
      </p>}
    </div>
  );
}

export function CashflowEntries({ presentation }: { presentation?: "ledger" | "compact-balances" }) {
  const store = useFinanceStore();
  return (
    <CashflowCard
      key={store.selectedMonth}
      presentation={presentation}
      cashflow={store.currentCashflow}
      totalIncome={store.totalIncome}
      totalExpense={store.totalExpense}
      cardExpensesForMonth={store.cardExpensesForMonth}
      expectedBalance={store.expectedBalance}
      onPrev={store.prevMonth}
      onNext={store.nextMonth}
      canPrev={store.selectedMonth > 0}
      canNext={store.selectedMonth < store.cashflowMonths.length - 1}
      monthIndex={store.selectedMonth}
      onTogglePaid={store.toggleCashflowPaid}
      onAddItem={store.addCashflowItem}
      onRemoveItem={store.removeCashflowItem}
      onUpdateItem={store.updateCashflowItem}
      onSetFixed={store.setCashflowItemFixed}
      onReplicateFixed={store.replicateFixedItem}
    />
  );
}

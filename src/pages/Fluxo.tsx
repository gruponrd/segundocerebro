import { useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Check, Plus, Sparkles, Zap } from "lucide-react";
import { useFinanceStore } from "@/stores/financeStore";
import { CashflowCard } from "@/components/CashflowCard";
import { PaymentSessions } from "@/components/PaymentSessions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXPENSE_CATEGORIES, getCategory, suggestCategory } from "@/data/categories";
import { toast } from "@/hooks/use-toast";

const brl = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Single-line smart entry: description, value, direction, origin and instant
 * confirmation. Confirmed items are marked as received/paid right away so the
 * real (live) balance updates without breaking the monthly projection.
 */
function SmartEntryPanel() {
  const {
    selectedMonth, currentCashflow, addCashflowItem, toggleCashflowPaid,
    totalIncome, totalExpense, expectedBalance, cardExpensesForMonth,
  } = useFinanceStore();

  const [kind, setKind] = useState<"expenses" | "incomes">("expenses");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("outros");
  const [origin, setOrigin] = useState("Débito");
  const [confirmed, setConfirmed] = useState(true);

  const val = parseFloat(amount) || 0;
  const isExpense = kind === "expenses";
  const valid = label.trim().length > 0 && val > 0;

  // Real cash position: only what was actually received minus every obligation.
  const live = useMemo(() => {
    const received = currentCashflow.incomes.filter((i) => i.paid).reduce((s, i) => s + i.amount, 0);
    return { received, obligations: totalExpense, value: received - totalExpense };
  }, [currentCashflow, totalExpense]);

  const nextExpected = expectedBalance + (isExpense ? -val : val);
  const nextLive = live.value + (isExpense ? -val : confirmed ? val : 0);

  const handleAdd = () => {
    if (!valid) return;
    const finalLabel = isExpense ? `${origin} — ${label.trim()}` : label.trim();
    const idx = isExpense ? currentCashflow.expenses.length : currentCashflow.incomes.length;
    addCashflowItem(selectedMonth, kind, finalLabel, val, isExpense ? category : undefined);
    if (confirmed) {
      // New item lands at the end of the list; confirm it immediately.
      setTimeout(() => toggleCashflowPaid(selectedMonth, kind, idx), 0);
    }
    const cat = getCategory(category);
    toast({
      title: isExpense
        ? confirmed ? "Saída paga registrada" : "Saída prevista registrada"
        : confirmed ? "Entrada recebida" : "Entrada prevista",
      description: `${isExpense ? cat.emoji : "💰"} ${label.trim()} • ${brl(val)} em ${currentCashflow.month}`,
    });
    setLabel(""); setAmount(""); setCategory("outros");
  };

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Lançamento inteligente</h3>
        <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground">
          {currentCashflow.month} {currentCashflow.year}
        </span>
      </div>

      {/* Direction */}
      <div className="flex gap-1.5">
        <button
          onClick={() => setKind("expenses")}
          className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-medium border transition-colors ${isExpense ? "border-expense text-expense bg-expense/10" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          <ArrowDownCircle className="w-3.5 h-3.5" /> Saída
        </button>
        <button
          onClick={() => setKind("incomes")}
          className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-medium border transition-colors ${!isExpense ? "border-income text-income bg-income/10" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          <ArrowUpCircle className="w-3.5 h-3.5" /> Entrada
        </button>
      </div>

      {/* Single line: description + value + action */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            if (isExpense && e.target.value.length >= 3) {
              const s = suggestCategory(e.target.value);
              if (s !== "outros") setCategory(s);
            }
          }}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder={isExpense ? "O que você gastou? (ex: Supermercado)" : "De onde veio? (ex: Salário)"}
          className="rounded-lg h-10 text-sm flex-1"
        />
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder="Valor"
          min={0}
          className="rounded-lg h-10 text-sm text-money sm:w-32"
        />
        <Button className="rounded-lg h-10 gap-1.5 sm:w-auto" onClick={handleAdd} disabled={!valid}>
          <Plus className="w-4 h-4" /> Lançar
        </Button>
      </div>

      {/* Origin / category / confirmation */}
      <div className="flex flex-wrap items-center gap-2">
        {isExpense && (
          <>
            <Select value={origin} onValueChange={setOrigin}>
              <SelectTrigger className="h-8 rounded-lg text-xs w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Débito">Débito</SelectItem>
                <SelectItem value="Pix">Pix</SelectItem>
                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                <SelectItem value="Boleto">Boleto</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 rounded-lg text-xs w-[150px]"><SelectValue /></SelectTrigger>
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
          className={`h-8 px-3 rounded-lg text-xs font-medium border inline-flex items-center gap-1.5 transition-colors ${confirmed ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          <Check className="w-3.5 h-3.5" />
          {isExpense ? (confirmed ? "Já paguei" : "Ainda vou pagar") : confirmed ? "Já recebi" : "Ainda vou receber"}
        </button>
      </div>

      {/* Live impact */}
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
    </div>
  );
}

const FluxoPage = () => {
  const store = useFinanceStore();

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 py-8 sm:px-8 lg:px-12 max-w-[1440px] mx-auto pb-28 md:pb-16">
        <header className="mb-8">
          <span className="label-mono">Fluxo de caixa</span>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mt-1">
            Fluxo do Mês
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Todas as entradas e saídas de {store.currentCashflow.month} {store.currentCashflow.year} — débito, pix, dinheiro e cartão, integrados às projeções.
          </p>
          <div className="hairline mt-5" />
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4 items-start">
          <div key={`cf-${store.selectedMonth}`} className="animate-float-in">
            <CashflowCard
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
          </div>
          <SmartEntryPanel />
        </div>

        <div className="mt-4">
          <PaymentSessions />
        </div>
      </div>
    </div>
  );
};

export default FluxoPage;

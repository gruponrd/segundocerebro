import { money } from "@/lib/planningTools";
import { useState, useEffect, useCallback, useRef } from "react";
import { useFinanceStore } from "@/stores/financeStore";
import { CreditCard, AlertTriangle, ChevronLeft, ChevronRight, Wallet, Plus, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXPENSE_CATEGORIES, suggestCategory, getCategory } from "@/data/categories";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AllCardsGrid } from "@/components/AllCardsGrid";
import { PageHeader } from "@/components/PageHeader";
import type { Bank } from "@/data/financialData";


function DebitExpenseForm({ bankName }: { bankName: string }) {
  const { selectedMonth, currentCashflow, addCashflowItem, totalIncome, totalExpense, expectedBalance } =
    useFinanceStore();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("outros");

  useEffect(() => {
    if (label.trim().length >= 3) {
      const s = suggestCategory(label);
      if (s !== "outros") setCategory(s);
    }
  }, [label]);

  const handleAdd = () => {
    const val = parseFloat(amount);
    if (!label.trim() || isNaN(val) || val <= 0) return;
    addCashflowItem(
      selectedMonth,
      "expenses",
      `💳 ${bankName} (débito) — ${label.trim()}`,
      val,
      category,
    );
    const cat = getCategory(category);
    toast({
      title: "Débito registrado",
      description: `${cat.emoji} ${label} • R$ ${val.toLocaleString("pt-BR")} descontado do saldo final`,
    });
    setLabel(""); setAmount(""); setCategory("outros"); setOpen(false);
  };

  const projectedAfter = expectedBalance - (parseFloat(amount) || 0);

  return (
    <div className="rounded-xl bg-background/50 border border-border/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Gasto no débito</h3>
          <p className="text-[10px] text-muted-foreground">
            Desconta do saldo final do mês ({currentCashflow.month})
          </p>
        </div>
        {!open && (
          <Button size="sm" variant="outline" className="rounded-lg gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Novo
          </Button>
        )}
      </div>

      {open && (
        <div className="space-y-2.5">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Descrição (ex: Supermercado)"
            className="rounded-lg h-9 text-sm"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Valor (R$)"
              className="rounded-lg h-9 text-sm"
              min={0}
            />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="rounded-lg h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.emoji} {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {amount && parseFloat(amount) > 0 && (
            <div className="text-[11px] bg-secondary/40 rounded-lg px-2.5 py-1.5 flex justify-between">
              <span className="text-muted-foreground">Saldo final projetado</span>
              <span className={cn("font-bold tabular-nums", projectedAfter < 0 ? "text-expense" : "text-income")}>
                R$ {projectedAfter.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" className="flex-1 rounded-lg gap-1.5" onClick={handleAdd}>
              <Check className="w-3.5 h-3.5" /> Adicionar
            </Button>
            <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-between text-[11px] pt-1 border-t border-border/30">
        <span className="text-muted-foreground">Saldo final do mês</span>
        <span className={cn("font-bold tabular-nums", expectedBalance < 0 ? "text-expense" : "text-income")}>
          R$ {expectedBalance.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
        </span>
      </div>
    </div>
  );
}

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  parcial: "Parcial",
};

const statusStyles: Record<string, string> = {
  pendente: "bg-expense/20 text-expense border-expense/30",
  pago: "bg-income/20 text-income border-income/30",
  parcial: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const bankGradients: Record<string, string> = {
  "bank-nubank": "linear-gradient(135deg, hsl(280,97%,38%), hsl(300,80%,25%))",
  "bank-inter": "linear-gradient(135deg, hsl(27,100%,50%), hsl(15,90%,40%))",
  "bank-c6": "linear-gradient(135deg, hsl(220,10%,20%), hsl(220,15%,12%))",
  "bank-itau": "linear-gradient(135deg, #F88104, hsl(25,90%,35%))",
  "bank-bb": "linear-gradient(135deg, hsl(45,100%,45%), hsl(45,80%,30%))",
  "bank-other": "linear-gradient(135deg, #1B7085, hsl(190,70%,22%))",
};

const bankTextColor: Record<string, string> = {
  "bank-nubank": "text-white",
  "bank-inter": "text-white",
  "bank-c6": "text-gray-300",
  "bank-itau": "text-white",
  "bank-bb": "text-gray-900",
  "bank-other": "text-white",
};

function WalletCard({
  bank,
  stackIndex,
  isActive,
  totalCards,
  onClick,
}: {
  bank: Bank;
  stackIndex: number;
  isActive: boolean;
  totalCards: number;
  onClick: () => void;
}) {
  const usagePercent = bank.limitTotal > 0 ? Math.min((bank.limitUsed / bank.limitTotal) * 100, 100) : 0;
  const isOverLimit = bank.limitUsed > bank.limitTotal;
  const freeAmount = bank.limitTotal - bank.limitUsed;
  const gradient = bankGradients[bank.color] || bankGradients["bank-other"];
  const textColor = bankTextColor[bank.color] || "text-white";
  const cardNumber = `•••• •••• •••• ${String(
    Math.abs(
      bank.name.split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % 10000
    )
  ).padStart(4, "0")}`;

  // Stack positioning: active card is fully visible, others peek from top
  const peekOffset = isActive ? 0 : -(stackIndex * 28 + 60);
  const scaleVal = isActive ? 1 : 1 - stackIndex * 0.03;
  const zIndex = isActive ? 50 : totalCards - stackIndex;
  const blurVal = isActive ? 0 : Math.min(stackIndex * 0.5, 2);

  return (
    <div
      className={cn("absolute left-1/2 cursor-pointer", textColor)}
      style={{
        transform: `translateX(-50%) translateY(${peekOffset}px) scale(${scaleVal})`,
        zIndex,
        filter: `blur(${blurVal}px)`,
        transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        width: 340,
        height: 210,
      }}
      onClick={onClick}
    >
      <div
        className="w-full h-full rounded-2xl overflow-hidden shadow-xl"
        style={{ background: gradient }}
      >
        <div className="relative w-full h-full p-4 flex flex-col justify-between">
          {/* Pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />

          <div className="relative z-10 flex items-start justify-between">
            <div>
              <h3 className="font-bold text-lg tracking-wide">{bank.name}</h3>
              <p className="text-[10px] opacity-60 mt-0.5">
                {bank.installments.filter((i) => i.status !== "pago").length} parcelas ativas
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn("text-[9px] border-white/30", statusStyles[bank.status] || "")}
            >
              {statusLabels[bank.status] || bank.status}
            </Badge>
          </div>

          <div className="relative z-10 flex items-center gap-2">
            <div className="w-9 h-6 rounded bg-gradient-to-br from-yellow-300/80 to-yellow-600/80 border border-yellow-400/40" />
            <span className="text-xs font-mono tracking-[0.18em] opacity-80">{cardNumber}</span>
          </div>

          <div className="relative z-10 space-y-1.5">
            <div>
              <div className="flex justify-between text-[9px] opacity-70 mb-0.5">
                <span>Limite usado</span>
                <span>{usagePercent.toFixed(0)}%</span>
              </div>
              <Progress value={usagePercent} className="h-1 bg-white/20 [&>div]:bg-white/80" />
            </div>
            <div className="flex justify-between items-end text-xs">
              <div>
                <p className="text-[9px] opacity-60">Limite</p>
                <p className="font-bold tabular-nums">
                  {money(bank.limitTotal)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[9px] opacity-60">Usado</p>
                <p className="font-bold tabular-nums">
                  {money(bank.limitUsed)}
                </p>
              </div>
              <div className="text-right">
                {isOverLimit ? (
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <div>
                      <p className="text-[9px] opacity-60">Excedido</p>
                      <p className="font-bold tabular-nums">
                        {money(Math.abs(freeAmount))}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-[9px] opacity-60">Livre</p>
                    <p className="font-bold tabular-nums">
                      {money(freeAmount)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="absolute bottom-3 right-4 opacity-10">
            <CreditCard className="w-10 h-10" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CarteiraPage() {
  const { banks } = useFinanceStore();
  const [activeIndex, setActiveIndex] = useState(0);
  const [view, setView] = useState<"carteira" | "todos">("carteira");
  const touchStartRef = useRef<number | null>(null);


  const count = banks.length;

  const prev = useCallback(() => setActiveIndex((p) => (p - 1 + count) % count), [count]);
  const next = useCallback(() => setActiveIndex((p) => (p + 1) % count), [count]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") prev();
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next]);

  const totalDebt = banks.reduce((s, b) => s + b.debtFinal, 0);
  const totalLimit = banks.reduce((s, b) => s + b.limitTotal, 0);
  const totalUsed = banks.reduce((s, b) => s + b.limitUsed, 0);

  if (count === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Nenhum cartão cadastrado.</p>
      </div>
    );
  }

  // Reorder banks so active is at bottom (index 0 = closest), rest stacked above
  const orderedBanks = banks.map((bank, i) => {
    let stackPos = i - activeIndex;
    if (stackPos < 0) stackPos += count;
    return { bank, originalIndex: i, stackPos };
  });

  const activeBank = banks[activeIndex];

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartRef.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) prev();
      else next();
    }
    touchStartRef.current = null;
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <div className="page-container">
        {/* Header */}
        <PageHeader title="Carteira" description="Seus cartões, limites e parcelas em um só lugar." icon={Wallet} className="mb-6" />

        {/* View toggle */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-full border border-border/50 bg-card/60 backdrop-blur p-1">
            {([
              { key: "carteira", label: "Carteira" },
              { key: "todos", label: "Todos os cartões" },
            ] as const).map((v) => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[11px] uppercase tracking-wider transition-colors",
                  view === v.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {view === "todos" && <AllCardsGrid banks={banks} />}

        {/* Main layout */}
        <div className={cn("flex flex-col lg:flex-row items-center lg:items-start gap-10 justify-center", view !== "carteira" && "hidden")}>

          {/* Wallet pocket */}
          <div className="flex-shrink-0 flex flex-col items-center gap-4">
            <div
              className="relative"
              style={{ width: 380, height: 380 }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Wallet body */}
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-3xl border border-border/60 overflow-hidden"
                style={{
                  width: 360,
                  height: 200,
                  background: "linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--card) / 0.8) 100%)",
                  boxShadow: "0 -4px 30px -5px hsl(var(--primary) / 0.08), inset 0 2px 20px hsl(var(--background) / 0.3)",
                }}
              >
                {/* Wallet stitching line */}
                <div className="absolute top-3 inset-x-4 h-px border-t border-dashed border-border/40" />
                {/* Total balance */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pt-6">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                    Saldo Total
                  </p>
                  <p className="text-2xl font-bold text-foreground tabular-nums tracking-wide">
                    ••••••
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Total Balance</p>
                </div>
                {/* Wallet icon */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-10">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>

              {/* Stacked cards peeking from wallet */}
              {orderedBanks
                .sort((a, b) => b.stackPos - a.stackPos)
                .map(({ bank, originalIndex, stackPos }) => (
                  <WalletCard
                    key={bank.id}
                    bank={bank}
                    stackIndex={stackPos}
                    isActive={stackPos === 0}
                    totalCards={count}
                    onClick={() => setActiveIndex(originalIndex)}
                  />
                ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-4">
              <button
                onClick={prev}
                className="w-10 h-10 rounded-full bg-card/80 backdrop-blur border border-border/50 flex items-center justify-center text-foreground hover:bg-primary/20 hover:text-primary transition-all shadow-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex gap-2">
                {banks.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    className={cn(
                      "h-2 rounded-full transition-all duration-500",
                      i === activeIndex
                        ? "bg-primary w-6"
                        : "bg-muted-foreground/30 w-2 hover:bg-muted-foreground/50"
                    )}
                  />
                ))}
              </div>

              <button
                onClick={next}
                className="w-10 h-10 rounded-full bg-card/80 backdrop-blur border border-border/50 flex items-center justify-center text-foreground hover:bg-primary/20 hover:text-primary transition-all shadow-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Detail Panel */}
          <div className="flex-1 max-w-xl w-full space-y-4">
            {activeBank && (
              <div
                key={activeBank.id}
                className="rounded-2xl bg-card/60 backdrop-blur border border-border/50 p-5 space-y-4"
                style={{ animation: "float-in 0.4s ease-out" }}
              >
                <h2 className="text-xl font-bold text-foreground">{activeBank.name}</h2>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-background/50 p-3">
                    <p className="text-[10px] text-muted-foreground">Limite</p>
                    <p className="text-base font-bold text-foreground tabular-nums">
                      {money(activeBank.limitTotal)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-background/50 p-3">
                    <p className="text-[10px] text-muted-foreground">Usado</p>
                    <p className="text-base font-bold text-foreground tabular-nums">
                      {money(activeBank.limitUsed)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-background/50 p-3">
                    <p className="text-[10px] text-muted-foreground">Dívida</p>
                    <p className="text-base font-bold text-foreground tabular-nums">
                      {money(activeBank.debtFinal)}
                    </p>
                  </div>
                </div>

                {activeBank.installments.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground">Parcelas</h3>
                    <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                      {activeBank.installments.map((inst) => (
                        <div
                          key={inst.id}
                          className="flex items-center justify-between rounded-lg bg-background/40 px-3 py-2 text-sm"
                        >
                          <span className="text-foreground truncate flex-1">
                            {inst.description}
                          </span>
                          <span className="text-muted-foreground text-xs mx-2">
                            {inst.totalInstallments > 1 ? `${inst.currentInstallment}/${inst.totalInstallments}` : "Avulsa"}
                          </span>
                          <span className="font-semibold text-foreground tabular-nums">
                            {money(inst.installmentAmount)}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn("ml-2 text-[9px]", statusStyles[inst.status] || "")}
                          >
                            {inst.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <DebitExpenseForm bankName={activeBank.name} />
              </div>
            )}

            {/* Summary */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-card/60 backdrop-blur border border-border/50 p-3 text-center">
                <p className="text-xs text-muted-foreground">Limite total</p>
                <p className="text-lg font-bold text-foreground tabular-nums">
                  {money(totalLimit)}
                </p>
              </div>
              <div className="rounded-xl bg-card/60 backdrop-blur border border-border/50 p-3 text-center">
                <p className="text-xs text-muted-foreground">Total usado</p>
                <p className="text-lg font-bold text-foreground tabular-nums">
                  {money(totalUsed)}
                </p>
              </div>
              <div className="rounded-xl bg-card/60 backdrop-blur border border-border/50 p-3 text-center">
                <p className="text-xs text-muted-foreground">Dívida total</p>
                <p className="text-lg font-bold text-expense tabular-nums">
                  {money(totalDebt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

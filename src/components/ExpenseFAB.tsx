import { CardPurchaseForm } from "@/components/CardPurchaseForm";
import { Plus, Check, X, CreditCard, ArrowUp, ArrowDown } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFinanceStore } from "@/stores/financeStore";
import { toast } from "@/hooks/use-toast";
import { EXPENSE_CATEGORIES, suggestCategory, getCategory } from "@/data/categories";
import { OPEN_TRANSACTION_EVENT } from "@/lib/transactionMenu";
import { PeriodPicker } from "@/components/PeriodPicker";

type Mode = "income" | "expense" | "card" | null;

function CategoryPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1.5">Categoria</p>
      <div className="grid grid-cols-4 gap-1.5">
        {EXPENSE_CATEGORIES.map((c) => {
          const active = value === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.id)}
              className={`flex flex-col items-center gap-0.5 px-1 py-2 rounded-lg border text-[10px] transition-all ${
                active
                  ? `${c.bg} ${c.color} border-current scale-105`
                  : "bg-secondary/40 border-transparent text-muted-foreground hover:bg-secondary/70"
              }`}
            >
              <span className="text-base leading-none">{c.emoji}</span>
              <span className="truncate w-full text-center">{c.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ExpenseFAB() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<Mode>(null);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("outros");
  const { selectedMonth, setSelectedMonth, cashflowMonths, addCashflowItem } = useFinanceStore();

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_TRANSACTION_EVENT, show);
    return () => window.removeEventListener(OPEN_TRANSACTION_EVENT, show);
  }, []);

  // Auto-suggest category from label
  useEffect(() => {
    if (label.trim().length >= 3) {
      const s = suggestCategory(label);
      if (s !== "outros") setCategory(s);
    }
  }, [label]);

  const reset = () => {
    setType(null); setLabel(""); setAmount(""); setCategory("outros");
  };

  const handleAddSimple = () => {
    const val = parseFloat(amount);
    if (!label.trim() || isNaN(val) || val <= 0 || !type) return;
    addCashflowItem(
      selectedMonth,
      type === "income" ? "incomes" : "expenses",
      label.trim(),
      val,
      type === "expense" ? category : undefined,
    );
    const cat = getCategory(category);
    reset(); setOpen(false);
    toast({
      title: "Adicionado",
      description: `${type === "expense" ? cat.emoji + " " : ""}${label} • R$ ${val.toLocaleString("pt-BR")}`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogContent className="w-[calc(100%-2rem)] rounded-2xl border-border/70 sm:max-w-md max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Novo lançamento</DialogTitle>
          <DialogDescription>Escolha receita, despesa ou compra no cartão.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {type !== "card" && <div className="rounded-xl border border-border/60 p-3"><p className="mb-2 text-xs text-muted-foreground">Registrar receita ou despesa em</p><PeriodPicker months={cashflowMonths} selected={selectedMonth} onChange={setSelectedMonth} /></div>}
          {!type ? (
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="h-24 flex-col gap-2 rounded-xl border-income/30 hover:bg-income/10 hover:border-income/50 text-income"
                onClick={() => setType("income")}
              >
                <ArrowUp className="w-5 h-5" />
                <span className="text-xs">Receita</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex-col gap-2 rounded-xl border-expense/30 hover:bg-expense/10 hover:border-expense/50 text-expense"
                onClick={() => setType("expense")}
              >
                <ArrowDown className="w-5 h-5" />
                <span className="text-xs">Despesa</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex-col gap-2 rounded-xl border-primary/30 hover:bg-primary/10 hover:border-primary/50 text-primary"
                onClick={() => setType("card")}
              >
                <CreditCard className="w-5 h-5" />
                <span className="text-xs">Cartão</span>
              </Button>
            </div>
          ) : type === "card" ? (
            <CardPurchaseForm onDone={() => { reset(); setOpen(false); }} onCancel={reset} />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {type === "income" ? "Nova Receita" : "Nova Despesa (débito/dinheiro/Pix)"}
              </p>
              <Input aria-label="Descrição do lançamento" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Descrição" className="rounded-xl" autoFocus />
              <Input aria-label="Valor do lançamento" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Valor (R$)" className="rounded-xl" min={0} />
              {type === "expense" && <CategoryPicker value={category} onChange={setCategory} />}
              <div className="flex gap-2">
                <Button className="flex-1 rounded-xl gap-2" onClick={handleAddSimple}>
                  <Check className="w-4 h-4" /> Adicionar
                </Button>
                <Button aria-label="Voltar à escolha de lançamento" variant="outline" className="rounded-xl" onClick={reset}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

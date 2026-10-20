import { CardPurchaseButton } from "@/components/CardPurchaseForm";
import { useMemo } from "react";
import { CreditCard, X } from "lucide-react";
import { useFinanceStore } from "@/stores/financeStore";
import { Checkbox } from "@/components/ui/checkbox";
import { getCategory, suggestCategory } from "@/data/categories";
import type { Bank, Installment } from "@/data/financialData";
import { BankLogo } from "@/components/BankLogo";

const MONTH_MAP: Record<string, number> = {
  "Janeiro": 1, "Fevereiro": 2, "Março": 3, "Abril": 4, "Maio": 5, "Junho": 6,
  "Julho": 7, "Agosto": 8, "Setembro": 9, "Outubro": 10, "Novembro": 11, "Dezembro": 12,
};

/** Central de cartões dentro do Fluxo de Caixa: detalha parcelas do mês por cartão,
 *  permite baixar pagamentos e lançar gastos emergenciais — tudo refletido
 *  automaticamente no saldo usado dos cartões e no saldo final do mês. */
export function CardFlowHub() {
  const { banks, currentCashflow, updateInstallment, removeInstallment } = useFinanceStore();
  const monthNum = MONTH_MAP[currentCashflow.month];
  const year = currentCashflow.year;

  const activeBanks = banks.filter((b) => b.status !== "cancelado");

  // Group this month's installments per card
  const perCard = useMemo(() => {
    return activeBanks
      .map((bank) => {
        const items = bank.installments.filter((inst) => {
          const d = new Date(inst.dueDate + "T00:00:00");
          return d.getMonth() + 1 === monthNum && d.getFullYear() === year;
        });
        const total = items.reduce((s, i) => s + i.installmentAmount, 0);
        const open = items.filter((i) => i.status !== "pago").reduce((s, i) => s + i.installmentAmount, 0);
        return { bank, items, total, open };
      })
      .filter((g) => g.items.length > 0);
  }, [activeBanks, monthNum, year]);

  const grandTotal = perCard.reduce((s, g) => s + g.total, 0);

  const togglePaid = (bank: Bank, inst: Installment) => {
    updateInstallment(bank.id, inst.id, { status: inst.status === "pago" ? "pendente" : "pago" });
  };

  return (
    <div className="mb-4 p-3 rounded-xl bg-expense/5 border border-expense/10">
      <div className="flex items-center justify-between text-sm mb-3">
        <span className="text-muted-foreground flex items-center gap-2">
          <CreditCard className="w-3.5 h-3.5 text-expense" />
          Central de Cartões
        </span>
        <span className="text-expense font-medium text-money">R$ {grandTotal.toLocaleString("pt-BR")}</span>
      </div>

      {/* Per-card breakdown */}
      {perCard.length === 0 && (
        <p className="text-xs text-muted-foreground mb-2">Nenhuma parcela de cartão neste mês.</p>
      )}
      <div className="space-y-3">
        {perCard.map(({ bank, items, total, open }) => (
          <div key={bank.id} className="rounded-lg bg-background/40 border border-border/20 p-2.5">
            <div className="flex items-center gap-2 mb-1.5">
              {bank.logoDataUrl ? (
                <BankLogo bank={bank} size="sm" decorative />
              ) : (
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: bank.color.startsWith("#") ? bank.color : `hsl(${bank.color})` }}
                />
              )}
              <span className="text-xs font-semibold text-foreground truncate">{bank.name}</span>
              <span className="ml-auto text-xs text-money text-foreground">R$ {total.toLocaleString("pt-BR")}</span>
              {open > 0 && open !== total && (
                <span className="text-[9px] text-muted-foreground">aberto R$ {open.toLocaleString("pt-BR")}</span>
              )}
            </div>
            <div className="space-y-1">
              {items.map((inst) => {
                const paid = inst.status === "pago";
                const cat = inst.category ? getCategory(inst.category) : null;
                const day = new Date(inst.dueDate + "T00:00:00").getDate();
                return (
                  <div key={inst.id} className="flex items-center gap-2 text-xs group">
                    <Checkbox
                      checked={paid}
                      onCheckedChange={() => togglePaid(bank, inst)}
                      className="h-3.5 w-3.5 rounded border-border data-[state=checked]:bg-income data-[state=checked]:border-income"
                    />
                    <span className={`truncate flex-1 ${paid ? "line-through text-muted-foreground" : "text-muted-foreground"}`}>
                      {inst.description}
                      {inst.totalInstallments > 1 && (
                        <span className="text-[9px] text-muted-foreground/70"> {inst.currentInstallment}/{inst.totalInstallments}</span>
                      )}
                    </span>
                    {cat && (
                      <span className={`hidden sm:inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] ${cat.bg} ${cat.color}`}>
                        {cat.emoji} {cat.label}
                      </span>
                    )}
                    <span className="text-[9px] text-muted-foreground/70 shrink-0">dia {day}</span>
                    <span className={`text-money shrink-0 ${paid ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      R$ {inst.installmentAmount.toLocaleString("pt-BR")}
                    </span>
                    <button
                      onClick={() => removeInstallment(bank.id, inst.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-expense/20 text-muted-foreground hover:text-expense transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Quick add: gasto emergencial / lançamento preciso no cartão */}
      <CardPurchaseButton initialDate={`${year}-${String(monthNum).padStart(2, "0")}-10`}>Lançar compra no cartão</CardPurchaseButton>
    </div>
  );
}

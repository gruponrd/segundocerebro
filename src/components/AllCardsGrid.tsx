import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CalendarClock, CreditCard, Wifi } from "lucide-react";
import { getCardColor } from "@/data/cardColors";
import { cardSpendingForMonth } from "@/lib/financeCalculations";
import { cn } from "@/lib/utils";
import type { Bank } from "@/data/financialData";

const brl = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const instStatusStyles: Record<string, string> = {
  pendente: "bg-expense/15 text-expense border-expense/30",
  pago: "bg-income/15 text-income border-income/30",
  atrasado: "bg-amber-500/15 text-amber-500 border-amber-500/30",
};

function CardColumn({ bank }: { bank: Bank }) {
  const color = getCardColor(bank.color);
  const usagePercent = bank.limitTotal > 0 ? Math.min((bank.limitUsed / bank.limitTotal) * 100, 100) : 0;
  const isOverLimit = bank.limitUsed > bank.limitTotal;
  const freeAmount = bank.limitTotal - bank.limitUsed;

  const open = bank.installments.filter((i) => i.status !== "pago");
  const now = new Date();
  const monthly = cardSpendingForMonth([bank], now.getMonth() + 1, now.getFullYear());

  const sorted = [...bank.installments].sort((a, b) => {
    if (a.status === "pago" && b.status !== "pago") return 1;
    if (a.status !== "pago" && b.status === "pago") return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  return (
    <div className="flex flex-col rounded-2xl border border-border/50 bg-card/60 backdrop-blur overflow-hidden">
      {/* Card head */}
      <div className={cn("relative p-4 bg-gradient-to-br", color.gradient, color.text)} style={color.style}>
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
        <div className="relative flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.2em] opacity-60">Cartão</p>
            <h3 className="text-lg font-bold tracking-wide truncate">{bank.name}</h3>
          </div>
          <Wifi className="w-4 h-4 opacity-40 rotate-90 shrink-0" />
        </div>

        <div className="relative mt-3">
          <div className="flex justify-between text-[9px] opacity-70 mb-1">
            <span>Limite usado</span>
            <span className="text-money">{usagePercent.toFixed(0)}%</span>
          </div>
          <Progress value={usagePercent} className={cn("h-1.5 bg-white/20", color.progress)} />
          <div className="flex justify-between items-end mt-2 text-xs">
            <div>
              <p className="text-[9px] opacity-60">Usado</p>
              <p className="font-bold text-money">R$ {brl(bank.limitUsed)}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] opacity-60 flex items-center gap-1 justify-end">
                {isOverLimit && <AlertTriangle className="w-3 h-3" />}
                {isOverLimit ? "Excedido" : "Disponível"}
              </p>
              <p className="font-bold text-money">R$ {brl(Math.abs(freeAmount))}</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 divide-x divide-border/40 border-b border-border/40">
        <div className="p-2.5 text-center">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Por mês</p>
          <p className="text-sm font-bold text-money text-foreground">R$ {brl(monthly)}</p>
        </div>
        <div className="p-2.5 text-center">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Em aberto</p>
          <p className="text-sm font-bold text-money text-foreground">{open.length}</p>
        </div>
        <div className="p-2.5 text-center">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Dívida</p>
          <p className="text-sm font-bold text-money text-expense">R$ {brl(bank.debtFinal)}</p>
        </div>
      </div>

      {/* Faturas */}
      <div className="p-3 space-y-1.5 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          Faturas ({bank.installments.length})
        </p>
        {sorted.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma fatura registrada.</p>
        ) : (
          sorted.map((inst) => {
            const progress = inst.totalInstallments > 0 ? (inst.currentInstallment / inst.totalInstallments) * 100 : 0;
            const isPaid = inst.status === "pago";
            const accent = isPaid ? "bg-income" : inst.status === "atrasado" ? "bg-amber-400" : "bg-primary";
            return (
              <div
                key={inst.id}
                className={cn(
                  "relative overflow-hidden rounded-lg bg-background/50 pl-3 pr-2.5 py-2",
                  isPaid && "opacity-60",
                )}
              >
                <span className={cn("absolute left-0 top-0 bottom-0 w-[3px]", accent)} />
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{inst.description}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                      <span className="text-money">{inst.totalInstallments > 1 ? `${inst.currentInstallment}/${inst.totalInstallments}` : "Avulsa"}</span>
                      <span className="opacity-40">•</span>
                      <span className="flex items-center gap-0.5">
                        <CalendarClock className="w-2.5 h-2.5" />
                        {new Date(inst.dueDate + "T00:00:00").toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-money text-foreground leading-tight">
                      R$ {brl(inst.installmentAmount)}
                    </p>
                    <Badge variant="outline" className={cn("text-[9px] mt-0.5", instStatusStyles[inst.status])}>
                      {inst.status === "pago" ? "Pago" : inst.status === "atrasado" ? "Atrasado" : "Pendente"}
                    </Badge>
                  </div>
                </div>
                <div className="h-1 bg-secondary rounded-full overflow-hidden mt-1.5">
                  <div className={cn("h-full rounded-full", accent)} style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function AllCardsGrid({ banks }: { banks: Bank[] }) {
  const activeBanks = useMemo(() => banks.filter((b) => b.status !== "cancelado"), [banks]);

  const totals = useMemo(() => {
    const limit = activeBanks.reduce((s, b) => s + b.limitTotal, 0);
    const used = activeBanks.reduce((s, b) => s + b.limitUsed, 0);
    const debt = activeBanks.reduce((s, b) => s + b.debtFinal, 0);
    const now = new Date();
    const monthly = cardSpendingForMonth(activeBanks, now.getMonth() + 1, now.getFullYear());
    const invoices = activeBanks.reduce((s, b) => s + b.installments.length, 0);
    return { limit, used, debt, monthly, invoices };
  }, [activeBanks]);

  if (activeBanks.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/60 p-8 text-center">
        <CreditCard className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Nenhum cartão aberto.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Consolidado */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: "Cartões abertos", value: String(activeBanks.length), tone: "text-foreground" },
          { label: "Faturas", value: String(totals.invoices), tone: "text-foreground" },
          { label: "Compromisso/mês", value: `R$ ${brl(totals.monthly)}`, tone: "text-foreground" },
          { label: "Limite total", value: `R$ ${brl(totals.limit)}`, tone: "text-foreground" },
          { label: "Dívida total", value: `R$ ${brl(totals.debt)}`, tone: "text-expense" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border/50 bg-card/60 backdrop-blur p-3">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{k.label}</p>
            <p className={cn("text-base font-bold text-money", k.tone)}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Cartões lado a lado */}
      <div className="flex gap-4 overflow-x-auto pb-3 snap-x custom-scrollbar">
        {activeBanks.map((bank) => (
          <div key={bank.id} className="snap-start shrink-0 w-[320px]">
            <CardColumn bank={bank} />
          </div>
        ))}
      </div>
    </div>
  );
}

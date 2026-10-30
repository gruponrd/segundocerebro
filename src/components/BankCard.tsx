import { bankCategoryLabel } from "@/lib/bankCategory";
import { useState } from "react";
import { type Bank, type BankId } from "@/data/financialData";
import { AlertTriangle, Pencil, Check, X, Wifi } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { getCardColor } from "@/data/cardColors";
import { BankLogo } from "@/components/BankLogo";

interface BankCardProps {
  bank: Bank;
  index: number;
  onClick: () => void;
  onUpdateBank?: (bankId: BankId, updates: Partial<Pick<Bank, "name" | "limitTotal" | "status" | "logoDataUrl" | "category">>) => void;
}

const statusLabels = {
  pendente: "Pendente",
  pago: "Pago",
  parcial: "Parcial",
  cancelado: "Cancelado",
};

const statusStyles = {
  pendente: "bg-expense/20 text-expense border-expense/30",
  pago: "bg-income/20 text-income border-income/30",
  parcial: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  cancelado: "bg-muted/40 text-muted-foreground border-muted-foreground/30",
};

const statusOptions: Bank["status"][] = ["pendente", "pago", "parcial", "cancelado"];

export function BankCard({ bank, index, onClick, onUpdateBank }: BankCardProps) {
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [editingLimit, setEditingLimit] = useState(false);
  const [editLimit, setEditLimit] = useState("");

  const usagePercent = bank.limitTotal > 0 ? Math.min((bank.limitUsed / bank.limitTotal) * 100, 100) : 0;
  const isOverLimit = bank.limitUsed > bank.limitTotal;
  const freeAmount = bank.limitTotal - bank.limitUsed;

  const cardColor = getCardColor(bank.color);
  const gradient = cardColor.gradient;
  const textColor = cardColor.text;
  const progressColor = cardColor.progress;

  const cycleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateBank) return;
    const idx = statusOptions.indexOf(bank.status);
    onUpdateBank(bank.id, { status: statusOptions[(idx + 1) % statusOptions.length] });
  };

  const cardNumber = `•••• •••• •••• ${String(Math.abs(bank.name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 10000)).padStart(4, "0")}`;

  const isCancelled = bank.status === "cancelado";

  return (
    <div
      className={`bank-summary-card relative w-full text-left rounded-2xl cursor-pointer group animate-float-in overflow-hidden ${isOverLimit ? "animate-over-limit" : ""} ${isCancelled ? "opacity-50 grayscale" : ""}`}
      style={{ animationDelay: `${index * 80}ms`, minHeight: "224px", aspectRatio: "1.586/1" }}
    >
      {!isCancelled && !editingName && !editingLimit && <button type="button" onClick={onClick} aria-label={`Ver detalhes do cartão ${bank.name}`} className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white" />}
      <div className={`relative pointer-events-none w-full h-full bg-gradient-to-br ${gradient} px-4 py-3 flex flex-col justify-between gap-1 ${textColor}`} style={cardColor.style}>
        {/* Subtle pattern */}
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{
          backgroundImage: `radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }} />

        {/* Top: name + status */}
        <div className="relative z-20 flex items-start justify-between gap-2 shrink-0">
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="pointer-events-auto flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Input
                  aria-label="Nome do cartão"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-7 text-sm rounded-lg w-32 bg-black/20 border-white/20 text-white placeholder:text-white/50"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { onUpdateBank?.(bank.id, { name: editName }); setEditingName(false); }
                    if (e.key === "Escape") setEditingName(false);
                  }}
                />
                <button onClick={(e) => { e.stopPropagation(); onUpdateBank?.(bank.id, { name: editName }); setEditingName(false); }} aria-label="Salvar nome do cartão" className="icon-action"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={(e) => { e.stopPropagation(); setEditingName(false); }} aria-label="Cancelar edição do nome do cartão" className="icon-action"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <button type="button" disabled={!onUpdateBank}
                aria-label={`Editar nome do cartão ${bank.name}`}
                className="pointer-events-auto text-left min-w-0 max-w-full min-h-8 flex items-center gap-1.5 group/name rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:cursor-default"
                onClick={(e) => { if (onUpdateBank) { e.stopPropagation(); setEditName(bank.name); setEditingName(true); } }}
              >
                <span className="font-bold text-base tracking-wide truncate max-w-full">{bank.name}</span>
                {onUpdateBank && <Pencil aria-hidden className="w-3 h-3 opacity-60" />}
              </button>
            )}
            <p className="text-[10px] opacity-80">{bankCategoryLabel(bank.category)}</p>
            <p className="text-[10px] opacity-60 mt-0.5">{bank.installments.filter(i => i.status !== "pago").length} parcelas ativas</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" disabled={!onUpdateBank} aria-label={`Alterar status de ${bank.name}: ${statusLabels[bank.status]}`}
              className={`pointer-events-auto min-h-8 px-2 rounded-md border text-[10px] cursor-pointer border-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${statusStyles[bank.status]}`}
              onClick={cycleStatus}
            >
              {statusLabels[bank.status]}
            </button>
            {bank.logoDataUrl ? <BankLogo bank={bank} size="sm" decorative /> : <Wifi className="w-5 h-5 opacity-40 rotate-90" />}
          </div>
        </div>

        {/* Chip + Card Number */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-7 h-5 rounded-md bg-gradient-to-br from-yellow-300/80 to-yellow-600/80 border border-yellow-400/40" />
          <span className="text-xs font-mono tracking-[0.18em] opacity-80">{cardNumber}</span>
        </div>

        {/* Bottom: Financial info */}
        <div className="relative z-20 space-y-1 shrink-0">
          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-[10px] opacity-70 mb-1">
              <span>Limite usado</span>
              <span>{usagePercent.toFixed(0)}%</span>
            </div>
            <Progress value={usagePercent} className={`h-1.5 bg-white/20 ${progressColor}`} />
          </div>

          {/* Values row */}
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] opacity-60">Limite</p>
              {editingLimit ? (
                <div className="pointer-events-auto flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Input
                    type="number"
                    aria-label="Limite do cartão em reais"
                    value={editLimit}
                    onChange={(e) => setEditLimit(e.target.value)}
                    className="h-6 text-xs rounded w-20 bg-black/20 border-white/20 text-white"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { const n = parseFloat(editLimit); if (!isNaN(n) && n > 0) onUpdateBank?.(bank.id, { limitTotal: n }); setEditingLimit(false); }
                      if (e.key === "Escape") setEditingLimit(false);
                    }}
                  />
                </div>
              ) : (
                <button type="button" disabled={!onUpdateBank} aria-label={`Editar limite do cartão ${bank.name}`}
                  className="pointer-events-auto min-h-8 text-sm font-bold tabular-nums cursor-pointer group/limit flex items-center gap-1 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                  onClick={(e) => { if (onUpdateBank) { e.stopPropagation(); setEditLimit(String(bank.limitTotal)); setEditingLimit(true); } }}
                >
                  R$ {bank.limitTotal.toLocaleString("pt-BR")}
                  {onUpdateBank && <Pencil aria-hidden className="w-2.5 h-2.5 opacity-60" />}
                </button>
              )}
            </div>

            <div className="text-center">
              <p className="text-[10px] opacity-60">Usado</p>
              <p className="text-sm font-bold tabular-nums">
                R$ {bank.limitUsed.toLocaleString("pt-BR")}
              </p>
              
            </div>

            <div className="text-right">
              {isOverLimit ? (
                <div className="flex items-center gap-1 animate-pulse-danger">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <div>
                    <p className="text-[10px] opacity-60">Excedido</p>
                    <p className="text-sm font-bold tabular-nums">R$ {Math.abs(freeAmount).toLocaleString("pt-BR")}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-[10px] opacity-60">Livre</p>
                  <p className="text-sm font-bold tabular-nums">R$ {freeAmount.toLocaleString("pt-BR")}</p>
                </div>
              )}
            </div>
          </div>

          {/* Debt total */}
          <div className="flex justify-between items-center pt-1 border-t border-white/10">
            <span className="text-[10px] opacity-60">Dívida Total</span>
            <span className="text-sm font-bold tabular-nums">R$ {bank.debtFinal.toLocaleString("pt-BR")}</span>
          </div>
        </div>

      </div>
    </div>
  );
}

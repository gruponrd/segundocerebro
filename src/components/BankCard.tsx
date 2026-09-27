import { useState } from "react";
import { type Bank, type BankId } from "@/data/financialData";
import { AlertTriangle, Pencil, Check, X, Wifi } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getCardColor } from "@/data/cardColors";

interface BankCardProps {
  bank: Bank;
  index: number;
  onClick: () => void;
  onUpdateBank?: (bankId: BankId, updates: Partial<Pick<Bank, "name" | "limitTotal" | "status">>) => void;
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
      onClick={editingName || editingLimit || isCancelled ? undefined : onClick}
      className={`w-full text-left rounded-2xl cursor-pointer group animate-float-in overflow-hidden ${isOverLimit ? "animate-over-limit" : ""} ${isCancelled ? "opacity-50 grayscale" : ""}`}
      style={{ animationDelay: `${index * 80}ms`, aspectRatio: "1.586/1" }}
    >
      <div className={`relative w-full h-full bg-gradient-to-br ${gradient} px-4 py-3 flex flex-col justify-between gap-1 ${textColor}`} style={cardColor.style}>
        {/* Subtle pattern */}
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{
          backgroundImage: `radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }} />

        {/* Top: name + status */}
        <div className="relative z-10 flex items-start justify-between shrink-0">
          <div className="flex-1">
            {editingName ? (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-7 text-sm rounded-lg w-32 bg-black/20 border-white/20 text-white placeholder:text-white/50"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { onUpdateBank?.(bank.id, { name: editName }); setEditingName(false); }
                    if (e.key === "Escape") setEditingName(false);
                  }}
                />
                <button onClick={(e) => { e.stopPropagation(); onUpdateBank?.(bank.id, { name: editName }); setEditingName(false); }} className="p-1"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={(e) => { e.stopPropagation(); setEditingName(false); }} className="p-1"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <div
                className="flex items-center gap-1.5 group/name"
                onClick={(e) => { if (onUpdateBank) { e.stopPropagation(); setEditName(bank.name); setEditingName(true); } }}
              >
                <h3 className="font-bold text-base tracking-wide truncate max-w-[8.5rem]">{bank.name}</h3>
                {onUpdateBank && <Pencil className="w-3 h-3 opacity-0 group-hover/name:opacity-60 transition-opacity" />}
              </div>
            )}
            <p className="text-[10px] opacity-60 mt-0.5">{bank.installments.filter(i => i.status !== "pago").length} parcelas ativas</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-[10px] cursor-pointer border-white/30 ${statusStyles[bank.status]}`}
              onClick={cycleStatus}
            >
              {statusLabels[bank.status]}
            </Badge>
            <Wifi className="w-5 h-5 opacity-40 rotate-90" />
          </div>
        </div>

        {/* Chip + Card Number */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-7 h-5 rounded-md bg-gradient-to-br from-yellow-300/80 to-yellow-600/80 border border-yellow-400/40" />
          <span className="text-xs font-mono tracking-[0.18em] opacity-80">{cardNumber}</span>
        </div>

        {/* Bottom: Financial info */}
        <div className="relative z-10 space-y-1 shrink-0">
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
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Input
                    type="number"
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
                <p
                  className="text-sm font-bold tabular-nums cursor-pointer group/limit flex items-center gap-1"
                  onClick={(e) => { if (onUpdateBank) { e.stopPropagation(); setEditLimit(String(bank.limitTotal)); setEditingLimit(true); } }}
                >
                  R$ {bank.limitTotal.toLocaleString("pt-BR")}
                  {onUpdateBank && <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/limit:opacity-60 transition-opacity" />}
                </p>
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

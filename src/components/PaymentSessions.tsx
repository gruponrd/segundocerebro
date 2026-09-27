import { useEffect, useMemo, useState } from "react";
import { Layers, ArrowUpCircle } from "lucide-react";
import { useFinanceStore } from "@/stores/financeStore";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { readAccountJson, writeAccountJson } from "@/lib/accountStorage";

const MONTH_MAP: Record<string, number> = {
  "Janeiro": 1, "Fevereiro": 2, "Março": 3, "Abril": 4, "Maio": 5, "Junho": 6,
  "Julho": 7, "Agosto": 8, "Setembro": 9, "Outubro": 10, "Novembro": 11, "Dezembro": 12,
};

/** Blocos de pagamento baseados nos dias de recebimento (5, 20 e 30).
 *  Cada recebimento cobre os vencimentos até a chegada do próximo. */
const SESSIONS = [
  { id: "s30", label: "Recebimento dia 30", range: "Venc. 1 – 4", from: 1, to: 4, payDay: 30, note: "receita do mês anterior" },
  { id: "s5", label: "Recebimento dia 5", range: "Venc. 5 – 19", from: 5, to: 19, payDay: 5, note: null },
  { id: "s20", label: "Recebimento dia 20", range: "Venc. 20 – 29", from: 20, to: 29, payDay: 20, note: null },
  { id: "s30b", label: "Recebimento dia 30", range: "Venc. 30 – 31", from: 30, to: 31, payDay: 30, note: "fecha o mês" },
] as const;

type SessionId = typeof SESSIONS[number]["id"];

const STORAGE_KEY = "payment-session-income-map-v1";
const brl = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Sessão sugerida a partir de um dia citado no texto da entrada (ex: "Salário dia 20"). */
function guessSession(label: string): SessionId {
  const m = label.match(/(?:dia\s*)?(\d{1,2})/);
  const day = m ? parseInt(m[1], 10) : NaN;
  if (!Number.isFinite(day)) return "s5";
  const best = [...SESSIONS].sort(
    (a, b) => Math.abs(a.payDay - day) - Math.abs(b.payDay - day)
  )[0];
  return best.id;
}

export function PaymentSessions() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const { banks, currentCashflow, updateInstallment, selectedMonth, toggleCashflowPaid } = useFinanceStore();

  const monthNum = MONTH_MAP[currentCashflow.month];
  const year = currentCashflow.year;
  const scope = `${currentCashflow.month}-${year}`;

  const [map, setMap] = useState<Record<string, SessionId>>({});
  useEffect(() => {
    if (userId) setMap(readAccountJson(userId, STORAGE_KEY, {}));
  }, [userId]);

  const assign = (key: string, session: SessionId) => {
    setMap((prev) => {
      const next = { ...prev, [key]: session };
      if (userId) writeAccountJson(userId, STORAGE_KEY, next);
      return next;
    });
  };

  const incomes = useMemo(
    () =>
      currentCashflow.incomes.map((item, idx) => {
        const key = `${scope}|${idx}|${item.label}`;
        return { item, idx, key, session: map[key] ?? guessSession(item.label) };
      }),
    [currentCashflow.incomes, map, scope]
  );

  const sessions = useMemo(() => {
    const items = banks
      .filter((b) => b.status !== "cancelado")
      .flatMap((bank) =>
        bank.installments
          .filter((inst) => {
            const d = new Date(inst.dueDate + "T00:00:00");
            return d.getMonth() + 1 === monthNum && d.getFullYear() === year;
          })
          .map((inst) => ({ bank, inst, day: new Date(inst.dueDate + "T00:00:00").getDate() }))
      );

    // Saídas manuais do fluxo do mês entram na sessão do dia 5 (não possuem data própria).
    const manualExpenses = currentCashflow.expenses.reduce((s, e) => s + e.amount, 0);

    return SESSIONS.map((s) => {
      const group = items
        .filter((i) => i.day >= s.from && i.day <= s.to)
        .sort((a, b) => a.day - b.day);
      const total = group.reduce((sum, i) => sum + i.inst.installmentAmount, 0);
      const paidTotal = group
        .filter((i) => i.inst.status === "pago")
        .reduce((sum, i) => sum + i.inst.installmentAmount, 0);
      const incomeGroup = incomes.filter((i) => i.session === s.id);
      const incomeTotal = incomeGroup.reduce((sum, i) => sum + i.item.amount, 0);
      return { ...s, group, total, paidTotal, incomeGroup, incomeTotal, manualExpenses };
    });
  }, [banks, monthNum, year, incomes, currentCashflow.expenses]);

  const grandTotal = sessions.reduce((s, x) => s + x.total, 0);
  const grandIncome = sessions.reduce((s, x) => s + x.incomeTotal, 0);
  const maxBar = Math.max(grandTotal, grandIncome, ...sessions.map((s) => Math.max(s.total, s.incomeTotal)), 1);

  return (
    <div className="glass-card rounded-2xl p-5 animate-float-in space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Sessões de Pagamento — {currentCashflow.month}
          </h3>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">
            Entradas <span className="text-money text-income">{brl(grandIncome)}</span>
          </span>
          <span className="text-xs text-muted-foreground">
            Dívidas <span className="text-money text-expense">{brl(grandTotal)}</span>
          </span>
          <span className={`text-sm text-money ${grandIncome - grandTotal < 0 ? "text-expense" : "text-income"}`}>
            {brl(grandIncome - grandTotal)}
          </span>
        </div>
      </div>

      {/* Comparativo por sessão: entradas x dívidas */}
      <div className="rounded-xl border border-border/60 bg-secondary/30 p-4 space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Comparativo por proximidade de data — entradas x dívidas
        </p>
        {sessions.map((s) => {
          const diff = s.incomeTotal - s.total;
          return (
            <div key={`cmp-${s.id}`} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">
                  {s.label} · {s.range}
                </span>
                <span className={`text-money ${diff < 0 ? "text-expense" : "text-income"}`}>
                  {diff < 0 ? `falta ${brl(Math.abs(diff))}` : `sobra ${brl(diff)}`}
                </span>
              </div>
              <div className="space-y-1">
                <div className="h-2 rounded-full bg-border/40 overflow-hidden">
                  <div className="h-full rounded-full bg-income/80" style={{ width: `${(s.incomeTotal / maxBar) * 100}%` }} />
                </div>
                <div className="h-2 rounded-full bg-border/40 overflow-hidden">
                  <div className="h-full rounded-full bg-expense/80" style={{ width: `${(s.total / maxBar) * 100}%` }} />
                </div>
              </div>
            </div>
          );
        })}
        <div className="flex gap-4 pt-1 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-1.5 rounded-full bg-income/80" /> entradas</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-1.5 rounded-full bg-expense/80" /> dívidas do bloco</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {sessions.map((s) => {
          const done = s.group.length > 0 && s.paidTotal >= s.total;
          return (
            <div
              key={s.id}
              className={`rounded-xl border p-3.5 flex flex-col transition-colors ${
                done
                  ? "border-income/30 bg-income/5"
                  : s.group.length > 0
                    ? "border-border/60 bg-secondary/30"
                    : "border-dashed border-border/40 bg-transparent"
              }`}
            >
              <div className="mb-2.5">
                <p className="text-xs font-semibold text-foreground">{s.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {s.range}
                  {s.note ? ` · ${s.note}` : ""}
                </p>
              </div>

              {/* Entradas do bloco */}
              <div className="mb-2.5 pb-2.5 border-b border-border/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1">
                    <ArrowUpCircle className="w-3 h-3 text-income" /> Entradas
                  </span>
                  <span className="text-xs text-money text-income">{brl(s.incomeTotal)}</span>
                </div>
                {s.incomeGroup.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground/70">Nenhuma entrada neste bloco</p>
                ) : (
                  s.incomeGroup.map(({ item, idx, key }) => (
                    <div key={key} className="flex items-center gap-1.5 text-xs">
                      <Checkbox
                        checked={!!item.paid}
                        onCheckedChange={() => toggleCashflowPaid(selectedMonth, "incomes", idx)}
                        className="h-3.5 w-3.5 rounded border-border data-[state=checked]:bg-income data-[state=checked]:border-income"
                      />
                      <span className={`truncate flex-1 ${item.paid ? "text-muted-foreground line-through" : "text-muted-foreground"}`}>
                        {item.label}
                      </span>
                      <span className="text-money text-foreground shrink-0">
                        {item.amount.toLocaleString("pt-BR")}
                      </span>
                      <Select value={s.id} onValueChange={(v) => assign(key, v as SessionId)}>
                        <SelectTrigger className="h-6 w-[52px] rounded-md text-[9px] px-1.5 shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SESSIONS.map((opt) => (
                            <SelectItem key={opt.id} value={opt.id} className="text-xs">
                              dia {opt.payDay} · {opt.range}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))
                )}
              </div>

              {s.group.length === 0 ? (
                <p className="text-[11px] text-muted-foreground/70 py-3 text-center">Sem vencimentos 🎉</p>
              ) : (
                <div className="space-y-1.5 flex-1">
                  {s.group.map(({ bank, inst, day }) => {
                    const paid = inst.status === "pago";
                    return (
                      <div key={inst.id} className="flex items-center gap-1.5 text-xs group/item">
                        <Checkbox
                          checked={paid}
                          onCheckedChange={() =>
                            updateInstallment(bank.id, inst.id, { status: paid ? "pendente" : "pago" })
                          }
                          className="h-3.5 w-3.5 rounded border-border data-[state=checked]:bg-income data-[state=checked]:border-income"
                        />
                        <span className="text-[9px] text-muted-foreground/70 w-7 shrink-0">d.{day}</span>
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: bank.color.startsWith("#") ? bank.color : `hsl(${bank.color})` }}
                        />
                        <span className={`truncate flex-1 ${paid ? "line-through text-muted-foreground" : "text-muted-foreground"}`}>
                          {inst.description}
                          {inst.totalInstallments > 1 && (
                            <span className="text-[9px] text-muted-foreground/70"> {inst.currentInstallment}/{inst.totalInstallments}</span>
                          )}
                        </span>
                        <span className={`text-money shrink-0 ${paid ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {inst.installmentAmount.toLocaleString("pt-BR")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {s.group.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-border/40 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">
                      {done ? "Sessão quitada ✓" : `Falta pagar ${brl(s.total - s.paidTotal)}`}
                    </span>
                    <span className={`text-sm text-money ${done ? "text-income" : "text-expense"}`}>
                      {brl(s.total)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">Entradas − dívidas</span>
                    <span className={`text-[11px] text-money ${s.incomeTotal - s.total < 0 ? "text-expense" : "text-income"}`}>
                      {brl(s.incomeTotal - s.total)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

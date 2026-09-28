import { useEffect, useMemo, useState } from "react";
import { useFinanceStore } from "@/stores/financeStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sparkles, CheckCircle2, AlertTriangle, XCircle, Trash2, Plus,
  ShoppingBag, CalendarDays, Wallet, TrendingDown,
} from "lucide-react";
import { cardSpendingForMonth } from "@/lib/financeCalculations";
import { useAuth } from "@/hooks/useAuth";
import { readAccountJson, writeAccountJson } from "@/lib/accountStorage";

interface Wish {
  id: string;
  label: string;
  amount: number;
  monthIdx: number; // index into cashflowMonths
  priority: "alta" | "media" | "baixa";
  createdAt: number;
}

const STORAGE_KEY = "fin_wishes_v1";

type Verdict = "ok" | "risco" | "inviavel";

const VERDICT_CONFIG: Record<Verdict, { label: string; color: string; bg: string; border: string; icon: import("lucide-react").LucideIcon; msg: string }> = {
  ok: {
    label: "Viável",
    color: "text-chart-2",
    bg: "bg-chart-2/10",
    border: "border-chart-2/30",
    icon: CheckCircle2,
    msg: "Cabe no orçamento sem comprometer a margem de segurança.",
  },
  risco: {
    label: "Risco",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    icon: AlertTriangle,
    msg: "É possível, mas invade sua reserva de segurança.",
  },
  inviavel: {
    label: "Inviável",
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    icon: XCircle,
    msg: "Não há saldo suficiente — vai gerar dívida ou atrasar contas.",
  },
};

export default function DesejosPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const store = useFinanceStore();
  const [wishes, setWishes] = useState<Wish[]>(() => readAccountJson(userId, STORAGE_KEY, []));
  const [form, setForm] = useState({
    label: "",
    amount: "",
    monthIdx: String(store.selectedMonth),
    priority: "media" as Wish["priority"],
  });

  useEffect(() => {
    if (userId) writeAccountJson(userId, STORAGE_KEY, wishes);
  }, [wishes, userId]);

  // Rolling projected balance per month (starts from savedBalance, adds each month's expectedBalance)
  const monthlyProjection = useMemo(() => {
    let rolling = 0;
    return store.cashflowMonths.map((m, idx) => {
      const income = m.incomes.reduce((s, i) => s + i.amount, 0);
      const manualExp = m.expenses.reduce((s, e) => s + e.amount, 0);
      // approximate card installments for this month
      const MONTH_MAP: Record<string, number> = {
        Janeiro: 0, Fevereiro: 1, Março: 2, Abril: 3, Maio: 4, Junho: 5,
        Julho: 6, Agosto: 7, Setembro: 8, Outubro: 9, Novembro: 10, Dezembro: 11,
      };
      const mIdx = MONTH_MAP[m.month] ?? idx;
      const cardExp = cardSpendingForMonth(store.banks, mIdx + 1, m.year);
      const net = income - manualExp - cardExp;
      const startBalance = rolling;
      rolling += net;
      return {
        idx,
        label: `${m.month.slice(0, 3)}/${String(m.year).slice(-2)}`,
        fullLabel: `${m.month} ${m.year}`,
        income, manualExp, cardExp, net,
        startBalance,
        endBalance: rolling,
      };
    });
  }, [store.cashflowMonths, store.banks]);

  // Compute verdict for each wish given other wishes competing in same month
  const wishesEvaluated = useMemo(() => {
    // sort within same month by priority to allocate budget
    const byMonth: Record<number, Wish[]> = {};
    wishes.forEach(w => {
      (byMonth[w.monthIdx] ??= []).push(w);
    });
    const PRIO_ORDER: Record<Wish["priority"], number> = { alta: 0, media: 1, baixa: 2 };
    const results: Record<string, { verdict: Verdict; leftover: number; needed: number }> = {};

    Object.entries(byMonth).forEach(([mIdxStr, list]) => {
      const mIdx = Number(mIdxStr);
      const proj = monthlyProjection[mIdx];
      if (!proj) return;
      const sorted = [...list].sort((a, b) => PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority] || b.amount - a.amount);
      let available = proj.endBalance; // projected balance at end of that month
      sorted.forEach(w => {
        const after = available - w.amount;
        let verdict: Verdict;
        if (after >= store.safetyMargin) verdict = "ok";
        else if (after >= 0) verdict = "risco";
        else verdict = "inviavel";
        results[w.id] = { verdict, leftover: after, needed: w.amount };
        available = after;
      });
    });
    return results;
  }, [wishes, monthlyProjection, store.safetyMargin]);

  function handleAdd() {
    const amount = Number(form.amount);
    if (!form.label.trim() || !amount || amount <= 0) return;
    const w: Wish = {
      id: `wish-${Date.now()}`,
      label: form.label.trim(),
      amount,
      monthIdx: Number(form.monthIdx),
      priority: form.priority,
      createdAt: Date.now(),
    };
    setWishes(prev => [w, ...prev]);
    setForm({ label: "", amount: "", monthIdx: form.monthIdx, priority: "media" });
  }

  function handleRemove(id: string) {
    setWishes(prev => prev.filter(w => w.id !== id));
  }

  // Group wishes by month for display
  const wishesByMonth = useMemo(() => {
    const map = new Map<number, Wish[]>();
    wishes.forEach(w => {
      if (!map.has(w.monthIdx)) map.set(w.monthIdx, []);
      map.get(w.monthIdx)!.push(w);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [wishes]);

  const totalWishes = wishes.reduce((s, w) => s + w.amount, 0);
  const viavelCount = Object.values(wishesEvaluated).filter(e => e.verdict === "ok").length;

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8 max-w-[1600px] mx-auto space-y-8 pb-24 md:pb-6">
      <div className="animate-float-in">
        <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gradient tracking-tight">Desejos & Metas de Compra</h1>
          <p className="text-sm text-muted-foreground">Adicione desejos e o sistema avalia a viabilidade em cada mês</p>
        </div>
        </div>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Desejos registrados</p>
              <p className="text-lg font-bold text-money">{wishes.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor total desejado</p>
              <p className="text-lg font-bold text-money">R$ {totalWishes.toLocaleString("pt-BR")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-chart-2/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-chart-2" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Viáveis</p>
              <p className="text-lg font-bold text-money">{viavelCount}/{wishes.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add wish form */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" /> Novo desejo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1.5fr_1fr_auto] gap-3">
            <Input
              placeholder="O que você quer comprar?"
              value={form.label}
              onChange={e => setForm({ ...form, label: e.target.value })}
            />
            <Input
              type="number"
              placeholder="R$ 0,00"
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
            />
            <Select value={form.monthIdx} onValueChange={v => setForm({ ...form, monthIdx: v })}>
              <SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger>
              <SelectContent>
                {store.cashflowMonths.map((m, i) => (
                  <SelectItem key={i} value={String(i)}>{m.month} {m.year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v as Wish["priority"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="alta">🔥 Alta</SelectItem>
                <SelectItem value="media">⚡ Média</SelectItem>
                <SelectItem value="baixa">💤 Baixa</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} className="whitespace-nowrap">
              <Plus className="w-4 h-4 mr-1" /> Adicionar
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1">
            <Wallet className="w-3 h-3" /> Margem de segurança usada:
            <span className="text-money font-semibold text-foreground">R$ {store.safetyMargin.toLocaleString("pt-BR")}</span>
            · configurável em Configurações
          </p>
        </CardContent>
      </Card>

      {/* Wishes grouped by month */}
      {wishesByMonth.length === 0 ? (
        <Card className="glass-card border-dashed border-border/50">
          <CardContent className="p-10 text-center text-muted-foreground">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum desejo cadastrado ainda. Adicione algo que você quer comprar!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {wishesByMonth.map(([mIdx, list]) => {
            const proj = monthlyProjection[mIdx];
            if (!proj) return null;
            const totalMonth = list.reduce((s, w) => s + w.amount, 0);
            return (
              <Card key={mIdx} className="glass-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-primary" />
                      <CardTitle className="text-base font-bold">{proj.fullLabel}</CardTitle>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Saldo projetado no fim do mês: </span>
                        <span className={`text-money font-bold ${proj.endBalance >= 0 ? "text-chart-2" : "text-destructive"}`}>
                          R$ {proj.endBalance.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total desejos: </span>
                        <span className="text-money font-bold text-foreground">R$ {totalMonth.toLocaleString("pt-BR")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground mt-1">
                    <span>Receitas: <span className="text-income font-medium">R$ {proj.income.toLocaleString("pt-BR")}</span></span>
                    <span>Contas fixas: <span className="text-expense font-medium">R$ {proj.manualExp.toLocaleString("pt-BR")}</span></span>
                    <span>Cartões: <span className="text-expense font-medium">R$ {proj.cardExp.toLocaleString("pt-BR")}</span></span>
                    <span>Saldo entrando no mês: <span className="text-foreground font-medium">R$ {proj.startBalance.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span></span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {list
                    .sort((a, b) => ({ alta: 0, media: 1, baixa: 2 }[a.priority] - { alta: 0, media: 1, baixa: 2 }[b.priority]))
                    .map(w => {
                      const ev = wishesEvaluated[w.id];
                      const cfg = VERDICT_CONFIG[ev?.verdict ?? "risco"];
                      const Icon = cfg.icon;
                      return (
                        <div key={w.id} className={`flex items-center gap-4 p-3 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-lg ${cfg.border} ${cfg.bg}`}>
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                            <Icon className="w-4.5 h-4.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-foreground truncate">{w.label}</p>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/60 text-muted-foreground uppercase font-medium">
                                {w.priority}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${cfg.bg} ${cfg.color}`}>
                                {cfg.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">{cfg.msg}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-money text-foreground">R$ {w.amount.toLocaleString("pt-BR")}</p>
                            {ev && (
                              <p className={`text-[10px] ${ev.leftover >= 0 ? "text-muted-foreground" : "text-destructive"}`}>
                                Sobra: R$ {ev.leftover.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemove(w.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useMemo } from "react";
import { useFinanceStore } from "@/stores/financeStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Repeat, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from "recharts";

const KEYWORDS = [
  "assinatura", "streaming", "netflix", "spotify", "adobe", "youtube",
  "prime", "disney", "hbo", "max", "apple", "icloud", "google one",
  "microsoft", "office 365", "dropbox", "notion", "canva", "chatgpt",
  "gpt", "claude", "perplexity", "academia", "gym", "plano de saúde",
  "vivo", "claro", "tim", "oi", "nubank ultravioleta", "amazon prime",
  "deezer", "tidal", "paramount", "globoplay", "crunchyroll", "twitch",
  "linkedin premium", "figma", "github", "vercel",
];

type SubItem = { name: string; monthly: number; annual: number; source: "cashflow" | "cartão" };

function isSubscription(label: string) {
  const l = label.toLowerCase();
  return KEYWORDS.some((k) => l.includes(k));
}

const COLORS = [
  "hsl(var(--primary))", "hsl(280 80% 60%)", "hsl(160 70% 45%)",
  "hsl(38 92% 55%)", "hsl(0 75% 60%)", "hsl(200 80% 55%)",
  "hsl(320 70% 60%)", "hsl(100 60% 50%)",
];

export function AnnualSubscriptionsCard() {
  const store = useFinanceStore();

  const subs = useMemo<SubItem[]>(() => {
    const map = new Map<string, SubItem>();

    // From cashflow expenses (use latest month occurrence as monthly value)
    store.cashflowMonths.forEach((m) => {
      m.expenses.forEach((e) => {
        if (isSubscription(e.label)) {
          const key = e.label.trim().toLowerCase();
          const existing = map.get(key);
          if (!existing || e.amount > existing.monthly) {
            map.set(key, { name: e.label, monthly: e.amount, annual: e.amount * 12, source: "cashflow" });
          }
        }
      });
    });

    // From card installments (use installmentAmount as monthly proxy)
    store.banks.forEach((b) => {
      b.installments.forEach((inst) => {
        if (isSubscription(inst.description)) {
          const key = inst.description.trim().toLowerCase();
          const existing = map.get(key);
          if (!existing) {
            map.set(key, {
              name: inst.description,
              monthly: inst.installmentAmount,
              annual: inst.installmentAmount * 12,
              source: "cartão",
            });
          }
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => b.annual - a.annual);
  }, [store.cashflowMonths, store.banks]);

  const totalMonthly = subs.reduce((s, x) => s + x.monthly, 0);
  const totalAnnual = subs.reduce((s, x) => s + x.annual, 0);

  const chartData = subs.map((s) => ({ name: s.name, anual: s.annual }));

  return (
    <Card className="glass-card border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Repeat className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div>Assinaturas & Serviços (Anual)</div>
            <p className="text-xs text-muted-foreground font-normal">
              Detectado automaticamente em despesas e cartões
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {subs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            Nenhuma assinatura detectada. Inclua palavras como "Netflix", "Spotify", "Assinatura" ou "Streaming" no nome da despesa.
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-secondary/30 border border-border/40 p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Mensal</p>
                <p className="text-money text-lg font-semibold text-foreground mt-1">
                  R$ {totalMonthly.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="rounded-xl bg-primary/10 border border-primary/30 p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Anual</p>
                <p className="text-money text-lg font-semibold text-primary mt-1">
                  R$ {totalAnnual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="rounded-xl bg-secondary/30 border border-border/40 p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Serviços</p>
                <p className="text-money text-lg font-semibold text-foreground mt-1">{subs.length}</p>
              </div>
            </div>

            {/* Horizontal bar chart */}
            <div style={{ height: Math.max(180, subs.length * 36) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={110} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}`, "Anual"]}
                    cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                  />
                  <Bar dataKey="anual" radius={[0, 6, 6, 0]}>
                    {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Detail list */}
            <div className="space-y-1.5">
              {subs.map((s, i) => (
                <div key={s.name} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/20 border border-border/30">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-sm text-foreground flex-1 truncate">{s.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/40 text-muted-foreground uppercase tracking-wider">
                    {s.source}
                  </span>
                  <span className="text-xs text-money text-muted-foreground">
                    R$ {s.monthly.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}/mês
                  </span>
                  <span className="text-sm text-money text-foreground font-semibold w-24 text-right">
                    R$ {s.annual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              Você gasta <strong className="text-foreground">R$ {totalAnnual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</strong> por ano em assinaturas.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

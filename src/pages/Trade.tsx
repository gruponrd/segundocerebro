import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Target,
  ShieldAlert,
  RefreshCw,
  CircleDollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  X,
  Pencil,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { readAccountJson, writeAccountJson } from "@/lib/accountStorage";

// ── Types ──────────────────────────────────────────────
interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  image: string;
  market_cap_rank: number;
}

interface TradeEntry {
  id: string;
  coin: string;
  entryPrice: number;
  tp1: number;
  tp2: number;
  tp3: number;
  tp4: number;
  sl: number;
  amount: number; // quantity of coin
  status: "open" | "closed";
  createdAt: string;
}

// ── Helpers ────────────────────────────────────────────
const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "USD" });

const fmtBrl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

// ── Component ──────────────────────────────────────────
export default function TradePage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [cryptos, setCryptos] = useState<CryptoPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [usdToBrl, setUsdToBrl] = useState(5.2);

  // Trades
  const [trades, setTrades] = useState<TradeEntry[]>(() =>
    readAccountJson(userId, "fin_trades", [])
  );

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formCoin, setFormCoin] = useState("");
  const [formEntry, setFormEntry] = useState("");
  const [formTp1, setFormTp1] = useState("");
  const [formTp2, setFormTp2] = useState("");
  const [formTp3, setFormTp3] = useState("");
  const [formTp4, setFormTp4] = useState("");
  const [formSl, setFormSl] = useState("");
  const [formAmount, setFormAmount] = useState("");

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);

  // Persist trades
  useEffect(() => {
    if (userId) writeAccountJson(userId, "fin_trades", trades);
  }, [trades, userId]);

  // Fetch crypto prices
  const fetchPrices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,tether,binancecoin,ripple,usd-coin,solana,tron,sui,dogecoin&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h"
      );
      if (!res.ok) throw new Error("API error");
      const data: CryptoPrice[] = await res.json();
      setCryptos(data);
      setLastUpdate(new Date());

      // Fetch USD → BRL rate
      try {
        const brlRes = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=usd&vs_currencies=brl"
        );
        if (brlRes.ok) {
          const brlData = await brlRes.json();
          if (brlData?.usd?.brl) setUsdToBrl(brlData.usd.brl);
        }
      } catch {
        // keep default
      }
    } catch (err) {
      console.error("Failed to fetch crypto prices:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, [fetchPrices]);

  // ── Trade CRUD ───────────────────────────────────────
  const resetForm = () => {
    setFormCoin("");
    setFormEntry("");
    setFormTp1("");
    setFormTp2("");
    setFormTp3("");
    setFormTp4("");
    setFormSl("");
    setFormAmount("");
    setShowForm(false);
    setEditingId(null);
  };

  const handleAddTrade = () => {
    const entry = parseFloat(formEntry);
    if (!formCoin || !entry) return;
    const newTrade: TradeEntry = {
      id: editingId || `trade-${Date.now()}`,
      coin: formCoin.toUpperCase(),
      entryPrice: entry,
      tp1: parseFloat(formTp1) || 0,
      tp2: parseFloat(formTp2) || 0,
      tp3: parseFloat(formTp3) || 0,
      tp4: parseFloat(formTp4) || 0,
      sl: parseFloat(formSl) || 0,
      amount: parseFloat(formAmount) || 1,
      status: "open",
      createdAt: new Date().toISOString(),
    };

    if (editingId) {
      setTrades((prev) =>
        prev.map((t) => (t.id === editingId ? { ...newTrade, status: t.status, createdAt: t.createdAt } : t))
      );
    } else {
      setTrades((prev) => [newTrade, ...prev]);
    }
    resetForm();
  };

  const handleEdit = (trade: TradeEntry) => {
    setEditingId(trade.id);
    setFormCoin(trade.coin);
    setFormEntry(trade.entryPrice.toString());
    setFormTp1(trade.tp1 ? trade.tp1.toString() : "");
    setFormTp2(trade.tp2 ? trade.tp2.toString() : "");
    setFormTp3(trade.tp3 ? trade.tp3.toString() : "");
    setFormTp4(trade.tp4 ? trade.tp4.toString() : "");
    setFormSl(trade.sl ? trade.sl.toString() : "");
    setFormAmount(trade.amount.toString());
    setShowForm(true);
  };

  const handleRemove = (id: string) => {
    setTrades((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleStatus = (id: string) => {
    setTrades((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: t.status === "open" ? "closed" : "open" } : t
      )
    );
  };

  // ── Derive current price for a trade coin ───────────
  const getCurrentPrice = (coinSymbol: string) => {
    const match = cryptos.find(
      (c) => c.symbol.toUpperCase() === coinSymbol.toUpperCase()
    );
    return match?.current_price ?? null;
  };

  const calcPnl = (trade: TradeEntry) => {
    const price = getCurrentPrice(trade.coin);
    if (!price) return null;
    const pnlUsd = (price - trade.entryPrice) * trade.amount;
    const pnlPct = ((price - trade.entryPrice) / trade.entryPrice) * 100;
    return { pnlUsd, pnlPct, currentPrice: price };
  };

  // ── Summary ──────────────────────────────────────────
  const openTrades = trades.filter((t) => t.status === "open");
  const totalPnlUsd = openTrades.reduce((sum, t) => {
    const pnl = calcPnl(t);
    return sum + (pnl?.pnlUsd ?? 0);
  }, 0);

  const hitTargets = (trade: TradeEntry, price: number) => {
    const targets = [];
    if (trade.tp1 && price >= trade.tp1) targets.push("TP1");
    if (trade.tp2 && price >= trade.tp2) targets.push("TP2");
    if (trade.tp3 && price >= trade.tp3) targets.push("TP3");
    if (trade.tp4 && price >= trade.tp4) targets.push("TP4");
    if (trade.sl && price <= trade.sl) targets.push("SL");
    return targets;
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CircleDollarSign className="w-6 h-6 text-primary" /> Trade Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cotações em tempo real • Monitoramento de operações
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-xs text-muted-foreground">
              Atualizado: {lastUpdate.toLocaleTimeString("pt-BR")}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchPrices} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-5">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
              <Target className="w-3.5 h-3.5" /> Operações Abertas
            </span>
            <p className="text-2xl font-bold text-primary">{openTrades.length}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-5">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
              {totalPnlUsd >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              P&L Total (USD)
            </span>
            <p className={`text-2xl font-bold ${totalPnlUsd >= 0 ? "text-primary" : "text-destructive"}`}>
              {fmt(totalPnlUsd)}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-5">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
              {totalPnlUsd >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              P&L Total (BRL)
            </span>
            <p className={`text-2xl font-bold ${totalPnlUsd >= 0 ? "text-primary" : "text-destructive"}`}>
              {fmtBrl(totalPnlUsd * usdToBrl)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top 10 Crypto Prices */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CircleDollarSign className="w-4 h-4" /> Top 10 Criptomoedas
            <span className="text-xs text-muted-foreground ml-auto">USD / BRL</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && cryptos.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">Carregando cotações...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {cryptos.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/40 hover:bg-secondary/60 transition-colors"
                >
                  <img src={c.image} alt={c.name} className="w-8 h-8 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground truncate">{c.symbol.toUpperCase()}</span>
                      <span className="text-[10px] text-muted-foreground">#{c.market_cap_rank}</span>
                    </div>
                    <p className="text-sm font-bold text-foreground">{fmt(c.current_price)}</p>
                    <p className="text-[11px] text-muted-foreground">{fmtBrl(c.current_price * usdToBrl)}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span
                      className={`text-xs font-semibold flex items-center gap-0.5 ${
                        c.price_change_percentage_24h >= 0 ? "text-primary" : "text-destructive"
                      }`}
                    >
                      {c.price_change_percentage_24h >= 0 ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {pct(c.price_change_percentage_24h)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Trade */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="w-4 h-4" /> {editingId ? "Editar Operação" : "Nova Operação"}
            </CardTitle>
            {!showForm && (
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Adicionar
              </Button>
            )}
          </div>
        </CardHeader>
        {showForm && (
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs text-muted-foreground mb-1 block">Moeda (símbolo)</label>
                <Input
                  placeholder="BTC"
                  value={formCoin}
                  onChange={(e) => setFormCoin(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Entrada (USD)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formEntry}
                  onChange={(e) => setFormEntry(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">TP1</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formTp1}
                  onChange={(e) => setFormTp1(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">TP2</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formTp2}
                  onChange={(e) => setFormTp2(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">TP3</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formTp3}
                  onChange={(e) => setFormTp3(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">TP4</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formTp4}
                  onChange={(e) => setFormTp4(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Stop Loss</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formSl}
                  onChange={(e) => setFormSl(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Qtd</label>
                <Input
                  type="number"
                  placeholder="1"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleAddTrade}>
                <Check className="w-3.5 h-3.5 mr-1.5" />
                {editingId ? "Salvar" : "Adicionar"}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                <X className="w-3.5 h-3.5 mr-1.5" /> Cancelar
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Trades List */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4" /> Minhas Operações
            <span className="text-xs text-muted-foreground ml-auto">{trades.length} registros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trades.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma operação registrada.</p>
          ) : (
            <div className="space-y-3">
              {trades.map((trade) => {
                const pnl = calcPnl(trade);
                const currentPrice = pnl?.currentPrice;
                const targets = currentPrice ? hitTargets(trade, currentPrice) : [];
                const hitSl = targets.includes("SL");

                return (
                  <div
                    key={trade.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      trade.status === "closed"
                        ? "bg-muted/30 border-border/30 opacity-70"
                        : hitSl
                        ? "bg-destructive/5 border-destructive/30"
                        : "bg-secondary/40 border-border/50 hover:bg-secondary/60"
                    }`}
                  >
                    {/* Row 1: Coin + Status + PnL */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-foreground">{trade.coin}</span>
                        <Badge
                          variant={trade.status === "open" ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {trade.status === "open" ? "Aberta" : "Fechada"}
                        </Badge>
                        {targets.map((t) => (
                          <Badge
                            key={t}
                            variant={t === "SL" ? "destructive" : "default"}
                            className="text-[10px]"
                          >
                            {t === "SL" ? <ShieldAlert className="w-3 h-3 mr-0.5" /> : null}
                            {t} ✓
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        {pnl && (
                          <div className="text-right">
                            <p
                              className={`text-sm font-bold ${
                                pnl.pnlUsd >= 0 ? "text-primary" : "text-destructive"
                              }`}
                            >
                              {fmt(pnl.pnlUsd)} ({pct(pnl.pnlPct)})
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {fmtBrl(pnl.pnlUsd * usdToBrl)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Prices grid */}
                    <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Entrada</span>
                        <p className="font-semibold text-foreground">{fmt(trade.entryPrice)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Atual</span>
                        <p className="font-semibold text-foreground">
                          {currentPrice ? fmt(currentPrice) : "—"}
                        </p>
                      </div>
                      {trade.tp1 > 0 && (
                        <div>
                          <span className={targets.includes("TP1") ? "text-primary font-bold" : "text-muted-foreground"}>
                            TP1
                          </span>
                          <p className="font-semibold text-foreground">{fmt(trade.tp1)}</p>
                        </div>
                      )}
                      {trade.tp2 > 0 && (
                        <div>
                          <span className={targets.includes("TP2") ? "text-primary font-bold" : "text-muted-foreground"}>
                            TP2
                          </span>
                          <p className="font-semibold text-foreground">{fmt(trade.tp2)}</p>
                        </div>
                      )}
                      {trade.tp3 > 0 && (
                        <div>
                          <span className={targets.includes("TP3") ? "text-primary font-bold" : "text-muted-foreground"}>
                            TP3
                          </span>
                          <p className="font-semibold text-foreground">{fmt(trade.tp3)}</p>
                        </div>
                      )}
                      {trade.tp4 > 0 && (
                        <div>
                          <span className={targets.includes("TP4") ? "text-primary font-bold" : "text-muted-foreground"}>
                            TP4
                          </span>
                          <p className="font-semibold text-foreground">{fmt(trade.tp4)}</p>
                        </div>
                      )}
                      {trade.sl > 0 && (
                        <div>
                          <span className={hitSl ? "text-destructive font-bold" : "text-muted-foreground"}>
                            SL
                          </span>
                          <p className="font-semibold text-foreground">{fmt(trade.sl)}</p>
                        </div>
                      )}
                    </div>

                    {/* Row 3: Qtd + Actions */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
                      <span className="text-xs text-muted-foreground">
                        Qtd: {trade.amount} • {new Date(trade.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => toggleStatus(trade.id)}
                        >
                          {trade.status === "open" ? "Fechar" : "Reabrir"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => handleEdit(trade)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemove(trade.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

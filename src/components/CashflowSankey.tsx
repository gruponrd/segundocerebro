import { useMemo, useState } from "react";
import { useFinanceStore } from "@/stores/financeStore";
import { EXPENSE_CATEGORIES, getCategory, suggestCategory } from "@/data/categories";
import { GitBranch } from "lucide-react";

const MONTH_MAP: Record<string, number> = {
  Janeiro: 1, Fevereiro: 2, Março: 3, Abril: 4, Maio: 5, Junho: 6,
  Julho: 7, Agosto: 8, Setembro: 9, Outubro: 10, Novembro: 11, Dezembro: 12,
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

interface Node {
  id: string;
  label: string;
  emoji?: string;
  value: number;
  y: number;
  h: number;
  color: string;
}

const W = 800;
const H = 380;
const COL_W = 120;
const GAP = 4;
const PADDING_Y = 20;

export function CashflowSankey() {
  const store = useFinanceStore();
  const [hover, setHover] = useState<string | null>(null);

  const { sources, destinations, total } = useMemo(() => {
    const cf = store.currentCashflow;
    const incomes = cf.incomes.map((i, idx) => ({
      id: `inc-${idx}`,
      label: i.label,
      value: i.amount,
      color: "hsl(145, 63%, 48%)",
    }));
    const totalIncome = incomes.reduce((s, i) => s + i.value, 0);

    // Aggregate destinations by category
    const catMap: Record<string, number> = {};
    cf.expenses.forEach((e) => {
      const c = e.category || suggestCategory(e.label);
      catMap[c] = (catMap[c] || 0) + e.amount;
    });
    const monthNum = MONTH_MAP[cf.month];
    let cardTotal = 0;
    store.banks.forEach((b) => {
      b.installments.forEach((inst) => {
        const d = new Date(inst.dueDate + "T00:00:00");
        if (d.getMonth() + 1 === monthNum && d.getFullYear() === cf.year) {
          cardTotal += inst.installmentAmount;
        }
      });
    });

    const dests: { id: string; label: string; emoji?: string; value: number; color: string }[] = [];
    Object.entries(catMap).forEach(([cid, v]) => {
      const c = getCategory(cid);
      dests.push({ id: `cat-${cid}`, label: c.label, emoji: c.emoji, value: v, color: "hsl(var(--primary))" });
    });
    if (cardTotal > 0) {
      dests.push({ id: "cards", label: "Cartões", emoji: "💳", value: cardTotal, color: "hsl(280, 70%, 60%)" });
    }
    const surplus = totalIncome - dests.reduce((s, d) => s + d.value, 0);
    if (surplus > 0) {
      dests.push({ id: "surplus", label: "Sobra", emoji: "✨", value: surplus, color: "hsl(145, 63%, 48%)" });
    }
    dests.sort((a, b) => b.value - a.value);

    return { sources: incomes, destinations: dests, total: Math.max(totalIncome, dests.reduce((s, d) => s + d.value, 0), 1) };
  }, [store.currentCashflow, store.banks]);

  const layoutCol = (items: { id: string; label: string; emoji?: string; value: number; color: string }[], x: number): Node[] => {
    const availH = H - PADDING_Y * 2 - GAP * (items.length - 1);
    let y = PADDING_Y;
    return items.map((it) => {
      const h = Math.max(8, (it.value / total) * availH);
      const node = { ...it, y, h };
      y += h + GAP;
      return node;
    });
  };

  const leftNodes = layoutCol(sources, 0);
  const rightNodes = layoutCol(destinations, W - COL_W);

  // Build flows: distribute each source proportionally to each destination
  const totalSrc = sources.reduce((s, i) => s + i.value, 0) || 1;
  const totalDst = destinations.reduce((s, i) => s + i.value, 0) || 1;
  const flowTotal = Math.min(totalSrc, totalDst);

  // For each source, allocate to dests proportionally
  const srcOffsets: Record<string, number> = {};
  const dstOffsets: Record<string, number> = {};
  leftNodes.forEach((n) => { srcOffsets[n.id] = 0; });
  rightNodes.forEach((n) => { dstOffsets[n.id] = 0; });

  const flows: { id: string; d: string; thickness: number; color: string; value: number; from: string; to: string }[] = [];
  leftNodes.forEach((src) => {
    rightNodes.forEach((dst) => {
      const share = (src.value / totalSrc) * (dst.value / totalDst) * flowTotal;
      if (share < 1) return;
      const srcH = (share / src.value) * src.h;
      const dstH = (share / dst.value) * dst.h;
      const y1 = src.y + srcOffsets[src.id] + srcH / 2;
      const y2 = dst.y + dstOffsets[dst.id] + dstH / 2;
      srcOffsets[src.id] += srcH;
      dstOffsets[dst.id] += dstH;
      const x1 = COL_W;
      const x2 = W - COL_W;
      const cx = (x1 + x2) / 2;
      const d = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
      flows.push({
        id: `${src.id}-${dst.id}`,
        d,
        thickness: Math.max(2, Math.min(srcH, dstH)),
        color: dst.color,
        value: share,
        from: src.label,
        to: dst.label,
      });
    });
  });

  return (
    <div className="rounded-2xl bg-card border border-border/50 p-5">
      <div className="flex items-center gap-3 mb-4">
        <GitBranch className="w-5 h-5 text-primary" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">Fluxo de Caixa</h3>
          <p className="text-xs text-muted-foreground">De onde vem e para onde vai o dinheiro · {store.currentCashflow.month}</p>
        </div>
      </div>

      {sources.length === 0 || destinations.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">Sem dados suficientes neste mês.</p>
      ) : (
        <div className="overflow-x-auto scrollbar-none">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[600px]" style={{ height: H }}>
            {/* Flows */}
            {flows.map((f) => (
              <path
                key={f.id}
                d={f.d}
                stroke={f.color}
                strokeWidth={f.thickness}
                strokeOpacity={hover === f.id ? 0.7 : 0.25}
                fill="none"
                className="transition-all cursor-pointer"
                onMouseEnter={() => setHover(f.id)}
                onMouseLeave={() => setHover(null)}
              >
                <title>{`${f.from} → ${f.to}: ${fmt(f.value)}`}</title>
              </path>
            ))}

            {/* Source nodes */}
            {leftNodes.map((n) => (
              <g key={n.id}>
                <rect x={0} y={n.y} width={8} height={n.h} fill={n.color} rx={2} />
                <text x={14} y={n.y + n.h / 2} dy="0.35em" fontSize="11" fill="hsl(var(--foreground))" className="font-medium">
                  {n.label}
                </text>
                <text x={14} y={n.y + n.h / 2 + 14} dy="0.35em" fontSize="9" fill="hsl(var(--muted-foreground))">
                  {fmt(n.value)}
                </text>
              </g>
            ))}

            {/* Dest nodes */}
            {rightNodes.map((n) => (
              <g key={n.id}>
                <rect x={W - 8} y={n.y} width={8} height={n.h} fill={n.color} rx={2} />
                <text x={W - 14} y={n.y + n.h / 2} dy="0.35em" fontSize="11" textAnchor="end" fill="hsl(var(--foreground))" className="font-medium">
                  {n.emoji} {n.label}
                </text>
                <text x={W - 14} y={n.y + n.h / 2 + 14} dy="0.35em" fontSize="9" textAnchor="end" fill="hsl(var(--muted-foreground))">
                  {fmt(n.value)}
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}
    </div>
  );
}

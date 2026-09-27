import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { type Bank } from "@/data/financialData";
import { useTheme } from "@/hooks/use-theme";

interface SpendingChartProps {
  banks: Bank[];
}

const BANK_COLORS: Record<string, string> = {
  nubank: "#8A05BE",
  inter: "#FF7A00",
  c6: "#2C2C2E",
  itau: "#EC7000",
  bb: "#FFCD00",
};

const MONOCHROME_BANK_COLORS: Record<string, string> = {
  nubank: "#a0a0a0",
  inter: "#c0c0c0",
  c6: "#505050",
  itau: "#d0d0d0",
  bb: "#e0e0e0",
};

export function SpendingChart({ banks }: SpendingChartProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const isMonochrome = theme === "monochrome";
  const palette = isMonochrome ? MONOCHROME_BANK_COLORS : BANK_COLORS;
  const data = banks.map((b) => ({
    name: b.name,
    value: b.debtFinal,
    color: palette[b.id] || (isMonochrome ? "#888" : "#888"),
  }));

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="glass-card rounded-2xl p-6 animate-float-in" style={{ animationDelay: "100ms" }}>
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-5">
        Distribuição por Banco
      </h3>

      <div className="flex items-center gap-6">
        <div className="w-44 h-44 sm:w-52 sm:h-52 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={78}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR")}`}
                contentStyle={{
                  background: isLight ? "hsl(0 0% 100% / 0.95)" : "hsl(240 6% 10% / 0.95)",
                  border: `1px solid ${isLight ? "hsl(240 5% 87%)" : "hsl(240 5% 25% / 0.4)"}`,
                  borderRadius: "12px",
                  fontSize: "12px",
                  color: isLight ? "hsl(240 10% 10%)" : "hsl(0 0% 95%)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 flex-1 min-w-0">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground truncate">{d.name}</p>
                <p className="text-[11px] text-muted-foreground text-money">
                  R$ {d.value.toLocaleString("pt-BR")}
                </p>
              </div>
              <span className="text-sm font-medium text-money text-foreground shrink-0">
                {((d.value / total) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-border/50 text-center relative overflow-hidden group/total">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-expense/[0.04] to-transparent opacity-0 group-hover/total:opacity-100 transition-opacity duration-500" />
        <p className="text-xs text-muted-foreground">Dívida Total em Cartões</p>
        <p className="text-2xl text-money text-expense">R$ {total.toLocaleString("pt-BR")}</p>
      </div>
    </div>
  );
}

import { CalendarDays } from "lucide-react";

interface CalendarItem {
  id: string;
  description: string;
  installmentAmount: number;
  dueDate: string;
  bankName: string;
  bankColor: string;
}

interface CalendarCardProps {
  installments: CalendarItem[];
}

const bankDotColor: Record<string, string> = {
  "bank-nubank": "bg-bank-nubank",
  "bank-inter": "bg-bank-inter",
  "bank-c6": "bg-muted-foreground",
  "bank-itau": "bg-bank-itau",
  "bank-bb": "bg-bank-bb",
  "bank-other": "bg-bank-other",
};

function getWeekDues(items: CalendarItem[]) {
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);

  return items.filter((item) => {
    const d = new Date(item.dueDate + "T00:00:00");
    return d >= now && d <= weekEnd;
  });
}

export function CalendarCard({ installments }: CalendarCardProps) {
  const weekItems = getWeekDues(installments);
  const total = weekItems.reduce((s, i) => s + i.installmentAmount, 0);

  return (
    <div className="glass-card rounded-2xl p-5 animate-float-in" style={{ animationDelay: "250ms" }}>
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Vencimentos da Semana</h3>
      </div>

      {weekItems.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhum vencimento esta semana 🎉</p>
      ) : (
        <>
          <div className="space-y-2">
            {weekItems.map((item) => {
              const d = new Date(item.dueDate + "T00:00:00");
              const dayName = d.toLocaleDateString("pt-BR", { weekday: "short" });
              const dayNum = d.getDate();
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40"
                >
                  <div className="w-10 h-10 rounded-lg bg-secondary flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] text-muted-foreground uppercase leading-none">{dayName}</span>
                    <span className="text-sm font-bold text-foreground leading-none">{dayNum}</span>
                  </div>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${bankDotColor[item.bankColor] || "bg-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{item.description}</p>
                    <p className="text-xs text-muted-foreground">{item.bankName}</p>
                  </div>
                  <span className="text-sm text-money text-foreground shrink-0">
                    R$ {item.installmentAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-border/50 flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Total da semana</span>
            <span className="text-lg text-money text-expense">
              R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

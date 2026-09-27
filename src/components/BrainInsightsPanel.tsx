import { useState } from "react";
import { Brain, Clock, Ghost, HeartPulse, Bug, Pencil, Check, X, Settings } from "lucide-react";
import { useFinanceStore } from "@/stores/financeStore";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function LifeCostCalculator() {
  const { hourlyRate } = useFinanceStore();
  const [value, setValue] = useState("");
  const amount = parseFloat(value);
  const hours = !isNaN(amount) && hourlyRate > 0 ? amount / hourlyRate : 0;
  const days = hours / 8;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Quanto da sua vida isso custa?
        </span>
      </div>
      <Input
        type="number"
        placeholder="Digite o valor da compra (R$)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="rounded-xl h-9 text-sm"
        min={0}
      />
      {hours > 0 && (
        <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 animate-float-in">
          <p className="text-sm text-foreground leading-relaxed">
            ⚠️ <strong>Atenção:</strong> isso vai te custar{" "}
            <span className="text-primary font-bold">{hours.toFixed(0)} horas</span>
            {days >= 1 && (
              <> (quase <span className="text-primary font-bold">{Math.ceil(days)} {Math.ceil(days) === 1 ? "dia" : "dias"}</span>)</>
            )}{" "}
            sentado na frente do computador trabalhando.
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Base: R$ {hourlyRate.toFixed(2)}/hora
          </p>
        </div>
      )}
    </div>
  );
}

function VampireDetector() {
  const { currentCashflow } = useFinanceStore();
  const VAMPIRE_THRESHOLD = 50;
  const vampires = currentCashflow.expenses.filter((e) => e.amount <= VAMPIRE_THRESHOLD);
  const monthlyTotal = vampires.reduce((s, v) => s + v.amount, 0);
  const yearlyTotal = monthlyTotal * 12;

  if (vampires.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Bug className="w-4 h-4 text-expense" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Detector de Vampiros
        </span>
      </div>
      <div className="rounded-xl bg-expense/10 border border-expense/20 p-3">
        <p className="text-sm text-foreground leading-relaxed">
          🧛 Você tem <span className="text-expense font-bold">{vampires.length} "vampiros"</span> ativos.
          Somados, eles levam{" "}
          <span className="text-expense font-bold">R$ {yearlyTotal.toLocaleString("pt-BR")}</span> do seu ano.
        </p>
        <div className="mt-2 space-y-1">
          {vampires.map((v, i) => (
            <div key={i} className="flex justify-between text-xs text-muted-foreground">
              <span>{v.label}</span>
              <span>R$ {v.amount.toLocaleString("pt-BR")}/mês</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GhostBalance() {
  const { phantomBalance, safetyMargin, expectedBalance } = useFinanceStore();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Ghost className="w-4 h-4 text-accent" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Saldo Fantasma
        </span>
      </div>
      <div className="rounded-xl bg-accent/10 border border-accent/20 p-3">
        <p className="text-2xl text-money text-foreground">
          R$ {phantomBalance.toLocaleString("pt-BR")}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          R$ {safetyMargin.toLocaleString("pt-BR")} estão "escondidos" de você para emergências.
          No ano, isso cria uma reserva de{" "}
          <span className="text-income font-medium">R$ {(safetyMargin * 12).toLocaleString("pt-BR")}</span>.
        </p>
      </div>
    </div>
  );
}

function SurvivalDays() {
  const { survivalDays } = useFinanceStore();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <HeartPulse className="w-4 h-4 text-income" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Dias de Vida
        </span>
      </div>
      <div className="rounded-xl bg-income/10 border border-income/20 p-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl text-money text-foreground">{survivalDays}</span>
          <span className="text-sm text-muted-foreground">dias</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Se você parar de trabalhar hoje, tem exatamente{" "}
          <span className="text-income font-medium">{survivalDays} dias</span> antes de passar aperto.
        </p>
      </div>
    </div>
  );
}

function BrainSettings() {
  const { salary, monthlyHours, safetyMargin, setSalary, setMonthlyHours, setSafetyMargin } = useFinanceStore();
  const [s, setS] = useState(String(salary));
  const [h, setH] = useState(String(monthlyHours));
  const [m, setM] = useState(String(safetyMargin));
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    const sv = parseFloat(s), hv = parseFloat(h), mv = parseFloat(m);
    if (!isNaN(sv)) setSalary(sv);
    if (!isNaN(hv)) setMonthlyHours(hv);
    if (!isNaN(mv)) setSafetyMargin(mv);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) { setS(String(salary)); setH(String(monthlyHours)); setM(String(safetyMargin)); } }}>
      <DialogTrigger asChild>
        <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <Settings className="w-4 h-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="glass-card border-border/30 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-foreground">Configurar Segundo Cérebro</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs text-muted-foreground">Salário Mensal (R$)</label>
            <Input type="number" value={s} onChange={(e) => setS(e.target.value)} className="rounded-xl mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Horas Trabalhadas/Mês</label>
            <Input type="number" value={h} onChange={(e) => setH(e.target.value)} className="rounded-xl mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Margem de Segurança / Saldo Fantasma (R$)</label>
            <Input type="number" value={m} onChange={(e) => setM(e.target.value)} className="rounded-xl mt-1" />
          </div>
          <Button className="w-full rounded-xl gap-2" onClick={handleSave}>
            <Check className="w-4 h-4" /> Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function BrainInsightsPanel() {
  return (
    <div className="glass-card rounded-2xl p-5 animate-float-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Segundo Cérebro
          </h3>
        </div>
        <BrainSettings />
      </div>

      <div className="space-y-5">
        <LifeCostCalculator />
        <div className="border-t border-border/30" />
        <GhostBalance />
        <div className="border-t border-border/30" />
        <SurvivalDays />
        <div className="border-t border-border/30" />
        <VampireDetector />
      </div>
    </div>
  );
}

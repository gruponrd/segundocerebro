import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Brain, Zap, Shield, Flame, Sparkles, Trophy, RotateCcw, Calendar, Skull, Award, Building2, Cpu, Heart, BookOpen, Factory, TreePine, Info, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { Coin3D, type CoinTier } from "@/components/Coin3D";
import { useAuth } from "@/hooks/useAuth";
import { readAccountJson, writeAccountJson } from "@/lib/accountStorage";

// ============ DATA ============

type StatKey = "dopamina" | "impulso" | "energia" | "clareza" | "sono" | "ansiedade";

const BASE_STATS: Record<StatKey, { label: string; icon: string; start: number; inverted?: boolean; ratePerDay: number }> = {
  dopamina:  { label: "Dopamina",         icon: "🧪", start: 20, ratePerDay: 0.45 },
  impulso:   { label: "Controle Impulso", icon: "🎯", start: 15, ratePerDay: 0.50 },
  energia:   { label: "Energia",          icon: "⚡", start: 30, ratePerDay: 0.40 },
  clareza:   { label: "Clareza Mental",   icon: "🧠", start: 25, ratePerDay: 0.50 },
  sono:      { label: "Sono",             icon: "🌙", start: 40, ratePerDay: 0.35 },
  ansiedade: { label: "Ansiedade",        icon: "🌊", start: 90, inverted: true, ratePerDay: 0.40 },
};

const LEVELS = [
  { level: 1, days: 0 },
  { level: 2, days: 7 },
  { level: 3, days: 14 },
  { level: 4, days: 21 },
  { level: 5, days: 30 },
  { level: 6, days: 45 },
  { level: 7, days: 60 },
  { level: 8, days: 90 },
  { level: 9, days: 120 },
  { level: 10, days: 180 },
  { level: 11, days: 365, label: "Prestige" },
];

const BRAIN_REGIONS = [
  { day: 7,   name: "Córtex Pré-frontal",   icon: Cpu,       effect: "+5% autocontrole",                       district: "Centro de Comando" },
  { day: 14,  name: "Sistema Dopaminérgico", icon: Zap,       effect: "Receptores começam recuperação",         district: "Usina de Energia" },
  { day: 21,  name: "Neuroplasticidade",    icon: Sparkles,  effect: "Novas conexões se fortalecem",           district: "Rede de Trilhos" },
  { day: 30,  name: "Estriado",             icon: Factory,   effect: "Menor compulsão",                        district: "Fábrica de Hábitos" },
  { day: 45,  name: "Amígdala",             icon: Heart,     effect: "Menor resposta emocional aos gatilhos",  district: "Fortaleza Emocional" },
  { day: 60,  name: "Hipocampo",            icon: BookOpen,  effect: "Memória e aprendizado melhores",         district: "Biblioteca da Memória" },
  { day: 90,  name: "Ínsula",               icon: Shield,    effect: "Redução da sensação física da fissura",  district: "Muralha Sensorial" },
  { day: 120, name: "Rede de Recompensa",   icon: TreePine,  effect: "Prazer em atividades normais aumenta",   district: "Parque das Recompensas" },
  { day: 180, name: "Integração Cerebral",  icon: Brain,     effect: "Circuitos mais equilibrados",            district: "Cidade Reconstruída" },
];

const BUFFS = [
  { day: 3,   text: "+2 Energia" },
  { day: 7,   text: "+5 Foco" },
  { day: 14,  text: "+5 Humor" },
  { day: 21,  text: "+10 Resistência" },
  { day: 30,  text: "+10 Clareza Mental" },
  { day: 45,  text: "+5 Motivação" },
  { day: 60,  text: "+10 Energia" },
  { day: 90,  text: "+15 Autocontrole" },
  { day: 120, text: "+15 Disciplina" },
  { day: 180, text: "+20 Estabilidade" },
];

const BOSSES = [
  { id: "b1", day: 3,   name: "Abstinência Inicial",   desc: "Ataques: ansiedade, tédio, irritação" },
  { id: "b2", day: 7,   name: "Primeiro Final de Semana", desc: "Ataques: vontade de apostar, gatilhos sociais" },
  { id: "b3", day: 15,  name: "Confiança Excessiva",   desc: "O cérebro sussurra: 'só uma aposta'" },
  { id: "b4", day: 30,  name: "Primeiro Salário",      desc: "Dinheiro na mão, tentação alta" },
  { id: "b5", day: 60,  name: "Falsa Cura",            desc: "'Agora consigo controlar' — cuidado" },
  { id: "b6", day: 90,  name: "Memória da Recompensa", desc: "Lembranças da adrenalina reaparecem" },
  { id: "bf", day: 365, name: "Mestre da Neuroplasticidade", desc: "Chefe final: um ano livre" },
];

const ACHIEVEMENTS = [
  { day: 1,   title: "Primeira Vitória" },
  { day: 7,   title: "Sobreviveu à Primeira Semana" },
  { day: 30,  title: "Primeiro Mês" },
  { day: 90,  title: "Novo Cérebro" },
  { day: 180, title: "Meio Ano" },
  { day: 365, title: "Um Ano Livre" },
];

const SCIENCE_FACTS: Record<number, string> = {
  7:   "Seu cérebro já está reduzindo a hiperatividade do circuito da recompensa.",
  14:  "Os receptores dopaminérgicos começam a recuperar a sensibilidade.",
  21:  "Novas conexões neurais são fortalecidas toda vez que você escolhe não apostar.",
  30:  "Seu córtex pré-frontal está recuperando eficiência para controlar impulsos.",
  90:  "Seu cérebro responde cada vez melhor às recompensas naturais.",
  180: "Os circuitos ligados ao hábito perderam força por meses sem reforço.",
  365: "Você consolidou um ano de prática de novos comportamentos — a base é muito mais forte.",
};

// ============ MILESTONE COINS ============

type MilestoneCoin = {
  day: number;
  tier: CoinTier;
  icon: string;
  title: string;
  label: string; // short back-face text
  reward: string; // narrative reward
};

const MILESTONE_COINS: MilestoneCoin[] = [
  { day: 1,   tier: "bronze",   icon: "🌱", title: "Primeira Vitória",   label: "DAY 1",   reward: "A jornada começou. +100 XP" },
  { day: 3,   tier: "bronze",   icon: "💨", title: "72 Horas Firme",     label: "72H",     reward: "Primeiro pico de abstinência vencido" },
  { day: 7,   tier: "silver",   icon: "🗓️", title: "Semana Um",          label: "WEEK 1",  reward: "Córtex pré-frontal iniciou reparo" },
  { day: 14,  tier: "silver",   icon: "⚡", title: "Duas Semanas",       label: "14D",     reward: "Receptores dopaminérgicos ressensibilizando" },
  { day: 21,  tier: "gold",     icon: "🔗", title: "Três Semanas",       label: "21D",     reward: "Neuroplasticidade em ação" },
  { day: 30,  tier: "gold",     icon: "🏆", title: "Primeiro Mês",       label: "30D",     reward: "Fábrica de hábitos reformada" },
  { day: 45,  tier: "gold",     icon: "🛡️", title: "45 Dias",            label: "45D",     reward: "Amígdala mais resiliente" },
  { day: 60,  tier: "platinum", icon: "📚", title: "60 Dias",            label: "60D",     reward: "Hipocampo restaurado" },
  { day: 90,  tier: "platinum", icon: "🧠", title: "Novo Cérebro",       label: "90D",     reward: "Ínsula estabilizada" },
  { day: 120, tier: "diamond",  icon: "🌳", title: "120 Dias",           label: "120D",    reward: "Rede de recompensa florescendo" },
  { day: 180, tier: "diamond",  icon: "☀️", title: "Meio Ano",           label: "6M",      reward: "Integração cerebral avançada" },
  { day: 365, tier: "legend",   icon: "👑", title: "Um Ano Livre",       label: "LEGEND",  reward: "Mestre da Neuroplasticidade" },
];

// ============ STORAGE ============

const STORAGE_KEY = "neuro-recovery-v1";

type NeuroState = {
  startDate: string | null; // ISO
  defeatedBosses: string[];
  bestStreakDays: number;
  claimedCoins?: number[]; // list of coin.day already celebrated
};

function loadState(userId: string): NeuroState {
  const state = readAccountJson<NeuroState>(userId, STORAGE_KEY, {
    startDate: null, defeatedBosses: [], bestStreakDays: 0, claimedCoins: [],
  });
  return { ...state, claimedCoins: state.claimedCoins ?? [] };
}

function saveState(userId: string, state: NeuroState) {
  writeAccountJson(userId, STORAGE_KEY, state);
}

// ============ HELPERS ============

function daysBetween(iso: string): number {
  const start = new Date(iso).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
}

function computeLevel(days: number) {
  let current = LEVELS[0];
  let next: typeof LEVELS[number] | null = null;
  for (let i = 0; i < LEVELS.length; i++) {
    if (days >= LEVELS[i].days) current = LEVELS[i];
    else { next = LEVELS[i]; break; }
  }
  return { current, next };
}

function computeStat(key: StatKey, days: number): number {
  const cfg = BASE_STATS[key];
  const raw = cfg.inverted
    ? cfg.start - days * cfg.ratePerDay
    : cfg.start + days * cfg.ratePerDay;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

// ============ COMPONENT ============

export default function NeuroRecoveryPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [state, setState] = useState<NeuroState>(() => loadState(userId));
  const [dayTick, setDayTick] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [resetOpen, setResetOpen] = useState(false);
  const [celebrateCoin, setCelebrateCoin] = useState<MilestoneCoin | null>(null);

  // Refresh every minute so day rollover reflects
  useEffect(() => {
    const t = setInterval(() => setDayTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { if (userId) saveState(userId, state); }, [state, userId]);

  const days = state.startDate ? daysBetween(state.startDate) : 0;
  const totalXP = days * 100;
  const { current: currentLevel, next: nextLevel } = computeLevel(days);
  const progressPct = nextLevel
    ? ((days - currentLevel.days) / (nextLevel.days - currentLevel.days)) * 100
    : 100;

  useEffect(() => {
    if (days > state.bestStreakDays) {
      setState((s) => ({ ...s, bestStreakDays: days }));
    }
  }, [days]); // eslint-disable-line

  // Detect newly-unlocked coins and trigger celebration
  useEffect(() => {
    if (!state.startDate) return;
    const claimed = state.claimedCoins ?? [];
    const newly = MILESTONE_COINS.find((c) => days >= c.day && !claimed.includes(c.day));
    if (newly) {
      setCelebrateCoin(newly);
      setState((s) => ({ ...s, claimedCoins: [...(s.claimedCoins ?? []), newly.day] }));
    }
  }, [days, state.startDate]); // eslint-disable-line

  const currentFact = useMemo(() => {
    const keys = Object.keys(SCIENCE_FACTS).map(Number).sort((a, b) => a - b);
    let last = 0;
    for (const k of keys) if (days >= k) last = k;
    return last ? SCIENCE_FACTS[last] : "Cada dia offline reconstrói um pouco do seu cérebro. Isto é ciência, não mágica.";
  }, [days]);

  const unlockedCoinsCount = MILESTONE_COINS.filter((c) => days >= c.day).length;

  const startJourney = () => {
    const iso = new Date(pickerDate + "T00:00:00").toISOString();
    setState({ startDate: iso, defeatedBosses: [], bestStreakDays: 0, claimedCoins: [] });
    setPickerOpen(false);
  };

  const resetJourney = () => {
    setState({ startDate: null, defeatedBosses: [], bestStreakDays: state.bestStreakDays, claimedCoins: [] });
    setResetOpen(false);
  };

  const defeatBoss = (id: string) => {
    setState((s) => s.defeatedBosses.includes(id) ? s : { ...s, defeatedBosses: [...s.defeatedBosses, id] });
  };

  // -------------- EMPTY STATE ----------------
  if (!state.startDate) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
        <Card className="max-w-lg w-full border-primary/30">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
              <Brain className="w-9 h-9 text-primary" />
            </div>
            <CardTitle className="text-2xl">Neuro Recovery</CardTitle>
            <CardDescription>
              Um RPG do cérebro. Cada dia offline reconstrói regiões cerebrais e sistemas químicos.
              Os marcos abaixo são <span className="font-semibold">aproximados</span> e baseados em tendências
              da neurociência — não é um cronograma exato.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Data em que você parou
              </label>
              <Input
                type="date"
                value={pickerDate}
                onChange={(e) => setPickerDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="mt-2"
              />
            </div>
            <Button onClick={startJourney} className="w-full gap-2" size="lg">
              <Sparkles className="w-4 h-4" /> Iniciar Reconstrução
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // -------------- MAIN ----------------
  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Brain className="w-8 h-8 text-primary" />
              Neuro Recovery
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              RPG do cérebro. Marcos aproximados baseados em evidências científicas — tendências de recuperação, não datas exatas.
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={resetOpen} onOpenChange={setResetOpen}>
              <Button variant="outline" className="gap-2" onClick={() => setResetOpen(true)}>
                <RotateCcw className="w-4 h-4" /> Reiniciar
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reiniciar jornada?</DialogTitle>
                  <DialogDescription>
                    Recaídas fazem parte. Seu recorde ({state.bestStreakDays} dias) fica salvo.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setResetOpen(false)}>Cancelar</Button>
                  <Button variant="destructive" onClick={resetJourney}>Reiniciar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Level + Fact */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 border-primary/20 bg-primary/5 relative overflow-hidden">
            <div className="absolute -top-6 -right-6 opacity-10">
              <Brain className="w-40 h-40 text-primary" />
            </div>
            <CardHeader className="text-center relative z-10">
              <CardDescription className="uppercase tracking-widest text-xs">Nível</CardDescription>
              <div className="text-7xl font-black text-primary leading-none">
                {currentLevel.level}
              </div>
              {currentLevel.label && (
                <div className="text-sm font-bold text-primary mt-1">{currentLevel.label}</div>
              )}
              <div className="mt-2 flex items-center justify-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">{days} dias offline</span>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">XP total</span>
                <span className="font-bold text-primary">{totalXP.toLocaleString("pt-BR")}</span>
              </div>
              <Progress value={progressPct} className="h-3" />
              <div className="text-center text-xs text-muted-foreground">
                {nextLevel
                  ? <>Faltam <span className="font-bold text-foreground">{nextLevel.days - days} dias</span> para o Nível {nextLevel.level}{nextLevel.label ? ` (${nextLevel.label})` : ""}</>
                  : <>Nível máximo atingido</>}
              </div>
              <div className="pt-2 text-center text-[10px] text-muted-foreground">
                Recorde pessoal: <span className="font-bold text-foreground">{state.bestStreakDays} dias</span>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-accent/20 bg-accent/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="w-4 h-4 text-accent" /> Onde seu cérebro está agora
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg leading-relaxed text-foreground">{currentFact}</p>
              <p className="mt-4 text-xs text-muted-foreground italic">
                Todos os marcos abaixo são aproximados. A ciência mostra tendências de recuperação — o ritmo varia entre pessoas.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stats Bars */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-primary" /> Sistemas Químicos</CardTitle>
            <CardDescription>Estimativas — recuperam gradualmente com o tempo offline.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.keys(BASE_STATS) as StatKey[]).map((key) => {
              const cfg = BASE_STATS[key];
              const value = computeStat(key, days);
              const good = cfg.inverted ? 100 - value : value;
              const color = good > 70 ? "bg-emerald-500" : good > 40 ? "bg-amber-500" : "bg-rose-500";
              return (
                <div key={key} className="p-4 rounded-xl border bg-card">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold flex items-center gap-2">
                      <span>{cfg.icon}</span> {cfg.label}
                      {cfg.inverted && <span className="text-[10px] text-muted-foreground">(menor é melhor)</span>}
                    </span>
                    <span className="text-sm font-bold tabular-nums">{value}/100</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className={cn("h-full transition-all", color)} style={{ width: `${value}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Brain Regions / Districts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Cidade Cerebral em Reconstrução</CardTitle>
            <CardDescription>Cada distrito representa uma região do seu cérebro voltando à vida.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BRAIN_REGIONS.map((r) => {
              const unlocked = days >= r.day;
              const Icon = r.icon;
              return (
                <div key={r.day} className={cn(
                  "p-4 rounded-xl border transition-all",
                  unlocked ? "bg-primary/5 border-primary/30 shadow-sm" : "bg-secondary/30 border-border/50 opacity-60"
                )}>
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                      unlocked ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dia ~{r.day}</span>
                        {unlocked && <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">DESBLOQUEADO</span>}
                      </div>
                      <p className="font-semibold text-foreground mt-1">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.effect}</p>
                      <p className="text-[11px] mt-1 italic text-accent">🏙 {r.district}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Bosses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Skull className="w-5 h-5 text-rose-500" /> Chefes</CardTitle>
            <CardDescription>Períodos aproximados de maior vulnerabilidade. Marque como derrotado quando passar.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {BOSSES.map((b) => {
              const reached = days >= b.day;
              const defeated = state.defeatedBosses.includes(b.id);
              return (
                <div key={b.id} className={cn(
                  "p-4 rounded-xl border transition-all",
                  defeated ? "bg-emerald-500/5 border-emerald-500/30" :
                  reached  ? "bg-rose-500/5 border-rose-500/30 animate-pulse" :
                             "bg-secondary/30 border-border/50 opacity-60"
                )}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dia ~{b.day}</div>
                      <p className="font-semibold text-foreground mt-1 flex items-center gap-2">
                        {defeated ? "✅" : "⚔️"} {b.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{b.desc}</p>
                    </div>
                    {reached && !defeated && (
                      <Button size="sm" variant="outline" onClick={() => defeatBoss(b.id)}>
                        Derrotei
                      </Button>
                    )}
                    {defeated && <span className="text-xs font-bold text-emerald-500">DERROTADO</span>}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Buffs + Achievements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500" /> Buffs Ativos</CardTitle>
              <CardDescription>Bônus que você acumula ao longo da jornada.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {BUFFS.map((b) => {
                const active = days >= b.day;
                return (
                  <div key={b.day} className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-lg border text-sm",
                    active ? "bg-orange-500/5 border-orange-500/20" : "opacity-50"
                  )}>
                    <span className="text-xs font-bold text-muted-foreground w-14">Dia ~{b.day}</span>
                    <span className={cn("font-semibold", active ? "text-orange-500" : "text-muted-foreground")}>{b.text}</span>
                    <span className="text-xs">{active ? "✓" : "🔒"}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> Conquistas</CardTitle>
              <CardDescription>Marcos que ninguém pode tirar de você.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {ACHIEVEMENTS.map((a) => {
                const done = days >= a.day;
                return (
                  <div key={a.day} className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg border",
                    done ? "bg-amber-500/5 border-amber-500/20" : "opacity-50"
                  )}>
                    <Award className={cn("w-5 h-5", done ? "text-amber-500" : "text-muted-foreground")} />
                    <div className="flex-1">
                      <p className={cn("font-semibold text-sm", done && "text-amber-600 dark:text-amber-400")}>{a.title}</p>
                      <p className="text-[10px] text-muted-foreground">Dia {a.day}</p>
                    </div>
                    {done && <span className="text-xs font-bold text-amber-500">🏆</span>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Vault — 3D Coins */}

        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-transparent to-violet-500/5 overflow-hidden">
          <CardHeader>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-500" /> Cofre de Conquistas
                </CardTitle>
                <CardDescription>Moedas 3D forjadas a cada marco superado. Passe o mouse para girar mais devagar.</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-amber-500 leading-none tabular-nums">
                  {unlockedCoinsCount}<span className="text-muted-foreground/60 text-lg">/{MILESTONE_COINS.length}</span>
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Coletadas</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {MILESTONE_COINS.map((c) => {
                const unlocked = days >= c.day;
                return (
                  <div key={c.day} className="flex flex-col items-center text-center gap-2 group">
                    <div className="relative">
                      <Coin3D tier={c.tier} icon={c.icon} label={c.label} size={92} locked={!unlocked} />
                      {unlocked && (
                        <>
                          <span className="absolute -top-1 -right-1 text-lg animate-[sparkle_1.5s_ease-in-out_infinite]">✨</span>
                          <span className="absolute -bottom-1 -left-1 text-lg animate-[sparkle_1.5s_ease-in-out_infinite] [animation-delay:0.7s]">✨</span>
                        </>
                      )}
                    </div>
                    <div>
                      <p className={cn("text-xs font-bold leading-tight", unlocked ? "text-foreground" : "text-muted-foreground/60")}>
                        {c.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {unlocked ? "✓ Conquistada" : `Dia ${c.day}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground italic pb-6">
          Aviso: este app é uma ferramenta motivacional. Não substitui acompanhamento profissional. Se precisar de ajuda: CVV 188.
        </p>
      </main>

      {/* Celebration modal — new coin unlocked */}
      <Dialog open={!!celebrateCoin} onOpenChange={(o) => !o && setCelebrateCoin(null)}>
        <DialogContent className="sm:max-w-md overflow-hidden">
          {celebrateCoin && (
            <>
              <div className="absolute inset-0 pointer-events-none">
                {["top-4 left-6", "top-8 right-8", "bottom-12 left-10", "bottom-6 right-6", "top-20 left-1/2"].map((pos, i) => (
                  <span key={i} className={cn("absolute text-2xl animate-[sparkle_1.5s_ease-in-out_infinite]", pos)} style={{ animationDelay: `${i * 0.2}s` }}>✨</span>
                ))}
              </div>
              <DialogHeader className="text-center items-center relative z-10">
                <div className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-1">Nova Conquista</div>
                <DialogTitle className="text-2xl">{celebrateCoin.title}</DialogTitle>
                <DialogDescription>{celebrateCoin.reward}</DialogDescription>
              </DialogHeader>
              <div className="flex justify-center py-4 relative z-10">
                <div className="animate-[coin-pop_1.2s_cubic-bezier(0.34,1.56,0.64,1)_forwards]">
                  <Coin3D tier={celebrateCoin.tier} icon={celebrateCoin.icon} label={celebrateCoin.label} size={180} />
                </div>
              </div>
              <DialogFooter className="relative z-10">
                <Button className="w-full gap-2" onClick={() => setCelebrateCoin(null)}>
                  <Sparkles className="w-4 h-4" /> Adicionar ao cofre
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

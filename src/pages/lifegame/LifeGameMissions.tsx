import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Check, Footprints, LockKeyhole, Plus, Sparkles, Target, Wallet, Zap } from "lucide-react";
import { journeyToday, validJourneyDate } from "@/lib/lifeGameDates";
import { isAccountPreview, isDesignPreview } from "@/lib/previewMode";
import "./lifegame.css";

const XP_PER_LEVEL = 100;
const initialMissions = [
  { id: "focus", title: "Faça 15 minutos de foco", detail: "Escolha uma tarefa e faça só ela.", xp: 35, icon: Target, tone: "focus" },
  { id: "movement", title: "Faça uma pausa em movimento", detail: "Caminhe ou se alongue por alguns minutos.", xp: 25, icon: Footprints, tone: "movement" },
  { id: "flow", title: "Confira seus gastos do dia", detail: "Reserve um momento para revisar seus lançamentos.", xp: 30, icon: Wallet, tone: "flow" },
];
type CustomMission = { id: string; title: string; from: string };
type Progress = { custom: CustomMission[]; log: Record<string, Record<string, number>> };
const empty: Progress = { custom: [], log: {} };
const shortDay = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" });
const longDay = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const dateNumber = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
const milestones = [
  { xp: 100, name: "Primeiro passo", icon: Sparkles },
  { xp: 250, name: "Pegou o ritmo", icon: Zap },
  { xp: 500, name: "Rotina em movimento", icon: Footprints },
];
const asDate = (day: string) => new Date(`${day}T00:00:00Z`);

function readProgress(storageKey: string): Progress {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return empty;
    const saved = JSON.parse(raw) as Partial<Progress>;
    if (!saved || !Array.isArray(saved.custom) || !saved.log || typeof saved.log !== "object") return empty;
    const custom = saved.custom.filter(item => typeof item?.id === "string" && typeof item?.title === "string" && validJourneyDate(item.from));
    const log = Object.fromEntries(Object.entries(saved.log).flatMap(([day, values]) => {
      if (!validJourneyDate(day) || !values || typeof values !== "object") return [];
      return [[day, Object.fromEntries(Object.entries(values).filter(([, xp]) => Number.isInteger(xp) && xp > 0 && xp <= 100))]];
    }));
    return { custom, log };
  } catch {
    return empty;
  }
}

function weekFor(today: string) {
  const first = asDate(today);
  first.setUTCDate(first.getUTCDate() - ((first.getUTCDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(first);
    date.setUTCDate(date.getUTCDate() + index);
    return { day: date.toISOString().slice(0, 10), date };
  });
}

export default function LifeGameMissions({ userId }: { userId: string }) {
  const storageKey = isDesignPreview && !isAccountPreview
    ? "lifegame-missions-design-preview-v1"
    : `lifegame-missions-v1:${userId}`;
  const [progress, setProgress] = useState(() => readProgress(storageKey));
  const [today, setToday] = useState(() => journeyToday());
  const [historyDay, setHistoryDay] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [savedLocally, setSavedLocally] = useState(true);

  useEffect(() => {
    const refresh = () => setToday(journeyToday());
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) setProgress(readProgress(storageKey));
    };
    window.addEventListener("storage", sync);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener("storage", sync); };
  }, [storageKey]);

  const week = weekFor(today);
  const selectedDay = historyDay && week.some(item => item.day === historyDay) ? historyDay : today;
  const isToday = selectedDay === today;
  const daily = progress.log[selectedDay] ?? {};
  const totalXp = Object.values(progress.log).flatMap(Object.values).reduce((sum, amount) => sum + amount, 0);
  const level = 1 + Math.floor(totalXp / XP_PER_LEVEL);
  const remaining = XP_PER_LEVEL - totalXp % XP_PER_LEVEL;
  const missions = [...initialMissions, ...progress.custom.filter(item => item.from <= selectedDay).map(item => ({
    ...item, detail: "", xp: 20, icon: BookOpen, tone: "custom",
  }))];
  const completed = missions.filter(item => !!daily[item.id]).length;
  const activeDays = week.filter(item => Object.keys(progress.log[item.day] ?? {}).length > 0).length;

  const update = (makeNext: (current: Progress) => Progress) => {
    const current = savedLocally ? readProgress(storageKey) : progress;
    const next = makeNext(current);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setSavedLocally(true);
    } catch {
      setSavedLocally(false);
    }
    setProgress(next);
  };
  const toggleMission = (id: string, title: string, xp: number) => {
    if (!isToday || today !== journeyToday()) { setToday(journeyToday()); return; }
    update(current => {
      const record = { ...current.log[today] };
      if (record[id]) {
        delete record[id];
        setNotice(`Conclusão desfeita: ${title}.`);
      } else {
        record[id] = xp;
        setNotice(`Missão concluída: ${title}. +${xp} XP.`);
      }
      return { ...current, log: { ...current.log, [today]: record } };
    });
  };

  return <main className="life-missions">
    <div className="life-missions-heading">
      <h1>Life Game</h1>
      <Link to="/lifegame/jornada"><ArrowLeft size={16} aria-hidden /> Minha jornada</Link>
    </div>
    <section className="life-xp" aria-labelledby="life-level-title">
      <div className="life-xp-level">
        <div className="life-level-icon"><Zap size={26} aria-hidden /></div>
        <div><h2 id="life-level-title">Nível {level}</h2><p>{totalXp.toLocaleString("pt-BR")} XP acumulados</p></div>
      </div>
      <div className="life-level-progress">
        <label htmlFor="life-level-progress">{remaining} XP para o nível {level + 1}</label>
        <progress id="life-level-progress" max={XP_PER_LEVEL} value={totalXp % XP_PER_LEVEL} />
      </div>
    </section>

    <div className="life-missions-layout">
      <section className="life-week" aria-labelledby="life-week-title">
        <header className="life-panel-heading"><div><h2 id="life-week-title">Sua semana</h2>
          <p>{activeDays} {activeDays === 1 ? "dia com missões" : "dias com missões"} · {dateNumber.format(week[0].date)} a {dateNumber.format(week[6].date)}</p></div></header>
        <div className="life-week-days" role="group" aria-label="Escolher dia da semana">
          {week.map(({ day, date }) => {
            const hasProgress = Object.keys(progress.log[day] ?? {}).length > 0;
            return <button type="button" key={day} disabled={day > today} aria-pressed={selectedDay === day}
              aria-label={`${longDay.format(date)}${day === today ? ", hoje" : ""}${hasProgress ? ", com missões concluídas" : ""}`}
              className={hasProgress ? "has-progress" : undefined} onClick={() => setHistoryDay(day === today ? null : day)}>
              <span>{shortDay.format(date).replace(".", "")}</span><strong>{date.getUTCDate()}</strong>
              <i aria-hidden>{hasProgress ? <Check size={11} /> : null}</i>
            </button>;
          })}
        </div>
      </section>
      <section className="life-board" aria-labelledby="life-board-title">
        <header className="life-panel-heading">
          <div><h2 id="life-board-title">{isToday ? "Missões de hoje" : longDay.format(asDate(selectedDay))}</h2>
            <p>{completed} de {missions.length} concluídas</p></div>
          {isToday && <button type="button" className="life-secondary" aria-expanded={adding} onClick={() => setAdding(!adding)}>
            <Plus size={16} aria-hidden /> Nova missão
          </button>}
        </header>
        {adding && isToday && <form className="life-add" onSubmit={event => {
          event.preventDefault();
          const title = draft.trim();
          if (!title) return;
          const item = { id: crypto.randomUUID(), title, from: today };
          update(current => ({ ...current, custom: [...current.custom, item] }));
          setNotice(`Missão adicionada: ${title}.`);
          setDraft(""); setAdding(false);
        }}>
          <label htmlFor="life-mission-title">O que você quer fazer?</label>
          <div><input id="life-mission-title" value={draft} maxLength={90} required autoFocus placeholder="Ex.: Ler cinco páginas" onChange={event => setDraft(event.target.value)} />
            <button type="submit" className="life-primary">Adicionar</button></div>
        </form>}
        <ul className="life-mission-list">
          {missions.map(item => {
            const done = !!daily[item.id];
            const Icon = item.icon;
            return <li key={item.id} className={`life-mission-row ${item.tone}${done ? " is-complete" : ""}`}>
              <span className="life-mission-icon"><Icon size={19} aria-hidden /></span>
              <div className="life-mission-text"><strong>{item.title}</strong>{item.detail && <p>{item.detail}</p>}</div>
              <div className="life-mission-actions">
                <span className="life-mission-xp">{done ? `+${daily[item.id]}` : `+${item.xp}`} XP</span>
                {isToday ? <button type="button" aria-pressed={done} aria-label={`${done ? "Feita" : "Concluir"}: ${item.title}`}
                  onClick={() => toggleMission(item.id, item.title, item.xp)}><Check size={18} aria-hidden /><span>{done ? "Feita" : "Concluir"}</span></button>
                  : <span className="life-history-status">{done ? "Concluída" : "Sem registro"}</span>}
              </div>
            </li>;
          })}
        </ul>
        <p className="life-sr" role="status" aria-atomic="true">{notice}</p>
        {!savedLocally && <p role="status" className="life-storage-note">O navegador não conseguiu salvar o progresso. Ele fica disponível enquanto esta tela estiver aberta.</p>}
      </section>

      <section className="life-milestones" aria-labelledby="life-milestones-title">
        <header className="life-panel-heading"><div><h2 id="life-milestones-title">Conquistas</h2>
          <p>{milestones.filter(item => totalXp >= item.xp).length} de {milestones.length} desbloqueadas</p></div></header>
        <ul>{milestones.map(item => {
          const unlocked = totalXp >= item.xp;
          const Icon = item.icon;
          return <li key={item.xp} className={unlocked ? "is-unlocked" : ""}>
            <span className="life-milestone-icon"><Icon size={16} aria-hidden /></span>
            <span><strong>{item.name}</strong><small>{item.xp} XP</small></span>
            <span className="life-milestone-state">{unlocked ? <Check size={15} aria-hidden /> : <LockKeyhole size={14} aria-hidden />}
              <span className="life-sr">{unlocked ? "Desbloqueada" : "Bloqueada"}</span></span>
          </li>;
        })}</ul>
      </section>
    </div>
    <p className="life-storage-note">O progresso das missões fica salvo neste navegador.</p>
  </main>;
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight, ArrowRight, Brain, ChevronLeft, ChevronRight, CreditCard, LayoutDashboard, ArrowLeftRight, CircleHelp, Target, Wallet, Link2, Check, Gamepad2, Sparkles, Wrench, LogOut } from "lucide-react";
import { useFinanceStore } from "@/stores/financeStore";
import { useAuth } from "@/hooks/useAuth";
import { money, monthNumber, pendingPayments } from "@/lib/planningTools";
import { buildBalanceProjection, surplusProjectionHorizon } from "@/lib/dashboardPresentation";
import { WelcomeCards } from "./WelcomeCards";
import { OverviewDebtCard } from "./OverviewDebtCard";
import { AnimatedAmount } from "./AnimatedAmount";
import { SurplusSparkline } from "./SurplusSparkline";
import { isAccountPreview } from "@/lib/previewMode";

const navigation = [
  { label: "Visão geral", href: "/", icon: LayoutDashboard },
  { label: "Fluxo de caixa", href: "/fluxo", icon: ArrowLeftRight },
  { label: "Renda", href: "/renda", icon: Wallet },
  { label: "Carteira", href: "/carteira", icon: CreditCard },
  { label: "Dívidas", href: "/divida", icon: ArrowDownLeft },
  { label: "Objetivos", href: "/objetivos", icon: Target },
  { label: "LifeGame", href: "/lifegame", icon: Gamepad2 },
  { label: "Desejos", href: "/desejos", icon: Sparkles },
  { label: "Ferramentas", href: "/ferramentas", icon: Wrench },
  { label: "Integrações", href: "/integracoes", icon: Link2 },
];
const sum = (items: { amount: number }[]) => items.reduce((total, item) => total + Math.round(item.amount * 100), 0) / 100;
function Amount({ value, className = "" }: { value: number; className?: string }) {
  return <AnimatedAmount value={value} className={className} />;
}

export function OverviewProposal({ embedded = false }: { embedded?: boolean }) {
  const store = useFinanceStore();
  const auth = useAuth();
  const [chartMode, setChartMode] = useState<"monthly" | "accumulated">("accumulated");
  const [chosenEnd, setChosenEnd] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  if (auth.loading || store.cloudLoading || !store.cloudReady) return <main className="cl-loading">Preparando a proposta… <a href="/">Voltar à visão atual</a></main>;
  const month = store.currentCashflow;
  const payments = pendingPayments(month, store.banks);
  const pending = sum(payments);
  const received = sum(month.incomes.filter(item => item.paid));
  const toReceive = sum(month.incomes.filter(item => !item.paid));
  const paid = Math.max(0, Math.round((store.totalExpense - pending) * 100) / 100);
  const income = store.totalIncome;
  const cost = store.totalExpense;
  const balance = store.expectedBalance;
  const spentPercent = income > 0 ? Math.min(100, Math.max(0, cost / income * 100)) : cost > 0 ? 100 : 0;
  const savingsPercent = income > 0 ? balance / income * 100 : 0;
  const maxHorizon = surplusProjectionHorizon(store.cashflowMonths, store.banks, store.selectedMonth);
  const horizon = Math.max(0, Math.min(chosenEnd ?? maxHorizon, maxHorizon));
  const points = buildBalanceProjection(store.cashflowMonths, store.banks, store.selectedMonth, horizon, true);
  const last = points[points.length - 1];
  const accumulated = last?.forecast ?? last?.planned ?? 0;
  const offsetLabel = (offset: number) => new Date(month.year, monthNumber(month.month) - 1 + offset, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const visiblePoints = points.slice(-6);
  const values = visiblePoints.map(point => chartMode === "monthly" ? point.net : point.forecast ?? point.planned ?? 0);
  const low = Math.min(0, ...values), high = Math.max(1, ...values);
  const coordinates = values.map((value, index) => ({ x: 32 + index / Math.max(1, values.length - 1) * 656, y: 149 - (value - low) / (high - low) * 120 }));
  const path = coordinates.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
  const currentPoint = hovered === null ? null : visiblePoints[hovered];

  const content = (      <main tabIndex={-1} id="resumo" className="cl-main">
        <WelcomeCards name={auth.displayName} />
        <div className="cl-page-heading"><div><h2>Seu mês, em números.</h2><p>Entenda o que entra, o que sai e o que pode sobrar.</p></div><div className="cl-period"><button aria-label="Mês anterior" disabled={store.selectedMonth <= 0} onClick={() => { store.prevMonth(); setChosenEnd(null); setHovered(null); }}><ChevronLeft size={17} /></button><label className="cl-sr" htmlFor="cl-month">Mês de referência</label><select id="cl-month" value={store.selectedMonth} onChange={event => { store.setSelectedMonth(Number(event.target.value)); setChosenEnd(null); setHovered(null); }}>{store.cashflowMonths.map((item, index) => <option key={`${item.month}-${item.year}`} value={index}>{item.month} {item.year}</option>)}</select><button aria-label="Próximo mês" disabled={store.selectedMonth >= store.cashflowMonths.length - 1} onClick={() => { store.nextMonth(); setChosenEnd(null); setHovered(null); }}><ChevronRight size={17} /></button></div></div>

        <div className="cl-summary-grid">
          <section className={`cl-panel cl-result ${balance < 0 ? "cl-result-negative" : "cl-result-positive"}`} aria-labelledby="cl-result-title">
            <div className="cl-panel-heading"><h2 id="cl-result-title">{balance >= 0 ? "O que deve sobrar neste mês" : "O que falta para fechar este mês"}</h2><span className="cl-tag">Previsto</span></div>
            <div className="cl-result-intro"><div><div className="cl-result-number"><Amount value={Math.abs(balance)} className={balance < 0 ? "cl-red" : ""} />{income > 0 && <span className={balance < 0 ? "cl-red" : "cl-green"}>{Math.abs(savingsPercent).toFixed(0)}% {balance < 0 ? "faltando" : "das entradas"}</span>}</div>
            <p className="cl-explanation">{balance >= 0 ? "Depois de todas as despesas e parcelas previstas." : "As despesas previstas superam as entradas deste mês."} Não é o saldo da conta bancária.</p></div><SurplusSparkline key={`${month.month}-${month.year}`} month={month} months={store.cashflowMonths} banks={store.banks} /></div>
            <div className="cl-equation">
              <Link to="/fluxo"><span><ArrowDownLeft size={15} className="cl-green" />Total de entradas</span><Amount value={income} /></Link><span className="cl-equation-sign" aria-hidden>−</span>
              <Link to="/fluxo"><span><ArrowUpRight size={15} className="cl-red" />Total de saídas</span><Amount value={cost} /></Link><span className="cl-equation-sign" aria-hidden>=</span>
              <div><span>{balance < 0 ? "Déficit do mês" : "Sobra do mês"}</span><Amount value={Math.abs(balance)} className={balance < 0 ? "cl-red" : "cl-green"} /></div>
            </div>
            <div className="cl-spending-bar" aria-hidden><span style={{ width: `${spentPercent}%` }} /><span style={{ width: `${income > 0 ? 100 - spentPercent : 0}%` }} /></div>
            <div className="cl-bar-labels"><span><i className="cl-swatch-expense" />{income > 0 ? `${Math.round(cost / income * 100)}% comprometido` : "Sem entradas no período"}</span><span><i className="cl-swatch-income" />{balance >= 0 ? "Sobra prevista" : "Mês no negativo"}</span></div>
          </section>
<OverviewDebtCard banks={store.banks} creditors={store.creditors} month={month} />
          <div className="cl-pending-pair">
            <section className="cl-panel cl-pending-mini cl-receive" aria-labelledby="cl-receive-title"><div><h2 id="cl-receive-title">A receber</h2><Amount value={toReceive} /></div><p>Já recebido <strong><Amount value={received} /></strong></p></section>
            <section className="cl-panel cl-pending-mini cl-pay" aria-labelledby="cl-pay-title"><div><h2 id="cl-pay-title">A pagar</h2><Amount value={pending} /></div><p>{payments.length} pendências · Já pago <strong><Amount value={paid} /></strong></p></section>
          </div>
        </div>

        <section className="cl-panel cl-forecast" aria-labelledby="cl-forecast-title">
          <div className="cl-panel-heading"><div><h2 id="cl-forecast-title">E nos próximos meses?</h2><p>Uma visão do que pode se acumular a partir de {month.month.toLocaleLowerCase("pt-BR")}.</p></div><div className="cl-forecast-select"><label htmlFor="cl-forecast-end">Projetar até</label><select id="cl-forecast-end" value={horizon} onChange={event => { setChosenEnd(Number(event.target.value)); setHovered(null); }}>{Array.from({ length: maxHorizon + 1 }, (_, index) => <option key={index} value={index}>{offsetLabel(index)}</option>)}</select></div></div>
          <div className="cl-forecast-body"><div className="cl-forecast-total"><span>Sobra acumulada prevista</span><Amount value={accumulated} className={accumulated < 0 ? "cl-red" : "cl-green"} /><p>De {month.month.toLocaleLowerCase("pt-BR")} até {offsetLabel(horizon)}.<br />Somando as sobras de cada mês, a partir de zero.</p><div className="cl-forecast-caption"><CircleHelp size={15} /><span>Projeção de fluxo.<br />Não é dinheiro já guardado.</span></div></div>
          <div className="cl-forecast-chart"><div className="cl-chart-toolbar"><span>{chartMode === "monthly" ? "Sobra de cada mês" : "Soma das sobras"}</span><div className="cl-segments" aria-label="Exibição do gráfico"><button aria-pressed={chartMode === "monthly"} onClick={() => { setChartMode("monthly"); setHovered(null); }}>Por mês</button><button aria-pressed={chartMode === "accumulated"} onClick={() => { setChartMode("accumulated"); setHovered(null); }}>Acumulado</button></div></div>
            <svg viewBox="0 0 720 180" role="img" aria-label={`${chartMode === "monthly" ? "Sobras mensais" : "Sobra acumulada"}. Valores nos botões abaixo e na tabela de cálculo.`}>
              <defs><pattern id="cl-chart-dots" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.55" fill="#353535" /></pattern></defs><rect x="20" y="18" width="680" height="142" fill="url(#cl-chart-dots)" />
              {[29, 89, 149].map(y => <line key={y} x1="20" y1={y} x2="700" y2={y} stroke="#232323" strokeDasharray="2 5" />)}
              <path d={path} fill="none" stroke={chartMode === "monthly" ? "#82b0ff" : "#f4f5f6"} strokeWidth="2" strokeLinejoin="round" />
              {coordinates.map((point, index) => <g key={index}>{hovered === index && <line x1={point.x} x2={point.x} y1="18" y2="160" stroke="#7d7d7d" strokeDasharray="3 4" />}<rect x={point.x - 3} y={point.y - 3} width="6" height="6" fill={hovered === index ? "#8beaac" : "#f4f5f6"} /></g>)}
            </svg>
            <div className="cl-chart-values" style={{ gridTemplateColumns: `repeat(${Math.max(1, visiblePoints.length)}, minmax(0, 1fr))` }}>{visiblePoints.map((point, index) => <button key={point.label} onMouseEnter={() => setHovered(index)} onFocus={() => setHovered(index)} onClick={() => setHovered(index)} aria-pressed={hovered === index}><span>{point.label}</span><strong className={values[index] < 0 ? "cl-red" : ""}><Amount value={values[index]} /></strong>{point.source === "Média estimada" && <small>Estimado</small>}</button>)}</div>
            <p className="cl-chart-note" aria-live="polite">{currentPoint ? `${currentPoint.label}: ${money(values[hovered!])} · ${currentPoint.source}` : visiblePoints.length < points.length ? "Gráfico: últimos 6 meses da projeção. Todos os valores na memória de cálculo." : "Selecione um mês para conferir o valor e a origem da previsão."}</p>
          </div></div>
          <section className="cl-calculation cl-calculation-visible" aria-labelledby="cl-calculation-title"><h3 id="cl-calculation-title">Entenda a projeção e confira os valores</h3><p>O mês inicial é o selecionado no topo. O limite final acompanha as contas e faturas pendentes cadastradas. Cada mês considera entradas menos despesas e cartões; sem registros, repete a média dos três últimos meses registrados até o início. Meses com apenas parcelas consideram essas saídas. Valores recebidos ou pagos continuam no total do mês.</p><div className="cl-table-scroll"><table><caption className="cl-sr">Memória da projeção de sobras</caption><thead><tr><th>Mês</th><th>Sobra no mês</th><th>Soma das sobras</th><th>Base</th></tr></thead><tbody>{points.map(point => <tr key={point.label}><th scope="row">{point.label}</th><td>{money(point.net)}</td><td>{money(point.forecast ?? point.planned ?? 0)}</td><td>{point.source}</td></tr>)}</tbody></table></div></section>
        </section>

        <div className="cl-bottom-grid"><section className="cl-panel cl-bills"><div className="cl-panel-heading"><div><h2>Contas que ainda precisam de você</h2><p>Somente pendências de {month.month.toLocaleLowerCase("pt-BR")}.</p></div><Link to="/fluxo" className="cl-text-link">Abrir fluxo <ArrowUpRight size={14} /></Link></div>
          {payments.length ? <div className="cl-bill-list">{payments.map(item => <Link key={item.id} to={item.route} className="cl-bill"><span className={`cl-bill-date ${item.overdue ? "cl-red" : ""}`}>{item.dueDate ? new Date(`${item.dueDate}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "Sem data"}</span><span className="cl-bill-name"><strong>{item.title}</strong><small>{item.source}</small></span><span className={`cl-bill-status ${item.overdue ? "cl-red" : ""}`}>{item.overdue ? "Em atraso" : "A pagar"}</span><Amount value={item.amount} /><ArrowUpRight size={14} /></Link>)}</div> : <p className="cl-empty"><Check size={18} />Nenhuma conta pendente neste período.</p>}
          <div className="cl-bill-footer"><span>Total que falta pagar</span><Amount value={pending} /></div>
        </section>
        </div>
        <footer className="cl-footer"><span><Brain size={15} />Segundo Cérebro</span>{!embedded && <a href="/">Comparar com a interface atual <ArrowUpRight size={14} /></a>}</footer>
      </main>);
  if (embedded) return content;

  return <div className="cl-app">
    <a className="cl-skip" href="#/" onClick={event => { event.preventDefault(); document.getElementById("resumo")?.focus(); }}>Pular para o resumo</a>
    <aside className="cl-sidebar">
      <a className="cl-brand" href="#/"><Brain size={24} strokeWidth={1.5} /><span>Segundo Cérebro<small>Seu dinheiro, mais claro.</small></span></a>
      <nav aria-label="Navegação da proposta">{navigation.map(({ label, href, icon: Icon }, index) => <a key={label} href={`#${href}`} className={index === 0 ? "is-active" : ""} aria-current={index === 0 ? "page" : undefined}><Icon size={17} strokeWidth={1.6} />{label}{index !== 0 && <ArrowUpRight size={12} className="cl-nav-external" />}</a>)}</nav>
      <div className="cl-sidebar-bottom"><button className="cl-proposal-logout" onClick={() => void auth.signOut()}><LogOut size={15} />Sair da conta</button><a href="/"><ChevronLeft size={16} />Comparar com a visão atual</a><p>Proposta de interface<br />Somente neste ambiente local.</p></div>
    </aside>
    <div className="cl-workspace">
      <div className="cl-preview"><span className="cl-preview-dot" />Proposta local · {isAccountPreview ? "Cópia da sua conta, sem gravação na nuvem" : "Dados de exemplo"}<a href="/">Ver interface atual <ArrowUpRight size={13} /></a></div>
      <header className="cl-topbar"><span>Meu espaço <span className="cl-slash">/</span> Visão geral</span><span className="cl-account"><span className="cl-avatar">{(auth.displayName || "P").slice(0, 1)}</span>{auth.displayName || "Prévia"}</span></header>
{content}
    </div>
  </div>;
}

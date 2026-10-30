import { Link } from "react-router-dom";
import { ArrowUpRight, ChartNoAxesCombined, Target, Wallet } from "lucide-react";

export function WelcomeCards({ name }: { name: string }) {
  const hour = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: "America/Sao_Paulo" }).format(new Date()));
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  return <section className="cl-welcome" aria-labelledby="cl-welcome-title">
    <div className="cl-welcome-copy"><p>{greeting}, {name || "bem-vindo"}.</p><h1 id="cl-welcome-title">Mais clareza.<br />Mais espaço para seus planos.</h1><span>Seu dinheiro, suas escolhas. Veja o mês e prepare o próximo passo.</span></div>
    <div className="cl-welcome-tiles">
      <Link to="/fluxo" className="cl-welcome-tile"><span>Organize<br /><strong>seu mês</strong></span><ArrowUpRight size={17} /><Wallet className="cl-welcome-drawing" strokeWidth={.8} aria-hidden="true" /></Link>
      <Link to="/carteira" className="cl-welcome-tile cl-welcome-tile-dark"><span>Acompanhe<br /><strong>seus movimentos</strong></span><ArrowUpRight size={17} /><ChartNoAxesCombined className="cl-welcome-drawing" strokeWidth={.8} aria-hidden="true" /></Link>
      <Link to="/objetivos" className="cl-welcome-tile"><span>Planeje<br /><strong>o que vem</strong></span><ArrowUpRight size={17} /><Target className="cl-welcome-drawing" strokeWidth={.8} aria-hidden="true" /></Link>
    </div>
  </section>;
}

import { Link } from "react-router-dom";
import { ChevronDown, ChartNoAxesCombined, Target, Wallet } from "lucide-react";

export function WelcomeCards({ name }: { name: string }) {
  const hour = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: "America/Sao_Paulo" }).format(new Date()));
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  return <details className="cl-overview-welcome">
    <summary><span>Mais clareza. Mais espaço para seus planos.</span><ChevronDown size={17} aria-hidden="true" /></summary>
    <div className="cl-overview-welcome-content">
      <p>{greeting}, {name || "bem-vindo"}.</p>
      <nav aria-label="Atalhos da Visão Geral">
        <Link to="/fluxo"><Wallet size={16} aria-hidden="true" /> Fluxo de caixa</Link>
        <Link to="/carteira"><ChartNoAxesCombined size={16} aria-hidden="true" /> Carteira</Link>
        <Link to="/objetivos"><Target size={16} aria-hidden="true" /> Objetivos</Link>
      </nav>
    </div>
  </details>;
}

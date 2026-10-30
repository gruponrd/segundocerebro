import { lazy, Suspense, useEffect } from "react";
import { HashRouter, Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useAuth } from "@/hooks/useAuth";
import { useFinanceStore } from "@/stores/financeStore";
import { isAccountPreview } from "@/lib/previewMode";
import { Brain, ArrowUpRight, LogOut, LayoutDashboard, ArrowLeftRight, Wallet, CreditCard, Target, TrendingUp, Gamepad2, Sparkles, Wrench, Link2 } from "lucide-react";
import { OverviewProposal } from "./OverviewProposal";

const routes = [
  { path: "/fluxo", label: "Fluxo de caixa", icon: ArrowLeftRight, Page: lazy(() => import("@/pages/Fluxo")) },
  { path: "/renda", label: "Renda", icon: Wallet, Page: lazy(() => import("@/pages/Renda")) },
  { path: "/carteira", label: "Carteira", icon: CreditCard, Page: lazy(() => import("@/pages/Carteira")) },
  { path: "/divida", label: "Dívidas", icon: TrendingUp, Page: lazy(() => import("@/pages/Divida")) },
  { path: "/objetivos", label: "Objetivos", icon: Target, Page: lazy(() => import("@/pages/Goals")) },
  { path: "/lifegame", label: "LifeGame", icon: Gamepad2, Page: lazy(() => import("@/pages/LifeGame")) },
  { path: "/desejos", label: "Desejos", icon: Sparkles, Page: lazy(() => import("@/pages/Desejos")) },
  { path: "/ferramentas", label: "Ferramentas", icon: Wrench, Page: lazy(() => import("@/pages/Ferramentas")) },
  { path: "/integracoes", label: "Integrações", icon: Link2, Page: lazy(() => import("@/pages/Integracoes")) },
];
const queryClient = new QueryClient();
function SectionShell() {
  const auth = useAuth();
  const { pathname } = useLocation();
  const selected = routes.find(route => route.path === pathname);
  return <div className="cl-app cl-proposal-shell">
    <a className="cl-skip" href="#workspace" onClick={event => { event.preventDefault(); document.getElementById("cl-section-content")?.focus(); }}>Pular para o conteúdo</a>
    <aside className="cl-sidebar"><a className="cl-brand" href="#/"><Brain size={24} strokeWidth={1.5}/><span>Segundo Cérebro<small>Seu dinheiro, mais claro.</small></span></a><nav aria-label="Navegação da proposta"><NavLink to="/" end><LayoutDashboard size={17}/>Visão geral</NavLink>{routes.map(({ path, label, icon: Icon }) => <NavLink key={path} to={path} className={({isActive}) => isActive ? "is-active" : ""}><Icon size={17} strokeWidth={1.6}/>{label}</NavLink>)}</nav><div className="cl-sidebar-bottom"><button className="cl-proposal-logout" onClick={() => void auth.signOut()}><LogOut size={15}/>Sair da conta</button><p>Prévia local · sem publicação.</p></div></aside>
    <div className="cl-workspace"><div className="cl-preview"><span className="cl-preview-dot"/>Proposta local · {isAccountPreview ? "Cópia da sua conta, sem gravação na nuvem" : "Dados de exemplo"}<a href="/">Interface anterior <ArrowUpRight size={13}/></a></div><header className="cl-topbar"><span>Meu espaço <span className="cl-slash">/</span>{selected?.label}</span><span className="cl-account"><span className="cl-avatar">{(auth.displayName || "P").slice(0,1)}</span>{auth.displayName || "Prévia"}<button className="cl-mobile-logout" onClick={() => void auth.signOut()} aria-label="Sair da conta"><LogOut size={16}/></button></span></header><div id="cl-section-content" tabIndex={-1} className="cl-section-page" data-section={pathname.slice(1)}><Suspense fallback={<p className="cl-route-loading" role="status">Carregando {selected?.label.toLocaleLowerCase("pt-BR")}…</p>}>{selected ? <selected.Page/> : <Navigate to="/" replace/>}</Suspense></div></div>
  </div>;
}
function ProposalRoutes() {
  const auth = useAuth();
  const finance = useFinanceStore();
  const location = useLocation();
  useEffect(() => { window.scrollTo({top:0,behavior:"instant"}); }, [location.pathname]);
  if (auth.loading || finance.cloudLoading) return <main className="cl-loading">Preparando sua prévia…</main>;
  if (!auth.user) return <main className="cl-loading"><p>Entre para visualizar a cópia da sua conta.</p><a href="/acesso?conta=1">Abrir login local</a></main>;
  if (!finance.cloudReady) return <main className="cl-loading"><p>{finance.syncError || "Carregando seus dados…"}</p>{finance.syncError && <button onClick={finance.retryCloudLoad}>Tentar novamente</button>}</main>;
  return <Routes><Route path="/" element={<OverviewProposal/>}/><Route path="*" element={<SectionShell/>}/></Routes>;
}
export function ProposalApp() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><HashRouter><ProposalRoutes/><Toaster/><Sonner/></HashRouter></TooltipProvider></QueryClientProvider>;
}

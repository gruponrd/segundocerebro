import { type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ArrowDownLeft, ArrowLeftRight, Brain, CreditCard, Gamepad2, LayoutDashboard, Link2, Plus, Search, Sparkles, Target, Wallet, Wrench } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFinanceStore } from "@/stores/financeStore";
import { openCommandMenu } from "@/lib/commandMenu";
import { openTransactionMenu } from "@/lib/transactionMenu";
import { isPreviewMode, isDesignPreview } from "@/lib/previewMode";
import { LogoutButton } from "@/components/LogoutButton";
import { ExportXlsxButton } from "@/components/ExportXlsxButton";

const navigation = [
  { path: "/", label: "Visão geral", icon: LayoutDashboard },
  { path: "/fluxo", label: "Fluxo de caixa", icon: ArrowLeftRight },
  { path: "/renda", label: "Renda", icon: Wallet },
  { path: "/carteira", label: "Carteira", icon: CreditCard },
  { path: "/divida", label: "Dívidas", icon: ArrowDownLeft },
  { path: "/objetivos", label: "Objetivos", icon: Target },
  { path: "/lifegame", label: "LifeGame", icon: Gamepad2 },
  { path: "/desejos", label: "Desejos", icon: Sparkles },
  { path: "/ferramentas", label: "Ferramentas", icon: Wrench },
  { path: "/integracoes", label: "Integrações", icon: Link2 },
];

/** Presentation only: account providers, recovery and persistence stay in App. */
export function ClarityWorkspace({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { displayName } = useAuth();
  const finance = useFinanceStore();
  const label = navigation.find(item => item.path === pathname)?.label || "Meu espaço";
  return <div className="cl-app cl-production-shell">
    <a className="cl-skip" href="#workspace-content" onClick={event => { event.preventDefault(); document.getElementById("workspace-content")?.focus(); }}>Pular para o conteúdo</a>
    <aside className="cl-sidebar">
      <Link className="cl-brand" to="/"><Brain size={24} strokeWidth={1.5}/><span>Segundo Cérebro<small>Seu dinheiro, mais claro.</small></span></Link>
      <nav aria-label="Navegação principal">{navigation.map(({ path, label: title, icon: Icon }) => <NavLink key={path} to={path} end={path === "/"} className={({ isActive }) => isActive ? "is-active" : ""}><Icon size={17} strokeWidth={1.6}/>{title}</NavLink>)}</nav>
      <div className="cl-sidebar-bottom"><LogoutButton className="cl-proposal-logout"/></div>
    </aside>
    <div className="cl-workspace">
      {isDesignPreview && <div className="cl-preview">Prévia local · alterações somente neste navegador</div>}
      <header className="cl-topbar"><span className="cl-current-section">Meu espaço <span className="cl-slash">/</span> {label}</span><div className="cl-header-actions">{pathname === "/" && <span className="cl-export"><ExportXlsxButton compact/></span>}<button onClick={openCommandMenu} aria-label="Buscar no aplicativo"><Search size={17}/></button><button className="cl-new-entry" onClick={openTransactionMenu} aria-label="Novo lançamento"><Plus size={17}/><span>Novo lançamento</span></button><span className="cl-avatar" title={displayName}>{(displayName || "SC").slice(0,1)}</span><LogoutButton iconOnly className="cl-header-logout"/></div></header>
      <div className="cl-sync-status" role="status" aria-live="polite">
        {finance.syncStatus === "saving" && (isPreviewMode ? "Salvando nesta prévia…" : "Salvando alterações…")}
        {finance.syncStatus === "saved" && (isPreviewMode ? "Prévia salva somente neste navegador" : "Dados sincronizados")}
        {(finance.syncStatus === "error" || finance.syncStatus === "conflict") && <span role="alert">{finance.syncError} <button onClick={finance.syncStatus === "conflict" ? finance.retryCloudLoad : finance.retryCloudSave}>{finance.syncStatus === "conflict" ? "Recarregar dados da nuvem" : "Tentar novamente"}</button></span>}
      </div>
      <div id="workspace-content" tabIndex={-1} className="cl-section-page" data-section={pathname.slice(1) || "overview"}>{children}</div>
    </div>
  </div>;
}

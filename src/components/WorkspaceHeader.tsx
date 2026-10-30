import { Link, useLocation } from "react-router-dom";
import { Brain, Plus, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { openTransactionMenu } from "@/lib/transactionMenu";
import { openCommandMenu } from "@/lib/commandMenu";
import { isDesignPreview, isPreviewMode } from "@/lib/previewMode";

const titles: Record<string,string> = { "/":"Visão geral", "/fluxo":"Fluxo de caixa", "/renda":"Renda", "/objetivos":"Objetivos", "/divida":"Dívidas", "/carteira":"Carteira", "/ferramentas":"Ferramentas", "/lifegame":"LifeGame", "/desejos":"Desejos", "/integracoes":"Integrações", "/acesso":"Acesso" };
export function WorkspaceHeader() {
  const { pathname } = useLocation();
  const { displayName } = useAuth();
  const initials = displayName.trim().split(/\s+/).slice(0,2).map(name=>name[0]).join("") || "SC";
  return <div className="workspace-topbar flex items-center justify-between gap-3">
    <div className="flex min-w-0 items-center gap-3 text-xs text-muted-foreground"><Brain aria-hidden className="h-5 w-5 shrink-0 text-accent md:hidden" /><span className="hidden md:inline">{displayName || "Seu espaço"}</span><span aria-hidden className="hidden text-border md:inline">/</span><span className="truncate text-foreground">{titles[pathname] ?? "Seu espaço"}</span></div>
    <div className="flex shrink-0 items-center gap-3">
      {isDesignPreview && <Link to="/acesso" className="hidden min-h-10 items-center text-xs text-muted-foreground hover:text-foreground sm:inline-flex">Ver login</Link>}
      <button type="button" onClick={openCommandMenu} aria-label="Buscar no aplicativo" className="workspace-search flex h-10 items-center gap-2 rounded-full px-3 text-xs text-muted-foreground hover:text-foreground"><Search aria-hidden className="h-4 w-4" /><span className="hidden lg:inline">Buscar no seu espaço</span><kbd className="ml-8 hidden text-xs text-muted-foreground lg:inline">Ctrl K</kbd></button>
      <Button onClick={openTransactionMenu} aria-label="Novo lançamento" className="h-10 gap-2 px-3"><Plus aria-hidden className="h-4 w-4" /><span className="hidden xl:inline">Novo lançamento</span></Button>
      <span className="workspace-avatar grid h-9 w-9 place-items-center rounded-full text-xs" title={isPreviewMode ? "Perfil da prévia local" : displayName}>{initials}</span>
    </div>
  </div>;
}

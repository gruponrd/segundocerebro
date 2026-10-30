import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { FinanceProvider, useFinanceStore } from "@/stores/financeStore";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

import { ThemeProvider } from "@/hooks/use-theme";
import { WorkspaceLoading } from "@/components/WorkspaceLoading";
import { ClarityWorkspace } from "@/components/ClarityWorkspace";
import { OverviewProposal } from "@/overview-proposal/OverviewProposal";
import { CommandCenter } from "@/components/CommandCenter";
import { ExpenseFAB } from "@/components/ExpenseFAB";
import { MigratedModulesGate } from "@/components/MigratedModulesGate";
import { RouteRecovery } from "@/components/RouteRecovery";
import { isDesignPreview } from "@/lib/previewMode";
import { AccountWorkspace } from "@/components/AccountWorkspace";
import { WorkspaceMotion } from "@/components/WorkspaceMotion";
const FerramentasPage = lazy(() => import("./pages/Ferramentas"));
const IntegracoesPage = lazy(() => import("./pages/Integracoes"));
const Index = lazy(() => import("./pages/Index"));
const GoalsPage = lazy(() => import("./pages/Goals"));
const RendaPage = lazy(() => import("./pages/Renda"));
const TradePage = lazy(() => import("./pages/Trade"));
const DividaPage = lazy(() => import("./pages/Divida"));
const CarteiraPage = lazy(() => import("./pages/Carteira"));
const FluxoPage = lazy(() => import("./pages/Fluxo"));
const LifeGamePage = lazy(() => import("./pages/LifeGame"));
const DesejosPage = lazy(() => import("./pages/Desejos"));
const AuthPage = lazy(() => import("./pages/Auth"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();
  const finance = useFinanceStore();

  if (loading) {
    return (
      <WorkspaceLoading/>
    );
  }

  if (!user) {
    return (
      <BrowserRouter>
        <RouteRecovery>
        <Suspense fallback={<WorkspaceLoading message="Abrindo a página…"/>}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="*" element={<AuthPage />} />
        </Routes>
        </Suspense>
        </RouteRecovery>
        <Toaster />
        <Sonner />
      </BrowserRouter>
    );
  }

  if (finance.localRecoveryAvailable) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-border bg-card p-6 space-y-4">
          <h1 className="text-xl font-semibold">Duas versões dos seus dados</h1>
          <p className="text-sm text-muted-foreground">A cópia neste dispositivo está diferente da versão na nuvem. Escolha qual versão usar antes de continuar.</p>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-lg bg-primary px-4 py-2 text-primary-foreground" onClick={finance.useLocalRecovery}>Usar cópia deste dispositivo</button>
            <button className="rounded-lg border border-border px-4 py-2" onClick={finance.useCloudRecovery}>Usar versão da nuvem</button>
          </div>
          <p className="text-xs text-muted-foreground">Ao escolher a cópia local, ela será salva na nuvem. A outra versão poderá ser substituída.</p>
        </div>
      </main>
    );
  }

  if (finance.cloudLoading || !finance.cloudReady) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
        {finance.syncError ? (
          <>
            <p role="alert" className="text-sm text-destructive">{finance.syncError}</p>
            <button className="rounded-lg border border-border px-4 py-2" onClick={finance.retryCloudLoad}>Tentar novamente</button>
          </>
        ) : (
          <>
            <WorkspaceLoading compact message="Carregando seus dados financeiros…"/>
          </>
        )}
      </main>
    );
  }

  return (
    <BrowserRouter>
      <ClarityWorkspace>
      <CommandCenter />
      <ExpenseFAB />
        <WorkspaceMotion>
        <RouteRecovery>
        <Suspense fallback={<div className="workspace-route-loading"><WorkspaceLoading compact message="Abrindo a seção…"/></div>}>
          <Routes>
            {isDesignPreview && <Route path="/acesso" element={<AuthPage />} />}
            <Route path="/" element={<><OverviewProposal embedded /><Index detailsOnly /></>} />
            <Route path="/objetivos" element={<GoalsPage />} />
            <Route path="/renda" element={<RendaPage />} />
            <Route path="/trade" element={<TradePage />} />
            <Route path="/divida" element={<DividaPage />} />
            <Route path="/carteira" element={<CarteiraPage />} />
            <Route path="/fluxo" element={<FluxoPage />} />
            <Route path="/lifegame" element={<LifeGamePage />} />
            <Route path="/desejos" element={<DesejosPage />} />
            <Route path="/ferramentas" element={<FerramentasPage />} />
            <Route path="/integracoes" element={<IntegracoesPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </RouteRecovery>
        </WorkspaceMotion>
      <Toaster />
      <Sonner />
      </ClarityWorkspace>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <AccountWorkspace>
          <MigratedModulesGate>
          <FinanceProvider>
            <AppRoutes />
          </FinanceProvider>
          </MigratedModulesGate>
          </AccountWorkspace>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

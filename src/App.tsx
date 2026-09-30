import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { FinanceProvider, useFinanceStore } from "@/stores/financeStore";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

import { ThemeProvider } from "@/hooks/use-theme";
import { AppNav } from "@/components/AppNav";
import { MobileNav } from "@/components/MobileNav";
import { CommandCenter } from "@/components/CommandCenter";
import { ExpenseFAB } from "@/components/ExpenseFAB";
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando página...</div>}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="*" element={<AuthPage />} />
        </Routes>
        </Suspense>
        <Toaster />
        <Sonner />
      </BrowserRouter>
    );
  }

  if (finance.legacyImportAvailable) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-border bg-card p-6 space-y-4">
          <h1 className="text-xl font-semibold">Dados locais encontrados</h1>
          <p className="text-sm text-muted-foreground">Há dados financeiros antigos neste navegador sem identificação da conta. Confira se são seus antes de importá-los para esta conta.</p>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-lg bg-primary px-4 py-2 text-primary-foreground" onClick={finance.importLegacyData}>Importar meus dados</button>
            <button className="rounded-lg border border-border px-4 py-2" onClick={finance.dismissLegacyImport}>Continuar sem importar</button>
          </div>
          <p className="text-xs text-muted-foreground">Os dados locais antigos não serão apagados.</p>
        </div>
      </main>
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

  if (finance.legacyModuleImportAvailable) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-border bg-card p-6 space-y-4">
          <h1 className="text-xl font-semibold">Outros dados locais encontrados</h1>
          <p className="text-sm text-muted-foreground">Há dados antigos de Trade, Desejos, Dream Board, rotina ou LifeGame neste navegador sem identificação de conta. Importe apenas se forem seus.</p>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-lg bg-primary px-4 py-2 text-primary-foreground" onClick={finance.importLegacyModules}>Importar para esta conta</button>
            <button className="rounded-lg border border-border px-4 py-2" onClick={finance.dismissLegacyModules}>Continuar sem importar</button>
          </div>
          <p className="text-xs text-muted-foreground">Os dados antigos permanecem neste dispositivo.</p>
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
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Carregando seus dados financeiros...</p>
          </>
        )}
      </main>
    );
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
      <AppNav />
      <MobileNav />
      <CommandCenter />
      <ExpenseFAB />
      <div className="min-h-screen md:pl-64">
        <div role="status" aria-live="polite" className="mx-auto max-w-[1600px] px-4 pt-3 text-xs text-muted-foreground sm:px-6 lg:px-8">
          {finance.syncStatus === "saving" && "Salvando dados..."}
          {finance.syncStatus === "saved" && "Dados sincronizados"}
          {(finance.syncStatus === "error" || finance.syncStatus === "conflict") && (
            <span className="text-destructive">
              {finance.syncError}{" "}
              <button className="underline" onClick={finance.syncStatus === "conflict" ? finance.retryCloudLoad : finance.retryCloudSave}>
                {finance.syncStatus === "conflict" ? "Recarregar dados da nuvem" : "Tentar salvar novamente"}
              </button>
            </span>
          )}
        </div>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando página...</div>}>
          <Routes>
            <Route path="/" element={<Index />} />
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
      </div>
      <Toaster />
      <Sonner />
      </div>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <FinanceProvider>
            <AppRoutes />
          </FinanceProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

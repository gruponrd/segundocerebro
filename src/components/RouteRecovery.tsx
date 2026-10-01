import { Component, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    // Keep account providers mounted. Reload only at the user's request, so a
    // failed page import cannot automatically discard an unfinished edit.
    return (
      <main className="page-container flex min-h-[70vh] items-center justify-center">
        <section role="alert" className="glass-card w-full max-w-md space-y-4 p-6 text-center">
          <h1 className="text-xl font-semibold">Não foi possível abrir esta tela</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Confira sua conexão e recarregue o aplicativo para tentar novamente.
            Você também pode abrir outra seção pelo menu.
          </p>
          <Button className="gap-2 rounded-xl" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" /> Recarregar aplicativo
          </Button>
        </section>
      </main>
    );
  }
}

export function RouteRecovery({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <RouteErrorBoundary key={pathname}>{children}</RouteErrorBoundary>;
}

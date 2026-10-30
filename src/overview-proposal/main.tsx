import { createRoot } from "react-dom/client";
import { AuthProvider } from "@/hooks/useAuth";
import { FinanceProvider } from "@/stores/financeStore";
import { AccountWorkspace } from "@/components/AccountWorkspace";
import { isDesignPreview } from "@/lib/previewMode";
import { ProposalApp } from "./ProposalApp";
import { MigratedModulesGate } from "@/components/MigratedModulesGate";
import "@/index.css";
import "@/styles/typography.css";
import "./overview.css";
import "./quiet.css";
import "./orange.css";
import "./sections.css";

// Separate entry point: the production app and its routes are never replaced.
createRoot(document.getElementById("clarity-root")!).render(isDesignPreview
  ? <AuthProvider><AccountWorkspace><MigratedModulesGate><FinanceProvider><ProposalApp /></FinanceProvider></MigratedModulesGate></AccountWorkspace></AuthProvider>
  : <main>Esta proposta está disponível somente na prévia local de design.</main>);

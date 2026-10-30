import { createRoot } from "react-dom/client";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";
import AuthPage from "@/pages/Auth";
import { isDesignPreview } from "@/lib/previewMode";
import "@/index.css";
import "./overview.css";
import "./quiet.css";
import "./orange.css";
import "./sections.css";
import "@/styles/clarity-polish.css";

createRoot(document.getElementById("root")!).render(isDesignPreview
  ? <AuthProvider><AuthPage/><Toaster/></AuthProvider>
  : <main>Prévia disponível somente no ambiente local.</main>);

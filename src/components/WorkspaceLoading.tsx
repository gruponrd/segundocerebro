import { Brain } from "lucide-react";

/** A visual status only; never hides or changes the account loading guards. */
export function WorkspaceLoading({ message = "Preparando seu espaço…", compact = false }: { message?: string; compact?: boolean }) {
  return <div className={`cl-loading-screen ${compact ? "cl-loading-compact" : ""}`} role="status" aria-live="polite">
    <span className="cl-loading-mark" aria-hidden="true"><Brain size={27} strokeWidth={1.4}/></span>
    <p>{message}</p><span className="cl-loading-track" aria-hidden="true"><span/></span>
  </div>;
}

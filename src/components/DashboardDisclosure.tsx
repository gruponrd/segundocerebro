import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/** Native disclosure keeps secondary dashboard content available to keyboard and touch. */
export function DashboardDisclosure({ title, description, children, status }: { title: string; description: string; children: ReactNode; status?: string }) {
  return <details className="dashboard-disclosure">
    <summary><span><span className="disclosure-title">{title}{status && <span className="ml-2 inline-flex rounded-md bg-expense/15 px-2 py-0.5 text-xs text-expense">{status}</span>}</span><span className="disclosure-description">{description}</span></span><ChevronDown aria-hidden className="h-4 w-4 shrink-0" /></summary>
    <div className="disclosure-content">{children}</div>
  </details>;
}

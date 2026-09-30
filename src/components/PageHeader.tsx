import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, icon: Icon, actions, className }: { title: string; description: string; icon: LucideIcon; actions?: ReactNode; className?: string }) {
  return (
    <header className={cn("page-heading flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-primary/10 bg-primary/5"><Icon aria-hidden className="h-5 w-5 text-primary" /></span>
        <div className="min-w-0"><h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p></div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, icon: Icon, actions, className }: { title: string; description: string; icon: LucideIcon; actions?: ReactNode; className?: string }) {
  return (
    <header className={cn("page-heading flex flex-col gap-4 pb-2 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-secondary/40"><Icon aria-hidden className="h-5 w-5 text-accent" /></span>
        <div className="min-w-0"><h1 className="font-display text-2xl font-medium tracking-tight text-foreground sm:text-[28px]">{title}</h1><p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p></div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

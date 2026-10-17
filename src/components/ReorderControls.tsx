import { ArrowDown, ArrowUp } from "lucide-react";

/** Native buttons complement drag and drop for keyboard and touch. */
export function ReorderControls({ label, index, total, onMove }: { label: string; index: number; total: number; onMove: (direction: -1 | 1) => void }) {
  return <div role="group" aria-label={`Ordem de ${label}`} className="flex items-center gap-1">
    <span className="text-xs text-muted-foreground mr-1">{index + 1}/{total}</span>
    <button type="button" className="icon-action" aria-label={`Mover ${label} para cima`} disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp aria-hidden className="h-3.5 w-3.5" /></button>
    <button type="button" className="icon-action" aria-label={`Mover ${label} para baixo`} disabled={index === total - 1} onClick={() => onMove(1)}><ArrowDown aria-hidden className="h-3.5 w-3.5" /></button>
  </div>;
}

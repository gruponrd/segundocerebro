import { money } from "@/lib/planningTools";

export function CashflowPaymentTotals({ label, total, open }: { label: string; total: number; open: number }) {
  return (
    <dl aria-label={label} className="ml-auto max-w-full shrink-0 space-y-0.5 text-right text-xs leading-tight tabular-nums">
      <div className="flex flex-wrap items-baseline justify-end gap-x-1.5">
        <dt className="text-muted-foreground">Total</dt>
        <dd className="font-medium text-foreground">{money(total)}</dd>
      </div>
      <div className="flex flex-wrap items-baseline justify-end gap-x-1.5">
        <dt className="text-muted-foreground">Falta pagar</dt>
        <dd className={open > 0 ? "font-semibold text-expense" : "font-medium text-foreground"}>{money(open)}</dd>
      </div>
    </dl>
  );
}

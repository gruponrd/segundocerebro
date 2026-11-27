import { useId } from "react";
import { CalendarClock } from "lucide-react";
import type { Bank, CashflowMonth } from "@/data/financialData";
import { nextPaymentPlan } from "@/lib/nextPaymentPlan";
import { money } from "@/lib/planningTools";

type Plan = NonNullable<ReturnType<typeof nextPaymentPlan>>;
const amounts = (cents: number) => money(cents / 100);
const shortDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
const fullDate = (date: string) => date.split("-").reverse().join("/");
const saoPauloDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });

function PaymentRow({ account, today, deposit }: { account: Plan["accounts"][number]; today: string; deposit: string }) {
  const timing = account.date < today ? "Em atraso" : account.date < deposit ? "Vence antes do recebimento" : null;
  return <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-2.5 border-t border-border/60 py-2.5 text-xs">
    <time dateTime={account.date} className="font-medium tabular-nums text-muted-foreground">{shortDate(account.date)}</time>
    <div className="min-w-0">
      <p className="font-semibold [overflow-wrap:anywhere]">{account.label}</p>
      <p className="mt-0.5 text-muted-foreground">{account.source}{timing && <span className="text-expense"> · {timing}</span>}</p>
    </div>
    <div className="text-right">
      <p className="font-semibold tabular-nums">{amounts(account.cents)}</p>
      <p className={`mt-0.5 ${account.covered ? "text-income" : "text-expense"}`}>{account.covered ? "Coberta após entrada" : "Fica em aberto"}</p>
    </div>
  </li>;
}

export function NextPaymentCard({ months, banks }: { months: CashflowMonth[]; banks: Bank[] }) {
  const title = useId();
  const today = saoPauloDate.format(new Date());
  const plan = nextPaymentPlan(months, banks, today);
  return <section aria-labelledby={title} className="mt-4 rounded-2xl border border-border bg-card p-4 text-foreground sm:p-5">
    <h2 id={title} className="flex items-center gap-2 text-base font-semibold">
      <CalendarClock className="size-4 shrink-0 text-primary-text" aria-hidden /> Próximo recebimento
    </h2>
    {plan ? <>
      <p className="mt-1 text-sm text-muted-foreground">
        <time dateTime={plan.date} className="font-semibold text-foreground">{fullDate(plan.date)}</time> · {plan.deposit.map(item => item.label).join(" · ")}
      </p>
      <dl className="my-3 grid grid-cols-2 gap-2 [overflow-wrap:anywhere] sm:grid-cols-3">
        <div className="col-span-2 rounded-lg bg-secondary/60 px-3 py-2 sm:col-span-1">
          <dt className="text-xs text-muted-foreground">Recebimento previsto</dt>
          <dd className="font-semibold tabular-nums text-income">{amounts(plan.income)}</dd>
        </div>
        <div className="rounded-lg bg-secondary/60 px-3 py-2">
          <dt className="text-xs text-muted-foreground">Contas até {shortDate(plan.until)}</dt>
          <dd className="font-semibold tabular-nums">{amounts(plan.committed)}</dd>
        </div>
        <div className="rounded-lg bg-secondary/60 px-3 py-2">
          <dt className="text-xs text-muted-foreground">{plan.difference < 0 ? "Falta para cobrir" : "Sobra estimada"}</dt>
          <dd className={`font-semibold tabular-nums ${plan.difference < 0 ? "text-expense" : "text-income"}`}>{amounts(Math.abs(plan.difference))}</dd>
        </div>
      </dl>
      <h3 className="mb-2 text-sm font-semibold">Contas em ordem de vencimento</h3>
      {plan.accounts.length > 0 ? <ul>{plan.accounts.map(account => <PaymentRow key={account.id} account={account} today={today} deposit={plan.date} />)}</ul>
        : <p className="text-sm text-muted-foreground">Nenhuma conta pendente com vencimento até {shortDate(plan.until)}.</p>}
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {plan.nextDate ? `Lista até a véspera da entrada prevista de ${fullDate(plan.nextDate)}.` : `Lista até o fim do mês do recebimento, ${fullDate(plan.until)}.`}
        {" A previsão usa somente esse recebimento e as contas com data cadastrada."}
      </p>
    </> : <p className="mt-2 text-sm text-muted-foreground">Nenhuma entrada pendente com data a partir de hoje. Informe a data de um recebimento previsto para montar o plano.</p>}
  </section>;
}

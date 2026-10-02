import { Link } from "react-router-dom";
import { ArrowRight, CreditCard, Target, Wallet } from "lucide-react";
import { useFinanceStore } from "@/stores/financeStore";

export function GettingStarted() {
  const store = useFinanceStore();
  const hasData = store.banks.length || store.creditors.length || store.goals.length
    || store.incomeSources.length || store.salary || store.transportEntries.length || store.transportBalance
    || store.cashflowMonths.some(month => month.incomes.length || month.expenses.length);
  if (hasData) return null;
  return <section aria-labelledby="getting-started-title" className="mb-6 rounded-2xl border border-primary/20 bg-card/70 p-6 backdrop-blur-xl">
    <p className="label-mono mb-2 text-primary">Seu primeiro passo</p>
    <h2 id="getting-started-title" className="text-xl font-semibold">Seu espaço começa aqui.</h2>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Ainda não há lançamentos nesta conta. Comece pela sua renda, cadastre seus cartões ou defina um objetivo. Os valores do painel serão calculados a partir do que você registrar.</p>
    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      {[{ to: "/renda", label: "Cadastrar minha renda", icon: Wallet },
        { to: "/carteira", label: "Adicionar meu cartão", icon: CreditCard },
        { to: "/objetivos", label: "Criar meu objetivo", icon: Target }].map(({ to, label, icon: Icon }) =>
        <Link key={to} to={to} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 p-4 text-sm transition-colors hover:bg-secondary/70">
          <Icon aria-hidden="true" className="h-4 w-4 text-primary" /><span className="flex-1">{label}</span><ArrowRight aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
        </Link>)}
    </div>
  </section>;
}

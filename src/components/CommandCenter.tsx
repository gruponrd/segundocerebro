import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, ArrowRight, Calculator, CreditCard, DollarSign, Gamepad2, LayoutDashboard, Link2, ReceiptText, Search, Sparkles, Target, TrendingDown, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useFinanceStore } from "@/stores/financeStore";
import { COMMAND_MENU_EVENT } from "@/lib/commandMenu";
import { money } from "@/lib/planningTools";

const PAGES = [
  { title: "Dashboard", detail: "Visão geral", route: "/", icon: LayoutDashboard },
  { title: "Fluxo de caixa", detail: "Lançar receita ou despesa · pagamentos", route: "/fluxo", icon: ArrowLeftRight },
  { title: "Renda", detail: "Fontes de renda e análise", route: "/renda", icon: DollarSign },
  { title: "Ferramentas", detail: "Simulador · compra · orçamento · pendências", route: "/ferramentas", icon: Calculator },
  { title: "Objetivos", detail: "Metas e sonhos", route: "/objetivos", icon: Target },
  { title: "Dívidas", detail: "Credores e quitação", route: "/divida", icon: TrendingDown },
  { title: "Carteira", detail: "Cartões e parcelas", route: "/carteira", icon: Wallet },
  { title: "Trade", detail: "Operações", route: "/trade", icon: TrendingUp },
  { title: "LifeGame", detail: "Sua jornada", route: "/lifegame", icon: Gamepad2 },
  { title: "Desejos", detail: "Compras planejadas", route: "/desejos", icon: Sparkles },
  { title: "Integrações", detail: "Telegram · bot · conectar conta", route: "/integracoes", icon: Link2 },
];

const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const matches = (text: string, query: string) => normalize(query).split(/\s+/).every(term => normalize(text).includes(term));
interface SearchResult { id: string; title: string; detail: string; route: string; icon: LucideIcon; monthIndex?: number }

export function CommandCenter() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const store = useFinanceStore();

  useEffect(() => {
    const show = () => { setQuery(""); setOpen(true); };
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" && !event.defaultPrevented) {
        event.preventDefault();
        setQuery("");
        setOpen(current => !current);
      }
    };
    window.addEventListener(COMMAND_MENU_EVENT, show);
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener(COMMAND_MENU_EVENT, show); window.removeEventListener("keydown", onKeyDown); };
  }, []);

  const results = useMemo(() => {
    if (query.trim().length < 2) return [];
    const items: SearchResult[] = [
      ...store.banks.filter(bank => bank.status !== "cancelado").map(bank => ({ id: `bank-${bank.id}`, title: bank.name, detail: "Cartão · abrir Carteira", route: "/carteira", icon: CreditCard })),
      ...store.goals.map(goal => ({ id: `goal-${goal.id}`, title: goal.title, detail: `Objetivo · ${money(goal.savedAmount)} de ${money(goal.targetAmount)}`, route: "/objetivos", icon: Target })),
      ...store.creditors.map(creditor => ({ id: `creditor-${creditor.id}`, title: creditor.name, detail: `Credor · ${money(Math.max(0, creditor.totalDebt - creditor.amountPaid))} em aberto`, route: "/divida", icon: TrendingDown })),
      ...store.cashflowMonths.flatMap((month, monthIndex) => [
        ...month.incomes.map((item, i) => ({ id: `income-${monthIndex}-${i}`, title: item.label, detail: `Receita · ${month.month} ${month.year} · ${money(item.amount)}`, route: "/fluxo", icon: DollarSign, monthIndex })),
        ...month.expenses.map((item, i) => ({ id: `expense-${monthIndex}-${i}`, title: item.label, detail: `Despesa · ${month.month} ${month.year} · ${money(item.amount)}`, route: "/fluxo", icon: ReceiptText, monthIndex })),
      ]),
    ];
    return items.filter(item => matches(`${item.title} ${item.detail}`, query)).slice(0, 20);
  }, [query, store.banks, store.goals, store.creditors, store.cashflowMonths]);
  const pages = PAGES.filter(page => matches(`${page.title} ${page.detail}`, query.trim()));

  const select = (route: string, monthIndex?: number) => {
    setOpen(false);
    if (monthIndex !== undefined) store.setSelectedMonth(monthIndex);
    navigate(route);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="z-[120] w-[calc(100%-2rem)] overflow-hidden rounded-2xl border-border/70 p-0 sm:max-w-xl">
        <div className="px-5 pt-5"><DialogTitle className="flex items-center gap-2 text-sm"><Search className="h-4 w-4 text-primary" /> Encontrar no Segundo Cérebro</DialogTitle><DialogDescription className="mt-2 text-xs">Páginas, cartões, objetivos e lançamentos. Digite para buscar.</DialogDescription></div>
        <Command shouldFilter={false} className="bg-transparent">
          <CommandInput aria-label="Buscar páginas e registros" placeholder="Ex.: simulador, salário, cartão…" value={query} onValueChange={setQuery} className="h-12" />
          <CommandList className="max-h-[55svh] p-2">
            <CommandEmpty>Nenhum resultado. Tente outro nome ou mês.</CommandEmpty>
            {pages.length > 0 && <CommandGroup heading="Ir para">{pages.map(page => <CommandItem key={page.route} value={`page-${page.route}`} onSelect={() => select(page.route)} className="cursor-pointer gap-3 rounded-xl px-3 py-3 data-[selected=true]:bg-secondary data-[selected=true]:text-foreground"><page.icon className="h-4 w-4 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="text-sm">{page.title}</p><p className="truncate text-xs text-muted-foreground">{page.detail}</p></div><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /></CommandItem>)}</CommandGroup>}
            {results.length > 0 && <CommandGroup heading="Seus registros · até 20 resultados">{results.map(item => <CommandItem key={item.id} value={item.id} onSelect={() => select(item.route, item.monthIndex)} className="cursor-pointer gap-3 rounded-xl px-3 py-3 data-[selected=true]:bg-secondary data-[selected=true]:text-foreground"><item.icon className="h-4 w-4 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="truncate text-sm">{item.title}</p><p className="truncate text-xs text-muted-foreground">{item.detail}</p></div><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /></CommandItem>)}</CommandGroup>}
          </CommandList>
        </Command>
        <div className="border-t border-border/60 px-5 py-3 text-[11px] text-muted-foreground">↑ ↓ escolher · Enter abrir · Esc fechar</div>
      </DialogContent>
    </Dialog>
  );
}

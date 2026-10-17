import { money, pendingPayments } from "@/lib/planningTools";
import { useFinanceStore } from "@/stores/financeStore";
import { DashboardHeader } from "@/components/DashboardHeader";
import { GettingStarted } from "@/components/GettingStarted";
import { QuickTools } from "@/components/QuickTools";
import { ReorderControls } from "@/components/ReorderControls";
import { DashboardDisclosure } from "@/components/DashboardDisclosure";
import { DashboardOverview } from "@/components/DashboardOverview";
import { BankCard } from "@/components/BankCard";
import { AddBankCard } from "@/components/AddBankCard";
import { InstallmentTimeline } from "@/components/InstallmentTimeline";
import { CreditorWidget } from "@/components/CreditorWidget";
import { SpendingChart } from "@/components/SpendingChart";
import { BankDetailSheet } from "@/components/BankDetailSheet";
import { HeroChart } from "@/components/HeroChart";
import { MonthlyCashflowChart } from "@/components/MonthlyCashflowChart";
import { CalendarCard } from "@/components/CalendarCard";
import { FinancialHealthScore } from "@/components/FinancialHealthScore";
import { IncomeCoverage } from "@/components/IncomeCoverage";
import { AnnualSubscriptionsCard } from "@/components/AnnualSubscriptionsCard";
import { BalanceProjectionChart } from "@/components/BalanceProjectionChart";
import { CashflowSankey } from "@/components/CashflowSankey";
import { EyeOff, Eye, ArrowRight, GripVertical, LayoutGrid, RotateCcw, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

/** Compact section head shared by each dashboard module. */
function SectionHead({
  index,
  title,
  subtitle,
  action,
}: {
  index: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-baseline gap-3 min-w-0">

          <span className="sr-only">Seção {index}</span>
          <div className="min-w-0">
            <h2 className="font-display text-base sm:text-lg font-semibold tracking-tight text-foreground truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1 font-normal">{subtitle}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      <div className="hairline mt-4 opacity-70" />
    </div>
  );
}

const SECTION_IDS = [
  "panorama",
  "cobertura",
  "fluxo",
  "cartoes",
  "vencimentos",
  "assinaturas",
  "analise",
  "credores",
] as const;
type SectionId = (typeof SECTION_IDS)[number];

const ORDER_KEY = "dash-section-order-v1";

const Index = () => {
  const store = useFinanceStore();
  const payments = pendingPayments(store.currentCashflow, store.banks);
  const pendingTotal = payments.reduce((sum, item) => sum + Math.round(item.amount * 100), 0) / 100;
  const overdueCount = payments.filter(item => item.overdue).length;
  const nextDue = payments.filter(item => !item.overdue && item.dueDate).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))[0]?.dueDate;
  const pendingDescription = payments.length
    ? `${payments.length} ${payments.length === 1 ? "pendência" : "pendências"} · ${money(pendingTotal)}${nextDue ? ` · Próximo vencimento ${new Date(`${nextDue}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}` : " · Sem próximo vencimento informado"}`
    : "Nenhuma pendência registrada neste período · Veja seus objetivos";
  const [reorderMessage, setReorderMessage] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);
  const [dragBankId, setDragBankId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const [editLayout, setEditLayout] = useState(false);
  const [order, setOrder] = useState<SectionId[]>(() => {
    try {
      const raw = localStorage.getItem(ORDER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SectionId[];
        const valid = parsed.filter((id) => (SECTION_IDS as readonly string[]).includes(id));
        const missing = SECTION_IDS.filter((id) => !valid.includes(id));
        return [...valid, ...missing];
      }
    } catch {
      /* ignore */
    }
    return [...SECTION_IDS];
  });
  const [dragSection, setDragSection] = useState<SectionId | null>(null);
  const [overSection, setOverSection] = useState<SectionId | null>(null);

  useEffect(() => {
    localStorage.setItem(ORDER_KEY, JSON.stringify(order));
  }, [order]);

  const moveSection = (from: SectionId, to: SectionId) => {
    setOrder((cur) => {
      const next = [...cur];
      const fromIdx = next.indexOf(from);
      const toIdx = next.indexOf(to);
      if (fromIdx < 0 || toIdx < 0) return cur;
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, from);
      return next;
    });
  };

  const activeBanks = store.banks.filter((b) => b.status !== "cancelado");
  const cancelledBanks = store.banks.filter((b) => b.status === "cancelado");

  const sections: Record<SectionId, { title: string; node: React.ReactNode }> = useMemo(
    () => ({
      panorama: {
        title: "Panorama",
        node: (
          <>
            <SectionHead index="01" title="Detalhamento mensal" subtitle="Recebimentos e pagamentos do período selecionado" />
            <div className="mt-6"><MonthlyCashflowChart key={`${store.currentCashflow.month}-${store.currentCashflow.year}`} /></div>
          </>
        ),
      },
      cobertura: {
        title: "Cobertura & Saúde",
        node: (
          <>
            <SectionHead index="02" title="Cobertura & Saúde" subtitle="A renda cobre os próximos meses?" />
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 auto-rows-min">
              <div className="lg:col-span-4">
                <IncomeCoverage />
              </div>
              <div className="lg:col-span-2">
                <FinancialHealthScore />
              </div>
              <div className="lg:col-span-6">
                <SpendingChart banks={store.banks} />
              </div>
            </div>
          </>
        ),
      },
      fluxo: {
        title: "Fluxo do Mês",
        node: (
          <>
            <SectionHead
              index="03"
              title="Fluxo do Mês"
              subtitle="Entradas e saídas detalhadas em seção própria"
              action={
                <Link
                  to="/fluxo"
                  className="flex items-center gap-1.5 text-[11px] label-mono hover:text-foreground transition-colors border border-border rounded-md px-2.5 py-1.5"
                >
                  Abrir fluxo <ArrowRight className="w-3 h-3" />
                </Link>
              }
            />
            <Link
              to="/fluxo"
              className="block rounded-2xl border border-border bg-card p-5 hover:border-foreground/30 transition-colors"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="label-mono">Receitas</p>
                  <p className="text-money text-lg text-income">{money(store.totalIncome)}</p>
                </div>
                <div>
                  <p className="label-mono">Saídas totais</p>
                  <p className="text-money text-lg text-expense">{money(store.totalExpense)}</p>
                </div>
                <div>
                  <p className="label-mono">Em cartões</p>
                  <p className="text-money text-lg text-expense">{money(store.cardExpensesForMonth)}</p><p className="text-xs text-muted-foreground mt-1">Incluídos nas saídas totais</p>
                </div>
                <div>
                  <p className="label-mono">Saldo final</p>
                  <p className={`text-money text-lg ${store.expectedBalance < 0 ? "text-expense" : "text-income"}`}>
                    {money(store.expectedBalance)}
                  </p>
                </div>
              </div>
            </Link>
          </>
        ),
      },
      cartoes: {
        title: "Cartões de Crédito",
        node: (
          <>
            <SectionHead
              index="04"
              title="Cartões de Crédito"
              subtitle="Saldo usado calculado pelas parcelas · reordene pelas setas ou arraste"
              action={
                cancelledBanks.length > 0 ? (
                  <button
                    onClick={() => setShowCancelled((s) => !s)}
                    className="flex items-center gap-1.5 text-[11px] label-mono hover:text-foreground transition-colors border border-border rounded-md px-2.5 py-1.5"
                  >
                    {showCancelled ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showCancelled ? "Ocultar cancelados" : `Cancelados (${cancelledBanks.length})`}
                  </button>
                ) : undefined
              }
            />
            <div className="dashboard-card-grid grid gap-4 stagger-children">
              {activeBanks.map((bank, i) => (
                <div
                  key={bank.id}
                  draggable
                  onDragStart={(e) => { e.stopPropagation(); setDragBankId(bank.id); }}
                  onDragEnd={() => { setDragBankId(null); setDragOverId(null); }}
                  onDragOver={(e) => { e.preventDefault(); if (dragBankId && dragBankId !== bank.id) setDragOverId(bank.id); }}
                  onDragLeave={() => setDragOverId((cur) => (cur === bank.id ? null : cur))}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragBankId && dragBankId !== bank.id) { store.moveBank(dragBankId, bank.id); setReorderMessage("Ordem dos cartões atualizada."); }
                    e.stopPropagation();
                    setDragBankId(null); setDragOverId(null);
                  }}
                  className={`transition-all duration-200 ${
                    dragBankId === bank.id ? "opacity-40 scale-[0.97]" : ""
                  } ${dragOverId === bank.id ? "ring-2 ring-primary/60 ring-offset-2 ring-offset-background rounded-3xl" : ""}`}
                >
                  <div className="flex justify-end mb-2"><ReorderControls label={`cartão ${bank.name}`} index={i} total={activeBanks.length} onMove={(direction) => { store.moveBank(bank.id, activeBanks[i + direction].id); setReorderMessage(`${bank.name} movido para a posição ${i + direction + 1} de ${activeBanks.length}.`); }} /></div>
                  <BankCard
                    bank={bank}
                    index={i}
                    onClick={() => store.setSelectedBank(bank)}
                    onUpdateBank={store.updateBank}
                  />
                </div>
              ))}
              {showCancelled &&
                cancelledBanks.map((bank, i) => (
                  <BankCard
                    key={bank.id}
                    bank={bank}
                    index={activeBanks.length + i}
                    onClick={() => store.setSelectedBank(bank)}
                    onUpdateBank={store.updateBank}
                  />
                ))}
              <AddBankCard onAdd={store.addBank} />
            </div>
          </>
        ),
      },
      vencimentos: {
        title: "Vencimentos",
        node: (
          <>
            <SectionHead index="05" title="Vencimentos" subtitle="Parcelas e calendário" />
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
              <InstallmentTimeline
                installments={store.allInstallments}
                onUpdate={store.updateInstallment}
                onRemove={store.removeInstallment}
                onAdd={store.addInstallment}
                banks={store.banks.map((b) => ({ id: b.id, name: b.name }))}
              />
              <CalendarCard installments={store.allInstallments} />
            </div>
          </>
        ),
      },
      assinaturas: {
        title: "Assinaturas & Serviços",
        node: (
          <>
            <SectionHead index="06" title="Assinaturas & Serviços" subtitle="Custo anual recorrente" />
            <AnnualSubscriptionsCard />
          </>
        ),
      },
      analise: {
        title: "Análise & Visualização",
        node: (
          <>
            <SectionHead index="07" title="Análise & Visualização" subtitle="Projeções e fluxo de caixa" />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <BalanceProjectionChart />
              <CashflowSankey />
            </div>
          </>
        ),
      },
      credores: {
        title: "Credores",
        node: (
          <>
            <SectionHead index="08" title="Credores" subtitle="Dívidas pessoais" />
            <CreditorWidget
              creditors={store.creditors}
              totalDebt={store.totalCreditorsDebt}
              totalPaid={store.totalCreditorsPaid}
              onAdd={store.addCreditor}
              onRemove={store.removeCreditor}
              onUpdate={store.updateCreditor}
            />
          </>
        ),
      },
    }),
    [store, showCancelled, dragBankId, dragOverId, activeBanks, cancelledBanks]
  );

  return (
    <div className="relative min-h-screen bg-background">
      {/* A quiet ambient wash keeps the new shell light without competing with data. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-50"
        style={{
          background: "radial-gradient(circle at 75% 0%, hsl(var(--primary) / 0.08), transparent 34%), radial-gradient(circle at 15% 20%, hsl(var(--income) / 0.05), transparent 28%)",
        }}
      />

      <div className="page-container dashboard-page">
        <DashboardHeader
          totalDebt={store.totalDebt}
          expectedBalance={store.expectedBalance}
          monthLabel={`${store.currentCashflow.month} ${store.currentCashflow.year}`}
          selectedMonth={store.selectedMonth}
          totalMonths={store.cashflowMonths.length}
          onMonthChange={store.setSelectedMonth}
          cashflowMonths={store.cashflowMonths}
        />

        <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{reorderMessage}</p>
        <DashboardOverview section="balance" />
        <section aria-labelledby="first-panorama-title" className="dashboard-first-panorama">
          <h2 id="first-panorama-title" className="mb-3 text-base font-medium">Panorama financeiro</h2>
          <HeroChart
            showSavingsGoal={false}
            cashflowMonths={store.cashflowMonths}
            totalDebt={store.totalDebt}
            totalExpense={store.totalExpense}
            expectedBalance={store.expectedBalance}
            savingsGoalMonth={store.savingsGoalMonth}
            onSavingsGoalChange={store.setSavingsGoalMonth}
            selectedMonth={store.selectedMonth}
            banks={store.banks}
            creditors={store.creditors}
            cardExpensesForMonth={store.cardExpensesForMonth}
          />
        </section>
        <DashboardDisclosure title="Vencimentos e objetivos" description={pendingDescription} status={overdueCount ? `${overdueCount} em atraso` : undefined}>
          <DashboardOverview section="priorities" />
        </DashboardDisclosure>
        <GettingStarted />
        <QuickTools />

        <DashboardDisclosure title="Relatórios e detalhes" description="Cobertura, fluxo, cartões, parcelas e análises completas">
        {/* Layout controls */}
        <div className="flex flex-wrap items-center justify-end gap-2 mb-6">
          {editLayout && (
            <button
              onClick={() => setOrder([...SECTION_IDS])}
              className="flex items-center gap-1.5 text-[11px] label-mono hover:text-foreground transition-colors border border-border rounded-md px-2.5 py-1.5"
            >
              <RotateCcw className="w-3 h-3" /> Restaurar ordem
            </button>
          )}
          <button
            onClick={() => setEditLayout((s) => !s)}
            className={`flex items-center gap-1.5 text-[11px] label-mono transition-colors border rounded-md px-2.5 py-1.5 ${
              editLayout
                ? "border-foreground text-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {editLayout ? <Lock className="w-3 h-3" /> : <LayoutGrid className="w-3 h-3" />}
            {editLayout ? "Concluir layout" : "Editar layout"}
          </button>
        </div>

        {editLayout && (
          <p className="text-xs text-muted-foreground mb-4">
            Use as setas ou arraste as seções para reorganizar. A ordem é salva neste navegador.
          </p>
        )}

        <div className="space-y-8">
          {order.map((id, sectionIndex) => {
            const section = sections[id];
            if (!section) return null;
            return (
              <section
                key={id}
                draggable={editLayout}
                onDragStart={() => editLayout && setDragSection(id)}
                onDragEnd={() => { setDragSection(null); setOverSection(null); }}
                onDragOver={(e) => {
                  if (!editLayout || !dragSection) return;
                  e.preventDefault();
                  if (dragSection !== id) setOverSection(id);
                }}
                onDragLeave={() => setOverSection((cur) => (cur === id ? null : cur))}
                onDrop={(e) => {
                  if (!editLayout) return;
                  e.preventDefault();
                  if (dragSection && dragSection !== id) { moveSection(dragSection, id); setReorderMessage("Ordem das seções atualizada."); }
                  setDragSection(null); setOverSection(null);
                }}
                className={`relative transition-all duration-200 ${
                  editLayout ? "rounded-2xl border border-dashed border-border/70 p-4 pt-16" : ""
                } ${dragSection === id ? "opacity-40 scale-[0.99]" : ""} ${
                  overSection === id ? "border-foreground/60 ring-1 ring-foreground/30" : ""
                }`}
              >
                {editLayout && (
                  <div className="absolute top-2 left-3 right-3 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 min-w-0 text-xs text-muted-foreground"><GripVertical aria-hidden className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{section.title}</span></span>
                    <ReorderControls label={`seção ${section.title}`} index={sectionIndex} total={order.length} onMove={(direction) => { moveSection(id, order[sectionIndex + direction]); setReorderMessage(`${section.title} movida para a posição ${sectionIndex + direction + 1} de ${order.length}.`); }} />
                  </div>
                )}
                {section.node}
              </section>
            );
          })}
        </div>
        </DashboardDisclosure>
      </div>

      <BankDetailSheet
        bank={store.selectedBank}
        open={!!store.selectedBank}
        onOpenChange={(open) => {
          if (!open) store.setSelectedBank(null);
        }}
        onUpdateInstallment={store.updateInstallment}
        onRemoveInstallment={store.removeInstallment}
        onAddInstallment={store.addInstallment}
        onUpdateBank={store.updateBank}
        onRemoveBank={store.removeBank}
      />

    </div>
  );
};

export default Index;

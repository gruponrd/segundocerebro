import * as XLSX from "xlsx";
import { Download } from "lucide-react";
import { useFinanceStore } from "@/stores/financeStore";
import { toast } from "@/hooks/use-toast";
import { EXPENSE_CATEGORIES } from "@/data/categories";
import { cardSpendingForMonth, remainingInstallments } from "@/lib/financeCalculations";

const BRL = 'R$ #,##0.00;[Red]-R$ #,##0.00;"-"';
const INT = "#,##0";
const PCT = "0.0%";

type Cell = { v: string | number | boolean; t?: "n" | "s" | "b" | "d"; z?: string };
type CellValue = Cell | string | number | boolean | null | undefined;

function aoa(rows: CellValue[][]): Cell[][] {
  return rows.map((r) =>
    r.map((c) =>
      c === null || c === undefined
        ? { v: "", t: "s" }
        : typeof c === "object" && "v" in c
        ? c
        : typeof c === "number"
        ? { v: c, t: "n" }
        : typeof c === "boolean"
        ? { v: c, t: "b" }
        : { v: String(c), t: "s" },
    ),
  );
}

function makeSheet(rows: CellValue[][], widths?: number[]) {
  const data = aoa(rows);
  const ws = XLSX.utils.aoa_to_sheet(data.map((r) => r.map((c) => c.v)));
  // Apply types/formats
  data.forEach((row, r) => {
    row.forEach((cell, c) => {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (ws[ref]) {
        if (cell.t) ws[ref].t = cell.t;
        if (cell.z) ws[ref].z = cell.z;
      }
    });
  });
  if (widths) ws["!cols"] = widths.map((w) => ({ wch: w }));
  return ws;
}

const MONTH_MAP: Record<string, number> = {
  Janeiro: 1, Fevereiro: 2, "Março": 3, Marco: 3, Abril: 4, Maio: 5, Junho: 6,
  Julho: 7, Agosto: 8, Setembro: 9, Outubro: 10, Novembro: 11, Dezembro: 12,
};

export function ExportXlsxButton({ compact = false }: { compact?: boolean }) {
  const store = useFinanceStore();

  const handleExport = () => {
    try {
      const wb = XLSX.utils.book_new();
      const now = new Date();
      const stamp = now.toLocaleString("pt-BR");

      /* ═══ 1. CAPA ═══ */
      const capa: CellValue[][] = [
        [{ v: "RELATÓRIO FINANCEIRO COMPLETO", t: "s" }],
        [{ v: `Gerado em: ${stamp}`, t: "s" }],
        [],
        [{ v: "Índice de Planilhas", t: "s" }],
        ["1", "Resumo Executivo"],
        ["2", "KPIs Mensais"],
        ["3", "Bancos & Cartões"],
        ["4", "Parcelas (Detalhado)"],
        ["5", "Fluxo de Caixa (Detalhado)"],
        ["6", "Fluxo Consolidado"],
        ["7", "Por Categoria"],
        ["8", "Credores"],
        ["9", "Metas"],
        ["10", "Fontes de Renda"],
        ["11", "Projeção 12 Meses"],
        ["12", "Quitação (48h/sem)"],
        ["13", "Parâmetros"],
      ];
      XLSX.utils.book_append_sheet(wb, makeSheet(capa, [8, 40]), "Capa");

      /* ═══ 2. RESUMO EXECUTIVO ═══ */
      const totalLimit = store.banks.reduce((s, b) => s + (b.status === "cancelado" ? 0 : b.limitTotal), 0);
      const totalUsed = store.banks.reduce((s, b) => s + b.limitUsed, 0);
      const utilization = totalLimit > 0 ? totalUsed / totalLimit : 0;
      const goalsTotal = store.goals.reduce((s, g) => s + g.targetAmount, 0);
      const goalsSaved = store.goals.reduce((s, g) => s + g.savedAmount, 0);
      const totalInstallments = store.banks.reduce((s, b) => s + b.installments.length, 0);
      const paidInstallments = store.banks.reduce(
        (s, b) => s + b.installments.filter((i) => i.status === "pago").length, 0,
      );
      const overdueInstallments = store.banks.reduce(
        (s, b) => s + b.installments.filter((i) => i.status === "atrasado").length, 0,
      );

      const resumo: CellValue[][] = [
        [{ v: "RESUMO EXECUTIVO", t: "s" }],
        [],
        [{ v: "Indicador", t: "s" }, { v: "Valor", t: "s" }, { v: "Observação", t: "s" }],
        ["Dívida Total", { v: store.totalDebt, t: "n", z: BRL }, "Cartões + Credores"],
        ["Renda (mês atual)", { v: store.totalIncome, t: "n", z: BRL }, store.currentCashflow.month],
        ["Despesas (mês atual)", { v: store.totalExpense, t: "n", z: BRL }, "Manuais + cartões"],
        ["Despesas de Cartão (mês)", { v: store.cardExpensesForMonth, t: "n", z: BRL }, ""],
        ["Saldo Esperado do Mês", { v: store.expectedBalance, t: "n", z: BRL }, "Receita - Despesa"],
        ["Meta de Economia Mensal", { v: store.savingsGoalMonth, t: "n", z: BRL }, ""],
        ["Margem de Segurança", { v: store.safetyMargin, t: "n", z: BRL }, ""],
        ["Saldo Fantasma", { v: store.phantomBalance, t: "n", z: BRL }, "Saldo - margem"],
        ["Dias de Sobrevivência", { v: store.survivalDays, t: "n", z: INT }, "com o saldo atual"],
        [],
        [{ v: "Cartões", t: "s" }, "", ""],
        ["Limite Total", { v: totalLimit, t: "n", z: BRL }, `${store.banks.filter(b => b.status !== "cancelado").length} cartões ativos`],
        ["Limite Utilizado", { v: totalUsed, t: "n", z: BRL }, ""],
        ["Utilização", { v: utilization, t: "n", z: PCT }, utilization > 0.7 ? "⚠️ Acima de 70%" : "OK"],
        ["Parcelas totais", { v: totalInstallments, t: "n", z: INT }, ""],
        ["Parcelas pagas", { v: paidInstallments, t: "n", z: INT }, ""],
        ["Parcelas atrasadas", { v: overdueInstallments, t: "n", z: INT }, overdueInstallments > 0 ? "⚠️" : "OK"],
        [],
        [{ v: "Credores", t: "s" }, "", ""],
        ["Total devido", { v: store.totalCreditorsDebt, t: "n", z: BRL }, `${store.creditors.length} credores`],
        ["Total pago", { v: store.totalCreditorsPaid, t: "n", z: BRL }, ""],
        ["Restante credores", { v: store.totalCreditorsDebt - store.totalCreditorsPaid, t: "n", z: BRL }, ""],
        [],
        [{ v: "Metas", t: "s" }, "", ""],
        ["Total alvo", { v: goalsTotal, t: "n", z: BRL }, `${store.goals.length} metas`],
        ["Total guardado", { v: goalsSaved, t: "n", z: BRL }, ""],
        ["Progresso", { v: goalsTotal > 0 ? goalsSaved / goalsTotal : 0, t: "n", z: PCT }, ""],
      ];
      XLSX.utils.book_append_sheet(wb, makeSheet(resumo, [30, 18, 30]), "Resumo Executivo");

      /* ═══ 3. KPIs MENSAIS ═══ */
      const kpiRows: CellValue[][] = [[
        "Mês", "Ano", "Receitas", "Receitas Pagas", "Despesas Manuais",
        "Despesas Pagas", "Parcelas Cartão", "Total Despesas", "Saldo",
        "% Comprometido", "Itens Fixos",
      ]];
      store.cashflowMonths.forEach((m) => {
        const inc = m.incomes.reduce((s, i) => s + i.amount, 0);
        const incPaid = m.incomes.filter(i => i.paid).reduce((s, i) => s + i.amount, 0);
        const exp = m.expenses.reduce((s, e) => s + e.amount, 0);
        const expPaid = m.expenses.filter(e => e.paid).reduce((s, e) => s + e.amount, 0);
        const monthNum = MONTH_MAP[m.month];
        const cardTotal = cardSpendingForMonth(store.banks, monthNum, m.year);
        const totalExp = exp + cardTotal;
        const fixedCount = m.incomes.filter(i => i.fixed).length + m.expenses.filter(e => e.fixed).length;
        kpiRows.push([
          m.month, m.year,
          { v: inc, t: "n", z: BRL },
          { v: incPaid, t: "n", z: BRL },
          { v: exp, t: "n", z: BRL },
          { v: expPaid, t: "n", z: BRL },
          { v: cardTotal, t: "n", z: BRL },
          { v: totalExp, t: "n", z: BRL },
          { v: inc - totalExp, t: "n", z: BRL },
          { v: inc > 0 ? totalExp / inc : 0, t: "n", z: PCT },
          { v: fixedCount, t: "n", z: INT },
        ]);
      });
      XLSX.utils.book_append_sheet(wb, makeSheet(kpiRows, [12, 6, 14, 14, 14, 14, 14, 14, 14, 14, 10]), "KPIs Mensais");

      /* ═══ 4. BANCOS ═══ */
      const bancoRows: CellValue[][] = [[
        "Banco", "Status", "Limite Total", "Limite Usado", "Disponível",
        "% Usado", "Dívida Final", "Nº Parcelas", "Parcelas Pagas", "Parcelas Atrasadas",
      ]];
      store.banks.forEach((b) => {
        const paid = b.installments.filter(i => i.status === "pago").length;
        const overdue = b.installments.filter(i => i.status === "atrasado").length;
        bancoRows.push([
          b.name, b.status,
          { v: b.limitTotal, t: "n", z: BRL },
          { v: b.limitUsed, t: "n", z: BRL },
          { v: Math.max(b.limitTotal - b.limitUsed, 0), t: "n", z: BRL },
          { v: b.limitTotal > 0 ? b.limitUsed / b.limitTotal : 0, t: "n", z: PCT },
          { v: b.debtFinal, t: "n", z: BRL },
          { v: b.installments.length, t: "n", z: INT },
          { v: paid, t: "n", z: INT },
          { v: overdue, t: "n", z: INT },
        ]);
      });
      XLSX.utils.book_append_sheet(wb, makeSheet(bancoRows, [22, 12, 14, 14, 14, 10, 14, 10, 10, 12]), "Bancos & Cartões");

      /* ═══ 5. PARCELAS ═══ */
      const parcRows: CellValue[][] = [[
        "Banco", "Descrição", "Categoria", "Valor Parcela", "Valor Total",
        "Parcela", "Total Parcelas", "Restante no plano (informativo)", "Fatura em aberto (R$)",
        "Vencimento", "Dias até vencer", "Status",
      ]];
      store.banks.forEach((b) => {
        b.installments.forEach((i) => {
          const due = new Date(i.dueDate + "T00:00:00");
          const days = Math.ceil((due.getTime() - Date.now()) / 86400000);
          const remainingCount = remainingInstallments(i);
          parcRows.push([
            b.name, i.description, i.category ?? "",
            { v: i.installmentAmount, t: "n", z: BRL },
            { v: i.totalAmount, t: "n", z: BRL },
            { v: i.currentInstallment, t: "n", z: INT },
            { v: i.totalInstallments, t: "n", z: INT },
            { v: remainingCount, t: "n", z: INT },
            { v: i.status === "pago" ? 0 : i.installmentAmount, t: "n", z: BRL },
            i.dueDate,
            { v: days, t: "n", z: INT },
            i.status,
          ]);
        });
      });
      XLSX.utils.book_append_sheet(wb, makeSheet(parcRows, [20, 30, 14, 14, 14, 8, 8, 10, 14, 12, 10, 12]), "Parcelas");

      /* ═══ 6. FLUXO DE CAIXA DETALHADO ═══ */
      const fluxoRows: CellValue[][] = [[
        "Mês", "Ano", "Tipo", "Descrição", "Categoria", "Valor", "Pago", "Fixo",
      ]];
      store.cashflowMonths.forEach((m) => {
        m.incomes.forEach((i) => fluxoRows.push([
          m.month, m.year, "Receita", i.label, i.category ?? "",
          { v: i.amount, t: "n", z: BRL },
          i.paid ? "Sim" : "Não", i.fixed ? "Sim" : "Não",
        ]));
        m.expenses.forEach((e) => fluxoRows.push([
          m.month, m.year, "Despesa", e.label, e.category ?? "",
          { v: e.amount, t: "n", z: BRL },
          e.paid ? "Sim" : "Não", e.fixed ? "Sim" : "Não",
        ]));
      });
      XLSX.utils.book_append_sheet(wb, makeSheet(fluxoRows, [12, 6, 10, 28, 14, 14, 8, 8]), "Fluxo de Caixa");

      /* ═══ 7. FLUXO CONSOLIDADO (mês a mês, colunas) ═══ */
      const consRows: CellValue[][] = [
        ["Mês/Ano", ...store.cashflowMonths.map((m) => `${m.month.slice(0, 3)}/${String(m.year).slice(-2)}`)],
      ];
      const addLine = (label: string, values: number[], fmt = BRL) =>
        consRows.push([label, ...values.map((v) => ({ v, t: "n" as const, z: fmt }))]);

      const incomes = store.cashflowMonths.map((m) => m.incomes.reduce((s, i) => s + i.amount, 0));
      const expenses = store.cashflowMonths.map((m) => m.expenses.reduce((s, e) => s + e.amount, 0));
      const cards = store.cashflowMonths.map((m) => {
        const mn = MONTH_MAP[m.month];
        return cardSpendingForMonth(store.banks, mn, m.year);
      });
      addLine("Receitas", incomes);
      addLine("Despesas Manuais", expenses);
      addLine("Cartões", cards);
      addLine("Total Despesas", expenses.map((e, i) => e + cards[i]));
      addLine("Saldo", incomes.map((v, i) => v - expenses[i] - cards[i]));

      let acc = 0;
      const accArr = incomes.map((v, i) => (acc += v - expenses[i] - cards[i]));
      addLine("Saldo Acumulado", accArr);
      XLSX.utils.book_append_sheet(
        wb, makeSheet(consRows, [22, ...store.cashflowMonths.map(() => 12)]),
        "Fluxo Consolidado",
      );

      /* ═══ 8. POR CATEGORIA ═══ */
      const catRows: CellValue[][] = [
        ["Categoria", ...store.cashflowMonths.map((m) => `${m.month.slice(0, 3)}/${String(m.year).slice(-2)}`), "Total", "Média"],
      ];
      EXPENSE_CATEGORIES.forEach((cat) => {
        const perMonth = store.cashflowMonths.map((m) =>
          m.expenses.filter((e) => (e.category ?? "outros") === cat.id).reduce((s, e) => s + e.amount, 0),
        );
        const total = perMonth.reduce((s, v) => s + v, 0);
        const avg = perMonth.length > 0 ? total / perMonth.length : 0;
        if (total > 0) {
          catRows.push([
            `${cat.emoji} ${cat.label}`,
            ...perMonth.map((v) => ({ v, t: "n" as const, z: BRL })),
            { v: total, t: "n", z: BRL },
            { v: avg, t: "n", z: BRL },
          ]);
        }
      });
      XLSX.utils.book_append_sheet(
        wb, makeSheet(catRows, [22, ...store.cashflowMonths.map(() => 12), 14, 14]),
        "Por Categoria",
      );

      /* ═══ 9. CREDORES ═══ */
      const credRows: CellValue[][] = [[
        "Nome", "Dívida Total", "Valor Pago", "Restante", "% Quitado",
        "Juros a.m.", "Vencimento", "Dias até vencer",
      ]];
      store.creditors.forEach((c) => {
        const rem = c.totalDebt - c.amountPaid;
        const pct = c.totalDebt > 0 ? c.amountPaid / c.totalDebt : 0;
        const days = c.dueDate ? Math.ceil((new Date(c.dueDate).getTime() - Date.now()) / 86400000) : null;
        credRows.push([
          c.name,
          { v: c.totalDebt, t: "n", z: BRL },
          { v: c.amountPaid, t: "n", z: BRL },
          { v: rem, t: "n", z: BRL },
          { v: pct, t: "n", z: PCT },
          { v: (c.interestRate ?? 0) / 100, t: "n", z: PCT },
          c.dueDate ?? "",
          days !== null ? { v: days, t: "n", z: INT } : "",
        ]);
      });
      XLSX.utils.book_append_sheet(wb, makeSheet(credRows, [24, 14, 14, 14, 10, 10, 12, 12]), "Credores");

      /* ═══ 10. METAS ═══ */
      const metaRows: CellValue[][] = [[
        "Meta", "Alvo", "Guardado", "Restante", "% Concluída", "Meses (@meta mensal)",
      ]];
      const savingsMonth = store.savingsGoalMonth;
      store.goals.forEach((g) => {
        const rem = Math.max(g.targetAmount - g.savedAmount, 0);
        const months = savingsMonth > 0 ? Math.ceil(rem / savingsMonth) : 0;
        metaRows.push([
          g.title,
          { v: g.targetAmount, t: "n", z: BRL },
          { v: g.savedAmount, t: "n", z: BRL },
          { v: rem, t: "n", z: BRL },
          { v: g.targetAmount > 0 ? g.savedAmount / g.targetAmount : 0, t: "n", z: PCT },
          { v: months, t: "n", z: INT },
        ]);
      });
      XLSX.utils.book_append_sheet(wb, makeSheet(metaRows, [26, 14, 14, 14, 12, 18]), "Metas");

      /* ═══ 11. FONTES DE RENDA ═══ */
      const rendaRows: CellValue[][] = [["Fonte", "Valor mensal"]];
      store.incomeSources.forEach((s) => rendaRows.push([s.label, { v: s.amount, t: "n", z: BRL }]));
      rendaRows.push([
        { v: "TOTAL", t: "s" },
        { v: store.incomeSources.reduce((s, i) => s + i.amount, 0), t: "n", z: BRL },
      ]);
      XLSX.utils.book_append_sheet(wb, makeSheet(rendaRows, [28, 16]), "Fontes de Renda");

      /* ═══ 12. PROJEÇÃO 12 MESES ═══ */
      const proj: CellValue[][] = [[
        "Mês/Ano", "Receita", "Despesa Total", "Saldo Mês", "Saldo Acumulado",
      ]];
      let running = 0;
      store.cashflowMonths.forEach((m, i) => {
        const bal = incomes[i] - expenses[i] - cards[i];
        running += bal;
        proj.push([
          `${m.month} ${m.year}`,
          { v: incomes[i], t: "n", z: BRL },
          { v: expenses[i] + cards[i], t: "n", z: BRL },
          { v: bal, t: "n", z: BRL },
          { v: running, t: "n", z: BRL },
        ]);
      });
      XLSX.utils.book_append_sheet(wb, makeSheet(proj, [18, 14, 14, 14, 16]), "Projeção 12 Meses");

      /* ═══ 13. QUITAÇÃO 48h/semana ═══ */
      const HOURS_PER_MONTH = 48 * (52 / 12);
      const totalRemaining = store.totalDebt;
      const positive = incomes.filter((v) => v > 0);
      const avgIncome = positive.length > 0 ? positive.reduce((s, v) => s + v, 0) / positive.length : 0;
      const hourly = avgIncome > 0 ? avgIncome / HOURS_PER_MONTH : 0;
      const workHours = hourly > 0 ? totalRemaining / hourly : 0;
      const weeks = workHours / 48;
      const calDays = weeks * 7;
      const quit: CellValue[][] = [
        [{ v: "TEMPO ATÉ A QUITAÇÃO (48h/semana)", t: "s" }],
        [],
        ["Renda média mensal", { v: avgIncome, t: "n", z: BRL }],
        ["Horas/mês (48h * 52/12)", { v: HOURS_PER_MONTH, t: "n", z: "0.0" }],
        ["Valor/hora", { v: hourly, t: "n", z: BRL }],
        ["Dívida restante", { v: totalRemaining, t: "n", z: BRL }],
        [],
        ["Horas de trabalho necessárias", { v: workHours, t: "n", z: "#,##0.0" }],
        ["Semanas", { v: weeks, t: "n", z: "#,##0.0" }],
        ["Dias corridos", { v: calDays, t: "n", z: "#,##0.0" }],
        ["Dias úteis (8h/dia)", { v: workHours / 8, t: "n", z: "#,##0.0" }],
      ];
      XLSX.utils.book_append_sheet(wb, makeSheet(quit, [34, 16]), "Quitação (48h-sem)");

      /* ═══ 14. PARÂMETROS ═══ */
      const params: CellValue[][] = [
        ["Parâmetro", "Valor"],
        ["Salário base", { v: store.salary, t: "n", z: BRL }],
        ["Horas mensais", { v: store.monthlyHours, t: "n", z: INT }],
        ["Valor da hora", { v: store.hourlyRate, t: "n", z: BRL }],
        ["Margem de segurança", { v: store.safetyMargin, t: "n", z: BRL }],
        ["Meta economia mensal", { v: store.savingsGoalMonth, t: "n", z: BRL }],
        ["Economia diária derivada", { v: store.dailySavings, t: "n", z: BRL }],
      ];
      XLSX.utils.book_append_sheet(wb, makeSheet(params, [26, 14]), "Parâmetros");

      /* Save */
      const today = now.toISOString().slice(0, 10);
      XLSX.writeFile(wb, `relatorio_financeiro_${today}.xlsx`);
      toast({
        title: "Relatório completo exportado",
        description: `${wb.SheetNames.length} planilhas geradas.`,
      });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao exportar", description: String(e), variant: "destructive" });
    }
  };

  return (
    <button
      onClick={handleExport}
      aria-label="Exportar relatório XLSX"
      className={`inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm hover:bg-secondary/60 hover:border-primary/40 transition-all text-xs font-medium text-foreground ${
        compact ? "h-10 px-3" : "px-3 py-2"
      }`}
      title="Exportar relatório completo em .xlsx"
    >
      <Download className="w-3.5 h-3.5" />
      <span className={compact ? "hidden sm:inline" : undefined}>Exportar XLSX</span>
    </button>
  );
}


import { describe, expect, it } from "vitest";
import type { Bank, Installment } from "@/data/financialData";
import { debtProjection } from "./debtProjection";

const now = new Date("2026-10-30T12:00:00Z");
const bill = (dueDate: string, amount = 500, status: Installment["status"] = "pendente"): Installment => ({ id: dueDate, description: "Compra", totalAmount: 2500, installmentAmount: amount, currentInstallment: 1, totalInstallments: 5, dueDate, status });
const bank = (installments: Installment[]): Bank => ({ id: "card", name: "Cartão", color: "", glowClass: "", limitTotal: 10000, limitUsed: 9999, debtFinal: 9999, status: "pendente", installments });

describe("projeção da dívida no mês selecionado", () => {
  it("separa cartões e empréstimos sem duplicar o total, inclusive após mudar a categoria", () => {
    const card = bank([bill("2026-10-10", 100), bill("2026-11-10", 200)]);
    const loan = { ...bank([bill("2026-10-20", 400), bill("2026-12-20", 500)]), id: "loan", category: "emprestimo_credito" as const };
    const result = debtProjection([card, loan], [], { month: "Novembro", year: 2026 }, now);
    expect(result).toMatchObject({ currentDebt: 1200, cardsCurrent: 300, loansCurrent: 900, cardsRemaining: 0, loansRemaining: 500, remaining: 500 });
    const reclassified = debtProjection([{ ...card, category: "emprestimo_credito" }, loan], [], { month: "Novembro", year: 2026 }, now);
    expect(reclassified).toMatchObject({ currentDebt: 1200, cardsCurrent: 0, loansCurrent: 1200, cardsRemaining: 0, loansRemaining: 500, remaining: 500 });
  });
  it("reduz somente as parcelas registradas até cada mês, inclusive na virada do ano", () => {
    const banks = [bank([bill("2026-10-10"), bill("2026-11-10"), bill("2026-12-10"), bill("2027-01-10"), bill("2027-02-10")])];
    const snapshot = JSON.stringify(banks);
    expect(debtProjection(banks, [], { month: "Outubro", year: 2026 }, now).remaining).toBe(2000);
    expect(debtProjection(banks, [], { month: "Novembro", year: 2026 }, now).remaining).toBe(1500);
    expect(debtProjection(banks, [], { month: "Janeiro", year: 2027 }, now).remaining).toBe(500);
    expect(debtProjection(banks, [], { month: "Fevereiro", year: 2027 }, now).remaining).toBe(0);
    expect(debtProjection(banks, [], { month: "Outubro", year: 2026 }, now).remaining).toBe(2000);
    expect(JSON.stringify(banks)).toBe(snapshot);
  });

  it("não abate duas vezes parcelas pagas nem considera cartões cancelados", () => {
    const cancelled = { ...bank([bill("2026-11-12", 999)]), status: "cancelado" as const };
    const result = debtProjection([bank([bill("2026-10-10", 500, "pago"), bill("2026-11-10"), bill("2026-12-10")]), cancelled], [], { month: "Novembro", year: 2026 }, now);
    expect(result).toMatchObject({ currentDebt: 1000, projectedPayments: 500, remaining: 500 });
  });

  it("mantém atrasos, datas inválidas e credores sem cronograma e calcula em centavos", () => {
    const banks = [bank([bill("2026-09-10", 100, "atrasado"), bill("2026-11-10", .1), bill("2026-12-10", .2), bill("2026-02-30", 50), bill("sem data", 75)])];
    const creditors = [{ id: "c", name: "Credor", totalDebt: 1000, amountPaid: 250, dueDate: "2026-11-01" }];
    expect(debtProjection(banks, creditors, { month: "Dezembro", year: 2026 }, now)).toMatchObject({ currentDebt: 975.3, projectedPayments: .3, cardsRemaining: 225, creditorsRemaining: 750, remaining: 975 });
  });

  it("não inventa histórico passado e funciona sem registros", () => {
    expect(debtProjection([bank([bill("2026-10-10")])], [], { month: "Setembro", year: 2026 }, now)).toMatchObject({ isProjection: false, remaining: 500, projectedPayments: 0 });
    expect(debtProjection([], [], { month: "Novembro", year: 2026 }, now).remaining).toBe(0);
  });

  it("usa o mês de Brasília na virada UTC", () => {
    expect(debtProjection([bank([bill("2026-10-10")])], [], { month: "Outubro", year: 2026 }, new Date("2026-11-01T01:00:00Z"))).toMatchObject({ isProjection: true, remaining: 0 });
  });
});

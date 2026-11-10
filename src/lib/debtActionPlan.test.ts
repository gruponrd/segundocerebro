import { describe, expect, it } from "vitest";
import type { Bank, Installment } from "@/data/financialData";
import { normalizeDebtPlan, saoPauloPeriod, simulateDebtPlan } from "./debtActionPlan";
const start = 2027 * 12;
const bill = (date: string, amount: number, status: Installment["status"] = "pendente"): Installment => ({ id: date, description:"Compra", totalAmount:amount, installmentAmount:amount, currentInstallment:1, totalInstallments:1, dueDate:date, status });
const bank = (installments: Installment[]): Bank => ({ id:"card", name:"Cartão", color:"", glowClass:"", limitTotal:1000, limitUsed:0, debtFinal:0, status:"pendente", installments });
const creditors = [{ id:"a",name:"Maior",totalDebt:500,amountPaid:0,interestRate:10 }, { id:"b",name:"Menor",totalDebt:200,amountPaid:0,interestRate:1 }, { id:"c",name:"Sem taxa",totalDebt:100,amountPaid:0 }];
const plan = { monthlyExtra: 100, strategy: "smallest" as const, priorityId: "" };
describe("debt action plan", () => {
  it("soma somente parcelas em aberto e distribui adicionais com centavos sem alterar dados", () => {
    const banks=[bank([bill("2027-01-15",100),bill("2027-02-15",200),bill("2027-01-01", 300,"pago")])];
    const snapshot=JSON.stringify({banks,creditors});
    const result=simulateDebtPlan(banks,creditors,plan,start);
    expect(result.initial).toBe(1100);
    expect(result.steps[0]).toMatchObject({scheduled:100,extra:100,remaining:900,allocations:[{name:"Sem taxa",amount:100,cleared:true}]});
    expect(result.finishPeriod).toBe(start+7);
    expect(JSON.stringify({banks,creditors})).toBe(snapshot);
  });
  it("mantém parcelas atrasadas, sem data ou inválidas no saldo e não promete quitação", () => {
    const banks=[bank([bill("2026-12-10",100),bill("2027-02-30",50),bill("2027-01-10",25,"atrasado"),bill("2027-02-10",0.1)])];
    const result=simulateDebtPlan(banks,[],plan,start);
    expect(result).toMatchObject({initial:175.1,unscheduled:175,unscheduledCount:3,finishPeriod:null});
    expect(result.steps.at(-1)?.remaining).toBe(175);
  });
  it("prioriza taxas conhecidas e permite escolher um primeiro credor", () => {
    const interest=simulateDebtPlan([],creditors,{...plan,strategy:"interest"},start);
    expect(interest.steps[0].allocations[0].name).toBe("Maior");
    expect(interest.unknownRates).toBe(1);
    const custom=simulateDebtPlan([],creditors,{...plan,strategy:"custom",priorityId:"b"},start);
    expect(custom.steps[0].allocations[0].name).toBe("Menor");
  });
  it("sem adicional não promete quitar credores e ignora cartões cancelados", () => {
    const result=simulateDebtPlan([{...bank([bill("2027-01-01",999)]),status:"cancelado"}],creditors,{...plan,monthlyExtra:0},start);
    expect(result.initial).toBe(800); expect(result.finishPeriod).toBeNull(); expect(result.steps[0].extra).toBe(0);
  });
  it("normaliza dados ausentes e considera o mês de Brasília", () => {
    expect(normalizeDebtPlan({monthlyExtra:-20,strategy:"unknown"})).toEqual({monthlyExtra:0,strategy:"smallest",priorityId:""});
    expect(saoPauloPeriod(new Date("2027-01-01T01:00:00Z"))).toBe(2026*12+11);
  });
});

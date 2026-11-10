import { describe, expect, it } from "vitest";
import type { Bank, CashflowMonth, Installment } from "@/data/financialData";
import { suggestDebtActions } from "./debtSuggestions";
const now = new Date("2026-11-10T15:00:00Z");
const bill = (date:string, amount:number, status:Installment["status"]="pendente"):Installment => ({ id:date,description:"Compra",totalAmount:amount,installmentAmount:amount,currentInstallment:1,totalInstallments:1,dueDate:date,status });
const bank = (installments:Installment[]):Bank => ({id:"b",name:"Cartão",category:"cartao",color:"",glowClass:"",limitTotal:1000,limitUsed:0,debtFinal:0,status:"pendente",installments});
const month = (incomes:CashflowMonth["incomes"],expenses:CashflowMonth["expenses"]):CashflowMonth => ({month:"Novembro",year:2026,incomes,expenses});
const creditors = [{id:"a",name:"Baixa",totalDebt:3000,amountPaid:0,interestRate:1},{id:"b",name:"Alta",totalDebt:2000,amountPaid:0,interestRate:4}];
describe("debt recommendations", () => {
  it("considers pending entries, pending expenses and unpaid card installments once, less reserve", () => {
    const m=month([{label:"a",amount:1000,paid:true},{label:"b",amount:3000,paid:false}],[{label:"x",amount:500,paid:true},{label:"y",amount:1000,paid:false}]);
    const banks=[bank([bill("2026-11-20",500),bill("2026-11-21",300,"pago"),bill("2026-12-10",400)])];
    const original=JSON.stringify({m,banks,creditors});
    expect(suggestDebtActions([m],banks,creditors,200,now)).toMatchObject({pendingIncome:3000,pendingExpense:1000,cards:500,pendingOut:1500,projectedDifference:1500,reserve:200,suggestedExtra:1300,priority:{name:"Alta"},incompleteCount:0});
    expect(JSON.stringify({m,banks,creditors})).toBe(original);
  });
  it("does not suggest extra with an old or undated installment or absent income", () => {
    const m=month([{label:"pending",amount:5000}],[]);
    expect(suggestDebtActions([m],[bank([bill("2026-10-01",300),bill("sem data",50)])],creditors,0,now)).toMatchObject({unaccounted:350,incompleteCount:2,suggestedExtra:0});
    expect(suggestDebtActions([month([{label:"paid",amount:5000,paid:true}],[])],[],creditors,0,now).suggestedExtra).toBe(0);
  });
  it("reports negative pending cash and never recommends more than total owed", () => {
    expect(suggestDebtActions([month([{label:"x",amount:100}],[{label:"y",amount:300}])],[],creditors,0,now)).toMatchObject({projectedDifference:-200,suggestedExtra:0});
    expect(suggestDebtActions([month([{label:"x",amount:9000}],[])],[],[{id:"c",name:"Credor",totalDebt:200,amountPaid:0}],0,now).suggestedExtra).toBe(200);
  });
  it("prioritizes overdue creditors, then known rates; does not invent a current month", () => {
    const c=[...creditors,{id:"old",name:"Em atraso",totalDebt:1000,amountPaid:0,dueDate:"2026-11-01"}];
    expect(suggestDebtActions([month([{label:"x",amount:1000}],[])],[],c,0,now).priority?.name).toBe("Em atraso");
    expect(suggestDebtActions([],[],c,0,now)).toMatchObject({evidence:false,suggestedExtra:0});
  });
  it("uses Brasília time at the month boundary and ignores canceled cards", () => {
    const october:CashflowMonth={month:"Outubro",year:2026,incomes:[{label:"x",amount:1000}],expenses:[]};
    const canceled={...bank([bill("2026-10-20",999)]),status:"cancelado" as const};
    expect(suggestDebtActions([october],[canceled],creditors,0,new Date("2026-11-01T01:00:00Z"))).toMatchObject({pendingIncome:1000,cards:0,suggestedExtra:1000});
  });
});

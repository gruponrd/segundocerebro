import { expect, it } from "vitest";
import { equalGoalAllocation, goalMonthlyAmount, validateGoalPlan } from "./goalAllocation";
import type { Goal } from "@/data/financialData";
const goals: Goal[] = ["a","b","c"].map(id=>({id,title:id,image:"",color:"",targetAmount:1000,savedAmount:0}));
it("divide até o último centavo sem exceder o orçamento",() => {
  expect(equalGoalAllocation(goals,100)).toEqual({a:33.34,b:33.33,c:33.33});
  expect(validateGoalPlan(goals,100,equalGoalAllocation(goals,100))).toBeNull();
});
it("rejeita excesso, negativos e valores não finitos",() => {
  expect(validateGoalPlan(goals,100,{a:100,b:0.01})).toBeTruthy();
  expect(validateGoalPlan(goals,100,{a:-1})).toBeTruthy();
  expect(validateGoalPlan(goals,NaN,{})).toBeTruthy();
  expect(validateGoalPlan(goals,100,{b:Infinity})).toBeTruthy();
});
it("não aloca em metas concluídas e preserva os saldos originais",() => {
  const completed = [{...goals[0],savedAmount:1000},goals[1]];
  expect(equalGoalAllocation(completed,100)).toEqual({a:0,b:100});
  expect(validateGoalPlan(completed,100,{a:1})).toBeTruthy();
  expect(completed[0].savedAmount).toBe(1000);
  expect(goalMonthlyAmount({...completed[0],monthlyAllocation:100})).toBe(0);
});
it("metas antigas ficam sem parcela até a pessoa definir seu plano",() => {
  expect(goalMonthlyAmount(goals[0])).toBe(0);
  expect(equalGoalAllocation([],100)).toEqual({});
});

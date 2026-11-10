import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const data = vi.hoisted(() => ({ cashflowMonths:[{month:"Novembro",year:2026,incomes:[{label:"Receita",amount:3000}],expenses:[{label:"Casa",amount:1000}]}],banks:[],creditors:[{id:"c",name:"Credor A",totalDebt:3000,amountPaid:0,interestRate:3}],safetyMargin:200 }));
vi.mock("@/stores/financeStore",()=>({useFinanceStore:()=>data}));
import { DebtNextSteps } from "./DebtNextSteps";
afterEach(()=>vi.useRealTimers());
describe("plano automático",()=>{
  it("mostra os próximos passos e simula sem exigir escolha nem alterar os dados",()=>{
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-10T15:00:00Z"));
    const before=JSON.stringify(data);
    render(<DebtNextSteps/>);
    expect(screen.getByText("Seu plano sugerido")).toBeInTheDocument();
    expect(screen.getByText("Caminho proposto")).toBeInTheDocument();
    expect(screen.getAllByText(/Destinar até.*Credor A/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(JSON.stringify(data)).toBe(before);
  });
});

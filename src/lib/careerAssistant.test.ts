import { describe, expect, it } from "vitest";
import { responseText, validateCareerRequest } from "../../supabase/functions/_shared/careerAssistant";

const context = { savings: 1000, currentIncome: 2000, monthlyExpenses: 500, newIncome: 600, newIncomeDelay: 1, reserveMonths: 6, insuranceAmount: 0, insuranceInstallments: 0, insuranceDelay: 1, reserveTarget: 3000, overdue: 0, unknown: 0, base: { period: 2027 * 12, starting: 4000, lowest: 3000, ending: 5000 }, insurance: null };
describe("assistente de transição", () => {
  it("aceita apenas agregados esperados e calcula o mês sem dados identificáveis", () => {
    const result = validateCareerRequest({ question: "Quais cuidados?", context: { ...context, nome: "privado", cpf: "privado" }, token: "privado" });
    expect(result?.context.baseMonth).toBe("janeiro de 2027");
    expect(result?.context).not.toHaveProperty("nome");
    expect(result?.context).not.toHaveProperty("cpf");
  });
  it("rejeita perguntas longas, dados inválidos e resultados malformados", () => {
    expect(validateCareerRequest({ question: "a".repeat(1201), context })).toBeNull();
    expect(validateCareerRequest({ question: "Ajuda?", context: { ...context, savings: -1 } })).toBeNull();
    expect(validateCareerRequest({ question: "Ajuda?", context: { ...context, base: { ...context.base, period: 999999 } } })).toBeNull();
  });
  it("lê somente mensagens completas de saída, recusando respostas incompletas", () => {
    expect(responseText({ status: "completed", output: [{ type: "reasoning" }, { type: "message", content: [{ type: "output_text", text: "Confira sua reserva." }] }] })).toBe("Confira sua reserva.");
    expect(responseText({ status: "incomplete", output: [{ type: "message", content: [{ type: "output_text", text: "parcial" }] }] })).toBeNull();
  });
});

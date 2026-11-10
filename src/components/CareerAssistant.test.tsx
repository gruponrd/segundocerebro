import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { DEFAULT_CAREER_PLAN } from "@/lib/careerTransition";
const mock = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mock.invoke } } }));
vi.mock("@/lib/previewMode", () => ({ isPreviewMode: false }));
import { CareerAssistant } from "./CareerAssistant";

it("só envia agregados e pergunta após ação explícita, sem gravar dados", async () => {
  mock.invoke.mockResolvedValue({ data: { answer: "Confira os custos previstos." }, error: null });
  render(<CareerAssistant plan={DEFAULT_CAREER_PLAN} base={{ first: null, reserveTarget: 1000, overdue: 0, unknown: 0 }} benefit={null} disabled={false} />);
  expect(mock.invoke).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Sua pergunta"), { target: { value: "O que devo verificar?" } });
  fireEvent.click(screen.getByRole("button", { name: "Enviar pergunta" }));
  await waitFor(() => expect(screen.getByText("Confira os custos previstos.")).toBeInTheDocument());
  expect(mock.invoke).toHaveBeenCalledWith("career-assistant", { body: { question: "O que devo verificar?", context: { ...DEFAULT_CAREER_PLAN, reserveTarget: 1000, overdue: 0, unknown: 0, base: null, insurance: null } } });
});

it("descarta respostas se o plano mudar enquanto a IA responde", async () => {
  let resolve!: (value: unknown) => void;
  mock.invoke.mockReturnValue(new Promise(r => { resolve = r; }));
  const base = { first: null, reserveTarget: 1000, overdue: 0, unknown: 0 };
  const view = render(<CareerAssistant plan={DEFAULT_CAREER_PLAN} base={base} benefit={null} disabled={false} />);
  fireEvent.change(screen.getByLabelText("Sua pergunta"), { target: { value: "Como prosseguir?" } });
  fireEvent.click(screen.getByRole("button", { name: "Enviar pergunta" }));
  view.rerender(<CareerAssistant plan={{ ...DEFAULT_CAREER_PLAN, savings: 999 }} base={base} benefit={null} disabled={false} />);
  await act(async () => { resolve({ data: { answer: "Resposta de um plano antigo" }, error: null }); });
  expect(screen.queryByText("Resposta de um plano antigo")).not.toBeInTheDocument();
});

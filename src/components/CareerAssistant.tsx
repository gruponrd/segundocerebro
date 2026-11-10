import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { isPreviewMode } from "@/lib/previewMode";
import type { CareerPlan } from "@/lib/careerTransition";

type Result = { first: { period: number; starting: number; lowest: number; ending: number } | null; reserveTarget: number; overdue: number; unknown: number };

export function CareerAssistant({ plan, base, benefit, disabled }: { plan: CareerPlan; base: Result; benefit: Result | null; disabled: boolean }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const requestVersion = useRef(0);
  const contextVersion = JSON.stringify({ plan, base, benefit, disabled });
  useEffect(() => { requestVersion.current++; setAnswer(""); setError(""); setPending(false); }, [contextVersion]);
  const ask = async () => {
    if (pending || disabled || isPreviewMode || question.trim().length < 3) return;
    const version = ++requestVersion.current;
    setPending(true); setError(""); setAnswer("");
    try {
      const { data, error: issue } = await supabase.functions.invoke("career-assistant", { body: { question: question.trim(), context: { ...plan, reserveTarget: base.reserveTarget, overdue: base.overdue, unknown: base.unknown, base: base.first, insurance: benefit?.first ?? null } } });
      if (version !== requestVersion.current) return;
      if (issue) {
        let message = "Não foi possível consultar o assistente. Tente novamente mais tarde.";
        const response = "context" in issue ? issue.context : null;
        if (response instanceof Response) { try { const body = await response.json(); if (typeof body.error === "string") message = body.error; } catch { /* fallback */ } }
        if (version === requestVersion.current) setError(message);
      } else if (typeof data?.answer === "string" && data.answer.trim()) setAnswer(data.answer);
      else setError("Não foi possível ler a resposta. Tente novamente.");
    } catch { if (version === requestVersion.current) setError("Não foi possível acessar o assistente. Verifique a conexão."); }
    finally { if (version === requestVersion.current) setPending(false); }
  };
  return <section className="rounded-xl border border-border p-4 space-y-3" aria-labelledby="career-assistant-title">
    <h3 id="career-assistant-title" className="flex items-center gap-2 font-semibold"><MessageCircle className="h-4 w-4 text-primary" /> Converse sobre sua transição</h3>
    <p className="text-xs leading-relaxed text-muted-foreground">Ao enviar, sua pergunta e os valores e resultados deste plano serão enviados à OpenAI para gerar uma resposta. O assistente não altera lançamentos. Não inclua senhas ou dados que não queira compartilhar.</p>
    <label className="block text-sm font-medium">Sua pergunta<Textarea className="mt-1 min-h-20" value={question} maxLength={1200} disabled={pending} onChange={e => setQuestion(e.target.value)} placeholder="Ex.: O que devo conferir antes de considerar essa mudança?" /></label>
    <div className="flex flex-wrap items-center gap-3"><Button type="button" onClick={() => void ask()} disabled={pending || disabled || isPreviewMode || question.trim().length < 3} className="gap-2"><Send className="h-4 w-4" />{pending ? "Consultando…" : "Enviar pergunta"}</Button><span className="text-xs text-muted-foreground">Até 10 perguntas por dia por conta. As respostas não ficam salvas no app.</span></div>
    {isPreviewMode && <p className="text-xs text-muted-foreground">O assistente está disponível apenas no aplicativo publicado, com a integração ativada.</p>}
    {disabled && <p className="text-xs text-muted-foreground">Salve as alterações do plano antes de perguntar.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {answer && <div aria-live="polite" className="rounded-lg bg-secondary/50 p-4"><p className="mb-2 text-sm font-semibold">Assistente</p><p className="whitespace-pre-wrap text-sm leading-relaxed">{answer}</p><p className="mt-3 text-xs text-muted-foreground">Resposta gerada por IA. Confira os números, condições e regras antes de decidir.</p></div>}
  </section>;
}

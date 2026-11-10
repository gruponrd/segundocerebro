import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CAREER_ASSISTANT_INSTRUCTIONS, responseText, validateCareerRequest } from "../_shared/careerAssistant.ts";

const origin = Deno.env.get("APP_ORIGIN") ?? "https://segundo-cerebro-nrd10.vercel.app";
const headers = { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin", "Content-Type": "application/json", "Cache-Control": "no-store" };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async req => {
  if (req.headers.get("origin") && req.headers.get("origin") !== origin) return reply({ error: "Origem não permitida." }, 403);
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return reply({ error: "Método inválido." }, 405);
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return reply({ error: "Entre novamente na sua conta." }, 401);
  const url = Deno.env.get("SUPABASE_URL") ?? "", anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "", role = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !anon || !role) return reply({ error: "O assistente ainda não está configurado." }, 503);
  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: { user }, error: authError } = await userClient.auth.getUser(auth.slice(7));
  if (authError || !user) return reply({ error: "Entre novamente na sua conta." }, 401);
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return reply({ error: "O assistente ainda não foi ativado pelo administrador." }, 503);
  try {
    const raw = await req.text();
    if (raw.length > 6000) return reply({ error: "A pergunta é muito longa." }, 413);
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return reply({ error: "Pedido inválido." }, 400); }
    const request = validateCareerRequest(parsed);
    if (!request) return reply({ error: "Confira a pergunta e salve uma projeção válida antes de continuar." }, 400);
    const admin = createClient(url, role, { auth: { persistSession: false } });
    const { data: allowed, error: quotaError } = await admin.rpc("career_assistant_claim", { p_user: user.id });
    if (quotaError) return reply({ error: "O limite de uso ainda não está configurado. Tente mais tarde." }, 503);
    if (allowed !== true) return reply({ error: "Limite diário do assistente atingido. Tente novamente amanhã." }, 429);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 35_000);
    try {
      const result = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ model: Deno.env.get("OPENAI_MODEL") ?? "gpt-6-luna", store: false, max_output_tokens: 1200, reasoning: { effort: "low" }, instructions: CAREER_ASSISTANT_INSTRUCTIONS, input: JSON.stringify(request) }) });
      if (!result.ok) return reply({ error: result.status === 429 ? "O serviço de IA está temporariamente indisponível ou sem créditos." : "Não foi possível consultar a IA agora. Tente novamente mais tarde." }, 503);
      const answer = responseText(await result.json());
      return answer ? reply({ answer }) : reply({ error: "A resposta não ficou completa. Tente reformular a pergunta." }, 502);
    } finally { clearTimeout(timer); }
  } catch {
    return reply({ error: "Não foi possível consultar a IA agora. Tente novamente mais tarde." }, 503);
  }
});

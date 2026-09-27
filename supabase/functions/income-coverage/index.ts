import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { parseCoverageInput } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response(null, { status: 405, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let months;
    try {
      const body = await req.text();
      if (body.length > 16_000) throw new Error("Requisição muito grande");
      months = parseCoverageInput(JSON.parse(body)).months;
    } catch {
      return new Response(JSON.stringify({ error: "Dados financeiros inválidos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: allowed, error: quotaError } = await supabase.rpc("consume_ai_quota", { p_endpoint: "income-coverage" });
    if (quotaError) {
      console.error("AI quota error:", quotaError);
      return new Response(JSON.stringify({ error: "Não foi possível verificar o limite de uso" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Limite de 5 análises por hora atingido" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const summary = months.map((m) =>
      `- ${m.label}: renda R$ ${m.income.toLocaleString("pt-BR")} | custos R$ ${m.cost.toLocaleString("pt-BR")} | saldo ${(m.income - m.cost).toLocaleString("pt-BR")}`
    ).join("\n");

    const systemPrompt = `Você é um conselheiro financeiro brasileiro direto e prático. Responda em português, em no máximo 3 frases curtas. Use 1 emoji no início (✅ saudável, ⚠️ atenção, 🚨 alerta crítico). Foque no diagnóstico: a renda cobre os próximos custos? O que ajustar?`;
    const userPrompt = `Próximos meses do usuário:\n${summary}\n\nDiagnostique brevemente se a renda cobre os custos e o que fazer.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao consultar IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const insight = data.choices?.[0]?.message?.content || "Não foi possível gerar análise.";
    return new Response(JSON.stringify({ insight }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("income-coverage error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

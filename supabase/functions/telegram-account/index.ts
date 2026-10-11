import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ensureTelegramWebhook, telegramWebhookSecret } from "../_shared/telegramSetup.ts";

const origin = Deno.env.get("APP_ORIGIN") ?? "https://segundo-cerebro-nrd10.vercel.app";
const headers = {
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
  "Content-Type": "application/json", "Cache-Control": "no-store",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async req => {
  if (req.headers.get("origin") && req.headers.get("origin") !== origin) return reply({ error: "Origem não permitida." }, 403);
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return reply({ error: "Método inválido." }, 405);
  const authorization = req.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return reply({ error: "Entre no aplicativo novamente." }, 401);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
  });
  const { data: { user }, error: authError } = await db.auth.getUser(authorization.slice(7));
  if (authError || !user) return reply({ error: "Entre no aplicativo novamente." }, 401);
  try {
    const body = await req.text();
    if (body.length > 1000) return reply({ error: "Requisição muito grande." }, 413);
    const { action, reminders } = JSON.parse(body);
    const botUsername = Deno.env.get("TELEGRAM_BOT_USERNAME") ?? "SecondB2Bot";
    const token = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
    const configured = !!token;
    if (!["status", "connect", "disconnect", "reminders"].includes(action)) return reply({ error: "Ação inválida." }, 400);
    if (action === "reminders") {
      if (!reminders || typeof reminders.enabled !== "boolean" || typeof reminders.includeAmounts !== "boolean" || ![0,1,3,7].includes(reminders.daysAhead) || !Number.isInteger(reminders.hour) || reminders.hour < 7 || reminders.hour > 21) return reply({error:"Configuração de lembrete inválida."},400);
      const {data: ready} = await db.rpc("telegram_reminder_scheduler_status");
      if (reminders.enabled && (!configured || ready !== true)) return reply({error:"O agendamento dos lembretes ainda não foi ativado."},409);
      const {error} = await db.rpc("telegram_set_reminders",{p_enabled:reminders.enabled,p_days:reminders.daysAhead,p_hour:reminders.hour,p_amounts:reminders.includeAmounts});
      if (error) return reply({error:"Não foi possível salvar. Confirme se o Telegram está conectado."},409);
      return reply({saved:true});
    }
    if (action === "disconnect") {
      const { error } = await db.rpc("telegram_disconnect");
      if (error) throw error;
      return reply({ disconnected: true });
    }
    if (!configured) return reply({ configured: false, botUsername, connected: false, history: [] });
    if (action === "connect") {
      const { data, error } = await db.rpc("telegram_create_pairing");
      if (error) {
        if (error.message.includes("30 seconds")) return reply({ error: "Aguarde 30 segundos antes de gerar outro link." }, 429);
        if (error.message.includes("Already connected")) return reply({ error: "Sua conta já está conectada. Atualize o status." }, 409);
        throw error;
      }
      const secret = await telegramWebhookSecret(token, Deno.env.get("TELEGRAM_WEBHOOK_SECRET"));
      await ensureTelegramWebhook(token, secret, Deno.env.get("SUPABASE_URL")!, botUsername);
      return reply({ url: `https://t.me/${botUsername}?start=${data.token}`, expiresAt: data.expiresAt });
    }
    const { data: connection, error } = await db.from("telegram_connections")
      .select("telegram_username, telegram_user_id, linked_at").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    const { data: history, error: historyError } = await db.from("telegram_drafts")
      .select("id,kind,amount,label,month,year,status,created_at,saved_at,credit")
      // RLS scopes this query to auth.uid(). user_id is intentionally not granted
      // to clients; filtering that column would fail its SELECT permission check.
      .eq("status", "saved").order("created_at", { ascending: false }).limit(8);
    if (historyError) throw historyError;
    const {data: pref} = await db.from("telegram_reminder_settings").select("enabled,days_ahead,hour,include_amounts").eq("user_id",user.id).maybeSingle();
    const {data: scheduleReady} = await db.rpc("telegram_reminder_scheduler_status");
    const {data: delivery} = await db.from("telegram_reminder_deliveries").select("day,status,finished_at").order("day",{ascending:false}).limit(1).maybeSingle();
    return reply({ configured: true, botUsername, connected: !!connection?.telegram_user_id,
      username: connection?.telegram_username, linkedAt: connection?.linked_at, history: history ?? [],
      reminders: {ready:scheduleReady === true,enabled:pref?.enabled ?? false,daysAhead:pref?.days_ahead ?? 3,hour:pref?.hour ?? 9,includeAmounts:pref?.include_amounts ?? false,lastDelivery:delivery} });
  } catch {
    // Never print a JWT, pairing code or transaction description to logs.
    return reply({ error: "Não foi possível acessar a integração. Tente novamente." }, 503);
  }
});

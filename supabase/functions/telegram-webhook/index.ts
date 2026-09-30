import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleTelegramUpdate, telegramBalance, type TelegramBackend, type TelegramUpdate } from "../_shared/telegramHandler.ts";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const secret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";
const token = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const appUrl = Deno.env.get("APP_ORIGIN") ?? "https://segundo-cerebro-nrd10.vercel.app";

function sameSecret(value: string) {
  if (value.length !== secret.length || secret.length < 32) return false;
  let difference = 0;
  for (let i = 0; i < secret.length; i++) difference |= value.charCodeAt(i) ^ secret.charCodeAt(i);
  return difference === 0;
}

const backend: TelegramBackend = {
  async claim(code, sender, username) {
    const { data, error } = await db.rpc("telegram_claim_pairing", { p_token: code, p_telegram_user_id: sender, p_username: username ?? null });
    if (error) throw new Error("Pairing failed");
    return data === true;
  },
  async connected(sender) {
    const { data, error } = await db.from("telegram_connections").select("user_id").eq("telegram_user_id", sender).maybeSingle();
    if (error) throw new Error("Connection lookup failed");
    return !!data;
  },
  async draft(update, sender, entry) {
    const { data, error } = await db.rpc("telegram_create_draft", { p_update_id: update, p_telegram_user_id: sender, p_entry: entry });
    if (error) throw new Error("Draft creation failed");
    return data;
  },
  async resolve(id, sender, confirm) {
    const { data, error } = await db.rpc("telegram_resolve_draft", { p_id: id, p_telegram_user_id: sender, p_confirm: confirm });
    if (error) throw new Error("Confirmation failed");
    return data;
  },
  async balance(sender, month, year) {
    const { data: connection, error: connectionError } = await db.from("telegram_connections").select("user_id").eq("telegram_user_id", sender).maybeSingle();
    if (connectionError || !connection) throw new Error("Not connected");
    const { data, error } = await db.from("user_financial_data").select("data").eq("user_id", connection.user_id).maybeSingle();
    if (error) throw new Error("Balance lookup failed");
    return telegramBalance(data?.data ?? {}, month, year);
  },
  async telegram(method, payload) {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(8000),
    });
    const result = await response.json();
    if (!result.ok) {
      if (method === "editMessageText" && result.description?.includes("message is not modified")) return;
      if (method === "answerCallbackQuery" && result.description?.includes("query is too old")) return;
      throw new Error("Telegram delivery failed");
    }
  },
};

Deno.serve(async req => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  if (!token || !sameSecret(req.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "")) return new Response(null, { status: 401 });
  try {
    const body = await req.text();
    if (body.length > 16000) return new Response(null, { status: 413 });
    let update: TelegramUpdate;
    try { update = JSON.parse(body); }
    catch { return new Response(null, { status: 400 }); }
    if (!update || typeof update !== "object") return new Response(null, { status: 400 });
    await handleTelegramUpdate(update, backend, appUrl);
    return new Response("ok");
  } catch {
    // Non-200 lets Telegram retry. Confirmation is idempotent in the database.
    return new Response("Temporarily unavailable", { status: 503 });
  }
});

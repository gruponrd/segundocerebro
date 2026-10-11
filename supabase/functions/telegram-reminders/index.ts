import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { processReminderBatch, reminderClock, type ReminderBackend } from "../_shared/telegramReminders.ts";
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status, headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
Deno.serve(async req => {
  if (req.method !== "POST") return reply({error:"Method not allowed"},405);
  const secret = req.headers.get("X-Reminder-Secret") ?? "";
  if (!/^[a-f0-9]{64}$/.test(secret)) return reply({error:"Unauthorized"},401);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {auth:{persistSession:false}});
  const {data: allowed, error: authError} = await db.rpc("telegram_verify_reminder_secret",{p_secret:secret});
  if (authError || allowed !== true) return reply({error:"Unauthorized"},401);
  try {
    const body = await req.text(); if (body.length > 1000) return reply({error:"Too large"},413);
    const dryRun = JSON.parse(body || "{}").dryRun === true;
    const clock = reminderClock();
    const {data: settings, error} = await db.from("telegram_reminder_settings").select("user_id,days_ahead").eq("enabled",true).eq("hour",clock.hour).order("user_id").limit(100);
    if (error) throw error;
    const finance = async (user: string) => {
      const {data,error} = await db.from("user_financial_data").select("data").eq("user_id",user).maybeSingle();
      if (error) throw error; return data?.data ?? null;
    };
    const backend: ReminderBackend = {
      finance,
      claim: async (user,day,hour) => { const {data,error}=await db.rpc("telegram_claim_reminder",{p_user:user,p_day:day,p_hour:hour}); if (error) throw error; return data; },
      live: async user => {
        const {data:pref,error:pError}=await db.from("telegram_reminder_settings").select("enabled,days_ahead,include_amounts,hour").eq("user_id",user).single();
        const {data:connection,error:cError}=await db.from("telegram_connections").select("telegram_user_id").eq("user_id",user).maybeSingle();
        if (pError || cError) throw pError ?? cError;
        return {enabled:pref.enabled,hour:pref.hour,daysAhead:pref.days_ahead,includeAmounts:pref.include_amounts,chatId:connection?.telegram_user_id ?? null,finance:await finance(user)};
      },
      send: async (chat,text) => {
        const token = Deno.env.get("TELEGRAM_BOT_TOKEN"); if (!token) throw new Error("Not configured");
        const response=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:chat,text,reply_markup:{inline_keyboard:[[{text:"Abrir aplicativo",url:`${Deno.env.get("APP_ORIGIN") ?? "https://segundo-cerebro-nrd10.vercel.app"}/integracoes`}]]}}),signal:AbortSignal.timeout(8000)});
        const result=await response.json(); return response.ok && result.ok===true;
      },
      finish: async (user,day,ticket,sent) => { const {error}=await db.rpc("telegram_finish_reminder",{p_user:user,p_day:day,p_ticket:ticket,p_sent:sent}); if (error) throw error; },
    };
    const result=await processReminderBatch(settings ?? [],clock,dryRun,backend);
    return reply(result,result.failed ? 503 : 200);
  } catch { return reply({error:"Reminder processing failed"},503); }
});

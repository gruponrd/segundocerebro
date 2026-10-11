-- Supabase-only scheduler. A random internal credential stays in Vault;
-- no bot token or service-role key is embedded in a job or client bundle.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name='telegram_reminder_scheduler') THEN
    PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'telegram_reminder_scheduler','Internal daily reminder scheduler');
  END IF;
END $$;

CREATE FUNCTION public.telegram_verify_reminder_secret(p_secret text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT length(p_secret)=64 AND EXISTS(SELECT 1 FROM vault.decrypted_secrets WHERE name='telegram_reminder_scheduler'
    AND extensions.digest(decrypted_secret,'sha256')=extensions.digest(p_secret,'sha256'));
$$;
REVOKE ALL ON FUNCTION public.telegram_verify_reminder_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_verify_reminder_secret(text) TO service_role;

CREATE FUNCTION public.telegram_reminder_scheduler_status()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM cron.job WHERE jobname='telegram-due-reminders' AND active)
    AND EXISTS(SELECT 1 FROM vault.secrets WHERE name='telegram_reminder_scheduler');
$$;
REVOKE ALL ON FUNCTION public.telegram_reminder_scheduler_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.telegram_reminder_scheduler_status() TO authenticated;

-- Job name makes reconfiguration idempotent. Each user receives at most one
-- digest per São Paulo calendar day, only at their chosen local hour.
SELECT cron.schedule('telegram-due-reminders','0 * * * *', $job$
  SELECT net.http_post(
    url := 'https://wgtktyrmifchgfrpnchh.supabase.co/functions/v1/telegram-reminders',
    headers := jsonb_build_object('Content-Type','application/json','X-Reminder-Secret',
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='telegram_reminder_scheduler' LIMIT 1)),
    body := '{}'::jsonb, timeout_milliseconds := 10000
  );
$job$);

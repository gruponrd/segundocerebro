-- Additive opt-in settings. No existing financial or connection rows are changed.
CREATE TABLE public.telegram_reminder_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  days_ahead integer NOT NULL DEFAULT 3 CHECK (days_ahead IN (0,1,3,7)),
  hour integer NOT NULL DEFAULT 9 CHECK (hour BETWEEN 7 AND 21),
  include_amounts boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.telegram_reminder_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own reminder settings" ON public.telegram_reminder_settings FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE ALL ON public.telegram_reminder_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.telegram_reminder_settings TO authenticated;
GRANT ALL ON public.telegram_reminder_settings TO service_role;

CREATE TABLE public.telegram_reminder_deliveries (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  ticket uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','sent','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  PRIMARY KEY (user_id, day)
);
ALTER TABLE public.telegram_reminder_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own reminder deliveries" ON public.telegram_reminder_deliveries FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE ALL ON public.telegram_reminder_deliveries FROM PUBLIC, anon, authenticated;
GRANT SELECT(user_id,day,status,finished_at) ON public.telegram_reminder_deliveries TO authenticated;
GRANT ALL ON public.telegram_reminder_deliveries TO service_role;

CREATE FUNCTION public.telegram_set_reminders(p_enabled boolean, p_days integer, p_hour integer, p_amounts boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  -- Same connection-first lock order as pairing/disconnecting/confirmation.
  PERFORM user_id FROM public.telegram_connections WHERE user_id=auth.uid() AND telegram_user_id IS NOT NULL FOR UPDATE;
  IF NOT FOUND AND p_enabled THEN RAISE EXCEPTION 'Connect Telegram first'; END IF;
  IF p_enabled IS NULL OR p_amounts IS NULL OR p_days NOT IN (0,1,3,7) OR p_days IS NULL OR p_hour NOT BETWEEN 7 AND 21 OR p_hour IS NULL THEN RAISE EXCEPTION 'Invalid settings'; END IF;
  INSERT INTO public.telegram_reminder_settings(user_id,enabled,days_ahead,hour,include_amounts)
    VALUES(auth.uid(),p_enabled,p_days,p_hour,p_amounts)
    ON CONFLICT (user_id) DO UPDATE SET enabled=EXCLUDED.enabled,days_ahead=EXCLUDED.days_ahead,hour=EXCLUDED.hour,include_amounts=EXCLUDED.include_amounts,updated_at=clock_timestamp();
END;
$$;
REVOKE ALL ON FUNCTION public.telegram_set_reminders(boolean,integer,integer,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.telegram_set_reminders(boolean,integer,integer,boolean) TO authenticated;

CREATE FUNCTION public.telegram_reminder_clock()
RETURNS timestamp LANGUAGE sql SET search_path = '' AS $$ SELECT now() AT TIME ZONE 'America/Sao_Paulo' $$;
REVOKE ALL ON FUNCTION public.telegram_reminder_clock() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_reminder_clock() TO service_role;

CREATE FUNCTION public.telegram_claim_reminder(p_user uuid, p_day date, p_hour integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_chat bigint; v_settings public.telegram_reminder_settings%ROWTYPE; v_ticket uuid;
  v_now timestamp := public.telegram_reminder_clock();
BEGIN
  IF p_day <> v_now::date OR p_hour <> extract(hour FROM v_now)::integer THEN RETURN NULL; END IF;
  SELECT telegram_user_id INTO v_chat FROM public.telegram_connections WHERE user_id=p_user FOR UPDATE;
  IF v_chat IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO v_settings FROM public.telegram_reminder_settings WHERE user_id=p_user FOR UPDATE;
  IF NOT FOUND OR NOT v_settings.enabled OR v_settings.hour <> p_hour THEN RETURN NULL; END IF;
  INSERT INTO public.telegram_reminder_deliveries(user_id,day) VALUES(p_user,p_day)
    ON CONFLICT DO NOTHING RETURNING ticket INTO v_ticket;
  IF v_ticket IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('chatId',v_chat,'ticket',v_ticket,'daysAhead',v_settings.days_ahead,'includeAmounts',v_settings.include_amounts);
END;
$$;
REVOKE ALL ON FUNCTION public.telegram_claim_reminder(uuid,date,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_claim_reminder(uuid,date,integer) TO service_role;

CREATE FUNCTION public.telegram_finish_reminder(p_user uuid, p_day date, p_ticket uuid, p_sent boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.telegram_reminder_deliveries SET status=CASE WHEN p_sent THEN 'sent' ELSE 'failed' END, finished_at=clock_timestamp()
    WHERE user_id=p_user AND day=p_day AND ticket=p_ticket AND status='processing';
END;
$$;
REVOKE ALL ON FUNCTION public.telegram_finish_reminder(uuid,date,uuid,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_finish_reminder(uuid,date,uuid,boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.telegram_disconnect()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  PERFORM user_id FROM public.telegram_connections WHERE user_id = auth.uid() FOR UPDATE;
  UPDATE public.telegram_reminder_settings SET enabled=false,updated_at=clock_timestamp() WHERE user_id=auth.uid();
  UPDATE public.telegram_drafts SET status = 'cancelled' WHERE user_id = auth.uid() AND status = 'pending';
  DELETE FROM public.telegram_connections WHERE user_id = auth.uid();
END;
$$;

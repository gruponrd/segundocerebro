-- Daily quotas contain only a user identifier and counters, never prompts or finances.
CREATE TABLE IF NOT EXISTS public.career_assistant_usage (
  usage_day date NOT NULL,
  owner_id uuid NOT NULL,
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  PRIMARY KEY (usage_day, owner_id)
);
ALTER TABLE public.career_assistant_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.career_assistant_usage FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.career_assistant_claim(p_user uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  today date := (now() AT TIME ZONE 'UTC')::date;
  all_users uuid := '00000000-0000-0000-0000-000000000000';
  total integer;
  person integer;
BEGIN
  IF p_user IS NULL OR p_user = all_users THEN RETURN false; END IF;
  INSERT INTO public.career_assistant_usage(usage_day, owner_id, request_count)
    VALUES (today, all_users, 1)
    ON CONFLICT (usage_day, owner_id) DO UPDATE SET request_count = career_assistant_usage.request_count + 1
    WHERE career_assistant_usage.request_count < 100 RETURNING request_count INTO total;
  IF total IS NULL THEN RETURN false; END IF;
  INSERT INTO public.career_assistant_usage(usage_day, owner_id, request_count)
    VALUES (today, p_user, 1)
    ON CONFLICT (usage_day, owner_id) DO UPDATE SET request_count = career_assistant_usage.request_count + 1
    WHERE career_assistant_usage.request_count < 10 RETURNING request_count INTO person;
  IF person IS NULL THEN
    UPDATE public.career_assistant_usage SET request_count = request_count - 1 WHERE usage_day = today AND owner_id = all_users;
    RETURN false;
  END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.career_assistant_claim(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.career_assistant_claim(uuid) TO service_role;

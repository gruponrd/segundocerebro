CREATE TABLE public.ai_usage_limits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  calls INTEGER NOT NULL CHECK (calls >= 0),
  PRIMARY KEY (user_id, endpoint, window_start)
);

ALTER TABLE public.ai_usage_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_ai_quota(p_endpoint TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller UUID := auth.uid();
  period TIMESTAMPTZ := date_trunc('hour', now());
  accepted INTEGER;
BEGIN
  IF caller IS NULL OR p_endpoint NOT IN ('analyze-income', 'income-coverage') THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.ai_usage_limits (user_id, endpoint, window_start, calls)
  VALUES (caller, p_endpoint, period, 1)
  ON CONFLICT (user_id, endpoint, window_start)
  DO UPDATE SET calls = ai_usage_limits.calls + 1
    WHERE ai_usage_limits.calls < 5
  RETURNING calls INTO accepted;

  RETURN accepted IS NOT NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_ai_quota(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota(TEXT) TO authenticated;

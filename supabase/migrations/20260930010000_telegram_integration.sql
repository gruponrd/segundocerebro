-- Additive integration: existing finance rows are changed only after a confirmed draft.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.telegram_connections (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_user_id bigint UNIQUE CHECK (telegram_user_id > 0),
  telegram_username text,
  linked_at timestamptz,
  pairing_hash text,
  pairing_expires_at timestamptz,
  pairing_requested_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.telegram_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own Telegram connection" ON public.telegram_connections
  FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE ALL ON public.telegram_connections FROM anon, authenticated;
GRANT SELECT (user_id, telegram_user_id, telegram_username, linked_at) ON public.telegram_connections TO authenticated;
GRANT ALL ON public.telegram_connections TO service_role;

CREATE TABLE public.telegram_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id bigint NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_user_id bigint NOT NULL,
  kind text NOT NULL CHECK (kind IN ('incomes', 'expenses')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0 AND amount <= 1000000),
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 240),
  category text NOT NULL CHECK (category IN ('moradia','alimentacao','transporte','lazer','saude','educacao','assinaturas','compras','contas','investimento','outros')),
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year integer NOT NULL CHECK (year BETWEEN 2000 AND 2099),
  paid boolean NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'saved', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  saved_at timestamptz
);
CREATE INDEX telegram_drafts_user_created ON public.telegram_drafts(user_id, created_at DESC);
ALTER TABLE public.telegram_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own Telegram drafts" ON public.telegram_drafts FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE ALL ON public.telegram_drafts FROM anon, authenticated;
GRANT SELECT (id, kind, amount, label, month, year, status, created_at, saved_at) ON public.telegram_drafts TO authenticated;
GRANT ALL ON public.telegram_drafts TO service_role;

CREATE FUNCTION public.telegram_create_pairing()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_connection public.telegram_connections%ROWTYPE;
  v_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_expiry timestamptz := now() + interval '10 minutes';
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  -- The row lock serializes pairing, linking, disconnecting and confirmations.
  INSERT INTO public.telegram_connections(user_id, pairing_requested_at)
    VALUES(v_user, now() - interval '1 minute') ON CONFLICT DO NOTHING;
  SELECT * INTO v_connection FROM public.telegram_connections WHERE user_id = v_user FOR UPDATE;
  IF v_connection.telegram_user_id IS NOT NULL THEN RAISE EXCEPTION 'Already connected'; END IF;
  IF v_connection.pairing_requested_at > now() - interval '30 seconds' THEN RAISE EXCEPTION 'Try again in 30 seconds'; END IF;
  UPDATE public.telegram_connections SET
    pairing_hash = encode(extensions.digest(v_token, 'sha256'), 'hex'),
    pairing_expires_at = v_expiry, pairing_requested_at = now()
    WHERE user_id = v_user;
  RETURN jsonb_build_object('token', v_token, 'expiresAt', v_expiry);
END;
$$;
REVOKE ALL ON FUNCTION public.telegram_create_pairing() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.telegram_create_pairing() TO authenticated;

CREATE FUNCTION public.telegram_disconnect()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  PERFORM user_id FROM public.telegram_connections WHERE user_id = auth.uid() FOR UPDATE;
  UPDATE public.telegram_drafts SET status = 'cancelled' WHERE user_id = auth.uid() AND status = 'pending';
  DELETE FROM public.telegram_connections WHERE user_id = auth.uid();
END;
$$;
REVOKE ALL ON FUNCTION public.telegram_disconnect() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.telegram_disconnect() TO authenticated;

CREATE FUNCTION public.telegram_claim_pairing(p_token text, p_telegram_user_id bigint, p_username text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user uuid;
BEGIN
  IF p_telegram_user_id <= 0 OR p_token !~ '^[a-f0-9]{64}$' THEN RETURN false; END IF;
  SELECT user_id INTO v_user FROM public.telegram_connections
    WHERE pairing_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
      AND pairing_expires_at > now() AND telegram_user_id IS NULL FOR UPDATE;
  IF v_user IS NULL THEN RETURN false; END IF;
  IF EXISTS(SELECT 1 FROM public.telegram_connections WHERE telegram_user_id = p_telegram_user_id) THEN RETURN false; END IF;
  UPDATE public.telegram_connections SET telegram_user_id = p_telegram_user_id,
    telegram_username = left(p_username, 64), linked_at = now(), pairing_hash = NULL, pairing_expires_at = NULL
    WHERE user_id = v_user;
  RETURN true;
EXCEPTION WHEN unique_violation THEN RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION public.telegram_claim_pairing(text, bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_claim_pairing(text, bigint, text) TO service_role;

CREATE FUNCTION public.telegram_create_draft(p_update_id bigint, p_telegram_user_id bigint, p_entry jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user uuid; v_draft public.telegram_drafts%ROWTYPE;
BEGIN
  SELECT user_id INTO v_user FROM public.telegram_connections WHERE telegram_user_id = p_telegram_user_id FOR UPDATE;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not connected'; END IF;
  SELECT * INTO v_draft FROM public.telegram_drafts WHERE update_id = p_update_id;
  IF FOUND THEN
    IF v_draft.user_id <> v_user OR v_draft.telegram_user_id <> p_telegram_user_id THEN RAISE EXCEPTION 'Invalid update'; END IF;
    RETURN to_jsonb(v_draft);
  END IF;
  IF (SELECT count(*) FROM public.telegram_drafts WHERE user_id = v_user AND created_at > now() - interval '1 day') >= 200
    THEN RAISE EXCEPTION 'Daily limit reached'; END IF;
  INSERT INTO public.telegram_drafts(update_id, user_id, telegram_user_id, kind, amount, label, category, month, year, paid)
    VALUES(p_update_id, v_user, p_telegram_user_id, p_entry->>'kind', (p_entry->>'amount')::numeric,
      p_entry->>'label', p_entry->>'category', (p_entry->>'month')::integer, (p_entry->>'year')::integer, (p_entry->>'paid')::boolean)
    RETURNING * INTO v_draft;
  RETURN to_jsonb(v_draft);
END;
$$;
REVOKE ALL ON FUNCTION public.telegram_create_draft(bigint, bigint, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_create_draft(bigint, bigint, jsonb) TO service_role;

CREATE FUNCTION public.telegram_resolve_draft(p_id uuid, p_telegram_user_id bigint, p_confirm boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user uuid; v_draft public.telegram_drafts%ROWTYPE; v_finance public.user_financial_data%ROWTYPE;
  v_months jsonb; v_month jsonb; v_items jsonb; v_index integer; v_entry jsonb; v_month_name text;
  v_names text[] := ARRAY['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
BEGIN
  SELECT user_id INTO v_user FROM public.telegram_connections WHERE telegram_user_id = p_telegram_user_id FOR UPDATE;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not connected'; END IF;
  SELECT * INTO v_draft FROM public.telegram_drafts WHERE id = p_id AND user_id = v_user AND telegram_user_id = p_telegram_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Draft not found'; END IF;
  IF v_draft.status <> 'pending' THEN RETURN jsonb_build_object('status', v_draft.status, 'duplicate', true); END IF;
  IF NOT p_confirm OR v_draft.expires_at <= now() THEN
    UPDATE public.telegram_drafts SET status = 'cancelled' WHERE id = p_id;
    RETURN jsonb_build_object('status', 'cancelled', 'expired', v_draft.expires_at <= now());
  END IF;

  -- Append to the latest row while holding its lock, never replace a stale snapshot.
  SELECT * INTO v_finance FROM public.user_financial_data WHERE user_id = v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Open and save the app first'; END IF;
  v_months := COALESCE(v_finance.data->'cashflowMonths', '[]'::jsonb);
  IF jsonb_typeof(v_months) <> 'array' THEN RAISE EXCEPTION 'Invalid cashflow data'; END IF;
  v_month_name := v_names[v_draft.month];
  SELECT (ordinality - 1)::integer INTO v_index FROM jsonb_array_elements(v_months) WITH ORDINALITY AS m(value, ordinality)
    WHERE value->>'month' = v_month_name AND value->>'year' = v_draft.year::text LIMIT 1;
  IF v_index IS NULL THEN
    v_index := jsonb_array_length(v_months);
    v_months := v_months || jsonb_build_array(jsonb_build_object('month', v_month_name, 'year', v_draft.year, 'incomes', '[]'::jsonb, 'expenses', '[]'::jsonb));
  END IF;
  v_month := v_months->v_index;
  v_items := COALESCE(v_month->v_draft.kind, '[]'::jsonb);
  IF jsonb_typeof(v_items) <> 'array' THEN RAISE EXCEPTION 'Invalid cashflow entries'; END IF;
  v_entry := jsonb_build_object('id', 'telegram:' || p_id::text, 'source', 'telegram', 'label', v_draft.label,
    'amount', v_draft.amount, 'paid', v_draft.paid, 'category', v_draft.category);
  v_month := jsonb_set(v_month, ARRAY[v_draft.kind], v_items || jsonb_build_array(v_entry));
  v_months := jsonb_set(v_months, ARRAY[v_index::text], v_month);
  UPDATE public.user_financial_data SET data = jsonb_set(v_finance.data, ARRAY['cashflowMonths'], v_months),
    updated_at = GREATEST(clock_timestamp(), v_finance.updated_at + interval '1 microsecond') WHERE user_id = v_user;
  UPDATE public.telegram_drafts SET status = 'saved', saved_at = now() WHERE id = p_id;
  RETURN jsonb_build_object('status', 'saved', 'duplicate', false);
END;
$$;
REVOKE ALL ON FUNCTION public.telegram_resolve_draft(uuid, bigint, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_resolve_draft(uuid, bigint, boolean) TO service_role;

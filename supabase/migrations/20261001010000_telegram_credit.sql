-- Add credit drafts; no existing finance records are rewritten by this migration.
BEGIN;
ALTER TABLE public.telegram_drafts DROP CONSTRAINT telegram_drafts_kind_check;
ALTER TABLE public.telegram_drafts ADD CONSTRAINT telegram_drafts_kind_check CHECK (kind IN ('incomes','expenses','credit'));
ALTER TABLE public.telegram_drafts ADD COLUMN credit jsonb;
ALTER TABLE public.telegram_drafts ADD CONSTRAINT telegram_drafts_credit_check CHECK (
  (kind = 'credit' AND credit IS NOT NULL AND jsonb_typeof(credit) = 'object' AND paid = false) OR (kind <> 'credit' AND credit IS NULL)
);
GRANT SELECT (credit) ON public.telegram_drafts TO authenticated;
CREATE OR REPLACE FUNCTION public.telegram_create_draft(p_update_id bigint, p_telegram_user_id bigint, p_entry jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user uuid; v_draft public.telegram_drafts%ROWTYPE;
  v_banks jsonb; v_bank jsonb; v_matches integer; v_credit jsonb; v_schedule jsonb := '[]'::jsonb;
  v_amount numeric; v_cents bigint; v_count integer; v_first date; v_due date; v_start date; v_day integer; v_i integer;
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
  IF p_entry->>'kind' = 'credit' THEN
    v_amount := (p_entry->>'amount')::numeric;
    v_count := (p_entry->'credit'->>'installments')::integer;
    IF v_amount IS NULL OR v_amount <= 0 OR v_amount > 1000000 OR round(v_amount,2) <> v_amount
      OR v_count IS NULL OR v_count < 1 OR v_count > 60 OR v_count > v_amount * 100 THEN RAISE EXCEPTION 'Invalid credit amount or installments'; END IF;
    IF COALESCE(p_entry->'credit'->>'firstDueDate','') !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
      OR COALESCE(length(p_entry->'credit'->>'bankId'),0) NOT BETWEEN 1 AND 240 THEN RAISE EXCEPTION 'Invalid credit details'; END IF;
    v_first := (p_entry->'credit'->>'firstDueDate')::date;
    v_day := extract(day FROM v_first)::integer;
    SELECT data->'banks' INTO v_banks FROM public.user_financial_data WHERE user_id = v_user;
    IF v_banks IS NULL OR jsonb_typeof(v_banks) <> 'array' THEN RAISE EXCEPTION 'Card unavailable'; END IF;
    SELECT count(*) INTO v_matches FROM jsonb_array_elements(v_banks) AS b(value)
      WHERE value->>'id' = p_entry->'credit'->>'bankId' AND COALESCE(value->>'status','pendente') <> 'cancelado';
    IF v_matches <> 1 THEN RAISE EXCEPTION 'Card unavailable'; END IF;
    SELECT value INTO v_bank FROM jsonb_array_elements(v_banks) AS b(value) WHERE value->>'id' = p_entry->'credit'->>'bankId';
    v_cents := (v_amount * 100)::bigint;
    FOR v_i IN 0..v_count-1 LOOP
      v_start := (date_trunc('month',v_first) + make_interval(months => v_i))::date;
      v_due := v_start + (LEAST(v_day,extract(day FROM v_start + interval '1 month - 1 day')::integer) - 1);
      IF extract(year FROM v_due) > 2099 THEN RAISE EXCEPTION 'Invalid final due date'; END IF;
      v_schedule := v_schedule || jsonb_build_array(jsonb_build_object('dueDate',to_char(v_due,'YYYY-MM-DD'),'number',v_i+1,
        'amount',(v_cents / v_count + CASE WHEN v_i = v_count-1 THEN v_cents % v_count ELSE 0 END)::numeric / 100));
    END LOOP;
    v_credit := jsonb_build_object('bankId',v_bank->>'id','bankName',v_bank->>'name','installments',v_count,'firstDueDate',to_char(v_first,'YYYY-MM-DD'),'schedule',v_schedule);
    p_entry := p_entry || jsonb_build_object('month',extract(month FROM v_first)::integer,'year',extract(year FROM v_first)::integer,'paid',false);
  END IF;
  INSERT INTO public.telegram_drafts(update_id, user_id, telegram_user_id, kind, amount, label, category, month, year, paid, credit)
    VALUES(p_update_id, v_user, p_telegram_user_id, p_entry->>'kind', (p_entry->>'amount')::numeric,
      p_entry->>'label', p_entry->>'category', (p_entry->>'month')::integer, (p_entry->>'year')::integer, (p_entry->>'paid')::boolean, v_credit)
    RETURNING * INTO v_draft;
  RETURN to_jsonb(v_draft);
END;
$$;
REVOKE ALL ON FUNCTION public.telegram_create_draft(bigint, bigint, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_create_draft(bigint, bigint, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.telegram_resolve_draft(p_id uuid, p_telegram_user_id bigint, p_confirm boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user uuid; v_draft public.telegram_drafts%ROWTYPE; v_finance public.user_financial_data%ROWTYPE;
  v_months jsonb; v_month jsonb; v_items jsonb; v_index integer; v_entry jsonb; v_month_name text;
  v_banks jsonb; v_bank jsonb; v_schedule jsonb; v_due date; v_bank_index integer; v_matches integer; v_i integer;
  v_names text[] := ARRAY['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
BEGIN
  SELECT user_id INTO v_user FROM public.telegram_connections WHERE telegram_user_id = p_telegram_user_id FOR UPDATE;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not connected'; END IF;
  SELECT * INTO v_draft FROM public.telegram_drafts WHERE id = p_id AND user_id = v_user AND telegram_user_id = p_telegram_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Draft not found'; END IF;
  IF v_draft.status <> 'pending' THEN RETURN jsonb_build_object('status', v_draft.status, 'kind', v_draft.kind, 'duplicate', true); END IF;
  IF NOT p_confirm OR v_draft.expires_at <= now() THEN
    UPDATE public.telegram_drafts SET status = 'cancelled' WHERE id = p_id;
    RETURN jsonb_build_object('status', 'cancelled', 'expired', v_draft.expires_at <= now());
  END IF;

  -- Append to the latest row while holding its lock, never replace a stale snapshot.
  SELECT * INTO v_finance FROM public.user_financial_data WHERE user_id = v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Open and save the app first'; END IF;

  IF v_draft.kind = 'credit' THEN
    v_banks := v_finance.data->'banks';
    IF v_banks IS NULL OR jsonb_typeof(v_banks) <> 'array' THEN RAISE EXCEPTION 'Invalid card data'; END IF;
    SELECT count(*), min((ordinality-1)::integer) INTO v_matches, v_bank_index
      FROM jsonb_array_elements(v_banks) WITH ORDINALITY AS b(value,ordinality)
      WHERE value->>'id' = v_draft.credit->>'bankId' AND COALESCE(value->>'status','pendente') <> 'cancelado';
    IF v_matches <> 1 THEN
      UPDATE public.telegram_drafts SET status = 'cancelled' WHERE id = p_id;
      RETURN jsonb_build_object('status','cancelled','reason','card_unavailable');
    END IF;
    v_bank := v_banks->v_bank_index;
    v_items := COALESCE(v_bank->'installments','[]'::jsonb);
    v_months := COALESCE(v_finance.data->'cashflowMonths','[]'::jsonb);
    v_schedule := v_draft.credit->'schedule';
    IF jsonb_typeof(v_items) <> 'array' OR jsonb_typeof(v_months) <> 'array' OR jsonb_typeof(v_schedule) <> 'array' THEN RAISE EXCEPTION 'Invalid card schedule'; END IF;
    FOR v_i IN 0..jsonb_array_length(v_schedule)-1 LOOP
      v_entry := v_schedule->v_i;
      v_due := (v_entry->>'dueDate')::date;
      v_items := v_items || jsonb_build_array(jsonb_build_object('id','telegram:' || p_id::text || ':' || (v_i+1)::text,
        'source','telegram','purchaseId','telegram:' || p_id::text,'description',v_draft.label,'totalAmount',v_draft.amount,
        'installmentAmount',(v_entry->>'amount')::numeric,'currentInstallment',v_i+1,'totalInstallments',jsonb_array_length(v_schedule),
        'dueDate',v_entry->>'dueDate','status','pendente','category',v_draft.category));
      -- Ensure each future bill can be viewed in Fluxo, without adding a duplicate expense.
      IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_months) AS m(value)
        WHERE value->>'month' = v_names[extract(month FROM v_due)::integer] AND value->>'year' = extract(year FROM v_due)::integer::text) THEN
        v_months := v_months || jsonb_build_array(jsonb_build_object('month',v_names[extract(month FROM v_due)::integer],
          'year',extract(year FROM v_due)::integer,'incomes','[]'::jsonb,'expenses','[]'::jsonb));
      END IF;
    END LOOP;
    v_bank := jsonb_set(v_bank,ARRAY['installments'],v_items);
    v_banks := jsonb_set(v_banks,ARRAY[v_bank_index::text],v_bank);
    UPDATE public.user_financial_data SET data = jsonb_set(jsonb_set(v_finance.data,ARRAY['banks'],v_banks),ARRAY['cashflowMonths'],v_months),
      updated_at = GREATEST(clock_timestamp(),v_finance.updated_at + interval '1 microsecond') WHERE user_id = v_user;
    UPDATE public.telegram_drafts SET status = 'saved', saved_at = now() WHERE id = p_id;
    RETURN jsonb_build_object('status','saved','kind','credit','duplicate',false);
  END IF;
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

COMMIT;

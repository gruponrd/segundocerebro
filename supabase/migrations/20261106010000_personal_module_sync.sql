-- Separate account-owned module documents. Existing financial records and migration backups are untouched.
CREATE TABLE public.personal_module_data (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_key text NOT NULL CHECK (module_key IN ('fin_wishes_v1', 'fin_dreamboard', 'neuro-recovery-v1', 'routine-store-v1', 'payment-session-income-map-v1')),
  data jsonb NOT NULL,
  revision uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, module_key)
);
ALTER TABLE public.personal_module_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own personal modules" ON public.personal_module_data FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Create own personal modules" ON public.personal_module_data FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own personal modules" ON public.personal_module_data FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
REVOKE ALL ON public.personal_module_data FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.personal_module_data TO authenticated;
GRANT ALL ON public.personal_module_data TO service_role;

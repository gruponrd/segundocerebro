-- Immutable copies of account-owned browser modules recovered during migration.
-- Financial data remains in user_financial_data.
CREATE TABLE public.account_migration_modules (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  modules jsonb NOT NULL CHECK (jsonb_typeof(modules) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.account_migration_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own migrated modules" ON public.account_migration_modules
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE ALL ON public.account_migration_modules FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.account_migration_modules TO authenticated;
GRANT ALL ON public.account_migration_modules TO service_role;

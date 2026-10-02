import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// Ephemeral PostgreSQL: no credentials, network or production data.
const db = new PGlite();
const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const newcomer = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const original = { salary: 5000, banks: [{ id: 'my-card', limitUsed: 350 }], goals: [{ id: 'my-goal', savedAmount: 99 }] };
const asNewcomer = async () => {
  await db.exec('SET ROLE authenticated');
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [newcomer]);
};
before(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY, raw_user_meta_data jsonb DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated;`);
  await db.exec(await readFile(new URL('../supabase/migrations/20260310202807_bef132ce-b45d-4746-9670-001679f3cd3e.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/20260930020000_account_migration_modules.sql', import.meta.url), 'utf8'));
  await db.exec('GRANT SELECT, INSERT, UPDATE ON public.profiles, public.user_financial_data TO authenticated');
  await db.query('INSERT INTO auth.users(id,raw_user_meta_data) VALUES ($1,$2),($3,$4)',
    [owner, JSON.stringify({ display_name: 'Existing owner' }), newcomer, JSON.stringify({ display_name: 'Marina Costa' })]);
  await db.query('INSERT INTO public.user_financial_data(user_id,data) VALUES ($1,$2)', [owner, JSON.stringify(original)]);
  await db.query('INSERT INTO public.account_migration_modules(user_id,modules) VALUES ($1,$2)', [owner, JSON.stringify({ fin_wishes_v1: '["private"]' })]);
});
after(() => db.close());

test('registration creates only the new profile with the supplied name', async () => {
  await asNewcomer();
  assert.deepEqual((await db.query('SELECT user_id,display_name FROM public.profiles')).rows,
    [{ user_id: newcomer, display_name: 'Marina Costa' }]);
  assert.equal((await db.query('SELECT * FROM public.user_financial_data')).rows.length, 0);
  assert.equal((await db.query('SELECT * FROM public.account_migration_modules')).rows.length, 0);
});
test('new user can save their own empty state without touching the existing account', async () => {
  await asNewcomer();
  await db.query('INSERT INTO public.user_financial_data(user_id,data) VALUES ($1,$2)', [newcomer, JSON.stringify({ banks: [], goals: [], salary: 0 })]);
  assert.equal((await db.query('SELECT * FROM public.user_financial_data')).rows.length, 1);
  await db.exec('RESET ROLE');
  assert.deepEqual((await db.query('SELECT data FROM public.user_financial_data WHERE user_id=$1', [owner])).rows[0].data, original);
});
test('new user cannot read or update the owner profile or financial records', async () => {
  await asNewcomer();
  assert.equal((await db.query('SELECT * FROM public.user_financial_data WHERE user_id=$1', [owner])).rows.length, 0);
  assert.equal((await db.query('UPDATE public.user_financial_data SET data=\'{}\' WHERE user_id=$1 RETURNING user_id', [owner])).rows.length, 0);
  assert.equal((await db.query('UPDATE public.profiles SET display_name=\'Changed\' WHERE user_id=$1 RETURNING user_id', [owner])).rows.length, 0);
  await assert.rejects(() => db.query('INSERT INTO public.user_financial_data(user_id,data) VALUES ($1,\'{}\')', [owner]), /row-level security/);
});

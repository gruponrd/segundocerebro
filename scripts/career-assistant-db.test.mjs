import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const user = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
before(async () => {
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
  await db.exec(await readFile(new URL('../supabase/migrations/20261110030000_career_assistant_quota.sql', import.meta.url), 'utf8'));
});
after(() => db.close());
test('clients cannot access counters or claim quota', async () => {
  await db.exec('SET ROLE authenticated');
  await assert.rejects(() => db.query('SELECT * FROM public.career_assistant_usage'), /permission denied/i);
  await assert.rejects(() => db.query('SELECT public.career_assistant_claim($1)', [user]), /permission denied/i);
  await db.exec('RESET ROLE');
});
test('service enforces ten calls per user and one hundred globally without writing financial data', async () => {
  await db.exec('SET ROLE service_role');
  for (let i = 0; i < 10; i++) assert.equal((await db.query('SELECT public.career_assistant_claim($1) AS ok', [user])).rows[0].ok, true);
  assert.equal((await db.query('SELECT public.career_assistant_claim($1) AS ok', [user])).rows[0].ok, false);
  await db.exec('RESET ROLE');
  const total = (await db.query("SELECT request_count FROM public.career_assistant_usage WHERE owner_id='00000000-0000-0000-0000-000000000000'" )).rows[0].request_count;
  assert.equal(total, 10);
  await db.exec("UPDATE public.career_assistant_usage SET request_count=100 WHERE owner_id='00000000-0000-0000-0000-000000000000'");
  await db.exec('SET ROLE service_role');
  assert.equal((await db.query('SELECT public.career_assistant_claim($1) AS ok', ['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'])).rows[0].ok, false);
  await db.exec('RESET ROLE');
});

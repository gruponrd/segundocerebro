import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

// In-memory PostgreSQL only. Never connects to Supabase or reads production credentials.
const db = new PGlite({ extensions: { pgcrypto } });
const userA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const userB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const original = {
  banks: [{ id: 'bank', name: 'Preservar cartão', installments: [{ amount: 123 }] }],
  goals: [{ id: 'goal', savedAmount: 987 }], creditors: [{ id: 'creditor', totalDebt: 456 }],
  customUntouched: { nested: ['preservar'] },
  cashflowMonths: [{ month: 'Setembro', year: 2026, incomes: [{ label: 'Original', amount: 1000 }], expenses: [{ label: 'Existente', amount: 20, paid: true }] }],
};
const entry = { kind: 'expenses', amount: 45.9, label: 'Teste isolado', category: 'alimentacao', month: 9, year: 2026, paid: true };
const scalar = async (sql, params = []) => (await db.query(sql, params)).rows[0].result;
const asUser = async id => { await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id]); };
const createDraft = async (update, sender = 10, details = entry) => scalar('SELECT public.telegram_create_draft($1,$2,$3::jsonb) AS result', [update, sender, JSON.stringify(details)]);
const resolve = async (id, sender = 10, confirm = true) => scalar('SELECT public.telegram_resolve_draft($1,$2,$3) AS result', [id, sender, confirm]);
const finance = async () => scalar('SELECT data AS result FROM public.user_financial_data WHERE user_id=$1', [userA]);

before(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE SCHEMA extensions;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, raw_user_meta_data jsonb DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated, service_role;`);
  await db.exec(await readFile(new URL('../supabase/migrations/20260310202807_bef132ce-b45d-4746-9670-001679f3cd3e.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/20260930010000_telegram_integration.sql', import.meta.url), 'utf8'));
  await db.query('INSERT INTO auth.users(id) VALUES ($1),($2)', [userA, userB]);
  await db.query('INSERT INTO public.user_financial_data(user_id,data) VALUES ($1,$2::jsonb),($3,$4::jsonb)', [userA, JSON.stringify(original), userB, JSON.stringify({ cashflowMonths: [] })]);
  await db.query('INSERT INTO public.telegram_connections(user_id,telegram_user_id) VALUES ($1,10),($2,20)', [userA, userB]);
});
after(() => db.close());

test('migration leaves existing user data untouched', async () => assert.deepEqual(await finance(), original));
test('draft creation does not change financial data', async () => { await createDraft(1); assert.deepEqual(await finance(), original); });
test('another Telegram user cannot confirm the draft', async () => {
  const draft = await createDraft(1);
  await assert.rejects(() => resolve(draft.id, 20), /Draft not found/);
  assert.deepEqual(await finance(), original);
});
test('confirmation appends once and preserves all other values', async () => {
  const draft = await createDraft(1);
  assert.equal((await resolve(draft.id)).status, 'saved');
  const saved = await finance();
  assert.deepEqual({ ...saved, cashflowMonths: original.cashflowMonths }, original);
  assert.deepEqual(saved.cashflowMonths[0].incomes, original.cashflowMonths[0].incomes);
  assert.deepEqual(saved.cashflowMonths[0].expenses[0], original.cashflowMonths[0].expenses[0]);
  assert.equal(saved.cashflowMonths[0].expenses[1].amount, 45.9);
  assert.equal(saved.cashflowMonths[0].expenses[1].source, 'telegram');
});
test('repeated updates and confirmations cannot double the amount', async () => {
  const draft = await createDraft(1);
  assert.equal(draft.status, 'saved');
  const before = await finance();
  const replies = await Promise.all([resolve(draft.id), resolve(draft.id), resolve(draft.id)]);
  assert(replies.every(result => result.duplicate));
  assert.deepEqual(await finance(), before);
});
test('latest database values survive an app edit before confirmation', async () => {
  const draft = await createDraft(2);
  await db.query("UPDATE public.user_financial_data SET data=jsonb_set(data,'{goals,0,savedAmount}','999') WHERE user_id=$1", [userA]);
  await resolve(draft.id);
  assert.equal((await finance()).goals[0].savedAmount, 999);
});
test('cancellation and expiry never write cashflow', async () => {
  const snapshot = await finance();
  const cancel = await createDraft(3);
  assert.equal((await resolve(cancel.id, 10, false)).status, 'cancelled');
  const expired = await createDraft(4);
  await db.query("UPDATE public.telegram_drafts SET expires_at=now()-interval '1 minute' WHERE id=$1", [expired.id]);
  assert.equal((await resolve(expired.id)).expired, true);
  assert.deepEqual(await finance(), snapshot);
});
test('adding a missing month keeps all previous months', async () => {
  const previous = await finance();
  const draft = await createDraft(5, 10, { ...entry, kind: 'incomes', month: 10 });
  await resolve(draft.id);
  const saved = await finance();
  assert.deepEqual(saved.cashflowMonths[0], previous.cashflowMonths[0]);
  assert.equal(saved.cashflowMonths[1].month, 'Outubro');
  assert.equal(saved.cashflowMonths[1].incomes[0].amount, 45.9);
});
test('history reads only granted columns and RLS isolates each account', async () => {
  const other = await createDraft(7, 20, { ...entry, label: 'Only account B' });
  await resolve(other.id, 20);
  const historyQuery = "SELECT id,kind,amount,label,month,year,status,created_at,saved_at FROM public.telegram_drafts WHERE status='saved' ORDER BY created_at DESC LIMIT 8";
  await asUser(userA);
  await db.exec('SET ROLE authenticated');
  try {
    await assert.rejects(() => db.query("SELECT id FROM public.telegram_drafts WHERE user_id=$1", [userA]), /permission denied/);
    const history = (await db.query(historyQuery)).rows;
    assert(history.length > 0);
    assert(history.every(row => row.label !== 'Only account B'));
    await asUser(userB);
    const otherHistory = (await db.query(historyQuery)).rows;
    assert.equal(otherHistory.length, 1);
    assert.equal(otherHistory[0].label, 'Only account B');
  } finally { await db.exec('RESET ROLE'); }
});

test('anonymous and authenticated clients cannot call the saving RPC', async () => {
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`SET ROLE ${role}`);
    try { await assert.rejects(() => resolve('11111111-1111-4111-8111-111111111111'), /permission denied/); }
    finally { await db.exec('RESET ROLE'); }
  }
});
test('disconnect cancels drafts and blocks further confirmations without touching saved data', async () => {
  const snapshot = await finance();
  const draft = await createDraft(6);
  await asUser(userA);
  await db.exec('SET ROLE authenticated');
  try { await db.query('SELECT public.telegram_disconnect()'); } finally { await db.exec('RESET ROLE'); }
  await assert.rejects(() => resolve(draft.id), /Not connected/);
  assert.deepEqual(await finance(), snapshot);
});
test('pairing codes expire, are single-use, hashed, and cannot replace a linked account', async () => {
  await asUser(userA);
  const pairing = await scalar('SELECT public.telegram_create_pairing() AS result');
  assert.match(pairing.token, /^[a-f0-9]{64}$/);
  const storedHash = await scalar('SELECT pairing_hash AS result FROM public.telegram_connections WHERE user_id=$1', [userA]);
  assert.notEqual(storedHash, pairing.token);
  await assert.rejects(() => scalar('SELECT public.telegram_create_pairing() AS result'), /30 seconds/);
  assert.equal(await scalar('SELECT public.telegram_claim_pairing($1,30,$2) AS result', [pairing.token, 'test_user']), true);
  assert.equal(await scalar('SELECT public.telegram_claim_pairing($1,40,$2) AS result', [pairing.token, 'intruder']), false);
  await assert.rejects(() => scalar('SELECT public.telegram_create_pairing() AS result'), /Already connected/);
  await db.query('SELECT public.telegram_disconnect()');
  const expired = await scalar('SELECT public.telegram_create_pairing() AS result');
  await db.query("UPDATE public.telegram_connections SET pairing_expires_at=now()-interval '1 minute' WHERE user_id=$1", [userA]);
  assert.equal(await scalar('SELECT public.telegram_claim_pairing($1,30,$2) AS result', [expired.token, 'test_user']), false);
});

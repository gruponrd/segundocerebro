import {after,before,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
// In-memory only: no production credentials, messages or data.
const db = new PGlite({extensions:{pgcrypto}});
const a='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', b='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const original={banks:[{id:'existing',installments:[]}],goals:[{id:'g',savedAmount:500}],cashflowMonths:[]};
const scalar=async (sql,params=[]) => (await db.query(sql,params)).rows[0]?.result;
const user=async id=>db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id]);
const settings=async (enabled=true,days=3,hour=9)=>db.query('SELECT public.telegram_set_reminders($1,$2,$3,false)',[enabled,days,hour]);
const claim=async (id=a,day='2026-10-10',hour=9)=>scalar('SELECT public.telegram_claim_reminder($1,$2,$3) AS result',[id,day,hour]);
before(async()=>{
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE SCHEMA extensions; CREATE TABLE auth.users(id uuid PRIMARY KEY,raw_user_meta_data jsonb DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated,service_role;`);
  for (const name of ['20260310202807_bef132ce-b45d-4746-9670-001679f3cd3e.sql','20260930010000_telegram_integration.sql']) await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
  await db.query('INSERT INTO auth.users(id) VALUES($1),($2)',[a,b]);
  await db.query('INSERT INTO public.user_financial_data(user_id,data) VALUES($1,$2::jsonb)',[a,JSON.stringify(original)]);
  await db.query('INSERT INTO public.telegram_connections(user_id,telegram_user_id) VALUES($1,10)',[a]);
  await db.exec(await readFile(new URL('../supabase/migrations/20261010010000_telegram_reminders.sql',import.meta.url),'utf8'));
  await db.exec("CREATE OR REPLACE FUNCTION public.telegram_reminder_clock() RETURNS timestamp LANGUAGE sql AS $$ SELECT timestamp '2026-10-10 09:00:00' $$;");
});
after(()=>db.close());
test('migration preserves all existing finance and defaults are opt-in',async()=>{
  assert.deepEqual(await scalar('SELECT data AS result FROM public.user_financial_data WHERE user_id=$1',[a]),original);
  assert.equal(await scalar('SELECT count(*)::integer AS result FROM public.telegram_reminder_settings'),0);
  assert.equal(await claim(),null);
});
test('anonymous, unconnected and invalid preferences are rejected',async()=>{
  await user(''); await assert.rejects(()=>settings());
  await user(b); await assert.rejects(()=>settings());
  await user(a); await assert.rejects(()=>settings(true,2)); await assert.rejects(()=>settings(true,3,25));
});
test('settings belong only to the authenticated user',async()=>{
  await user(a); await settings();
  await db.exec('SET ROLE authenticated'); await user(b);
  assert.equal(await scalar('SELECT count(*)::integer AS result FROM public.telegram_reminder_settings'),0);
  await assert.rejects(()=>db.query('UPDATE public.telegram_reminder_settings SET enabled=false'));
  await db.exec('RESET ROLE');
});
test('only service role can claim deliveries and wrong day/hour never sends',async()=>{
  await db.exec('SET ROLE authenticated'); await assert.rejects(()=>claim()); await db.exec('RESET ROLE');
  assert.equal(await claim(a,'2026-10-09'),null);
  assert.equal(await claim(a,'2026-10-10',10),null);
  await db.exec('SET ROLE service_role'); const delivery=await claim(); await db.exec('RESET ROLE');
  assert.equal(delivery.chatId,10); assert.equal(delivery.includeAmounts,false);
});
test('concurrent runs claim at most once; acknowledgement requires the ticket',async()=>{
  const repeated=await Promise.all([claim(),claim(),claim()]); assert(repeated.every(x=>x===null));
  await db.query('SELECT public.telegram_finish_reminder($1,$2,$3,true)',[a,'2026-10-10','00000000-0000-4000-8000-000000000000']);
  assert.equal(await scalar('SELECT status AS result FROM public.telegram_reminder_deliveries WHERE user_id=$1',[a]),'processing');
  const ticket=await scalar('SELECT ticket AS result FROM public.telegram_reminder_deliveries WHERE user_id=$1',[a]);
  await db.query('SELECT public.telegram_finish_reminder($1,$2,$3,true)',[a,'2026-10-10',ticket]);
  assert.equal(await scalar('SELECT status AS result FROM public.telegram_reminder_deliveries WHERE user_id=$1',[a]),'sent');
  assert.equal(await claim(),null);
});
test('disabling or disconnecting blocks future reminders and preserves finance',async()=>{
  await user(a); await settings(false); assert.equal(await claim(),null);
  await settings(true); await db.query('SELECT public.telegram_disconnect()');
  assert.equal(await scalar('SELECT enabled AS result FROM public.telegram_reminder_settings WHERE user_id=$1',[a]),false);
  assert.equal(await claim(),null);
  assert.deepEqual(await scalar('SELECT data AS result FROM public.user_financial_data WHERE user_id=$1',[a]),original);
});

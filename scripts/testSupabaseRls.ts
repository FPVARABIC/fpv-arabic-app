#!/usr/bin/env tsx
/**
 * The RLS policies, EXERCISED — not read.
 *
 * WHY THIS RUNS A REAL POSTGRESQL
 * ===============================
 * «المستخدم لا ينتحل معرف مستخدم آخر» is a claim about what happens when
 * somebody tries it. A test that greps the policy file for `auth.uid()` proves
 * that a string is present; it cannot tell a policy that works from one whose
 * `using` and `with check` are the wrong way round — and that mistake reads as
 * correct.
 *
 * So this spins up a stock PostgreSQL 16, applies the real migrations, and
 * then connects AS each role and tries the thing. A pass means the database
 * refused it; a fail means it did not.
 *
 * WHAT MAKES IT HONEST
 * ====================
 * Every deny assertion has a matching ALLOW assertion. «the user cannot read
 * supplier cost» passes trivially if nobody can read anything, so the suite
 * also proves the admin CAN — otherwise a broken migration that created no
 * tables at all would look like perfect security.
 *
 * The shim in `supabase/test/00_supabase_shim.sql` supplies `auth.uid()` and
 * the three PostgREST roles. It is test scaffolding and is asserted to live
 * outside `supabase/migrations/`.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { remoteConfig, remoteSql, remoteSqlAsPsql, type RemoteConfig } from './lib/supabaseRemote';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PGHOST = '/tmp';
const PGPORT = process.env.RLS_TEST_PORT ?? '55432';
const DB = 'fpvarabic_rls_test';

/**
 * REMOTE MODE — the same suite, pointed at the REAL project.
 *
 * `SUPABASE_REMOTE=1` swaps the executor from local psql to the Management
 * API and changes NOTHING about what is asserted: the policies under test
 * are the ones the reconciler applied to the live database, exercised as the
 * live `anon` / `authenticated` roles.
 *
 * Three mechanical differences, each forced by the channel:
 *   · a probe cannot end in `rollback` (the API returns the LAST statement's
 *     rows), so remote probes rely on the session's implicit rollback —
 *     every call is its own session, and an uncommitted transaction dies
 *     with it
 *   · seeds COMMIT (sessions share nothing), so remote runs register a
 *     cleanup that deletes every seeded row by its known id — before seeding
 *     (a crashed earlier run) and again on exit
 *   · the local bootstrap (scratch cluster, shims, migration apply) is
 *     skipped: the real database is expected to be reconciled already, and
 *     the suite REFUSES to run if the signature policy is absent rather
 *     than passing vacuously against empty tables
 */
const REMOTE = process.env.SUPABASE_REMOTE === '1';
let RCFG: RemoteConfig | null = null;
if (REMOTE) {
  const r = remoteConfig();
  if (!r.ok) {
    console.error(`✋ SUPABASE_REMOTE=1 لكن ينقص: ${r.missing.join(', ')}`);
    process.exit(2);
  }
  RCFG = r.cfg;
}

let passed = 0;
let failed = 0;
function ok(label: string, cond: boolean, detail = ''): void {
  if (cond) { passed++; console.log(`  ok — ${label}`); }
  else { failed++; console.log(`  FAIL — ${label}${detail ? ` — ${detail}` : ''}`); }
}

function psql(sql: string, db = DB): string {
  if (REMOTE) return remoteSqlAsPsql(RCFG!, sql).trim();
  return execFileSync('psql', [
    '-h', PGHOST, '-p', PGPORT, '-U', 'postgres', '-d', db,
    '-v', 'ON_ERROR_STOP=1', '-tAc', sql,
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function psqlFile(file: string, db = DB): void {
  execFileSync('psql', [
    '-h', PGHOST, '-p', PGPORT, '-U', 'postgres', '-d', db,
    '-v', 'ON_ERROR_STOP=1', '-f', file,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
}

/**
 * Run `sql` as `role`, impersonating `uid`, and report whether it was allowed.
 *
 * `set local role` plus the JWT GUCs is exactly how PostgREST presents a
 * request to the database, so a statement that is refused here is refused in
 * production for the same reason.
 */
function asUser(role: string, uid: string | null, sql: string): { okd: boolean; out: string } {
  const claim = uid ? `set local request.jwt.claim.sub = '${uid}';` : '';
  // Remotely the probe ends on its OWN last statement: the API returns the
  // last statement's rows, and the never-committed transaction dies with the
  // session — the same rollback, achieved implicitly.
  const wrapped = REMOTE
    ? `begin; set local role ${role}; ${claim} ${sql}`
    : `begin; set local role ${role}; ${claim} ${sql}; rollback;`;
  try {
    return { okd: true, out: psql(wrapped) };
  } catch (e) {
    const err = String((e as { stderr?: Buffer; message?: string }).stderr
      ?? (e as Error).message ?? e);
    return { okd: false, out: err.split('\n').find(l => /ERROR|violates|denied|permission/i.test(l)) ?? err.slice(0, 160) };
  }
}

/**
 * Did the client FAIL to achieve the change? Either mechanism counts.
 *
 * RLS denies in two different shapes and both are real denials:
 *   · a `using` filter that matches nothing — the statement succeeds, 0 rows
 *   · a `with check` violation — the statement ERRORS
 *
 * The first version of this suite only accepted the first shape, so five
 * correct policies were reported as failures: self-promotion IS refused, with
 * `new row violates row-level security policy for table "profiles"`. Asserting
 * on one shape would have sent me to "fix" policies that were already right.
 */
function denied(role: string, uid: string | null, sql: string): boolean {
  const r = asUser(role, uid, `with u as (${sql} returning 1) select count(*) from u`);
  if (!r.okd) return true;
  const n = r.out.split('\n').map(l => l.trim()).filter(l => /^\d+$/.test(l)).pop();
  return n === '0';
}

/**
 * How many rows a SELECT returned for that role. A policy that hides rows
 * returns 0; a missing GRANT raises an error, which is -1.
 *
 * THE PARSING IS NOT INCIDENTAL — IT MADE HALF THIS SUITE VACUOUS ONCE.
 *
 * psql prints a command tag for every statement, so the wrapped query above
 * emits `BEGIN / SET / 1 / ROLLBACK`. The first version took the LAST line and
 * got `ROLLBACK`, parsed it as NaN, and returned -1 for every call. Every
 * assertion phrased «< 1» or «<= 0» then passed — on a harness bug rather than
 * on a policy. The suite reported deny after deny while proving nothing.
 *
 * So the number is taken from the last line that IS a number, and a query that
 * produced no numeric line at all is -1 rather than silently 0.
 */
function rowsSeen(role: string, uid: string | null, sql: string): number {
  const r = asUser(role, uid, sql);
  if (!r.okd) return -1;
  const numeric = r.out.split('\n').map(l => l.trim()).filter(l => /^\d+$/.test(l));
  return numeric.length ? Number(numeric[numeric.length - 1]) : -1;
}

// The list serves both modes: applied locally, and swept for leaked secrets
// by section [14] either way.
const MIGRATIONS = readdirSync(path.join(ROOT, 'supabase/migrations')).filter(f => f.endsWith('.sql')).sort();

/* ── Bring the database up (LOCAL) / verify it is reconciled (REMOTE) ────── */

if (!REMOTE) {
  if (!existsSync('/usr/lib/postgresql/16/bin/initdb') && !existsSync('/usr/bin/psql')) {
    console.log('\nPostgreSQL is not available — RLS spec cannot run.');
    process.exitCode = 1;
    throw new Error('no postgres');
  }

  // Bring the cluster up if it is not already. The spec must be runnable with
  // one command, not two — a suite that needs a remembered prerequisite is a
  // suite that gets skipped.
  try {
    execFileSync('bash', [path.join(ROOT, 'supabase/test/start-postgres.sh')],
      { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    console.log('could not start PostgreSQL:', String((e as { stderr?: Buffer }).stderr ?? e).slice(0, 200));
    process.exitCode = 1;
    throw e;
  }

  console.log('\nApplying migrations to a scratch database…');
  try { psql(`drop database if exists ${DB}`, 'postgres'); } catch { /* first run */ }
  psql(`create database ${DB}`, 'postgres');
  psql('create extension if not exists "pgcrypto"');
  // EVERY shim, in order — not a hand-written list.
  //
  // The RLS suite briefly loaded only the auth shim while still applying every
  // migration, so `0003_storage.sql` failed with `relation "storage.buckets"
  // does not exist`. A sweep cannot fall out of step with the directory the way
  // a list can.
  for (const shim of readdirSync(path.join(ROOT, 'supabase/test'))
    .filter(f => f.endsWith('.sql')).sort()) {
    psqlFile(path.join(ROOT, 'supabase/test', shim));
  }

  for (const m of MIGRATIONS) psqlFile(path.join(ROOT, 'supabase/migrations', m));
  console.log(`applied: ${MIGRATIONS.join(', ')}`);
} else {
  // The real project must be reconciled FIRST — this suite proves policies,
  // it does not install them. Refusing here beats passing vacuously.
  const sig = psql(`select count(*) from pg_policies where policyname = 'posts_read_active'`);
  if (!/1/.test(sig)) {
    console.error('✋ المشروع الحقيقي غير مُسوّى بعد — شغّل npm run remote:reconcile أولاً.');
    process.exit(2);
  }
  console.log('\n✓ الوضع البعيد: السياسات موجودة على المشروع الحقيقي — الاختبار يجري عليه مباشرة.');
}

/**
 * REMOTE seeds COMMIT, so they must LEAVE. Every seeded row is deleted by
 * its known id — before seeding (a crashed earlier run left leftovers) and
 * again on exit, crash included: the executor is synchronous, so an exit
 * handler can actually finish the job.
 */
function remoteCleanup(): void {
  if (!REMOTE) return;
  const uids = [
    '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555', '77777777-7777-7777-7777-777777777777',
    '88888888-8888-8888-8888-888888888878', '99999999-9999-9999-9999-999999999979',
  ].map(u => `'${u}'`).join(',');
  try {
    psql(`
      delete from public.audit_log where actor_id in (${uids}) or actor_id is null and action = 'role.change';
      delete from public.orders where id = '66666666-6666-6666-6666-666666666666';
      delete from public.store_docs where (collection, id) in (
        ('storeSupply','prod-live:std'), ('storeProducts','prod-live'),
        ('storeShippingZones','eu'), ('storeSettings','public'),
        ('storeSettings','shippingRules'), ('storeSettings','private'));
      delete from public.store_variants where id = 'var-1';
      delete from public.store_products where id in ('prod-live','prod-draft');
      delete from public.posts where id in ('post-live','post-hidden');
      delete from auth.users where id in (${uids});
    `);
  } catch (e) {
    console.error('  ⚠ تنظيف البذور البعيدة تعثّر:', String((e as Error).message).slice(0, 200));
  }
}

if (REMOTE) {
  remoteCleanup();
  let cleaned = false;
  process.on('exit', () => { if (!cleaned) { cleaned = true; remoteCleanup(); } });
}

/* ── Seed four people and a shop ──────────────────────────────────────────── */

const U = {
  alice: '11111111-1111-1111-1111-111111111111',
  mallory: '22222222-2222-2222-2222-222222222222',
  mod: '33333333-3333-3333-3333-333333333333',
  admin: '44444444-4444-4444-4444-444444444444',
  banned: '55555555-5555-5555-5555-555555555555',
};
psql(`
  insert into auth.users (id, email) values
    ('${U.alice}','a@x.test'), ('${U.mallory}','m@x.test'),
    ('${U.mod}','mod@x.test'), ('${U.admin}','admin@x.test'),
    ('${U.banned}','b@x.test');
  -- 0005's trigger already created a bare profile for each auth row above, so
  -- the seed's job is to SET the roles, not to insert beside the trigger. An
  -- upsert keeps this true whichever of the two runs first.
  insert into public.profiles (id, display_name, role, status) values
    ('${U.alice}','Alice','user','active'),
    ('${U.mallory}','Mallory','user','active'),
    ('${U.mod}','Mod','moderator','active'),
    ('${U.admin}','Admin','admin','active'),
    ('${U.banned}','Banned','user','banned')
  on conflict (id) do update set
    display_name = excluded.display_name,
    role = excluded.role,
    status = excluded.status;
  -- Backdated one hour: 0006's cooldown policies read the author's newest row,
  -- and a seed stamped «now» would put every author inside their own cooldown
  -- window before the first assertion ran.
  insert into public.posts (id, author_id, text, status, created_at) values
    ('post-live','${U.alice}','منشور نشط','active', now() - interval '1 hour'),
    ('post-hidden','${U.alice}','منشور مخفي','hidden', now() - interval '1 hour');
  insert into public.comments (id, post_id, author_id, text, status, created_at) values
    ('c1','post-live','${U.alice}','تعليق','active', now() - interval '1 hour');
  insert into public.store_products (id, name_ar, category_id, published) values
    ('prod-live','منتج منشور','frames', true),
    ('prod-draft','منتج مسودة','frames', false);
  insert into public.store_variants (id, product_id, label_ar, price_minor, is_default) values
    ('var-1','prod-live','قياسي', 4999, true);
  insert into public.store_docs (collection, id, doc) values
    ('storeSupply','prod-live:std','{"variantId":"prod-live:std","supplierId":"mori","unitCostMinor":2500,"marginPercent":45}'),
    ('storeProducts','prod-live','{"published":true,"priceMinor":4999}'),
    ('storeShippingZones','eu','{"costMinor":700,"enabled":true}'),
    ('storeSettings','public','{"currency":"EUR"}'),
    ('storeSettings','shippingRules','{"blockedCategoryIds":[]}'),
    ('storeSettings','private','{"defaultMarginPercent":10}');
  insert into public.orders (id, reference, user_id, total_minor, payment_state, fulfilment) values
    ('66666666-6666-6666-6666-666666666666','ORD-1','${U.alice}', 4999, 'paid', 'confirmed');
  insert into public.audit_log (actor_id, action, target_type) values
    ('${U.admin}','role.change','profile');
`);

/* ── 0. The profile trigger — an account cannot exist without a profile ───── */

console.log('\n[0] كل حساب جديد يحصل على ملف تعريف تلقائياً');
{
  // A fresh auth row, exactly as Supabase Auth writes one: id, email, and the
  // display name inside raw_user_meta_data. No client insert anywhere.
  psql(`insert into auth.users (id, email, raw_user_meta_data) values
    ('77777777-7777-7777-7777-777777777777','new@x.test','{"display_name": "Newcomer"}')`);

  ok('the profile row exists without any client writing it',
    psql(`select count(*) from public.profiles where id = '77777777-7777-7777-7777-777777777777'`) === '1');
  ok('the display name was read out of the metadata',
    psql(`select display_name from public.profiles where id = '77777777-7777-7777-7777-777777777777'`) === 'Newcomer');
  ok('the new account defaults to role `user`, not to anything grander',
    psql(`select role::text from public.profiles where id = '77777777-7777-7777-7777-777777777777'`) === 'user');

  // The collision case: a SECOND person typing the same display name must not
  // lose their ACCOUNT to the unique index — only the colliding name.
  psql(`insert into auth.users (id, email, raw_user_meta_data) values
    ('88888888-8888-8888-8888-888888888878','new2@x.test','{"display_name": "Newcomer"}')`);
  ok('a display-name collision costs the name, never the sign-up',
    psql(`select count(*) from public.profiles where id = '88888888-8888-8888-8888-888888888878'`) === '1'
    && psql(`select coalesce(display_name_normalized, '∅') from public.profiles where id = '88888888-8888-8888-8888-888888888878'`) === '∅');

  // The import case. `profiles.id` references `auth.users`, so the data
  // migration MUST create the auth row first — the trigger then makes a bare
  // profile — and upsert the imported fields over it. The assertion is that
  // the upsert wins and the trigger's bare row does not: an imported moderator
  // arriving as role `user` would be a silent de-mod of every staff account.
  psql(`insert into auth.users (id, email) values
    ('99999999-9999-9999-9999-999999999979','imp@x.test')`);
  psql(`insert into public.profiles (id, display_name, role) values
    ('99999999-9999-9999-9999-999999999979','Imported','moderator')
    on conflict (id) do update set
      display_name = excluded.display_name, role = excluded.role`);
  ok('an imported profile overwrites the trigger\'s bare row, roles intact',
    psql(`select display_name from public.profiles where id = '99999999-9999-9999-9999-999999999979'`) === 'Imported'
    && psql(`select role::text from public.profiles where id = '99999999-9999-9999-9999-999999999979'`) === 'moderator');
}

/* ── 1. Reading the community ─────────────────────────────────────────────── */

console.log('\n[1] المستخدم يقرأ المنشورات العامة النشطة');
{
  ok('an anonymous visitor sees the active post',
    rowsSeen('anon', null, "select count(*) from public.posts where id='post-live'") === 1);
  ok('a signed-in user sees it too',
    rowsSeen('authenticated', U.alice, "select count(*) from public.posts where id='post-live'") === 1);

  // The deny half: hidden content is invisible even to its own author, who
  // must not be able to tell moderation from deletion.
  ok('a hidden post is invisible to anonymous',
    rowsSeen('anon', null, "select count(*) from public.posts where id='post-hidden'") === 0);
  ok('…and to its own author',
    rowsSeen('authenticated', U.alice, "select count(*) from public.posts where id='post-hidden'") === 0);
  ok('…but a moderator sees it',
    rowsSeen('authenticated', U.mod, "select count(*) from public.posts where id='post-hidden'") === 1);
}

/* ── 2 & 3. Posting, and impersonation ────────────────────────────────────── */

console.log('\n[2] المستخدم ينشئ منشوراً باسمه فقط · [3] لا ينتحل معرف غيره');
{
  ok('Alice may post as herself',
    asUser('authenticated', U.alice,
      `insert into public.posts (id, author_id, text) values ('p-new','${U.alice}','مرحباً')`).okd);

  // THE IMPERSONATION TEST.
  const imp = asUser('authenticated', U.mallory,
    `insert into public.posts (id, author_id, text) values ('p-fake','${U.alice}','منتحَل')`);
  ok('Mallory may NOT post as Alice', !imp.okd, imp.out);

  ok('an anonymous visitor may not post at all',
    !asUser('anon', null,
      `insert into public.posts (id, author_id, text) values ('p-anon','${U.alice}','x')`).okd);

  ok('a banned account may not post',
    !asUser('authenticated', U.banned,
      `insert into public.posts (id, author_id, text) values ('p-ban','${U.banned}','x')`).okd);

  // Editing someone else's post is the same defect in a different verb.
  ok('Mallory may not edit Alice\'s post',
    denied('authenticated', U.mallory, "update public.posts set text='hacked' where id='post-live'"));
}

/* ── 4. Comments ──────────────────────────────────────────────────────────── */

console.log('\n[4] صاحب التعليق يدير تعليقه ضمن القواعد');
{
  ok('Alice may comment as herself',
    asUser('authenticated', U.alice,
      `insert into public.comments (id, post_id, author_id, text) values ('c-new','post-live','${U.alice}','تعليق')`).okd);
  ok('Mallory may not comment AS Alice',
    !asUser('authenticated', U.mallory,
      `insert into public.comments (id, post_id, author_id, text) values ('c-fake','post-live','${U.alice}','x')`).okd);
  ok('nobody may comment on a hidden post',
    !asUser('authenticated', U.alice,
      `insert into public.comments (id, post_id, author_id, text) values ('c-h','post-hidden','${U.alice}','x')`).okd);
  ok('Alice may soft-delete her own comment',
    !denied('authenticated', U.alice, "update public.comments set status='deleted' where id='c1'"));
  // The author sees what they deleted — required for the update above to be
  // writable at all — and still cannot see what a moderator hid.
  ok('…and can still see it afterwards',
    rowsSeen('authenticated', U.alice,
      "select count(*) from (update public.comments set status='deleted' where id='c1' returning 1) t") !== 0);
  ok('a user may NOT hide their own comment (that is moderation)',
    denied('authenticated', U.alice, "update public.comments set status='hidden' where id='c1'"));
  ok('Mallory may not touch Alice\'s comment',
    denied('authenticated', U.mallory, "update public.comments set status='deleted' where id='c1'"));
}

/* ── 5. THE COMMERCIAL SECRET ─────────────────────────────────────────────── */

console.log('\n[5] المستخدم العادي لا يقرأ المورد أو التكلفة أو الهامش');
{
  const SUPPLY = "select count(*) from public.store_docs where collection = 'storeSupply'";
  const PRIVATE = "select count(*) from public.store_docs where collection = 'storeSettings' and id = 'private'";

  ok('a normal user reads NOTHING of the supply documents',
    rowsSeen('authenticated', U.alice, SUPPLY) === 0);
  ok('an anonymous visitor reads nothing of them either',
    rowsSeen('anon', null, SUPPLY) <= 0);

  /*
   * STAFF — ANY STAFF, ADMIN INCLUDED — MUST NOT SEE COST FROM A CLIENT.
   *
   * `0007` names `storeSupply` in NO select policy at all: the only path to a
   * supplier cost is the server adapter on the secret key, where every read
   * is code review-able. A client-side admin read would put the margin one
   * developer-tools tab away from any admin's browser extension.
   */
  ok('a MODERATOR reads nothing of the supply documents',
    rowsSeen('authenticated', U.mod, SUPPLY) === 0);
  ok('even an ADMIN client reads nothing of them — server adapter only',
    rowsSeen('authenticated', U.admin, SUPPLY) === 0);
  ok('the private settings document is equally invisible to an admin client',
    rowsSeen('authenticated', U.admin, PRIVATE) === 0);

  // The allow half, without which everything above passes on an empty table:
  // the same table, the PUBLIC collections, readable by everyone.
  ok('anyone reads a product override (so the checks above are not vacuous)',
    rowsSeen('anon', null,
      "select count(*) from public.store_docs where collection = 'storeProducts'") === 1);
  ok('anyone reads the zone pricing and the public settings',
    rowsSeen('anon', null,
      "select count(*) from public.store_docs where collection = 'storeShippingZones'") === 1
    && rowsSeen('anon', null,
      "select count(*) from public.store_docs where collection = 'storeSettings' and id in ('public','shippingRules')") === 2);
  ok('no client writes a store document, staff included',
    !asUser('authenticated', U.admin,
      `insert into public.store_docs (collection, id, doc) values ('storeProducts','x','{}')`).okd);

  // The public product is readable; the draft is not.
  ok('anyone reads a published product',
    rowsSeen('anon', null, "select count(*) from public.store_products where id='prod-live'") === 1);
  ok('nobody reads a draft product',
    rowsSeen('anon', null, "select count(*) from public.store_products where id='prod-draft'") === 0);
  ok('…but staff do',
    rowsSeen('authenticated', U.mod, "select count(*) from public.store_products where id='prod-draft'") === 1);
}

/* ── 6 & 7. Roles ─────────────────────────────────────────────────────────── */

console.log('\n[6] المشرف لا يحصل على صلاحيات المالك · [7] الأدوار لا تُعدّل من العميل');
{
  // THE ESCALATION TEST: the first thing anybody tries.
  ok('a user cannot promote themselves',
    denied('authenticated', U.alice,
      `update public.profiles set role='owner' where id='${U.alice}'`));

  ok('a user cannot promote somebody else',
    denied('authenticated', U.alice,
      `update public.profiles set role='admin' where id='${U.mallory}'`));

  ok('a MODERATOR cannot promote themselves to admin',
    denied('authenticated', U.mod,
      `update public.profiles set role='admin' where id='${U.mod}'`));

  ok('an ADMIN cannot make themselves owner',
    denied('authenticated', U.admin,
      `update public.profiles set role='owner' where id='${U.admin}'`));

  ok('a user cannot unban themselves',
    denied('authenticated', U.banned,
      `update public.profiles set status='active' where id='${U.banned}'`));

  // The allow half: a profile edit that does NOT touch role or status works,
  // or the policy is simply "nobody may edit their profile".
  ok('…but a user CAN change their own display name',
    rowsSeen('authenticated', U.alice,
      `with u as (update public.profiles set display_name='Alice2' where id='${U.alice}' returning 1) select count(*) from u`) === 1);

  ok('a new signup cannot insert itself as owner',
    !asUser('authenticated', U.alice,
      `insert into public.profiles (id, display_name, role) values ('77777777-7777-7777-7777-777777777777','X','owner')`).okd);
}

/* ── 8. The audit log ─────────────────────────────────────────────────────── */

console.log('\n[8] سجل التدقيق مغلق على العملاء');
{
  ok('a user cannot read the audit log',
    rowsSeen('authenticated', U.alice, 'select count(*) from public.audit_log') < 1);
  ok('a moderator cannot read it',
    rowsSeen('authenticated', U.mod, 'select count(*) from public.audit_log') < 1);
  ok('an ADMIN cannot read it from the client either',
    rowsSeen('authenticated', U.admin, 'select count(*) from public.audit_log') < 1);
  ok('nobody can forge an entry',
    !asUser('authenticated', U.admin,
      `insert into public.audit_log (actor_id, action, target_type) values ('${U.alice}','fake','post')`).okd);
  // The allow half: the server, with the secret key, can.
  ok('the service role CAN read it (server-side only)',
    Number(psql('select count(*) from public.audit_log')) === 1);
}

/* ── 9–12. Money ──────────────────────────────────────────────────────────── */

console.log('\n[9–12] الطلب والسعر والشحن — خادمياً فقط');
{
  // THE ONE THAT MATTERS: a client cannot create an order, so it can never
  // send a total. «السعر والشحن يعاد حسابهما خادمياً» is mechanical because
  // the client has no INSERT at all.
  const forged = asUser('authenticated', U.alice,
    `insert into public.orders (id, reference, user_id, total_minor, payment_state)
     values ('88888888-8888-8888-8888-888888888888','ORD-FORGED','${U.alice}', 1, 'paid')`);
  ok('a client cannot create an order at all — so it cannot send a price',
    !forged.okd, forged.out);

  ok('a client cannot rewrite the total of its own order',
    rowsSeen('authenticated', U.alice,
      "with u as (update public.orders set total_minor=1 where reference='ORD-1' returning 1) select count(*) from u") <= 0);

  ok('a client cannot mark its own order paid',
    rowsSeen('authenticated', U.alice,
      "with u as (update public.orders set payment_state='paid' where reference='ORD-1' returning 1) select count(*) from u") <= 0);

  // 0004's second axis. A customer who could set this could close their own
  // dispute by declaring the parcel delivered.
  ok('a client cannot declare its own order delivered',
    rowsSeen('authenticated', U.alice,
      "with u as (update public.orders set fulfilment='delivered' where reference='ORD-1' returning 1) select count(*) from u") <= 0);

  // The control for the two above: the columns EXIST and hold what was seeded,
  // so «the update changed nothing» is a refusal and not a typo in a column
  // name that no longer exists.
  ok('Alice can nevertheless SEE both axes of her own order',
    rowsSeen('authenticated', U.alice,
      "select count(*) from public.orders where reference='ORD-1' and payment_state='paid' and fulfilment='confirmed'") === 1);

  ok('a client cannot write order items',
    !asUser('authenticated', U.alice,
      `insert into public.order_items (order_id, name_ar, unit_price_minor, quantity, line_total_minor)
       values ('66666666-6666-6666-6666-666666666666','x',1,1,1)`).okd);

  ok('a client cannot touch the payment records',
    !asUser('authenticated', U.alice,
      `insert into public.store_payments (id, order_id) values
       ('tr_forged','66666666-6666-6666-6666-666666666666')`).okd);

  // 12. Reading someone else's order.
  ok('Alice reads her own order',
    rowsSeen('authenticated', U.alice, "select count(*) from public.orders where reference='ORD-1'") === 1);
  ok('Mallory does NOT read Alice\'s order',
    rowsSeen('authenticated', U.mallory, "select count(*) from public.orders where reference='ORD-1'") === 0);
  ok('Mallory does not read Alice\'s order items',
    rowsSeen('authenticated', U.mallory, 'select count(*) from public.order_items') === 0);
  ok('an anonymous visitor reads no orders',
    rowsSeen('anon', null, 'select count(*) from public.orders') <= 0);
}

/* ── 13. The tables with no client door at all ────────────────────────────── */

/* ── 0006 — the controls the WEB migration carried over ───────────────────── */

console.log('\n[15] فترة الانتظار — قاعدة، لا مجاملة واجهة');
{
  // Two posts in one breath: the first is allowed, the second refused BY THE
  // DATABASE. This is the 60-second window `firestore.rules` used to arm off
  // `lastPostAt`, now with nothing to arm.
  const burst = asUser('authenticated', U.alice, `
    insert into public.posts (id, author_id, text) values ('burst-1','${U.alice}','الأول');
    insert into public.posts (id, author_id, text) values ('burst-2','${U.alice}','الثاني')`);
  ok('a second post inside sixty seconds is refused', !burst.okd, burst.out);

  ok('one post alone is allowed (the control)',
    asUser('authenticated', U.alice,
      `insert into public.posts (id, author_id, text) values ('single-1','${U.alice}','وحيد')`).okd);

  const commentBurst = asUser('authenticated', U.mallory, `
    insert into public.comments (id, post_id, author_id, text) values ('cb-1','post-live','${U.mallory}','أ');
    insert into public.comments (id, post_id, author_id, text) values ('cb-2','post-live','${U.mallory}','ب')`);
  ok('a second comment inside five seconds is refused', !commentBurst.okd, commentBurst.out);
}

console.log('\n[16] العدّادات والاسم المنسوخ — تصونها القاعدة لا العميل');
{
  // psql echoes BEGIN/SET/ROLLBACK around the data, so the assertion reads
  // the result LINE, not the tail of the stream — the harness bug of treating
  // «ROLLBACK» as the answer is one this suite has already met once.
  const lineOf = (out: string, want: string) =>
    out.split('\n').map(l => l.trim()).includes(want);

  // The counter moves because the database moved it — the insert names no
  // counter column at all. The seed's own comment already fired the trigger
  // once, so the count this insert produces is 2, and asserting the exact
  // value proves the seed was counted too.
  const counted = asUser('authenticated', U.mallory, `
    insert into public.comments (id, post_id, author_id, text) values ('cc-1','post-live','${U.mallory}','عدّ');
    select comments_count from public.posts where id = 'post-live'`);
  ok('inserting a comment bumps the post\'s counter via the trigger',
    counted.okd && lineOf(counted.out, '2'), counted.out);

  const liked = asUser('authenticated', U.mallory, `
    insert into public.post_likes (post_id, user_id) values ('post-live','${U.mallory}');
    select likes_count from public.posts where id = 'post-live'`);
  ok('a like bumps likes_count the same way',
    liked.okd && lineOf(liked.out, '1'), liked.out);

  // The client's claimed author_name is IGNORED, not validated.
  const spoofed = asUser('authenticated', U.mallory, `
    insert into public.posts (id, author_id, text, author_name) values
      ('spoof-1','${U.mallory}','نص','قائد المنصة');
    select author_name from public.posts where id = 'spoof-1'`);
  ok('a spoofed author_name is overwritten from the profile',
    spoofed.okd && lineOf(spoofed.out, 'Mallory'), spoofed.out);

  // hasOnly(), reborn as column grants: the author's own row, and still no.
  ok('an author cannot inflate their own likes_count',
    !asUser('authenticated', U.alice,
      "update public.posts set likes_count = 999 where id = 'post-live'").okd);
  ok('an author cannot touch their own feed_score',
    !asUser('authenticated', U.alice,
      "update public.posts set feed_score = 1e9 where id = 'post-live'").okd);
  ok('…but editing their own text still works (the control)',
    rowsSeen('authenticated', U.alice,
      "with u as (update public.posts set text = 'معدّل' where id = 'post-live' returning 1) select count(*) from u") === 1);
}

console.log('\n[13] الجداول المغلقة كلياً على العميل');
{
  for (const t of ['rate_limits', 'cleanup_runs', 'media_objects']) {
    ok(`${t}: no client read`,
      rowsSeen('authenticated', U.admin, `select count(*) from public.${t}`) < 1);
  }

  // RLS must be not just enabled but FORCED, or the table owner bypasses it —
  // and migrations run as the owner.
  const unforced = psql(`
    select coalesce(string_agg(relname, ', '), '')
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname='public' and c.relkind='r' and (not c.relrowsecurity or not c.relforcerowsecurity)`);
  ok(`every public table has RLS enabled AND forced (${unforced || 'all'})`, unforced === '');

  // A table with a grant but no policy is denied — but a table with neither is
  // ALSO denied, and the two are not the same thing to a future reader. This
  // asserts the intended shape: the closed tables have no policy at all.
  const policied = psql(`
    select coalesce(string_agg(distinct tablename, ', '), '')
    from pg_policies where schemaname='public'
      and tablename in ('audit_log','store_payments','rate_limits','cleanup_runs','media_objects','order_items')
      and tablename <> 'order_items'`);
  ok(`the closed tables carry no policy whatsoever (${policied || 'none'})`, policied === '');
}

/* ── The scaffolding is not a migration ───────────────────────────────────── */

console.log('\n[14] The test shim cannot leak into the project');
{
  const migrations = readdirSync(path.join(ROOT, 'supabase/migrations'));
  ok('no shim file sits in supabase/migrations',
    !migrations.some(f => /shim|test/i.test(f)), migrations.join(', '));
  const shim = readFileSync(path.join(ROOT, 'supabase/test/00_supabase_shim.sql'), 'utf8');
  ok('the shim says plainly that it is test-only', /never applied to the project/i.test(shim));
  // The secret key must not appear in any migration.
  for (const m of MIGRATIONS) {
    const sql = readFileSync(path.join(ROOT, 'supabase/migrations', m), 'utf8');
    ok(`${m} contains no key or password`, !/service_role_key|secret_key|password\s*=/i.test(sql));
  }
}

console.log(`\n${'─'.repeat(66)}`);
console.log(`supabase rls: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;

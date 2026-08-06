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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PGHOST = '/tmp';
const PGPORT = process.env.RLS_TEST_PORT ?? '55432';
const DB = 'fpvarabic_rls_test';

let passed = 0;
let failed = 0;
function ok(label: string, cond: boolean, detail = ''): void {
  if (cond) { passed++; console.log(`  ok — ${label}`); }
  else { failed++; console.log(`  FAIL — ${label}${detail ? ` — ${detail}` : ''}`); }
}

function psql(sql: string, db = DB): string {
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
  const wrapped = `begin; set local role ${role}; ${claim} ${sql}; rollback;`;
  try {
    return { okd: true, out: psql(wrapped) };
  } catch (e) {
    const err = String((e as { stderr?: Buffer }).stderr ?? e);
    return { okd: false, out: err.split('\n').find(l => /ERROR/.test(l)) ?? err.slice(0, 120) };
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

/* ── Bring the database up ────────────────────────────────────────────────── */

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

const MIGRATIONS = readdirSync(path.join(ROOT, 'supabase/migrations')).filter(f => f.endsWith('.sql')).sort();
for (const m of MIGRATIONS) psqlFile(path.join(ROOT, 'supabase/migrations', m));
console.log(`applied: ${MIGRATIONS.join(', ')}`);

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
  insert into public.profiles (id, display_name, role, status) values
    ('${U.alice}','Alice','user','active'),
    ('${U.mallory}','Mallory','user','active'),
    ('${U.mod}','Mod','moderator','active'),
    ('${U.admin}','Admin','admin','active'),
    ('${U.banned}','Banned','user','banned');
  insert into public.posts (id, author_id, text, status) values
    ('post-live','${U.alice}','منشور نشط','active'),
    ('post-hidden','${U.alice}','منشور مخفي','hidden');
  insert into public.comments (id, post_id, author_id, text, status) values
    ('c1','post-live','${U.alice}','تعليق','active');
  insert into public.store_products (id, name_ar, category_id, published) values
    ('prod-live','منتج منشور','frames', true),
    ('prod-draft','منتج مسودة','frames', false);
  insert into public.store_variants (id, product_id, label_ar, price_minor, is_default) values
    ('var-1','prod-live','قياسي', 4999, true);
  insert into public.store_supply (product_id, supplier_name, cost_minor, margin_pct) values
    ('prod-live','MoriSupplier', 2500, 45.0);
  insert into public.orders (id, reference, user_id, total_minor, payment_state, fulfilment) values
    ('66666666-6666-6666-6666-666666666666','ORD-1','${U.alice}', 4999, 'paid', 'confirmed');
  insert into public.audit_log (actor_id, action, target_type) values
    ('${U.admin}','role.change','profile');
`);

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
  ok('a normal user reads NOTHING from store_supply',
    rowsSeen('authenticated', U.alice, 'select count(*) from public.store_supply') === 0);
  ok('an anonymous visitor reads nothing from it either',
    rowsSeen('anon', null, 'select count(*) from public.store_supply') <= 0);

  /*
   * A MODERATOR IS STAFF AND STILL MUST NOT SEE COST.
   *
   * This is the assertion that would have caught the likeliest real mistake:
   * writing `is_staff()` where `is_admin()` belongs. Both read as "a
   * privileged person", and only one of them is right for commercial terms.
   */
  ok('a MODERATOR reads nothing from store_supply either',
    rowsSeen('authenticated', U.mod, 'select count(*) from public.store_supply') === 0);

  // The allow half, without which all three above pass on an empty table.
  ok('an admin CAN read it (so the checks above are not vacuous)',
    rowsSeen('authenticated', U.admin, 'select count(*) from public.store_supply') === 1);

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

  ok('a client cannot touch payment_attempts',
    !asUser('authenticated', U.alice,
      `insert into public.payment_attempts (order_id, provider, amount_minor)
       values ('66666666-6666-6666-6666-666666666666','mollie', 1)`).okd);

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
      and tablename in ('audit_log','payment_attempts','rate_limits','cleanup_runs','media_objects','order_items')
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

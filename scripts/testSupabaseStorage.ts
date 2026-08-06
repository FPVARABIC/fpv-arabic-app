#!/usr/bin/env tsx
/**
 * Storage policies, EXERCISED — an upload is attempted, not a rule read.
 *
 * Supabase Storage authorises with ordinary PostgreSQL RLS on
 * `storage.objects`, so «try to upload into another user's folder» is a real
 * INSERT that the database either accepts or refuses. That is what happens
 * below, for every case in the brief.
 *
 * WHAT THE SHIM DOES AND DOES NOT PROVE
 * =====================================
 * `supabase/test/01_storage_shim.sql` recreates `storage.objects`, the bucket
 * registry and the two `storage.foldername`/`filename` helpers with the real
 * column names and the real `metadata` shape. So a policy proven here is the
 * same policy there.
 *
 * What it cannot prove is the half Supabase enforces OUTSIDE the database:
 * `file_size_limit` and `allowed_mime_types` on the bucket are applied by the
 * Storage API before the row is ever inserted. That is exactly why the
 * policies repeat both checks — the bucket columns are configuration, one
 * console click from being different, and the policy is not. The suite tests
 * the policy half, and asserts the bucket half is declared.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PGPORT = process.env.RLS_TEST_PORT ?? '55432';
const DB = 'fpvarabic_storage_test';

let passed = 0;
let failed = 0;
function ok(label: string, cond: boolean, detail = ''): void {
  if (cond) { passed++; console.log(`  ok — ${label}`); }
  else { failed++; console.log(`  FAIL — ${label}${detail ? ` — ${detail}` : ''}`); }
}

function psql(sql: string, db = DB): string {
  return execFileSync('psql', ['-h', '/tmp', '-p', PGPORT, '-U', 'postgres', '-d', db,
    '-v', 'ON_ERROR_STOP=1', '-tAc', sql], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function psqlFile(file: string, db = DB): void {
  execFileSync('psql', ['-h', '/tmp', '-p', PGPORT, '-U', 'postgres', '-d', db,
    '-v', 'ON_ERROR_STOP=1', '-f', file], { stdio: ['ignore', 'pipe', 'pipe'] });
}

/**
 * Attempt `sql` as `role` impersonating `uid`. True = the database allowed it.
 *
 * ONLY MEANINGFUL FOR INSERT. An UPDATE or DELETE that the `using` clause
 * filters to nothing SUCCEEDS — it simply changes no row — so «did it error»
 * answers the wrong question for those. Use `changed()` instead; two
 * assertions here were briefly wrong for exactly that reason.
 */
function allowed(role: string, uid: string | null, sql: string): boolean {
  const claim = uid ? `set local request.jwt.claim.sub = '${uid}';` : '';
  try {
    psql(`begin; set local role ${role}; ${claim} ${sql}; rollback;`);
    return true;
  } catch { return false; }
}

/** Did the statement actually change a row? The right question for UPDATE/DELETE. */
function changed(role: string, uid: string | null, sql: string): number {
  return visible(role, uid, `with c as (${sql} returning 1) select count(*) from c`);
}

/** How many rows the role can see. -1 means the statement itself was refused. */
function visible(role: string, uid: string | null, sql: string): number {
  const claim = uid ? `set local request.jwt.claim.sub = '${uid}';` : '';
  try {
    const out = psql(`begin; set local role ${role}; ${claim} ${sql}; rollback;`);
    const n = out.split('\n').map(l => l.trim()).filter(l => /^\d+$/.test(l)).pop();
    return n === undefined ? -1 : Number(n);
  } catch { return -1; }
}

const IMG = `'{"size": 204800, "mimetype": "image/webp"}'::jsonb`;
const VID = `'{"size": 20971520, "mimetype": "video/mp4"}'::jsonb`;

/** An upload attempt, written the way the Storage API writes one. */
function put(bucket: string, name: string, uid: string, meta = IMG): string {
  return `insert into storage.objects (bucket_id, name, owner, metadata)
          values ('${bucket}', '${name}', '${uid}', ${meta})`;
}

/* ── Bring the database up ────────────────────────────────────────────────── */

if (!existsSync('/usr/bin/psql')) {
  console.log('\nPostgreSQL is not available — storage spec cannot run.');
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

const U = {
  alice: '11111111-1111-1111-1111-111111111111',
  mallory: '22222222-2222-2222-2222-222222222222',
  mod: '33333333-3333-3333-3333-333333333333',
  admin: '44444444-4444-4444-4444-444444444444',
  banned: '55555555-5555-5555-5555-555555555555',
};
psql(`
  insert into auth.users (id, email) values
    ('${U.alice}','a@x.test'),('${U.mallory}','m@x.test'),
    ('${U.mod}','mod@x.test'),('${U.admin}','ad@x.test'),('${U.banned}','b@x.test');
  insert into public.profiles (id, display_name, role, status) values
    ('${U.alice}','Alice','user','active'),
    ('${U.mallory}','Mallory','user','active'),
    ('${U.mod}','Mod','moderator','active'),
    ('${U.admin}','Admin','admin','active'),
    ('${U.banned}','Banned','user','banned');
  insert into storage.objects (bucket_id, name, owner, metadata) values
    ('avatars','${U.alice}/me.webp','${U.alice}', ${IMG}),
    ('community-media','${U.alice}/post-1/photo.webp','${U.alice}', ${IMG}),
    ('store-products','prod-live/01-main.webp','${U.admin}', ${IMG});
`);

/* ── 1. The four buckets exist and are configured ─────────────────────────── */

console.log('\n[1] The buckets, and their declared limits');
{
  const buckets = psql("select string_agg(id, ',' order by id) from storage.buckets");
  ok(`four buckets exist (${buckets})`,
    buckets === 'avatars,community-media,project-images,store-products');

  // Public READ is deliberate on all four; it is not a licence to write, and
  // the rest of this suite is what proves the two are separate.
  ok('every bucket declares a size ceiling',
    psql('select count(*) from storage.buckets where file_size_limit is null') === '0');
  ok('every bucket declares an allowed mime list',
    psql('select count(*) from storage.buckets where allowed_mime_types is null') === '0');
  ok('avatars are capped small (2 MB)',
    psql("select file_size_limit from storage.buckets where id='avatars'") === String(2 * 1024 * 1024));
  ok('community media allows video, avatars do not',
    psql("select 'video/mp4' = any(allowed_mime_types) from storage.buckets where id='community-media'") === 't'
    && psql("select 'video/mp4' = any(allowed_mime_types) from storage.buckets where id='avatars'") === 'f');
  ok('no bucket allows an executable or archive mime type',
    psql(`select count(*) from storage.buckets
          where allowed_mime_types && array['application/x-sh','application/octet-stream',
                                            'application/zip','text/html']`) === '0');
}

/* ── 2. Avatars ───────────────────────────────────────────────────────────── */

console.log('\n[2] رفع Avatar داخل المسار الخاص فقط');
{
  ok('Alice uploads her own avatar',
    allowed('authenticated', U.alice, put('avatars', `${U.alice}/new.webp`, U.alice)));

  // THE ONE THE RULE EXISTS FOR.
  ok('Mallory may NOT write into Alice\'s avatar folder',
    !allowed('authenticated', U.mallory, put('avatars', `${U.alice}/evil.webp`, U.mallory)));

  // Owning the row is not the test — the PATH is. Claiming ownership of an
  // object placed in someone else's folder must still fail.
  ok('…not even by declaring herself the owner',
    !allowed('authenticated', U.mallory, put('avatars', `${U.alice}/evil.webp`, U.alice)));

  ok('Mallory may not REPLACE Alice\'s avatar',
    changed('authenticated', U.mallory,
      `update storage.objects set metadata = ${IMG} where bucket_id='avatars' and name='${U.alice}/me.webp'`) === 0);

  ok('Mallory may not DELETE Alice\'s avatar',
    changed('authenticated', U.mallory,
      `delete from storage.objects where bucket_id='avatars' and name='${U.alice}/me.webp'`) === 0);

  ok('Alice CAN replace her own',
    changed('authenticated', U.alice,
      `update storage.objects set metadata = ${IMG} where bucket_id='avatars' and name='${U.alice}/me.webp'`) === 1);

  ok('an anonymous visitor cannot upload at all',
    !allowed('anon', null, put('avatars', 'anon/x.webp', U.alice)));

  ok('a banned account cannot upload',
    !allowed('authenticated', U.banned, put('avatars', `${U.banned}/x.webp`, U.banned)));
}

/* ── 3. Forbidden types, sizes and paths ──────────────────────────────────── */

console.log('\n[3] الامتدادات والأنواع والأحجام والمسارات');
{
  ok('a .sh upload is refused',
    !allowed('authenticated', U.alice, put('avatars', `${U.alice}/run.sh`, U.alice)));

  // THE DISGUISE CASES — each is a different lie.
  ok('a double extension (photo.png.sh) is refused',
    !allowed('authenticated', U.alice, put('avatars', `${U.alice}/photo.png.sh`, U.alice)));
  ok('an executable declared as an image is refused',
    !allowed('authenticated', U.alice,
      put('avatars', `${U.alice}/x.webp`, U.alice, `'{"size":1024,"mimetype":"application/x-sh"}'::jsonb`)));
  ok('an image extension with an html mime is refused',
    !allowed('authenticated', U.alice,
      put('avatars', `${U.alice}/x.png`, U.alice, `'{"size":1024,"mimetype":"text/html"}'::jsonb`)));
  ok('a NUL byte in the name is refused',
    !allowed('authenticated', U.alice, put('avatars', `${U.alice}/a` + '\\u0000' + `.webp`, U.alice)));

  // PATH ESCAPES.
  ok('a `..` path escape is refused',
    !allowed('authenticated', U.alice, put('avatars', `${U.alice}/../${U.mallory}/x.webp`, U.alice)));
  ok('a root-anchored path is refused',
    !allowed('authenticated', U.alice, put('avatars', `/${U.alice}/x.webp`, U.alice)));
  ok('a backslash separator is refused',
    !allowed('authenticated', U.alice, put('avatars', `${U.alice}\\\\x.webp`, U.alice)));
  ok('a file at the bucket root (no owner folder) is refused',
    !allowed('authenticated', U.alice, put('avatars', 'loose.webp', U.alice)));

  // SIZE, both directions.
  ok('an avatar over 2 MB is refused',
    !allowed('authenticated', U.alice,
      put('avatars', `${U.alice}/big.webp`, U.alice, `'{"size":5242880,"mimetype":"image/webp"}'::jsonb`)));
  ok('a zero-byte file is refused',
    !allowed('authenticated', U.alice,
      put('avatars', `${U.alice}/empty.webp`, U.alice, `'{"size":0,"mimetype":"image/webp"}'::jsonb`)));
  ok('an upload with NO metadata is refused',
    !allowed('authenticated', U.alice,
      `insert into storage.objects (bucket_id, name, owner) values ('avatars','${U.alice}/nometa.webp','${U.alice}')`));

  // …and the allow half, so the ceiling is a ceiling and not a wall.
  ok('a 200 KB webp IS accepted (the checks above are not blanket denial)',
    allowed('authenticated', U.alice, put('avatars', `${U.alice}/fine.webp`, U.alice)));
}

/* ── 4. Community media ───────────────────────────────────────────────────── */

console.log('\n[4] وسائط المجتمع مربوطة بصاحبها وبمنشورها');
{
  ok('Alice uploads to her own post folder',
    allowed('authenticated', U.alice, put('community-media', `${U.alice}/post-9/a.webp`, U.alice)));
  ok('…and a video within the ceiling',
    allowed('authenticated', U.alice, put('community-media', `${U.alice}/post-9/clip.mp4`, U.alice, VID)));

  // «تُربط بصاحبها والمنشور الخاص بها» — one segment is not a post.
  ok('a file with no post folder is refused',
    !allowed('authenticated', U.alice, put('community-media', `${U.alice}/loose.webp`, U.alice)));
  ok('Mallory may not upload into Alice\'s post folder',
    !allowed('authenticated', U.mallory, put('community-media', `${U.alice}/post-1/x.webp`, U.mallory)));

  ok('a 200 MB video is refused',
    !allowed('authenticated', U.alice,
      put('community-media', `${U.alice}/post-9/huge.mp4`, U.alice,
        `'{"size":209715200,"mimetype":"video/mp4"}'::jsonb`)));

  // DELETING SOMEBODY ELSE'S FILE.
  ok('Mallory may not delete Alice\'s community file',
    changed('authenticated', U.mallory,
      `delete from storage.objects where bucket_id='community-media' and name='${U.alice}/post-1/photo.webp'`) === 0);
  ok('Alice CAN delete her own',
    changed('authenticated', U.alice,
      `delete from storage.objects where bucket_id='community-media' and name='${U.alice}/post-1/photo.webp'`) === 1);

  // A moderator takes down, and does not put up.
  ok('a moderator CAN delete community media',
    changed('authenticated', U.mod,
      `delete from storage.objects where bucket_id='community-media' and name='${U.alice}/post-1/photo.webp'`) === 1);
  ok('…but a moderator may NOT upload into another user\'s folder',
    !allowed('authenticated', U.mod, put('community-media', `${U.alice}/post-1/mod.webp`, U.mod)));
}

/* ── 5. The catalogue buckets ─────────────────────────────────────────────── */

console.log('\n[5] صور المتجر والمشاريع — الإدارة فقط');
{
  ok('a normal user may NOT upload a store image',
    !allowed('authenticated', U.alice, put('store-products', 'prod-live/02-front.webp', U.alice)));
  ok('a normal user may not replace one',
    changed('authenticated', U.alice,
      `update storage.objects set metadata = ${IMG} where bucket_id='store-products' and name='prod-live/01-main.webp'`) === 0);
  ok('…and a MODERATOR may not replace one either',
    changed('authenticated', U.mod,
      `update storage.objects set metadata = ${IMG} where bucket_id='store-products' and name='prod-live/01-main.webp'`) === 0);
  ok('…but an admin CAN (so the two above are not blanket denial)',
    changed('authenticated', U.admin,
      `update storage.objects set metadata = ${IMG} where bucket_id='store-products' and name='prod-live/01-main.webp'`) === 1);
  ok('a normal user may not delete one',
    changed('authenticated', U.alice,
      `delete from storage.objects where bucket_id='store-products' and name='prod-live/01-main.webp'`) === 0);

  /*
   * A MODERATOR IS STAFF AND STILL HAS NO CATALOGUE CAPABILITY.
   *
   * The likeliest real mistake in this whole file is writing `is_staff()`
   * where `is_admin()` belongs — both read as «a privileged person». This is
   * the assertion that would catch it.
   */
  ok('a MODERATOR may not upload a store image',
    !allowed('authenticated', U.mod, put('store-products', 'prod-live/02-front.webp', U.mod)));
  ok('a moderator may not delete one either',
    changed('authenticated', U.mod,
      `delete from storage.objects where bucket_id='store-products' and name='prod-live/01-main.webp'`) === 0);

  // The allow half.
  ok('an ADMIN uploads a store image',
    allowed('authenticated', U.admin, put('store-products', 'prod-live/02-front.webp', U.admin)));
  ok('an admin deletes one',
    changed('authenticated', U.admin,
      `delete from storage.objects where bucket_id='store-products' and name='prod-live/01-main.webp'`) === 1);
  ok('an admin uploads a project image',
    allowed('authenticated', U.admin, put('project-images', 'gps-denied-vio/01-cover.webp', U.admin)));
  ok('a normal user may not upload a project image',
    !allowed('authenticated', U.alice, put('project-images', 'gps-denied-vio/01-cover.webp', U.alice)));

  // Even an admin cannot smuggle an executable in.
  ok('even an admin cannot upload a .sh into store-products',
    !allowed('authenticated', U.admin, put('store-products', 'prod-live/x.sh', U.admin)));
}

/* ── 6. Public read, and the unknown bucket ───────────────────────────────── */

console.log('\n[6] القراءة العامة، والمسار غير المعروف');
{
  ok('an anonymous visitor reads community media',
    visible('anon', null, "select count(*) from storage.objects where bucket_id='community-media'") >= 1);
  ok('…and store product images',
    visible('anon', null, "select count(*) from storage.objects where bucket_id='store-products'") >= 1);
  ok('…and avatars',
    visible('anon', null, "select count(*) from storage.objects where bucket_id='avatars'") >= 1);

  /*
   * «ملف يتيم أو مسار غير معروف يُرفض».
   *
   * Every policy names its bucket, so an object in a bucket nobody declared
   * matches none of them and RLS refuses it. No rule has to enumerate the
   * unknown — the default does it.
   */
  psql("insert into storage.buckets (id, name, public) values ('rogue','rogue', true) on conflict do nothing");
  ok('nobody can write into an undeclared bucket',
    !allowed('authenticated', U.admin, put('rogue', 'x.webp', U.admin)));
  ok('…not even a normal user',
    !allowed('authenticated', U.alice, put('rogue', `${U.alice}/x.webp`, U.alice)));
  psql("insert into storage.objects (bucket_id, name, owner, metadata) values ('rogue','orphan.webp','" + U.admin + "', " + IMG + ")");
  ok('and an orphan already in it is invisible to clients',
    visible('anon', null, "select count(*) from storage.objects where bucket_id='rogue'") === 0);

  // RLS must be on AND forced, or the owner bypasses it.
  ok('storage.objects has RLS enabled and forced',
    psql(`select relrowsecurity and relforcerowsecurity from pg_class c
          join pg_namespace n on n.oid=c.relnamespace
          where n.nspname='storage' and c.relname='objects'`) === 't');
}

/* ── 7. The migration itself ──────────────────────────────────────────────── */

console.log('\n[7] The migration keeps the existing contracts and holds no secret');
{
  const sql = readFileSync(path.join(ROOT, 'supabase/migrations/0003_storage.sql'), 'utf8');
  ok('no key or password in the migration',
    !/service_role_key|secret_key|password\s*=/i.test(sql));

  // The static, repository-committed images must NOT have been given a bucket:
  // two homes for a product photograph is the ambiguity the manifest removes.
  ok('the committed asset folders are named as deliberately excluded',
    /web\/public\/assets\/store/.test(sql) && /web\/public\/assets\/projects/.test(sql));

  const shim = readFileSync(path.join(ROOT, 'supabase/test/01_storage_shim.sql'), 'utf8');
  ok('the storage shim declares itself test-only', /NEVER APPLIED TO THE PROJECT/i.test(shim));
  ok('no shim sits in supabase/migrations',
    !readdirSync(path.join(ROOT, 'supabase/migrations')).some(f => /shim/i.test(f)));
}

console.log(`\n${'─'.repeat(66)}`);
console.log(`supabase storage: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;

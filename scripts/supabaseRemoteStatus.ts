#!/usr/bin/env tsx
/**
 * READ the real Supabase project and say precisely where it stands.
 *
 * Answers, from the live database and never from assumption:
 *   · which of `0001`–`0007` is fully applied, partial, or missing —
 *     statement by statement, not file by file
 *   · what exists that the migrations never created (a conflict to report,
 *     not to touch)
 *   · column-level diffs for every table the migrations define
 *   · the counts a final report needs: tables, policies, buckets, functions,
 *     triggers
 *
 * It CHANGES NOTHING. The write half is `supabaseReconcile.ts`, which reads
 * the same plan and executes only what this tool reports as missing.
 *
 * Needs: SUPABASE_PROJECT_REF + SUPABASE_ACCESS_TOKEN in the environment,
 * and `api.supabase.com` allowed by the environment's network policy.
 *
 * Run: npm run remote:status
 */

import path from 'node:path';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  remoteConfig, remotePing, remoteSql, RemoteBlockedError, RemoteSqlError,
} from './lib/supabaseRemote';
import {
  loadPlans, codeOfStatement, type DbSnapshot,
} from './lib/migrationPlan';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const cfgRes = remoteConfig();
if (!cfgRes.ok) {
  console.error('\n✋ لا وصول بعد — المطلوب قيمتان في متغيرات بيئة Claude Code هذه:');
  for (const v of cfgRes.missing) console.error(`   · ${v}`);
  console.error('\nومعهما سماح الشبكة للنطاق api.supabase.com في إعدادات البيئة.');
  process.exit(2);
}
const cfg = cfgRes.cfg;

try {
  const ping = remotePing(cfg);
  console.log(`\n✓ متصل بالمشروع الحقيقي: ${ping.database} — ${ping.version.split(' on ')[0]}`);
} catch (e) {
  if (e instanceof RemoteBlockedError) {
    console.error('\n✋ البوابة ترفض الاتصال — أضف api.supabase.com إلى Network في إعدادات البيئة ثم أعد التشغيل.');
  } else if (e instanceof RemoteSqlError) {
    console.error(`\n✋ ${e.message}`);
  } else { throw e; }
  process.exit(2);
}

/* ── Snapshot the real database ───────────────────────────────────────────── */

function q<T>(sql: string): T[] { return remoteSql(cfg, sql) as T[]; }

console.log('\nقراءة الحالة الحقيقية…');

const snap: DbSnapshot = {
  tables: new Set(q<{ s: string; t: string }>(
    `select table_schema s, table_name t from information_schema.tables
     where table_schema in ('public','storage') and table_type='BASE TABLE'`)
    .map(r => `${r.s}.${r.t}`)),
  columns: new Set(q<{ s: string; t: string; c: string }>(
    `select table_schema s, table_name t, column_name c from information_schema.columns
     where table_schema in ('public','storage')`)
    .map(r => `${r.s}.${r.t}.${r.c}`)),
  types: new Set(q<{ n: string }>(
    `select typname n from pg_type ty join pg_namespace ns on ns.oid = ty.typnamespace
     where ns.nspname = 'public' and ty.typtype = 'e'`)
    .map(r => r.n)),
  enumLabels: new Map(q<{ n: string; labels: string[] }>(
    `select ty.typname n, array_agg(e.enumlabel order by e.enumsortorder) labels
     from pg_enum e join pg_type ty on ty.oid = e.enumtypid
     join pg_namespace ns on ns.oid = ty.typnamespace
     where ns.nspname = 'public' group by ty.typname`)
    .map(r => [r.n, r.labels])),
  indexes: new Set(q<{ n: string }>(
    `select indexname n from pg_indexes where schemaname in ('public','storage')`)
    .map(r => r.n)),
  constraints: new Set(q<{ t: string; c: string }>(
    `select rel.relname t, con.conname c from pg_constraint con
     join pg_class rel on rel.oid = con.conrelid
     join pg_namespace ns on ns.oid = rel.relnamespace
     where ns.nspname in ('public','storage')`)
    .map(r => `${r.t}.${r.c}`)),
  policies: new Set(q<{ t: string; p: string }>(
    `select tablename t, policyname p from pg_policies where schemaname in ('public','storage')`)
    .map(r => `${r.t}.${r.p}`)),
  functions: new Set(q<{ s: string; f: string }>(
    `select ns.nspname s, p.proname f from pg_proc p
     join pg_namespace ns on ns.oid = p.pronamespace
     where ns.nspname in ('public','storage')`)
    .map(r => `${r.s}.${r.f}`)),
  triggers: new Set(q<{ t: string; g: string }>(
    `select rel.relname t, tg.tgname g from pg_trigger tg
     join pg_class rel on rel.oid = tg.tgrelid
     join pg_namespace ns on ns.oid = rel.relnamespace
     where not tg.tgisinternal and ns.nspname in ('public','storage','auth')`)
    .map(r => `${r.t}.${r.g}`)),
  buckets: new Set(q<{ id: string }>('select id from storage.buckets').map(r => r.id)),
  rls: new Map(q<{ s: string; t: string; e: boolean; f: boolean }>(
    `select ns.nspname s, rel.relname t, rel.relrowsecurity e, rel.relforcerowsecurity f
     from pg_class rel join pg_namespace ns on ns.oid = rel.relnamespace
     where rel.relkind = 'r' and ns.nspname in ('public','storage')`)
    .map(r => [`${r.s}.${r.t}`, { enabled: r.e, forced: r.f }])),
};

console.log(`  جداول public/storage: ${snap.tables.size} · أنواع enum: ${snap.types.size} · `
  + `سياسات: ${snap.policies.size} · دوال: ${snap.functions.size} · Buckets: ${snap.buckets.size}`);

/* ── Classify every migration, statement by statement ─────────────────────── */

const plans = loadPlans(ROOT);
const report: Record<string, {
  verdict: 'applied' | 'partial' | 'missing';
  satisfied: number; pending: number; destructiveHeld: number;
  pendingObjects: string[]; heldObjects: string[];
}> = {};

console.log('\nتصنيف الهجرات مقابل الواقع:');
for (const plan of plans) {
  const real = plan.statements.filter(s => s.kind !== 'transaction');
  const unsat = real.filter(s => !s.satisfied(snap));
  const held = unsat.filter(s => s.destructive);
  const pending = unsat.filter(s => !s.destructive);
  // «always-run» statements (grants, or-replace functions, upserts) count as
  // satisfiable-by-running, so a migration whose only pending items are
  // always-run refreshers still reads as APPLIED for the verdict — the
  // refreshers run anyway on reconcile.
  const pendingStructural = pending.filter(s =>
    !['grant', 'create-function', 'bucket-upsert', 'create-extension', 'create-schema',
      'do-block', 'drop-policy', 'drop-trigger', 'enable-rls', 'always-run'].includes(s.kind));

  const structural = real.filter(s =>
    !['grant', 'create-function', 'bucket-upsert', 'create-extension', 'create-schema',
      'do-block', 'drop-policy', 'drop-trigger', 'enable-rls', 'always-run'].includes(s.kind)
    && !s.destructive);
  const verdict: 'applied' | 'partial' | 'missing' =
    pendingStructural.length === 0 && held.length === 0 ? 'applied'
      : structural.length > 0 && pendingStructural.length === structural.length ? 'missing'
      : 'partial';

  report[plan.file] = {
    verdict,
    satisfied: real.length - unsat.length,
    pending: pending.length,
    destructiveHeld: held.length,
    pendingObjects: pendingStructural.map(s => `${s.kind}:${s.object}`),
    heldObjects: held.map(s => s.object),
  };

  const mark = verdict === 'applied' ? '✓' : verdict === 'partial' ? '◑' : '✗';
  console.log(`  ${mark} ${plan.file}: ${verdict}`
    + ` (متحقق ${real.length - unsat.length}/${real.length}`
    + `${held.length ? ` · مؤجَّل حذف ${held.length}` : ''})`);
  for (const o of pendingStructural.slice(0, 12)) console.log(`      ناقص → ${o.kind}: ${o.object}`);
  for (const o of held) console.log(`      حذف بانتظار موافقة → ${o.object}`);
}

/* ── Column-level diff for every table a migration defines ────────────────── */

console.log('\nفحص الأعمدة (جدول الهجرة مقابل الواقع):');
const migDir = path.join(ROOT, 'supabase', 'migrations');
const allSql = readdirSync(migDir).filter(f => f.endsWith('.sql')).sort()
  .map(f => readFileSync(path.join(migDir, f), 'utf8')).join('\n');

const columnDiffs: Record<string, { missing: string[]; extra: string[] }> = {};
for (const m of allSql.matchAll(/create table (?:if not exists )?(\w+)\.(\w+)\s*\(([\s\S]*?)\n\)/g)) {
  const [, schema, table, body] = m;
  const expected = body.split('\n')
    .map(l => l.replace(/--.*$/, '').trim())
    .filter(l => l && !/^(primary key|foreign key|unique|check|constraint)/i.test(l))
    .map(l => l.match(/^"?(\w+)"?\s/)?.[1])
    .filter((c): c is string => !!c);
  const key = `${schema}.${table}`;
  if (!snap.tables.has(key)) continue;
  const realCols = new Set([...snap.columns]
    .filter(c => c.startsWith(`${key}.`)).map(c => c.split('.')[2]));
  const missing = expected.filter(c => !realCols.has(c));
  const extra = [...realCols].filter(c => !expected.includes(c)
    // Columns later migrations add legitimately:
    && !['doc', 'search_tokens', 'fulfilment', 'payment_state'].includes(c));
  if (missing.length || extra.length) {
    columnDiffs[key] = { missing, extra };
    console.log(`  ⚠ ${key}: ناقص [${missing.join(', ') || '—'}] · زائد [${extra.join(', ') || '—'}]`);
  }
}
if (Object.keys(columnDiffs).length === 0) console.log('  ✓ لا فروق أعمدة في الجداول الموجودة');

/* ── Objects the migrations never made (conflicts to report, not touch) ───── */

const KNOWN_TABLES = new Set([...allSql.matchAll(/create table (?:if not exists )?(\w+)\.(\w+)/g)]
  .map(m => `${m[1]}.${m[2]}`));
const strangers = [...snap.tables].filter(t =>
  t.startsWith('public.') && !KNOWN_TABLES.has(t));
if (strangers.length) {
  console.log('\nجداول موجودة لم تنشئها أي هجرة (لن تُمَسّ):');
  for (const t of strangers) console.log(`  ? ${t}`);
}

/* ── Persist the snapshot for the reconciler and the final report ─────────── */

const outPath = path.join(ROOT, 'supabase', 'remote-status.json');
writeFileSync(outPath, JSON.stringify({
  at: new Date().toISOString(),
  counts: {
    tables: [...snap.tables].filter(t => t.startsWith('public.')).length,
    storageTables: [...snap.tables].filter(t => t.startsWith('storage.')).length,
    policies: snap.policies.size,
    buckets: snap.buckets.size,
    functions: [...snap.functions].filter(f => f.startsWith('public.')).length,
    triggers: snap.triggers.size,
    enumTypes: snap.types.size,
  },
  migrations: report,
  columnDiffs,
  strangers,
  buckets: [...snap.buckets],
  enumLabels: Object.fromEntries(snap.enumLabels),
}, null, 2));
console.log(`\nكُتب التقرير الكامل إلى ${path.relative(ROOT, outPath)}`);

#!/usr/bin/env tsx
/**
 * APPLY exactly what the real project is missing — nothing else, and never
 * a deletion.
 *
 * HOW IT DECIDES
 * ==============
 * The same statement plan `supabaseRemoteStatus.ts` reports from: every
 * migration split into statements, every statement carrying an «already
 * satisfied?» predicate over a FRESH introspection snapshot taken at run
 * time. What is satisfied is skipped; what is missing runs; each migration's
 * missing statements run as ONE transaction, so a failure leaves that
 * migration exactly as it was found rather than half-moved — the state this
 * whole tool exists to dig out of.
 *
 * WHAT IT WILL NOT DO, EVER
 * =========================
 *   · run a `drop table` / `drop type` / `truncate` / `delete` — those are
 *     collected and printed for the owner's explicit approval, whatever any
 *     migration says (`0007` legitimately supersedes four sketches; whether
 *     the REAL copies go is a decision made on a report)
 *   · touch any table the migrations never created
 *   · guess: with `--dry-run` it prints the exact SQL it would run and stops
 *
 * Re-runnable by construction: a second run finds everything satisfied and
 * does nothing.
 *
 * Run: npm run remote:reconcile        (or -- --dry-run first)
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  remoteConfig, remotePing, remoteSql, RemoteBlockedError, RemoteSqlError,
} from './lib/supabaseRemote';
import {
  loadPlans, guardedTouchTriggers, guardedRlsLoop, type DbSnapshot,
} from './lib/migrationPlan';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry-run');

const cfgRes = remoteConfig();
if (!cfgRes.ok) {
  console.error('\n✋ لا وصول بعد — المطلوب في متغيرات بيئة Claude Code هذه:');
  for (const v of cfgRes.missing) console.error(`   · ${v}`);
  console.error('ومعهما سماح الشبكة للنطاق api.supabase.com في إعدادات البيئة.');
  process.exit(2);
}
const cfg = cfgRes.cfg;

try {
  const ping = remotePing(cfg);
  console.log(`\n✓ متصل: ${ping.database} — ${ping.version.split(' on ')[0]}${DRY ? '  (dry-run)' : ''}`);
} catch (e) {
  if (e instanceof RemoteBlockedError || e instanceof RemoteSqlError) {
    console.error(`\n✋ ${e.message}`);
    process.exit(2);
  }
  throw e;
}

function q<T>(sql: string): T[] { return remoteSql(cfg, sql) as T[]; }

/** A fresh snapshot — the reconciler never trusts a stale report file. */
function takeSnapshot(): DbSnapshot {
  return {
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
       where ns.nspname = 'public' and ty.typtype = 'e'`).map(r => r.n)),
    enumLabels: new Map(),
    indexes: new Set(q<{ n: string }>(
      `select indexname n from pg_indexes where schemaname in ('public','storage')`).map(r => r.n)),
    constraints: new Set(q<{ t: string; c: string }>(
      `select rel.relname t, con.conname c from pg_constraint con
       join pg_class rel on rel.oid = con.conrelid
       join pg_namespace ns on ns.oid = rel.relnamespace
       where ns.nspname in ('public','storage')`).map(r => `${r.t}.${r.c}`)),
    policies: new Set(q<{ t: string; p: string }>(
      `select tablename t, policyname p from pg_policies where schemaname in ('public','storage')`)
      .map(r => `${r.t}.${r.p}`)),
    functions: new Set(q<{ s: string; f: string }>(
      `select ns.nspname s, p.proname f from pg_proc p
       join pg_namespace ns on ns.oid = p.pronamespace
       where ns.nspname in ('public','storage')`).map(r => `${r.s}.${r.f}`)),
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
}

const heldForApproval: { migration: string; object: string; sql: string }[] = [];
const applied: { migration: string; count: number; objects: string[] }[] = [];
const skipped: { migration: string; count: number }[] = [];

const plans = loadPlans(ROOT);

for (const plan of plans) {
  // Fresh snapshot per migration: earlier migrations in this same run may
  // have created objects later predicates depend on.
  const snap = takeSnapshot();

  const batch: string[] = [];
  const objects: string[] = [];
  let satisfiedCount = 0;

  for (const st of plan.statements) {
    if (st.kind === 'transaction') continue;

    if (st.destructive) {
      // Only held when the object still EXISTS — a drop of something already
      // gone is satisfied, not pending.
      const target = st.object.includes('.') ? st.object : `public.${st.object}`;
      const stillThere = snap.tables.has(target) || snap.types.has(st.object.replace(/^public\./, ''));
      if (stillThere) heldForApproval.push({ migration: plan.file, object: st.object, sql: st.sql });
      else satisfiedCount += 1;
      continue;
    }

    if (st.satisfied(snap)) { satisfiedCount += 1; continue; }

    if (st.kind === 'do-block') {
      // The two DO blocks are the only statements that cannot be made
      // idempotent as written (CREATE TRIGGER has no IF NOT EXISTS, and the
      // loops enumerate tables a later migration may have retired). Both are
      // regenerated per existing table from the live snapshot instead.
      const per = st.object === 'touch-triggers loop'
        ? guardedTouchTriggers(snap)
        : guardedRlsLoop(snap);
      if (per.length === 0) { satisfiedCount += 1; continue; }
      batch.push(...per);
      objects.push(...per.map(x => x.split('\n')[0].slice(0, 60)));
      continue;
    }

    // `create index` → IF NOT EXISTS, mechanically: between the snapshot and
    // the batch commit nothing else writes, but the rewrite makes re-runs
    // and races harmless for free.
    const sql = st.kind === 'create-index'
      ? st.sql.replace(/^(\s*create (?:unique )?index )(?!if not exists)/i, '$1if not exists ')
      : st.kind === 'drop-policy'
        ? st.sql.replace(/^(\s*drop policy )(?!if exists)/i, '$1if exists ')
        : st.sql;

    batch.push(sql);
    objects.push(`${st.kind}:${st.object}`);
  }

  if (batch.length === 0) {
    skipped.push({ migration: plan.file, count: satisfiedCount });
    console.log(`  ✓ ${plan.file}: مُتحقَّق بالكامل — لا شيء يُنفَّذ`);
    continue;
  }

  console.log(`  ◑ ${plan.file}: ${batch.length} عبارة ناقصة${DRY ? ' (لن تُنفَّذ — dry-run)' : ''}`);
  for (const o of objects) console.log(`      → ${o}`);

  if (DRY) continue;

  // One transaction per migration: it lands whole or not at all.
  const tx = `begin;\n${batch.join(';\n')};\ncommit;`;
  try {
    remoteSql(cfg, tx);
    applied.push({ migration: plan.file, count: batch.length, objects });
    console.log(`      ✓ نُفِّذت (${batch.length})`);
  } catch (e) {
    console.error(`\n✋ فشل تنفيذ ${plan.file} — تراجعت المعاملة كاملة، لم يتغير شيء من هذا الملف:`);
    console.error(`   ${(e as Error).message}`);
    process.exit(1);
  }
}

/* ── The verdicts ─────────────────────────────────────────────────────────── */

console.log('\n──────────────────────────────────────────────');
if (applied.length) {
  console.log('نُفِّذ:');
  for (const a of applied) console.log(`  ${a.migration}: ${a.count} عبارة`);
}
if (heldForApproval.length) {
  console.log('\nحذف مؤجَّل بانتظار موافقتك الصريحة (لن أنفذه من تلقاء نفسي):');
  for (const h of heldForApproval) console.log(`  ${h.migration}: ${h.object}`);
  console.log('\nهذه الجداول/الأنواع استُبدلت في 0007 ولا يقرؤها أي كود بعد الآن؛');
  console.log('حذفها آمن إن كانت فارغة، والقرار لك. للتنفيذ بعد الموافقة:');
  console.log('  npm run remote:reconcile -- --approve-drops');
}

if (process.argv.includes('--approve-drops') && heldForApproval.length && !DRY) {
  console.log('\n--approve-drops مُمرَّر: تنفيذ الحذف المعتمد…');
  // Refuses to drop anything that still holds rows — approval covers the
  // OBJECT, not silent data loss discovered later.
  for (const h of heldForApproval) {
    const obj = h.object.includes('.') ? h.object : `public.${h.object}`;
    if (/^drop table/i.test(h.sql)) {
      const rows = q<{ n: number }>(`select count(*)::int n from ${obj}`);
      if ((rows[0]?.n ?? 0) > 0) {
        console.error(`  ✋ ${obj} يحوي ${rows[0].n} صفاً — لن يُحذف. صدّر البيانات أولاً.`);
        continue;
      }
    }
    remoteSql(cfg, h.sql);
    console.log(`  ✓ حُذف ${h.object}`);
  }
}

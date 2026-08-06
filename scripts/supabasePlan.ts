#!/usr/bin/env tsx
/**
 * The corrective plan, computed OFFLINE from an introspection snapshot.
 *
 * WHY THIS EXISTS ALONGSIDE `supabaseRemoteStatus.ts`
 * ===================================================
 * Same engine (`lib/migrationPlan.ts`), different channel. `remote:status`
 * talks to the Management API over HTTPS and does its own introspection;
 * this one takes the snapshot as a FILE, because the project is reached
 * through the Supabase MCP connector — a tool channel the shell cannot call.
 * So the division of labour is: the connector reads the database and writes
 * `supabase/live-snapshot.json`, this computes what is missing, and the
 * connector applies the emitted SQL.
 *
 * WHAT IT EMITS
 * =============
 *   supabase/plan/<migration>.sql   exactly the unsatisfied, non-destructive
 *                                   statements of that migration, in original
 *                                   order — ready to apply as one migration
 *   supabase/plan/HELD.sql          the destructive statements, NEVER applied
 *                                   automatically, written out so the decision
 *                                   is made on a text a human can read
 *
 * A migration whose statements are all satisfied emits no file at all: that
 * is what «already applied» means here, and re-running this after a
 * successful apply must produce an empty plan. That property is the whole
 * point — it is what makes the run repeatable instead of destructive.
 *
 * Run: npx tsx scripts/supabasePlan.ts [--snapshot supabase/live-snapshot.json]
 */

import path from 'node:path';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  loadPlans, guardedTouchTriggers, guardedRlsLoop, codeOfStatement, type DbSnapshot,
} from './lib/migrationPlan';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// The prose lives in supabase/migrations/*.sql, which stays the documented
// source of truth. `--bare` emits the executable text only, for the copy that
// goes into the database's own migration ledger.
const BARE = process.argv.includes('--bare');
const snapArgIdx = process.argv.indexOf('--snapshot');
const snapPath = path.resolve(ROOT, snapArgIdx === -1
  ? 'supabase/live-snapshot.json'
  : process.argv[snapArgIdx + 1]);

if (!existsSync(snapPath)) {
  console.error(`✋ لا توجد لقطة: ${path.relative(ROOT, snapPath)}`);
  console.error('   اقرأ الحالة عبر موصل Supabase أولاً ثم اكتبها إلى هذا الملف.');
  process.exit(2);
}

interface RawSnapshot {
  tables: string[]; columns: string[]; types: string[];
  enumLabels: Record<string, string[]>;
  indexes: string[]; constraints: string[]; policies: string[];
  functions: string[]; triggers: string[]; buckets: string[];
  rls: Record<string, { enabled: boolean; forced: boolean }>;
}

const raw = JSON.parse(readFileSync(snapPath, 'utf8')) as RawSnapshot;
const snap: DbSnapshot = {
  tables: new Set(raw.tables),
  columns: new Set(raw.columns),
  types: new Set(raw.types),
  enumLabels: new Map(Object.entries(raw.enumLabels ?? {})),
  indexes: new Set(raw.indexes),
  constraints: new Set(raw.constraints),
  policies: new Set(raw.policies),
  functions: new Set(raw.functions),
  triggers: new Set(raw.triggers),
  buckets: new Set(raw.buckets),
  rls: new Map(Object.entries(raw.rls ?? {})),
};

console.log(`لقطة: ${raw.tables.length} جدول · ${raw.types.length} نوع · `
  + `${raw.policies.length} سياسة · ${raw.buckets.length} bucket · `
  + `${raw.functions.filter(f => f.startsWith('public.')).length} دالة public`);

const outDir = path.join(ROOT, 'supabase', 'plan');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const held: { migration: string; sql: string; object: string }[] = [];
const summary: { file: string; verdict: string; pending: number; total: number }[] = [];

for (const plan of loadPlans(ROOT)) {
  const emitted: string[] = [];
  let satisfied = 0;
  const real = plan.statements.filter(s => s.kind !== 'transaction');

  for (const st of real) {
    if (st.destructive) {
      // Existence-checked: a drop of something already gone is satisfied.
      const bare = st.object.replace(/^public\./, '');
      const stillThere = snap.tables.has(`public.${bare}`) || snap.types.has(bare);
      if (stillThere) held.push({ migration: plan.file, sql: st.sql, object: st.object });
      else satisfied += 1;
      continue;
    }
    if (st.satisfied(snap)) { satisfied += 1; continue; }

    if (st.kind === 'do-block') {
      // Neither DO block is idempotent as written (CREATE TRIGGER has no IF
      // NOT EXISTS; the RLS loop enumerates tables a later migration retires).
      // Both are regenerated from the live snapshot, per surviving table.
      const per = st.object === 'touch-triggers loop'
        ? guardedTouchTriggers(snap) : guardedRlsLoop(snap);
      if (per.length === 0) { satisfied += 1; continue; }
      emitted.push(...per.map(s => `${s};`));
      continue;
    }

    const source = BARE ? codeOfStatement(st.sql) : st.sql;
    const sql = st.kind === 'create-index'
      ? source.replace(/^(\s*create (?:unique )?index )(?!if not exists)/i, '$1if not exists ')
      : st.kind === 'drop-policy'
        ? source.replace(/^(\s*drop policy )(?!if exists)/i, '$1if exists ')
        : source;
    emitted.push(`${sql};`);
  }

  const verdict = emitted.length === 0 ? 'applied' : satisfied === 0 ? 'missing' : 'partial';
  summary.push({ file: plan.file, verdict, pending: emitted.length, total: real.length });

  const mark = verdict === 'applied' ? '✓' : verdict === 'partial' ? '◑' : '✗';
  console.log(`  ${mark} ${plan.file}: ${verdict} — متحقق ${satisfied}/${real.length}`
    + (emitted.length ? ` · ناقص ${emitted.length}` : ''));

  if (emitted.length) {
    const target = path.join(outDir, plan.file);
    writeFileSync(target, `-- corrective plan for ${plan.file}\n`
      + `-- ${emitted.length} of ${real.length} statements were missing from the live database.\n`
      + `-- Generated from ${path.relative(ROOT, snapPath)} — do not edit by hand.\n\n`
      + `${emitted.join('\n\n')}\n`);
  }
}

if (held.length) {
  writeFileSync(path.join(outDir, 'HELD.sql'),
    '-- NOT APPLIED AUTOMATICALLY — destructive statements, listed for an explicit decision.\n'
    + held.map(h => `-- from ${h.migration}\n${h.sql};`).join('\n\n') + '\n');
  console.log(`\nمحتجَز (حذف — لا يُنفَّذ تلقائياً): ${held.map(h => h.object).join(', ')}`);
}

console.log(`\nالخطة في ${path.relative(ROOT, outDir)}/ — `
  + `${summary.filter(s => s.pending).length} ملف يحتاج تنفيذاً، `
  + `${summary.filter(s => !s.pending).length} مكتمل.`);

/**
 * The migrations, read as STATEMENTS with per-statement «already satisfied»
 * predicates — the machinery behind both the status report and the
 * reconciler.
 *
 * WHY STATEMENT-LEVEL AND NOT FILE-LEVEL
 * ======================================
 * The real database was born from a partial, manual history: `0001` ran once
 * by hand, a re-run then died on its FIRST statement (`type "platform_role"
 * already exists`), and nothing says every later file is all-or-nothing
 * either. A file-level «applied?» flag cannot describe that state, and
 * re-running a whole file against it is exactly the error the owner hit.
 *
 * So each migration is split into its statements, and each statement carries
 * a predicate answering «does the real database already satisfy this?» from
 * an introspection snapshot. The classification and the corrective plan then
 * FALL OUT: a migration is applied when every statement is satisfied,
 * partial when some are, and the corrective plan is precisely the
 * unsatisfied, non-destructive statements in original order.
 *
 * WHAT IS REFUSED OUTRIGHT
 * ========================
 * Statements that destroy data — `drop table`, `drop type`, `truncate`,
 * `delete` — are NEVER executed by the reconciler, whatever the plan says.
 * They are collected for the owner's explicit approval (`0007` legitimately
 * drops four superseded sketches; whether the REAL project's copies go is
 * the owner's call, made on a report, not mine). Dropping a POLICY, TRIGGER
 * or CONSTRAINT is allowed: those are code, not data, and several
 * migrations recreate them in place.
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/* ── Splitting ────────────────────────────────────────────────────────────── */

/**
 * Split SQL into top-level statements, respecting single quotes, dollar
 * quoting ($$ and $tag$), and both comment styles. Written against the seven
 * files in this repository, which it round-trips exactly; it is not a general
 * SQL parser and does not pretend to be.
 */
export function splitSql(src: string): string[] {
  const out: string[] = [];
  let buf = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    const two = src.slice(i, i + 2);

    if (two === '--') {                       // line comment
      const end = src.indexOf('\n', i);
      const stop = end === -1 ? n : end + 1;
      buf += src.slice(i, stop);
      i = stop;
      continue;
    }
    if (two === '/*') {                       // block comment (the files do not nest them)
      const end = src.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      buf += src.slice(i, stop);
      i = stop;
      continue;
    }
    if (ch === "'") {                         // string literal ('' escapes)
      let j = i + 1;
      while (j < n) {
        if (src[j] === "'" && src[j + 1] === "'") { j += 2; continue; }
        if (src[j] === "'") { j += 1; break; }
        j += 1;
      }
      buf += src.slice(i, j);
      i = j;
      continue;
    }
    if (ch === '$') {                         // dollar quote
      const m = /^\$[A-Za-z_]*\$/.exec(src.slice(i));
      if (m) {
        const tag = m[0];
        const end = src.indexOf(tag, i + tag.length);
        const stop = end === -1 ? n : end + tag.length;
        buf += src.slice(i, stop);
        i = stop;
        continue;
      }
    }
    if (ch === ';') {
      out.push(buf.trim());
      buf = '';
      i += 1;
      continue;
    }
    buf += ch;
    i += 1;
  }
  if (buf.trim()) out.push(buf.trim());
  return out.filter(s => s.length > 0);
}

/** The statement without its leading comments, for classification. */
export function codeOfStatement(stmt: string): string {
  return stmt
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(l => !/^\s*--/.test(l))
    .join('\n')
    .trim();
}

/* ── The introspection snapshot the predicates read ───────────────────────── */

export interface DbSnapshot {
  tables: Set<string>;                        // schema.table
  columns: Set<string>;                       // schema.table.column
  types: Set<string>;                         // typname
  enumLabels: Map<string, string[]>;          // typname -> labels in order
  indexes: Set<string>;                       // indexname
  constraints: Set<string>;                   // table.conname
  policies: Set<string>;                      // tablename.policyname
  functions: Set<string>;                     // schema.proname
  triggers: Set<string>;                      // table.tgname
  buckets: Set<string>;                       // bucket id
  rls: Map<string, { enabled: boolean; forced: boolean }>; // schema.table
}

/* ── Classification ───────────────────────────────────────────────────────── */

export type StatementKind =
  | 'create-type' | 'create-table' | 'create-index' | 'create-function'
  | 'create-trigger' | 'create-policy' | 'create-schema' | 'create-extension'
  | 'add-column' | 'rename-column' | 'rename-index' | 'drop-constraint'
  | 'enable-rls' | 'grant' | 'bucket-upsert' | 'do-block'
  | 'drop-policy' | 'drop-trigger'
  | 'destructive' | 'transaction' | 'always-run';

export interface PlannedStatement {
  sql: string;
  kind: StatementKind;
  /** Human-readable name of the object this creates/changes. */
  object: string;
  /** True when the snapshot already satisfies this statement. */
  satisfied(snap: DbSnapshot): boolean;
  /** Never executed by the reconciler; queued for explicit approval. */
  destructive: boolean;
  /** Retired by a later migration — its absence is CORRECT. */
  superseded?: boolean;
}

const ALWAYS = () => false;      // «not satisfiable by looking» → always in the plan
const SATISFIED = () => true;    // never in the plan

/**
 * What LATER migrations retire — computed in a first pass over every file.
 *
 * An object created by `0001` and dropped by `0007` is SUPERSEDED: its
 * absence from the real database is correct, and recreating it would be the
 * reconciler fighting the migration history it exists to serve. The same
 * goes for everything hanging off it — indexes, policies, grants — and for
 * an index whose NAME a later migration renames.
 */
export interface SupersessionCtx {
  droppedTables: Set<string>;     // schema.table
  droppedTypes: Set<string>;      // typname
  renamedIndexes: Map<string, string>; // old -> new
}

export function scanSupersession(stmts: string[]): SupersessionCtx {
  const ctx: SupersessionCtx = {
    droppedTables: new Set(), droppedTypes: new Set(), renamedIndexes: new Map(),
  };
  for (const raw of stmts) {
    const code = codeOfStatement(raw).replace(/\s+/g, ' ');
    let m: RegExpMatchArray | null;
    if ((m = code.match(/^drop table (?:if exists )?(\w+)\.(\w+)/i))) {
      ctx.droppedTables.add(`${m[1]}.${m[2]}`);
    } else if ((m = code.match(/^drop type (?:if exists )?(\w+)/i))) {
      ctx.droppedTypes.add(m[1]);
    } else if ((m = code.match(/^alter index (\w+) rename to (\w+)/i))) {
      ctx.renamedIndexes.set(m[1], m[2]);
    }
  }
  return ctx;
}

/** Any `schema.table` this statement names that a later migration dropped. */
function referencesDropped(code: string, ctx: SupersessionCtx): boolean {
  for (const m of code.matchAll(/\b(public|storage)\.(\w+)/g)) {
    if (ctx.droppedTables.has(`${m[1]}.${m[2]}`)) return true;
  }
  return false;
}

function classify(stmt: string, ctx: SupersessionCtx): PlannedStatement {
  const code = codeOfStatement(stmt).replace(/\s+/g, ' ');
  const c = code.toLowerCase();

  const mk = (
    kind: StatementKind, object: string,
    satisfied: (s: DbSnapshot) => boolean, destructive = false,
  ): PlannedStatement => ({ sql: stmt, kind, object, satisfied, destructive });

  if (/^(begin|commit|rollback)\b/.test(c)) {
    // The reconciler wraps each migration's batch in its own transaction.
    return mk('transaction', c.split(' ')[0], SATISFIED);
  }

  let m: RegExpMatchArray | null;

  if ((m = code.match(/^create extension if not exists "?([\w-]+)"?/i))) {
    return mk('create-extension', m[1], ALWAYS); // idempotent by its own IF NOT EXISTS
  }
  if ((m = code.match(/^create type (\w+)/i))) {
    const name = m[1];
    if (ctx.droppedTypes.has(name)) {
      const st = mk('create-type', name, SATISFIED); st.superseded = true; return st;
    }
    return mk('create-type', name, s => s.types.has(name));
  }
  if ((m = code.match(/^create table (?:if not exists )?(\w+)\.(\w+)/i))) {
    const name = `${m[1]}.${m[2]}`;
    if (ctx.droppedTables.has(name)) {
      const st = mk('create-table', name, SATISFIED); st.superseded = true; return st;
    }
    return mk('create-table', name, s => s.tables.has(name));
  }
  if ((m = code.match(/^create (?:unique )?index (?:if not exists )?(\w+)/i))) {
    const name = m[1];
    const renamed = ctx.renamedIndexes.get(name);
    if (referencesDropped(code, ctx)) {
      const st = mk('create-index', name, SATISFIED); st.superseded = true; return st;
    }
    return mk('create-index', name,
      s => s.indexes.has(name) || (!!renamed && s.indexes.has(renamed)));
  }
  if (/^create or replace function/i.test(code)) {
    m = code.match(/^create or replace function (\w+)\.(\w+)/i);
    // Always re-run: OR REPLACE is idempotent and refreshes the definition to
    // the repository's truth, which is exactly what a reconciler wants.
    return mk('create-function', m ? `${m[1]}.${m[2]}` : 'function', ALWAYS);
  }
  if ((m = code.match(/^create trigger (\w+)\s+.*?\bon (\w+)\.(\w+)/is))) {
    const name = `${m[3]}.${m[1]}`;
    if (ctx.droppedTables.has(`${m[2]}.${m[3]}`)) {
      const st = mk('create-trigger', name, SATISFIED); st.superseded = true; return st;
    }
    return mk('create-trigger', name, s => s.triggers.has(name));
  }
  if ((m = code.match(/^create policy (\w+) on (\w+)\.(\w+)/i))) {
    const name = `${m[3]}.${m[1]}`;
    if (ctx.droppedTables.has(`${m[2]}.${m[3]}`)) {
      const st = mk('create-policy', name, SATISFIED); st.superseded = true; return st;
    }
    return mk('create-policy', name, s => s.policies.has(name));
  }
  if ((m = code.match(/^create schema if not exists (\w+)/i))) {
    return mk('create-schema', m[1], ALWAYS);
  }
  if ((m = code.match(/^alter table (\w+)\.(\w+) add column (?:if not exists )?(\w+)/i))) {
    const col = `${m[1]}.${m[2]}.${m[3]}`;
    return mk('add-column', col, s => s.columns.has(col));
  }
  if ((m = code.match(/^alter table (\w+)\.(\w+) rename column (\w+) to (\w+)/i))) {
    const target = `${m[1]}.${m[2]}.${m[4]}`;
    return mk('rename-column', target, s => s.columns.has(target));
  }
  if ((m = code.match(/^alter index (\w+) rename to (\w+)/i))) {
    const target = m[2];
    return mk('rename-index', target, s => s.indexes.has(target));
  }
  if ((m = code.match(/^alter table (\w+)\.(\w+) drop constraint (\w+)/i))) {
    const name = `${m[2]}.${m[3]}`;
    // Allowed: a constraint is code. Satisfied when it is already gone.
    return mk('drop-constraint', name, s => !s.constraints.has(name));
  }
  if (/^alter table .*(enable|force) row level security/i.test(code)) {
    m = code.match(/^alter table (\w+)\.(\w+)/i);
    const name = m ? `${m[1]}.${m[2]}` : '?';
    if (m && ctx.droppedTables.has(name)) {
      const st = mk('enable-rls', name, SATISFIED); st.superseded = true; return st;
    }
    const wantsForce = /force row level security/i.test(code);
    return mk('enable-rls', `${name}:${wantsForce ? 'force' : 'enable'}`, s => {
      const st = s.rls.get(name);
      return st ? (wantsForce ? st.forced : st.enabled) : false;
    });
  }
  if (/^(grant|revoke) /i.test(code)) {
    if (referencesDropped(code, ctx)) {
      const st = mk('grant', code.slice(0, 60), SATISFIED); st.superseded = true; return st;
    }
    return mk('grant', code.slice(0, 60), ALWAYS); // idempotent by nature
  }
  if (/^insert into storage\.buckets/i.test(code)) {
    // Carries its own ON CONFLICT upsert — safe and self-updating.
    return mk('bucket-upsert', 'storage.buckets seed', ALWAYS);
  }
  if (/^drop policy /i.test(code)) {
    m = code.match(/^drop policy (?:if exists )?(\w+) on (\w+)\.(\w+)/i);
    return mk('drop-policy', m ? `${m[3]}.${m[1]}` : code.slice(0, 40), ALWAYS);
  }
  if (/^drop trigger /i.test(code)) {
    m = code.match(/^drop trigger (?:if exists )?(\w+) on (\w+)\.(\w+)/i);
    return mk('drop-trigger', m ? `${m[3]}.${m[1]}` : code.slice(0, 40), ALWAYS);
  }
  if (/^do \$/i.test(c)) {
    return mk('do-block', c.includes('touch_updated_at') || c.includes('_touch')
      ? 'touch-triggers loop' : 'rls loop', ALWAYS);
  }
  if (/^(drop table|drop type|drop schema|truncate|delete from)/i.test(code)) {
    m = code.match(/^drop (?:table|type) (?:if exists )?(\w+(?:\.\w+)?)/i);
    return mk('destructive', m ? m[1] : code.slice(0, 50), ALWAYS, true);
  }

  return mk('always-run', code.slice(0, 60), ALWAYS);
}

/* ── The plan ─────────────────────────────────────────────────────────────── */

export interface MigrationPlan {
  file: string;
  statements: PlannedStatement[];
}

export function loadPlans(root: string): MigrationPlan[] {
  const dir = path.join(root, 'supabase', 'migrations');
  const files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  const perFile = files.map(f => splitSql(readFileSync(path.join(dir, f), 'utf8')));
  // Pass 1: what later migrations retire. Pass 2: classify with that known.
  const ctx = scanSupersession(perFile.flat());
  return files.map((file, i) => ({
    file,
    statements: perFile[i].map(st => classify(st, ctx)),
  }));
}

/**
 * The special case the plan cannot express generically: `0001`'s trigger
 * loop creates nine `_touch` triggers inside one DO block, which is not
 * idempotent (CREATE TRIGGER has no IF NOT EXISTS). The reconciler swaps the
 * block for per-trigger guarded pairs, and the classifier above marks the
 * block itself by name so the swap is targeted, not guessed.
 */
export const TOUCH_TRIGGER_TABLES = [
  // 0001's own array, verbatim. store_supply and payment_attempts are
  // superseded by 0007 and may already be gone — the generator checks the
  // live snapshot before writing a trigger on anything.
  'profiles', 'posts', 'comments', 'store_products', 'store_supply',
  'store_settings', 'orders', 'payment_attempts', 'project_overrides',
] as const;

export function guardedTouchTriggers(snap: DbSnapshot): string[] {
  return TOUCH_TRIGGER_TABLES
    .filter(t => snap.tables.has(`public.${t}`))
    .filter(t => !snap.triggers.has(`${t}.${t}_touch`))
    .map(t =>
      `create trigger ${t}_touch before update on public.${t}\n`
      + `  for each row execute function public.touch_updated_at()`);
}

/** 0001's RLS loop, verbatim — regenerated per existing table so a re-run
 *  after any approved drop cannot trip over a table that has left. */
export const RLS_LOOP_TABLES = [
  'profiles', 'posts', 'comments', 'post_likes', 'comment_likes', 'reports',
  'audit_log', 'store_products', 'store_variants', 'store_supply',
  'store_decisions', 'store_settings', 'shipping_regions', 'orders',
  'order_items', 'payment_attempts', 'project_overrides', 'media_objects',
  'cleanup_runs', 'rate_limits',
] as const;

export function guardedRlsLoop(snap: DbSnapshot): string[] {
  const out: string[] = [];
  for (const t of RLS_LOOP_TABLES) {
    const key = `public.${t}`;
    if (!snap.tables.has(key)) continue;
    const st = snap.rls.get(key);
    if (!st?.enabled) out.push(`alter table public.${t} enable row level security`);
    if (!st?.forced) out.push(`alter table public.${t} force row level security`);
  }
  return out;
}

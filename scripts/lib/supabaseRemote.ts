/**
 * The ONE channel to the real Supabase project: the Management API.
 *
 * WHY THIS CHANNEL AND NO OTHER
 * =============================
 * This environment's egress gateway refuses raw TCP outright (no DNS, no
 * sockets), so the Postgres wire protocol — psql, poolers, connection strings
 * — can never work from here, whatever credentials exist. What CAN work is
 * HTTPS through the pre-configured proxy, and Supabase's Management API
 * exposes exactly the needed capability over HTTPS:
 *
 *   POST https://api.supabase.com/v1/projects/{ref}/database/query
 *   Authorization: Bearer <personal access token>
 *   { "query": "<sql>" }
 *
 * — the same engine the dashboard's SQL editor uses. One domain to allow,
 * one token to hold, and every job (introspection, reconciliation, the RLS
 * and Storage suites) runs through it.
 *
 * WHAT IT NEEDS, AND WHERE THOSE VALUES LIVE
 * ==========================================
 *   SUPABASE_PROJECT_REF   the project ref (the subdomain in the project URL)
 *   SUPABASE_ACCESS_TOKEN  a Personal Access Token — Account → Access Tokens
 *
 * Both are environment variables of the Claude Code environment — never
 * committed, never pasted into a conversation. The token is an ACCOUNT
 * credential: treat it like one, scope it if the dashboard offers scopes,
 * and revoke it when this migration work is done.
 *
 * SYNCHRONOUS BY DESIGN
 * =====================
 * The RLS and Storage suites are synchronous scripts built around a psql
 * executor. Making this executor synchronous too (curl via execFileSync)
 * means the suites run REMOTELY with their assertion logic byte-for-byte
 * unchanged — the same 138 checks, pointed at the real database. An async
 * client would have forced a rewrite of every call site, which is a hundred
 * chances to change what is being asserted.
 *
 * TRANSACTIONS ACROSS THIS CHANNEL
 * ================================
 * Each API call is one isolated session. Two consequences the callers rely
 * on:
 *   · a batch that opens `begin` and never commits is rolled back when the
 *     session ends — so a probe can END on its SELECT and still leave no
 *     trace. (The local psql harness appends `rollback`; remotely the
 *     rollback is implicit and the SELECT must come last, because the API
 *     returns the last statement's rows.)
 *   · nothing persists between calls except what was COMMITTED — so seeds
 *     commit explicitly, and cleanup is a real obligation, not a rollback.
 */

import { execFileSync } from 'node:child_process';

export interface RemoteConfig {
  ref: string;
  token: string;
}

/** The config, or a precise statement of which half is missing. */
export function remoteConfig(): { ok: true; cfg: RemoteConfig } | { ok: false; missing: string[] } {
  const ref = process.env.SUPABASE_PROJECT_REF?.trim() ?? '';
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim() ?? '';
  const missing: string[] = [];
  if (!ref) missing.push('SUPABASE_PROJECT_REF');
  if (!token) missing.push('SUPABASE_ACCESS_TOKEN');
  return missing.length ? { ok: false, missing } : { ok: true, cfg: { ref, token } };
}

export class RemoteSqlError extends Error {
  constructor(message: string, readonly httpStatus: number | null, readonly body: string) {
    super(message);
    this.name = 'RemoteSqlError';
  }
}

export class RemoteBlockedError extends Error {
  constructor(detail: string) {
    super(`api.supabase.com is unreachable from this environment: ${detail}`);
    this.name = 'RemoteBlockedError';
  }
}

/**
 * Run SQL on the real project. Returns the LAST statement's rows.
 *
 * Throws `RemoteSqlError` for a SQL/auth failure (message carries the
 * server's own error text) and `RemoteBlockedError` when the egress gateway
 * refused the connection — the two failures need opposite fixes and must
 * never be confused in a report.
 */
export function remoteSql(cfg: RemoteConfig, sql: string): unknown[] {
  const url = `https://api.supabase.com/v1/projects/${cfg.ref}/database/query`;
  let out: string;
  try {
    out = execFileSync('curl', [
      '-sS', '--max-time', '120',
      '-w', '\n%{http_code}',
      '-H', `Authorization: Bearer ${cfg.token}`,
      '-H', 'Content-Type: application/json',
      '-X', 'POST', url,
      '--data-binary', '@-',
    ], { input: JSON.stringify({ query: sql }), encoding: 'utf8' });
  } catch (e) {
    const msg = String((e as { stderr?: Buffer; message?: string }).stderr ?? (e as Error).message ?? e);
    throw new RemoteBlockedError(msg.slice(0, 300));
  }

  const nl = out.lastIndexOf('\n');
  const status = Number(out.slice(nl + 1).trim());
  const body = out.slice(0, nl);

  if (status === 0) throw new RemoteBlockedError('CONNECT rejected by the gateway (status 000)');
  if (status === 401 || status === 403) {
    throw new RemoteSqlError(
      `the Management API refused the token (HTTP ${status}) — check SUPABASE_ACCESS_TOKEN`,
      status, body.slice(0, 500));
  }
  if (status === 404) {
    throw new RemoteSqlError(
      `project ref not found (HTTP 404) — check SUPABASE_PROJECT_REF`,
      status, body.slice(0, 500));
  }
  if (status >= 400) {
    // SQL errors arrive as 4xx with the Postgres message in the body.
    let message = body;
    try {
      const parsed = JSON.parse(body) as { message?: string; error?: string };
      message = parsed.message ?? parsed.error ?? body;
    } catch { /* raw body is the message */ }
    throw new RemoteSqlError(message.slice(0, 800), status, body.slice(0, 1000));
  }

  try {
    const parsed = JSON.parse(body);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

/**
 * The same call, shaped like `psql -tAc` output — one line per row, columns
 * joined by `|` — so the suites' text-parsing assertions (`the last numeric
 * line`) work identically against either executor.
 */
export function remoteSqlAsPsql(cfg: RemoteConfig, sql: string): string {
  const rows = remoteSql(cfg, sql);
  return rows.map(r => {
    if (r === null || r === undefined) return '';
    if (typeof r !== 'object') return String(r);
    return Object.values(r as Record<string, unknown>)
      .map(v => v === null || v === undefined ? ''
        : typeof v === 'object' ? JSON.stringify(v) : String(v))
      .join('|');
  }).join('\n');
}

/** One quick, harmless round trip — the access check the report leads with. */
export function remotePing(cfg: RemoteConfig): { version: string; database: string } {
  const rows = remoteSql(cfg, 'select version() as version, current_database() as database') as
    Array<{ version?: string; database?: string }>;
  return {
    version: String(rows[0]?.version ?? 'unknown'),
    database: String(rows[0]?.database ?? 'unknown'),
  };
}

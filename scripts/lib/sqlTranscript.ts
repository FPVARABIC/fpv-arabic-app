/**
 * Running the suites against the REAL project when the only channel to it is
 * an MCP tool call.
 *
 * THE PROBLEM
 * ===========
 * The RLS and Storage suites are synchronous scripts around one SQL executor.
 * The real project is reachable only through the Supabase MCP connector —
 * a tool the agent invokes, which a shell process cannot call at all. So the
 * suites cannot talk to the database directly, and rewriting their 138
 * assertions into SQL would mean re-deriving the specification in a second
 * language. That is exactly how a test suite quietly stops testing what it
 * used to.
 *
 * THE BRIDGE
 * ==========
 * Split the run in two, and keep the assertions untouched in both halves:
 *
 *   capture — the suite runs with the executor recording every statement, in
 *             order, and answering with a stub. Nothing is asserted (the
 *             answers are empty); the output is the TRANSCRIPT: the exact
 *             SQL the suite would have sent, in the exact order.
 *
 *   replay  — the same suite runs again, and the executor answers each
 *             statement with what the REAL project returned for it. Every
 *             assertion is now evaluated on a real answer from the real
 *             database, by the same code that evaluates it locally.
 *
 * Between the two halves, the transcript is executed on the real project (see
 * `supabaseRemoteBatch.ts`, which turns it into one script whose probes each
 * run in an isolated subtransaction).
 *
 * WHY THE ORDER CHECK IS LOAD-BEARING
 * ===================================
 * The bridge is only sound if the suite issues the SAME statements in the
 * SAME order in both halves — otherwise answer #37 is handed to a different
 * question and the pass means nothing. So replay verifies the statement it is
 * asked for against the one recorded at that position and ABORTS on the first
 * divergence rather than degrading quietly. A suite that branched on results
 * would trip this immediately, by design.
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';

export type TranscriptMode = 'off' | 'capture' | 'replay';

export interface TranscriptEntry {
  i: number;
  sql: string;
  /** What the real project returned, psql-shaped. Empty during capture. */
  out: string;
  /** Set when the statement raised: replay re-throws it so `catch` paths match. */
  err?: string;
}

export function transcriptMode(): TranscriptMode {
  const m = process.env.SUPABASE_TRANSCRIPT ?? '';
  return m === 'capture' || m === 'replay' ? m : 'off';
}

export function transcriptPath(): string {
  return process.env.SUPABASE_TRANSCRIPT_FILE ?? 'supabase/plan/transcript.jsonl';
}

/** Statement text is normalised before comparison — whitespace is not meaning. */
function key(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim();
}

export class Transcript {
  private entries: TranscriptEntry[] = [];
  private cursor = 0;

  constructor(readonly mode: TranscriptMode, readonly file: string) {
    if (mode === 'capture') writeFileSync(file, '');
    if (mode === 'replay') {
      if (!existsSync(file)) {
        throw new Error(`replay needs ${file} — run the capture pass first`);
      }
      this.entries = readFileSync(file, 'utf8').split('\n').filter(Boolean)
        .map(l => JSON.parse(l) as TranscriptEntry);
    }
  }

  /** Capture: record and stub. Replay: verify position and answer for real. */
  run(sql: string): string {
    if (this.mode === 'capture') {
      const entry: TranscriptEntry = { i: this.cursor, sql, out: '' };
      appendFileSync(this.file, `${JSON.stringify(entry)}\n`);
      this.cursor += 1;
      return '';
    }

    const entry = this.entries[this.cursor];
    if (!entry) {
      throw new Error(`transcript exhausted at statement ${this.cursor} — `
        + 'the replay pass asked for more statements than were captured');
    }
    if (key(entry.sql) !== key(sql)) {
      throw new Error(
        `transcript divergence at statement ${this.cursor}:\n`
        + `  captured: ${key(entry.sql).slice(0, 160)}\n`
        + `  replayed: ${key(sql).slice(0, 160)}\n`
        + 'The suite is not deterministic across passes; the bridge is unsound '
        + 'for it and the results must not be trusted.');
    }
    this.cursor += 1;
    if (entry.err) {
      const e = new Error(entry.err) as Error & { stderr: string };
      e.stderr = entry.err;
      throw e;
    }
    return entry.out;
  }

  get count(): number { return this.cursor; }
}

/** Read a captured transcript back — used by the batch generator. */
export function readTranscript(file: string): TranscriptEntry[] {
  return readFileSync(file, 'utf8').split('\n').filter(Boolean)
    .map(l => JSON.parse(l) as TranscriptEntry);
}

/** Write a transcript with the real project's answers filled in. */
export function writeTranscript(file: string, entries: TranscriptEntry[]): void {
  writeFileSync(file, entries.map(e => JSON.stringify(e)).join('\n') + '\n');
}

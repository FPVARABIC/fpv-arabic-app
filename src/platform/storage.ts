/**
 * The local-storage contract every persisted store must satisfy.
 *
 * Anything worth keeping on the device is, eventually, something the user will
 * expect to find on another device. That day arrives as a migration problem, and
 * the cost of it is decided now — by whether the data was written with a model,
 * a schema version, a validator and an export path, or without them.
 *
 * Five requirements, enforced by this module rather than remembered by authors:
 *
 *   1. a written model — the shape is a type, not a habit
 *   2. a schema version — carried in the payload, not inferred from its shape
 *   3. validation on read — a corrupt or hand-edited value is rejected whole,
 *      never partially trusted
 *   4. migration — an older version is upgraded rather than discarded, when an
 *      upgrade path exists
 *   5. export/import — the data can leave the browser as text, which is what
 *      makes future sync a transport problem instead of a rescue operation
 *
 * DELIBERATELY NOT HERE
 * ---------------------
 * No sync, no server, no conflict resolution. Those belong to a stage this
 * project has not reached. What is here is only what makes them possible later
 * without rewriting the stores.
 *
 * Storage access is wrapped because it genuinely throws: private browsing,
 * disabled storage, quota. A store that crashes the app on a failed write is
 * worse than one that silently keeps working in memory.
 */

export interface StoreDefinition<T> {
  /** The localStorage key. Stable forever — changing it orphans user data. */
  key: string;
  /** Current schema version. Increment when the shape changes. */
  version: number;
  /** Rejects anything that is not a valid `T` at the current version. */
  validate(raw: unknown): T | null;
  /**
   * Upgrades a payload written by an older version. Return null when the old
   * shape cannot be upgraded honestly — discarding is better than guessing.
   */
  migrate?(data: unknown, fromVersion: number): unknown | null;
}

/** The envelope actually written to storage. Never write a bare value. */
interface Envelope {
  v: number;
  data: unknown;
  /** Milliseconds since epoch, supplied by the caller — see `save`. */
  savedAt?: number;
}

function isEnvelope(x: unknown): x is Envelope {
  return typeof x === 'object' && x !== null && 'v' in x && 'data' in x
    && typeof (x as Envelope).v === 'number';
}

/** Reads raw text. Returns null when storage is unavailable — never throws. */
function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Loads and validates, migrating from an older version when possible.
 *
 * Returns null for every kind of doubt: missing, unreadable, malformed,
 * unmigratable, or invalid after migration. A caller that receives null is
 * meant to start clean, which is always safe; a caller that receives a value
 * can trust it completely.
 */
export function load<T>(def: StoreDefinition<T>): T | null {
  const raw = readRaw(def.key);
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  // A value written before this contract existed has no envelope. It is offered
  // to the validator as-is at version 0, so legacy keys can adopt the contract
  // without discarding what users already have.
  const version = isEnvelope(parsed) ? parsed.v : 0;
  let data = isEnvelope(parsed) ? parsed.data : parsed;

  if (version !== def.version) {
    if (!def.migrate) return null;
    const upgraded = def.migrate(data, version);
    if (upgraded === null || upgraded === undefined) return null;
    data = upgraded;
  }

  return def.validate(data);
}

/**
 * Writes a value inside a versioned envelope.
 *
 * `now` is passed in rather than read from the clock so that callers stay pure
 * and tests stay deterministic. Returns false when storage refused the write —
 * persistence is best-effort and must never be fatal.
 */
export function save<T>(def: StoreDefinition<T>, value: T, now?: number): boolean {
  const envelope: Envelope = { v: def.version, data: value };
  if (now !== undefined) envelope.savedAt = now;
  try {
    return writeRaw(def.key, JSON.stringify(envelope));
  } catch {
    return false;
  }
}

export function clear(def: StoreDefinition<unknown>): void {
  try {
    localStorage.removeItem(def.key);
  } catch {
    // Storage unavailable — there is nothing to clear and nothing to crash over.
  }
}

// ── Portability ──────────────────────────────────────────────────────────────

/** What `exportStore` produces and `importStore` accepts. */
export interface ExportedStore {
  key: string;
  v: number;
  data: unknown;
  /** Set by the caller when it wants the export stamped. */
  exportedAt?: number;
}

/**
 * Serialises a store to a plain object that can be written to a file, put in a
 * sync payload, or handed to another device. Deliberately returns the validated
 * value, so an export can never carry a shape the app would refuse to read back.
 */
export function exportStore<T>(def: StoreDefinition<T>, at?: number): ExportedStore | null {
  const value = load(def);
  if (value === null) return null;
  const out: ExportedStore = { key: def.key, v: def.version, data: value };
  if (at !== undefined) out.exportedAt = at;
  return out;
}

/**
 * Restores a previously exported store.
 *
 * Refuses an export belonging to a different key, and puts the payload through
 * the same migration and validation path as a normal read — an import is not a
 * privileged writer, so a corrupt file cannot poison the app.
 */
export function importStore<T>(def: StoreDefinition<T>, exported: unknown, now?: number): T | null {
  if (typeof exported !== 'object' || exported === null) return null;
  const e = exported as Partial<ExportedStore>;
  if (e.key !== def.key || typeof e.v !== 'number') return null;

  let data = e.data;
  if (e.v !== def.version) {
    if (!def.migrate) return null;
    const upgraded = def.migrate(data, e.v);
    if (upgraded === null || upgraded === undefined) return null;
    data = upgraded;
  }

  const value = def.validate(data);
  if (value === null) return null;
  save(def, value, now);
  return value;
}

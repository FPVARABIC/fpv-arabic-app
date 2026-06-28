/**
 * BOT V2 — AKL query lookup.
 *
 * Scans AKL aliases against a normalised query string and returns the
 * first matching AklIndexEntry, or undefined when no concept matches.
 *
 * Rules:
 *  - Aliases shorter than 4 normalised characters are ignored (avoids
 *    false positives from 2-3 character tokens like "rx", "tx", "kv").
 *  - Longer aliases are tried first (most-specific match wins).
 *  - The alias map is built once at module load — O(1) per call after that.
 *  - This function never throws; returns undefined on any internal error.
 */

import { normalizeArabicQuery } from '../botQueryAnalysis';
import { aklIndex, type AklIndexEntry } from '../../lkb/aklIndex.generated';

export type { AklIndexEntry };

// ── Build alias map at module load ────────────────────────────────────────────
// Each entry: [normalizedAlias, AklIndexEntry]
// Sorted longest-first so the most specific alias wins when multiple match.

const _MIN_ALIAS_LENGTH = 4;

const _aliasMap: Array<[string, AklIndexEntry]> = [];

for (const entry of aklIndex) {
  for (const alias of entry.aliases) {
    const norm = normalizeArabicQuery(alias);
    if (norm.length >= _MIN_ALIAS_LENGTH) {
      _aliasMap.push([norm, entry]);
    }
  }
}

// Longest alias first → most-specific match wins
_aliasMap.sort((a, b) => b[0].length - a[0].length);

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the AKL entry whose alias best matches the normalised query,
 * or undefined when no AKL concept is recognised.
 *
 * @param normalizedQuery - Already-normalised query from analyzeQuery().
 */
export function lookupAklEntry(normalizedQuery: string): AklIndexEntry | undefined {
  for (const [alias, entry] of _aliasMap) {
    if (normalizedQuery.includes(alias)) return entry;
  }
  return undefined;
}

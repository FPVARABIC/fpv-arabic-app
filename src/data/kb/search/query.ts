/**
 * Search ranking.
 *
 * Scoring model, in descending weight:
 *   1. exact whole-query phrase in the title            — the user typed the name
 *   2. exact token in title / keywords / body
 *   3. synonym-expanded token in title / keywords / body — "فلايت كنترولر" → FC
 *   4. prefix match (typing "betafl" while still typing)
 *   5. fuzzy match, penalised by edit distance          — typos
 *
 * Every match must involve at least one *original or expanded* query token;
 * fuzzy alone never introduces a document that shares nothing with the query.
 */

import { normalizeText, tokenize, allowedDistance, editDistance } from './normalize';
import { expandQueryTokens } from './synonyms';
import { getSearchIndex, type SearchDoc, type SearchDocType, type SearchContentClass } from './buildIndex';
import type { KbLevel } from '../types';

export interface SearchFilters {
  types?: SearchDocType[];
  contentClass?: SearchContentClass;
  level?: KbLevel;
  system?: string;
  software?: string;
}

export interface SearchHit {
  doc: SearchDoc;
  score: number;
  /** Why it matched — surfaced in the UI so results never look arbitrary. */
  reason: 'title' | 'keyword' | 'body' | 'fuzzy';
}

const W_TITLE_PHRASE = 220;
const W_TITLE_EXACT = 60;
const W_TITLE_SYNONYM = 42;
const W_TITLE_PREFIX = 26;
const W_KEYWORD_EXACT = 26;
const W_KEYWORD_SYNONYM = 18;
const W_BODY_EXACT = 8;
const W_BODY_SYNONYM = 5;
const W_FUZZY_TITLE = 18;
const W_FUZZY_KEYWORD = 8;

/**
 * Small, deliberate ordering nudge between equally-relevant result types. A
 * person searching "failsafe" is better served by the encyclopedic article or
 * the diagnostic tree than by one Betaflight field label out of hundreds.
 */
const TYPE_BIAS: Record<SearchDocType, number> = {
  article: 12,
  dx: 10,
  term: 8,
  lesson: 6,
  'bf-page': 5,
  troubleshooting: 4,
  'elrs-issue': 4,
  'edgetx-topic': 4,
  // Same tier as the other software-centre entries: a procedure page is worth
  // more than a single field label and less than the article that explains the
  // subject, which is exactly where the ExpressLRS and EdgeTX entries sit.
  'video-tool': 4,
  'elrs-step': 3,
  // Above the field-level types but below every real page: when someone asks
  // about a program we do not cover, saying so is a genuine answer and should
  // be visible — but it must never outrank an article that actually teaches
  // something adjacent. A reader searching «BLHeli» is better served by the ESC
  // firmware article first and the «no coverage» notice second.
  'software-scope': 2,
  'assembly-stage': 2,
  roadmap: 2,
  part: 2,
  checklist: 1,
  // The two field-level types sit at the bottom for the same reason: a single
  // setting row is the right answer only when the query names it, and when it
  // does the title weights carry it there without any bias.
  'bf-field': 0,
  'edgetx-setting': 0,
};

function fuzzyBest(token: string, pool: Set<string>): number {
  const max = allowedDistance(token);
  if (max === 0) return -1;
  let best = -1;
  for (const cand of pool) {
    if (Math.abs(cand.length - token.length) > max) continue;
    const d = editDistance(token, cand, max);
    if (d <= max && (best === -1 || d < best)) {
      best = d;
      if (best === 1) break;
    }
  }
  return best;
}

function scoreDoc(
  doc: SearchDoc,
  queryNorm: string,
  original: string[],
  expanded: Set<string>,
): SearchHit | null {
  const titleSet = new Set(doc.titleTokens);
  const keySet = new Set(doc.keywordTokens);
  const bodySet = new Set(doc.bodyTokens);

  let score = 0;
  let reason: SearchHit['reason'] | null = null;

  // 1) Whole-query phrase inside the title text.
  const titleJoined = doc.titleTokens.join(' ');
  const titleEnJoined = normalizeText(doc.titleEn ?? '');
  if (queryNorm && (titleJoined.includes(queryNorm) || (titleEnJoined && titleEnJoined.includes(queryNorm)))) {
    score += W_TITLE_PHRASE;
    reason = 'title';
  }

  for (const t of original) {
    if (titleSet.has(t)) { score += W_TITLE_EXACT; reason ??= 'title'; continue; }
    if (keySet.has(t)) { score += W_KEYWORD_EXACT; reason ??= 'keyword'; continue; }
    if (bodySet.has(t)) { score += W_BODY_EXACT; reason ??= 'body'; }
  }

  // 2) Synonym-expanded tokens (excluding the originals already counted).
  for (const t of expanded) {
    if (original.includes(t)) continue;
    if (titleSet.has(t)) { score += W_TITLE_SYNONYM; reason ??= 'title'; continue; }
    if (keySet.has(t)) { score += W_KEYWORD_SYNONYM; reason ??= 'keyword'; continue; }
    if (bodySet.has(t)) { score += W_BODY_SYNONYM; reason ??= 'body'; }
  }

  // 3) Prefix — matters while the user is still typing.
  for (const t of original) {
    if (t.length < 3) continue;
    if (titleSet.has(t)) continue;
    for (const tt of titleSet) {
      if (tt.startsWith(t)) { score += W_TITLE_PREFIX; reason ??= 'title'; break; }
    }
  }

  // 4) Fuzzy — only when nothing better matched, so typo tolerance never
  //    outranks a genuine exact hit.
  if (score === 0) {
    for (const t of original) {
      const dTitle = fuzzyBest(t, titleSet);
      if (dTitle >= 0) { score += Math.max(1, W_FUZZY_TITLE - dTitle * 5); reason ??= 'fuzzy'; continue; }
      const dKey = fuzzyBest(t, keySet);
      if (dKey >= 0) { score += Math.max(1, W_FUZZY_KEYWORD - dKey * 3); reason ??= 'fuzzy'; }
    }
  }

  if (score === 0 || !reason) return null;

  score += TYPE_BIAS[doc.type] ?? 0;
  // Shorter titles win ties: "UART" should outrank "إعداد UART للمستقبل".
  score += Math.max(0, 8 - doc.titleTokens.length);

  return { doc, score, reason };
}

function passesFilters(doc: SearchDoc, f?: SearchFilters): boolean {
  if (!f) return true;
  if (f.types && f.types.length > 0 && !f.types.includes(doc.type)) return false;
  if (f.contentClass && doc.contentClass !== f.contentClass) return false;
  if (f.level && doc.level !== f.level) return false;
  if (f.system && doc.system !== f.system) return false;
  if (f.software && doc.software !== f.software) return false;
  return true;
}

export interface SearchOptions {
  filters?: SearchFilters;
  limit?: number;
}

export function search(rawQuery: string, options: SearchOptions = {}): SearchHit[] {
  const queryNorm = normalizeText(rawQuery);
  if (!queryNorm) return [];

  const original = tokenize(rawQuery);
  const { expanded } = expandQueryTokens(original);

  const hits: SearchHit[] = [];
  for (const doc of getSearchIndex()) {
    if (!passesFilters(doc, options.filters)) continue;
    const hit = scoreDoc(doc, queryNorm, original, expanded);
    if (hit) hits.push(hit);
  }

  hits.sort((a, b) => (b.score - a.score) || a.doc.titleAr.localeCompare(b.doc.titleAr, 'ar'));
  return options.limit ? hits.slice(0, options.limit) : hits;
}

/** Counts per type for the current query, used to render filter chips honestly. */
export function countsByType(rawQuery: string, filters?: SearchFilters): Record<string, number> {
  const out: Record<string, number> = {};
  for (const h of search(rawQuery, { filters })) {
    out[h.doc.type] = (out[h.doc.type] ?? 0) + 1;
  }
  return out;
}

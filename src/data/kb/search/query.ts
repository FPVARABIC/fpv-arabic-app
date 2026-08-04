/**
 * Search ranking.
 *
 * Scoring model, in descending weight:
 *   1. exact whole-query phrase in the title            — the user typed the name
 *   2. a SYMPTOM phrase — the words people type when something is broken
 *   3. exact token in title / keywords / body
 *   4. synonym-expanded token in title / keywords / body — "فلايت كنترولر" → FC
 *   5. prefix match (typing "betafl" while still typing)
 *   6. fuzzy match, penalised by edit distance          — typos
 *
 * Every match must involve at least one *original or expanded* query token;
 * fuzzy alone never introduces a document that shares nothing with the query.
 *
 * WHY SYMPTOMS ARE SCORED APART FROM KEYWORDS
 * -------------------------------------------
 * They were folded together, and the measurable consequence was that
 * «الريسيفر لا يشتغل» ranked a receiver PRODUCT above the diagnostic tree: the
 * product's description contains those same three words, so the two matches
 * were worth the same. They are not the same. A symptom phrase is a statement
 * that something is BROKEN, and an entry that declares it is an entry written
 * for exactly this reader. `symptomTokens` carries them, and this file pays
 * for them separately.
 *
 * WHY MATCH REASONS ARE STRUCTURED
 * --------------------------------
 * A result has to be able to say why it is there — «طابق عرَض عطل», «طابق
 * اختصاراً», «تصحيح إملائي» — and a single enum of four strings could not.
 * `MatchReason[]` is what the UI renders and what an answering layer would
 * quote when it explains itself. The score stays internal: a number on its own
 * tells a reader nothing they can act on.
 */

import {
  normalizeText, tokenize, allowedDistance, editDistance, contentTokens,
} from './normalize';
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

/** Why a result is here, in a form the UI can render and a reader can act on. */
export type MatchReasonKind =
  | 'title-phrase'
  | 'title'
  | 'symptom'
  | 'abbreviation'
  | 'keyword'
  | 'synonym'
  | 'body'
  | 'prefix'
  | 'typo'
  | 'intent';

export interface MatchReason {
  kind: MatchReasonKind;
  /** The query words that produced it, for «طابق: منفذ» style explanations. */
  terms: string[];
}

export interface SearchHit {
  doc: SearchDoc;
  score: number;
  /**
   * The dominant reason, kept as a plain string for the callers that only need
   * one word. `reasons` is the full picture.
   */
  reason: 'title' | 'keyword' | 'body' | 'fuzzy' | 'symptom';
  reasons: MatchReason[];
}

/**
 * The title IS the query — «UART» against the term «UART».
 *
 * Split from mere containment because they are different claims. «ESC» is
 * contained in the title of «ESC Telemetry» and of «4-in-1 ESC», and treating
 * that as "the user typed the name" put both above the definition of ESC
 * itself. Equality is the strong signal; containment is a weak one.
 */
const W_TITLE_EXACT_PHRASE = 220;
const W_TITLE_PHRASE = 120;
/**
 * A symptom phrase match, weighted above a bare title token on purpose.
 *
 * Someone typing «الريسيفر لا يشتغل» is not naming a thing, they are describing
 * a failure, and the entry that declares that exact failure is the answer. The
 * weight has to clear the sum a long product description can accumulate from
 * body matches on the same words, which is what it was losing to.
 */
const W_SYMPTOM_PHRASE = 190;
const W_SYMPTOM_TOKEN = 34;
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
 * The bonus for being the DEFINITION of an abbreviation the user typed.
 *
 * Measured problem: «ESC» returned three articles before the glossary entry,
 * and «OSD» returned a video procedure before it, while «FC» correctly returned
 * the term. The difference was accidental — tie-breaks, not intent. Someone who
 * types three letters and nothing else is asking what they mean; the article
 * that uses the term heavily is the second thing they want, not the first.
 */
const W_ABBREVIATION = 150;

/**
 * Small, deliberate ordering nudge between equally-relevant result types. A
 * person searching "failsafe" is better served by the encyclopedic article or
 * the diagnostic tree than by one Betaflight field label out of hundreds.
 */
const TYPE_BIAS: Record<SearchDocType, number> = {
  article: 12,
  dx: 10,
  term: 8,
  module: 7,
  lesson: 6,
  path: 6,
  'bf-page': 5,
  troubleshooting: 4,
  'elrs-issue': 4,
  'edgetx-topic': 4,
  // Same tier as the other software-centre entries: a procedure page is worth
  // more than a single field label and less than the article that explains the
  // subject, which is exactly where the ExpressLRS and EdgeTX entries sit.
  'video-tool': 4,
  'elrs-step': 3,
  // A single check inside a tree, below the tree itself: the tree is the right
  // answer unless the query names the individual step, and when it does the
  // title weights carry it there without help.
  'dx-node': 1,
  // A build archetype is what a beginner names before they know any part.
  'drone-type': 3,
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

/**
 * The per-doc lookup sets, built once instead of once per query.
 *
 * Measured: rebuilding four `Set`s for each of 1,355 docs on every keystroke
 * was the whole of the query cost — 24 ms for a three-word query, against 11 ms
 * for a one-word one, almost entirely allocation. Caching them took it back
 * under the budget without changing a single result.
 *
 * A `WeakMap` keyed by the doc object, so `resetSearchIndexCache()` in tests
 * discards these too: the docs become unreachable and their sets go with them.
 * No manual invalidation to forget.
 */
interface DocSets {
  title: Set<string>;
  keyword: Set<string>;
  body: Set<string>;
  symptom: Set<string>;
  titleJoined: string;
  titleEnNorm: string;
  titleArNorm: string;
}

const SETS = new WeakMap<SearchDoc, DocSets>();

function setsFor(doc: SearchDoc): DocSets {
  let cached = SETS.get(doc);
  if (!cached) {
    cached = {
      title: new Set(doc.titleTokens),
      keyword: new Set(doc.keywordTokens),
      body: new Set(doc.bodyTokens),
      symptom: new Set(doc.symptomTokens ?? []),
      titleJoined: doc.titleTokens.join(' '),
      titleEnNorm: normalizeText(doc.titleEn ?? ''),
      titleArNorm: normalizeText(doc.titleAr),
    };
    SETS.set(doc, cached);
  }
  return cached;
}

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

/** Accumulates reasons without repeating a kind, merging the terms instead. */
class Reasons {
  private map = new Map<MatchReasonKind, Set<string>>();
  add(kind: MatchReasonKind, ...terms: string[]): void {
    const set = this.map.get(kind) ?? new Set<string>();
    for (const t of terms) if (t) set.add(t);
    this.map.set(kind, set);
  }
  list(): MatchReason[] {
    return [...this.map].map(([kind, terms]) => ({ kind, terms: [...terms] }));
  }
}

/** The one legacy reason string, derived from the structured set. */
function dominant(reasons: MatchReason[]): SearchHit['reason'] {
  const kinds = new Set(reasons.map(r => r.kind));
  if (kinds.has('symptom')) return 'symptom';
  if (kinds.has('title-phrase') || kinds.has('title') || kinds.has('abbreviation')
    || kinds.has('prefix')) return 'title';
  if (kinds.has('keyword') || kinds.has('synonym') || kinds.has('intent')) return 'keyword';
  if (kinds.has('body')) return 'body';
  return 'fuzzy';
}

/**
 * Types an intent prefers, so «أين أجد Ports» finds the screen rather than a
 * page that merely mentions it.
 *
 * A nudge, never a filter: an intent guess that is wrong must not be able to
 * hide the right answer, only to reorder near-ties. The intent names come from
 * the shared `KbIntent` vocabulary the bot metadata already uses — this adds no
 * new one.
 */
const INTENT_TYPE_BIAS: Record<string, Partial<Record<SearchDocType, number>>> = {
  diagnose: { dx: 70, 'dx-node': 40, 'elrs-issue': 55, troubleshooting: 40, article: 10, part: -40 },
  navigate: { 'bf-page': 70, 'edgetx-topic': 50, 'video-tool': 45, module: 40, 'bf-field': 25, part: -30 },
  explain: { term: 55, article: 45, module: 25, lesson: 20, part: -25, 'bf-field': -10 },
  compare: { article: 60, term: 35, part: -20 },
  // «أريد بناء درون سينمائي» collides with «فشل البناء» — Arabic «بناء» covers
  // both erecting an aircraft and compiling firmware. Someone planning a build
  // is not reporting a compile error, so the fault types are pushed down.
  build: {
    'drone-type': 85, path: 70, roadmap: 60, 'assembly-stage': 55, lesson: 30,
    checklist: 25, 'bf-field': -20, 'elrs-issue': -45, dx: -25,
  },
  // Someone asking how to CHANGE something is not reporting a fault. Without
  // this, «كيف أغير اتجاه المحرك» returned a thrown-propeller diagnosis above
  // the setting that reverses a motor.
  configure: {
    'bf-page': 55, 'bf-field': 45, 'edgetx-setting': 40, 'edgetx-topic': 35,
    'elrs-step': 30, part: -30, dx: -40, 'dx-node': -50,
  },
  coverage: { 'software-scope': 90, module: 15 },
};

export interface SearchOptions {
  filters?: SearchFilters;
  limit?: number;
  /**
   * Intents detected from the query, supplied by the retrieval layer.
   *
   * Passed IN rather than detected here so this module stays a pure ranker and
   * intent recognition has one home. An empty list means "no opinion", which is
   * exactly the behaviour this file had before.
   */
  intents?: string[];
  /**
   * Doc keys the caller wants nudged up because they relate to the reader's own
   * build — a part they own, a page one of their findings points at. The
   * retrieval layer decides which; this only applies the nudge, so no project
   * data reaches the ranker as anything but a set of keys.
   */
  boostKeys?: Set<string>;
}

const PROJECT_BOOST = 45;

function scoreDoc(
  doc: SearchDoc,
  queryNorm: string,
  original: string[],
  content: string[],
  expanded: Set<string>,
  opts: SearchOptions,
): SearchHit | null {
  const sets = setsFor(doc);
  const titleSet = sets.title;
  const keySet = sets.keyword;
  const bodySet = sets.body;
  const sympSet = sets.symptom;

  let score = 0;
  const reasons = new Reasons();

  // 1) The whole query as a phrase in the title — equality first, containment
  //    second, because "you typed its name" and "its name contains what you
  //    typed" are not the same claim and must not score the same.
  const { titleJoined, titleEnNorm: titleEnJoined, titleArNorm: titleArJoined } = sets;
  // Any name the thing answers to, including its abbreviation.
  const isItsName = (q: string): boolean =>
    titleArJoined === q || titleEnJoined === q || (doc.exactNames?.includes(q) ?? false);
  if (queryNorm) {
    if (isItsName(queryNorm)) {
      score += W_TITLE_EXACT_PHRASE;
      reasons.add('title-phrase', queryNorm);
    } else if (titleJoined.includes(queryNorm) || (titleEnJoined && titleEnJoined.includes(queryNorm))) {
      score += W_TITLE_PHRASE;
      reasons.add('title-phrase', queryNorm);
    }
  }

  // 2) The symptom surface. Scored before the ordinary fields so a broken-thing
  //    query reaches the entry written for it rather than the entry that merely
  //    contains the same words in prose.
  //
  //    Only CONTENT words count here. «أين أجد Ports؟» is three words of
  //    grammar and one noun, and scoring the grammar as symptom evidence
  //    matched a video logging page against «أين» — which is how the question
  //    was asked, not what it was about.
  //
  //    Skipped for scope pages unless the query IS a coverage question. Their
  //    symptom surface is «هل تدعمون BLHeli» phrasings, and paying for that on
  //    an ordinary query put «فيرموير ESC» — a subject with a real article —
  //    behind the page that says we do not cover the tool. The `coverage`
  //    intent is the right mechanism for those questions, and it already fires.
  const symptomsApply = doc.type !== 'software-scope' || (opts.intents ?? []).includes('coverage');
  if (symptomsApply && sympSet.size > 0 && content.length > 0) {
    const symptomHits = content.filter(t => sympSet.has(t));
    if (symptomHits.length > 0) {
      // A phrase-level match — most of the query's content words appear in the
      // symptom surface — is a different claim from one word overlapping.
      const covered = symptomHits.length;
      if (content.length >= 2 && covered >= Math.ceil(content.length * 0.6)) {
        score += W_SYMPTOM_PHRASE;
      }
      score += symptomHits.length * W_SYMPTOM_TOKEN;
      reasons.add('symptom', ...symptomHits);
    }
  }

  // 3) The abbreviation rule: a bare acronym is a request for its meaning.
  //
  //    Requires the term to BE that abbreviation, not merely to contain it —
  //    otherwise «ESC» rewards «ESC Telemetry» and «4-in-1 ESC» equally with
  //    the entry that actually defines ESC, which is what it did.
  if (doc.type === 'term' && content.length === 1 && content[0].length <= 5
    && isItsName(content[0])) {
    score += W_ABBREVIATION;
    reasons.add('abbreviation', content[0]);
  }

  for (const t of original) {
    if (titleSet.has(t)) { score += W_TITLE_EXACT; reasons.add('title', t); continue; }
    if (keySet.has(t)) { score += W_KEYWORD_EXACT; reasons.add('keyword', t); continue; }
    if (bodySet.has(t)) { score += W_BODY_EXACT; reasons.add('body', t); }
  }

  // 4) Synonym-expanded tokens (excluding the originals already counted).
  for (const t of expanded) {
    if (original.includes(t)) continue;
    if (titleSet.has(t)) { score += W_TITLE_SYNONYM; reasons.add('synonym', t); continue; }
    if (keySet.has(t)) { score += W_KEYWORD_SYNONYM; reasons.add('synonym', t); continue; }
    if (bodySet.has(t)) { score += W_BODY_SYNONYM; reasons.add('synonym', t); }
  }

  // 5) Prefix — matters while the user is still typing.
  for (const t of original) {
    if (t.length < 3) continue;
    if (titleSet.has(t)) continue;
    for (const tt of titleSet) {
      if (tt.startsWith(t)) { score += W_TITLE_PREFIX; reasons.add('prefix', t); break; }
    }
  }

  // 6) Fuzzy — only when nothing better matched, so typo tolerance never
  //    outranks a genuine exact hit.
  if (score === 0) {
    for (const t of original) {
      const dTitle = fuzzyBest(t, titleSet);
      if (dTitle >= 0) { score += Math.max(1, W_FUZZY_TITLE - dTitle * 5); reasons.add('typo', t); continue; }
      const dSymp = fuzzyBest(t, sympSet);
      if (dSymp >= 0) { score += Math.max(1, W_FUZZY_TITLE - dSymp * 5); reasons.add('typo', t); continue; }
      const dKey = fuzzyBest(t, keySet);
      if (dKey >= 0) { score += Math.max(1, W_FUZZY_KEYWORD - dKey * 3); reasons.add('typo', t); }
    }
  }

  if (score === 0 || reasons.list().length === 0) return null;

  score += TYPE_BIAS[doc.type] ?? 0;

  // 7) The query's intent, as a reordering nudge between near-ties.
  for (const intent of opts.intents ?? []) {
    const bias = INTENT_TYPE_BIAS[intent]?.[doc.type];
    if (bias) {
      score += bias;
      if (bias > 0) reasons.add('intent', intent);
    }
  }

  // 8) Relevance to the reader's own build, decided by the retrieval layer.
  if (opts.boostKeys?.has(doc.key)) score += PROJECT_BOOST;

  // Shorter titles win ties: "UART" should outrank "إعداد UART للمستقبل".
  score += Math.max(0, 8 - doc.titleTokens.length);

  const finalReasons = reasons.list();
  return { doc, score, reason: dominant(finalReasons), reasons: finalReasons };
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

export function search(rawQuery: string, options: SearchOptions = {}): SearchHit[] {
  const queryNorm = normalizeText(rawQuery);
  if (!queryNorm) return [];

  const original = tokenize(rawQuery);
  const content = contentTokens(original);
  const { expanded } = expandQueryTokens(original);

  const hits: SearchHit[] = [];
  for (const doc of getSearchIndex()) {
    if (!passesFilters(doc, options.filters)) continue;
    const hit = scoreDoc(doc, queryNorm, original, content, expanded, options);
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

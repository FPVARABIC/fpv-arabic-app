/**
 * What the reader is trying to DO, read from how they asked.
 *
 * WHY THIS IS PATTERNS AND NOT A MODEL
 * ------------------------------------
 * Because the job is small and the failure mode of getting it wrong is large.
 * Intent here does exactly one thing: it nudges near-ties in the ranking. It
 * never filters, never rewrites the query, and never produces text. A rule that
 * fires wrongly costs a few places in an ordering; a language model in this
 * position would cost predictability, testability, and the ability to say why a
 * result appeared — which is the property this whole batch exists to add.
 *
 * WHY THE STOPWORD LIST AND THIS FILE DISAGREE ON PURPOSE
 * -------------------------------------------------------
 * `contentTokens` strips «أين» and «كيف» and «هل» before scoring, because they
 * match everything and mean nothing as evidence. This file reads those same
 * words as the most informative thing in the sentence. Both are right: they say
 * nothing about the SUBJECT and everything about the REQUEST. Stripping them
 * from evidence and reading them for intent is the whole trick.
 *
 * ARABIC IS MATCHED AFTER NORMALISATION
 * -------------------------------------
 * Every pattern below is written in the normalised form — أ/إ/آ folded to ا,
 * ة to ه, ى to ي — because that is what the query has become by the time it
 * arrives. Writing «أين» here would never match, and would fail silently,
 * which is why `scripts/testRetrieval.ts` asserts each pattern against a query
 * written the way a person actually types it.
 *
 * AND NOT WITH `\b`
 * -----------------
 * JavaScript's word boundary is defined over `[A-Za-z0-9_]`. Arabic letters are
 * not word characters to it, so `/\bاين\b/` matches NOTHING — it does not
 * error, it silently never fires. The first version of this file used it, and
 * every single intent came back empty while the code looked correct. `W()`
 * below builds the boundary out of whitespace and string anchors, which is the
 * only form that works for both scripts.
 */

/**
 * A whole-word pattern that works in Arabic as well as Latin.
 *
 * Wraps the alternatives in explicit start/whitespace boundaries instead of
 * `\b`, so «اين» matches in «اين اجد ports» and in «اين» alone, and does not
 * match inside a longer word.
 */
function W(...alternatives: string[]): RegExp {
  return new RegExp(`(?:^|\\s)(?:${alternatives.join('|')})(?:\\s|$)`);
}

/** The same, for a two-word sequence where only the pair is meaningful. */
function SEQ(pattern: string): RegExp {
  return new RegExp(`(?:^|\\s)(?:${pattern})(?:\\s|$)`);
}

import { normalizeText } from '../../data/kb/search/normalize';
import type { QueryIntent } from './types';

interface IntentRule {
  intent: QueryIntent;
  /** Matched against the NORMALISED query, so no diacritics or hamza forms. */
  patterns: RegExp[];
  /** Higher wins when two rules fire; ties keep declaration order. */
  weight: number;
}

/**
 * The rules, ordered by how specific they are.
 *
 * `coverage` is first and heaviest because it is the one intent that changes
 * what an honest answer looks like: «هل تدعمون INAV» must be able to surface a
 * page whose entire content is «لا». Everything else competes on ordinary
 * relevance.
 */
const RULES: IntentRule[] = [
  {
    intent: 'coverage',
    weight: 100,
    patterns: [
      SEQ('هل\\s+(?:تدعمون|تدعم|يوجد|عندكم|لديكم)'),
      W('تدعمون', 'تدعم', 'مدعوم', 'مغطي', 'تغطون', 'تغطي', 'متوفر'),
      SEQ('do\\s+you\\s+support'),
      W('supported'),
    ],
  },
  {
    intent: 'diagnose',
    weight: 90,
    patterns: [
      // A negated verb is the single strongest signal in Arabic that something
      // is broken: «لا يعمل», «ما يشتغل», «لم يظهر», «مش شغال».
      SEQ('(?:لا|لم|مش|مو|مافي)\\s+\\S+'),
      // «ما» is the trap: it negates in «ما يشتغل» and interrogates in «ما هو»
      // and «ما الفرق». Requiring a following verb prefix (ي/ت) or «في» keeps
      // the negation and drops the question — without it, every «ما هو X» was
      // read as a fault report.
      SEQ('ما\\s+(?:[يت]\\S*|في)'),
      W('مشكله', 'عطل', 'خلل', 'خطا', 'يفشل', 'فشل', 'تالف', 'محترق', 'ميت', 'معطل'),
      W('لماذا', 'ليش', 'ليه'),
      SEQ('not\\s+working'), SEQ('no\\s+signal'), W('broken', 'fails'),
    ],
  },
  {
    intent: 'navigate',
    weight: 85,
    patterns: [
      W('اين', 'وين', 'فين'),
      W('افتح', 'اذهب', 'روح', 'وديني'),
      SEQ('where\\s+is'), SEQ('go\\s+to'), W('open'),
    ],
  },
  {
    intent: 'configure',
    weight: 80,
    patterns: [
      W('اعداد', 'اعدادات', 'اضبط', 'ضبط', 'اغير', 'تغيير', 'معايره', 'فعل', 'تفعيل', 'تعطيل'),
      SEQ('كيف\\s+(?:اغير|اضبط|افعل|اعدل|اعمل)'),
      W('set', 'setting', 'settings', 'configure', 'enable', 'disable', 'change'),
    ],
  },
  {
    intent: 'build',
    weight: 75,
    patterns: [
      W('ابني', 'بناء', 'تجميع', 'اجمع', 'اركب', 'تركيب'),
      SEQ('من\\s+اين\\s+ابدا'),
      SEQ('اريد\\s+(?:بناء|تجميع)'),
      W('build', 'assemble'),
    ],
  },
  {
    intent: 'compare',
    weight: 70,
    patterns: [
      W('الفرق', 'فرق', 'مقارنه', 'افضل', 'ايهما'),
      W('difference', 'versus', 'vs', 'better'),
    ],
  },
  {
    intent: 'explain',
    weight: 60,
    patterns: [
      SEQ('ما\\s+(?:هو|هي)'),
      W('شنو', 'يعني', 'معني', 'تعريف', 'اشرح', 'وضح'),
      SEQ('what\\s+is'), W('meaning', 'explain', 'define'),
    ],
  },
];

/**
 * Intents recognised in a query, strongest first.
 *
 * Returns an empty array when nothing fires, which is the common case for a
 * bare noun («UART», «Betaflight») — and correctly so: someone who types one
 * word has told us what they want to know about and nothing about why.
 *
 * More than one can fire. «لا أعرف كيف أضبط Failsafe» is both a diagnosis and a
 * configuration request, and biasing toward both is better than picking one and
 * being wrong half the time.
 */
export function detectIntents(rawQuery: string): QueryIntent[] {
  const q = normalizeText(rawQuery);
  if (!q) return [];

  const hits: { intent: QueryIntent; weight: number }[] = [];
  for (const rule of RULES) {
    if (rule.patterns.some(p => p.test(q))) hits.push({ intent: rule.intent, weight: rule.weight });
  }

  // At most two. A query that fires four rules has told us nothing useful, and
  // stacking four sets of type biases would reorder the list on noise.
  return hits
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2)
    .map(h => h.intent);
}

/**
 * Whether a query is a bare abbreviation — one short Latin token.
 *
 * Separate from the intents because it is not a request TYPE, it is a request
 * SHAPE, and the thing it should change is which result wins rather than which
 * kind of result: «ESC» should return the definition first, then the articles.
 */
export function isBareAbbreviation(rawQuery: string): boolean {
  const q = normalizeText(rawQuery);
  return /^[a-z0-9]{2,5}$/.test(q);
}

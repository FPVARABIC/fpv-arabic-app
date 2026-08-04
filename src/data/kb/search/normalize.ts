/**
 * Text normalization for Arabic + Latin search.
 *
 * Arabic search fails in practice for reasons that have nothing to do with the
 * user being wrong: the same word is legitimately written several ways
 * (أ/إ/آ/ا), diacritics may or may not be typed, ة and ه are interchanged
 * constantly, and ى/ي are keyboard-dependent. Normalizing both the index and
 * the query to one canonical form is what makes "بطاريه" find "بطارية".
 */

/** Arabic diacritics (tashkeel) + superscript alef + Quranic marks. */
const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;
/** Tatweel / kashida — pure decoration, never semantic. */
const TATWEEL = /ـ/g;
/** Arabic-Indic and Eastern Arabic-Indic digits → ASCII. */
const ARABIC_INDIC = /[٠-٩]/g;
const EXT_ARABIC_INDIC = /[۰-۹]/g;

const LETTER_FOLD: Record<string, string> = {
  'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا',
  'ى': 'ي', 'ئ': 'ي',
  'ة': 'ه',
  'ؤ': 'و',
  'ﻻ': 'لا',
};

/**
 * Canonical form used by both the index and every query.
 * Idempotent: normalize(normalize(x)) === normalize(x).
 */
export function normalizeText(input: string): string {
  if (!input) return '';
  let s = input.normalize('NFKC');
  s = s.replace(DIACRITICS, '');
  s = s.replace(TATWEEL, '');
  s = s.replace(ARABIC_INDIC, c => String(c.charCodeAt(0) - 0x0660));
  s = s.replace(EXT_ARABIC_INDIC, c => String(c.charCodeAt(0) - 0x06F0));
  s = s.replace(/[أإآٱىئةؤﻻ]/g, c => LETTER_FOLD[c] ?? c);
  s = s.toLowerCase();
  // Keep Arabic letters, ASCII alphanumerics and spaces; everything else is a
  // separator. Hyphens inside part numbers ("2207-1750") become spaces, which
  // is what we want — both halves stay searchable.
  s = s.replace(/[^ؠ-يٱ-ۓa-z0-9\s]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

export function tokenize(input: string): string[] {
  const n = normalizeText(input);
  return n ? n.split(' ').filter(Boolean) : [];
}

/**
 * Damerau–Levenshtein distance, capped early once `max` is exceeded so a long
 * query against a long document field cannot become quadratic hot work.
 * Transpositions matter here specifically: adjacent-key typos ("btaflight",
 * "eelrs") are the single most common real mistake.
 */
export function editDistance(a: string, b: string, max = 3): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  let prev2: number[] = [];
  let prev: number[] = new Array(bl + 1);
  let cur: number[] = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;

  for (let i = 1; i <= al; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2] + 1);
      }
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = cur;
    cur = new Array(bl + 1);
  }
  return prev[bl];
}

/**
 * Typo tolerance scaled to word length. Short tokens must match exactly —
 * allowing an edit on a 3-letter token would make "fc" match "fs", "cc", "f7"
 * and destroy precision on exactly the abbreviations users type most.
 */
export function allowedDistance(token: string): number {
  if (token.length <= 3) return 0;
  if (token.length <= 5) return 1;
  if (token.length <= 9) return 2;
  return 3;
}

/**
 * Words that carry no retrieval signal on their own.
 *
 * WHY THIS EXISTS, AND WHAT IT MUST NOT DO
 * ----------------------------------------
 * Weighting symptom phrases made «أين أجد Ports؟» rank a video logging page
 * first: the words «أين» and «أجد» appear in dozens of symptom lists, so a
 * query made mostly of function words scored a symptom match against almost
 * everything. Function words are how Arabic questions are ASKED — they are not
 * what the question is ABOUT.
 *
 * They are removed only from the *evidence* side of scoring. They are NOT
 * removed from the query before intent detection, because «أين» and «كيف» and
 * «هل» are precisely what tells us whether the reader wants a location, a
 * procedure or a yes/no — the one place these words are the most informative
 * thing in the sentence.
 *
 * The list stays deliberately short. Every word here is one a reader can no
 * longer search for on its own, so it holds only words that are never the
 * subject of an FPV question.
 */
const STOPWORDS = new Set([
  // Arabic interrogatives and particles.
  'ما', 'ماذا', 'من', 'اين', 'كيف', 'متي', 'لماذا', 'هل', 'اي', 'ايه',
  'في', 'علي', 'عن', 'الي', 'مع', 'ثم', 'او', 'و', 'ب', 'ل', 'ك',
  'لا', 'لم', 'لن', 'ليس', 'غير', 'بين', 'بعد', 'قبل', 'عند', 'حتي',
  'هذا', 'هذه', 'ذلك', 'تلك', 'التي', 'الذي', 'كل', 'بعض', 'اكثر',
  'يوجد', 'اجد', 'اريد', 'عايز', 'ابغي', 'ممكن', 'يمكن', 'شو', 'وش', 'ايش',
  // English equivalents that appear in transliterated queries.
  'the', 'a', 'an', 'is', 'are', 'to', 'of', 'in', 'on', 'for', 'and', 'or',
  'what', 'where', 'how', 'why', 'when', 'which', 'do', 'does', 'i', 'my',
]);

export function isStopword(token: string): boolean {
  return STOPWORDS.has(token);
}

/** The query's content words — what it is about, minus how it was asked. */
export function contentTokens(tokens: string[]): string[] {
  return tokens.filter(t => !STOPWORDS.has(t));
}

export function fuzzyEquals(a: string, b: string): boolean {
  if (a === b) return true;
  const max = Math.min(allowedDistance(a), allowedDistance(b));
  if (max === 0) return false;
  return editDistance(a, b, max) <= max;
}

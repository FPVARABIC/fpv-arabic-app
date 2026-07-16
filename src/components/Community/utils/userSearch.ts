// User (account) search normalization (Phase 6). A separate leaf module from
// searchTokens.ts/searchSynonyms.ts, which normalize per-WORD tokens for
// post full-text search — a display name is matched as a single prefix
// string ("عبدالله" should match a query of "عبد"), not tokenized into
// words, so it needs its own normalization entry point. Imports the shared
// diacritic/hamza/taa-marbuta folding rules from searchTokens.ts so the two
// pipelines never disagree on what counts as "the same character" for
// Arabic text — only the word-splitting step differs.
import { normalizeToken } from './searchTokens';

// Client-computed, same trust model already accepted for Post.searchTokens
// (see firestore.rules) — Rules validate shape/type only, never
// cryptographically re-derive this from displayName. Whitespace is
// collapsed (not stripped) so "Ahmed Ali" stays prefix-matchable as
// "ahmed ali", not glued into "ahmedali".
export function normalizeDisplayName(raw: string): string {
  const words = raw.trim().split(/\s+/).filter(Boolean);
  return words.map(normalizeToken).filter(w => w.length > 0).join(' ');
}

// Firestore range-query upper bound for a prefix search on a string field:
// where(field, '>=', prefix) combined with where(field, '<=', prefixRangeEnd(prefix))
// returns every indexed value that starts with `prefix`. The appended
// character (U+F8FF) is a Unicode Private Use Area code point Firebase's own
// docs use specifically for this prefix-query pattern — it sorts after any
// realistic normalized name character. This is honest PREFIX search only —
// Firestore has no native substring/full-text index, so a query for "مد"
// matches "مدى..." but never "...مدى" or a name containing "مد" mid-word.
export const prefixRangeEnd = (prefix: string): string => prefix + '\uf8ff';

// Below this length a prefix query against a large user base would match too
// broadly to be a useful, boundable read — same rationale as useSearch.ts's
// MAX_QUERY_TOKENS cap, just expressed as a minimum instead of a maximum.
export const MIN_USER_SEARCH_QUERY_LENGTH = 2;

// Tokenizer + Arabic normalization (D8).
//
// Synonym expansion is a deliberately separate layer in searchSynonyms.ts,
// which imports normalizeToken/tokenizeRaw from this file. This file does NOT
// import from searchSynonyms.ts, so the dependency only ever runs one way —
// avoiding a circular import between the two. Consumers that want the fully
// expanded, ready-to-store search tokens for a post should import
// generateSearchTokens from searchSynonyms.ts, not this file directly.

const DIACRITICS_PATTERN = /[ً-ٰٟۖ-ۭ]/g;
const PUNCTUATION_PATTERN = /[.,!?؟،؛:"'`()[\]{}<>|\\/@#$%^&*_+=~]/g;

// Normalizes a single word for matching: strips Arabic diacritics, folds
// أ/إ/آ to ا and ة to ه, lowercases Latin characters, trims punctuation.
export const normalizeToken = (raw: string): string => {
  let token = raw;
  token = token.replace(DIACRITICS_PATTERN, '');
  token = token.replace(/[أإآ]/g, 'ا');
  token = token.replace(/ة/g, 'ه');
  token = token.toLowerCase();
  token = token.replace(PUNCTUATION_PATTERN, '');
  return token.trim();
};

// Splits raw free text into normalized, deduped word tokens. No synonym
// expansion — that composition happens in searchSynonyms.ts.
export const tokenizeRaw = (text: string): string[] => {
  const words = text.split(/\s+/).filter(Boolean);
  const normalized = words.map(normalizeToken).filter(token => token.length > 0);
  return Array.from(new Set(normalized));
};

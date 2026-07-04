// FPV synonym expansion (D8). Expansion groups are DERIVED programmatically
// from FPV_DICTIONARY (fpvDictionary.ts) via buildSynonymIndex() below — no
// vocabulary is hand-copied here. A term is declared exactly once, in
// fpvDictionary.ts; extend vocabulary there, not in this file.
//
// TODO: Ahmed will extend vocabulary (in fpvDictionary.ts).

import { FPV_DICTIONARY } from './fpvDictionary';
import { normalizeToken, tokenizeRaw } from './searchTokens';

// Firestore's `array-contains-any` caps a single query at 10 values (D8) —
// that cap is enforced where queries are built (useSearch.ts, Phase 1), not
// here. This cap bounds how many tokens get stored PER POST, so a
// synonym-rich post's document doesn't grow unbounded.
const MAX_SEARCH_TOKENS = 30;

let cachedIndex: Map<string, string[]> | null = null;

// Inverts FPV_DICTIONARY: every keyword/alias/Arabic surface form for a term
// maps to the full, normalized set of that term's surface forms (its
// "synonym group"). Built once and memoized — the dictionary is static for
// the lifetime of the process.
const buildSynonymIndex = (): Map<string, string[]> => {
  const index = new Map<string, string[]>();

  for (const entry of Object.values(FPV_DICTIONARY)) {
    const surfaceForms = [entry.arabic, ...entry.keywords, ...entry.aliases];
    const normalizedGroup = Array.from(new Set(surfaceForms.map(normalizeToken)));

    for (const form of normalizedGroup) {
      index.set(form, normalizedGroup);
    }
  }

  return index;
};

const getSynonymIndex = (): Map<string, string[]> => {
  if (!cachedIndex) cachedIndex = buildSynonymIndex();
  return cachedIndex;
};

// Expands one already-normalized token into itself plus every synonym in its
// dictionary group. Tokens with no dictionary match expand to themselves only.
export const expandToken = (normalizedToken: string): string[] => {
  const index = getSynonymIndex();
  return index.get(normalizedToken) ?? [normalizedToken];
};

// Full D8 pipeline: raw post text -> normalized, synonym-expanded, deduped,
// size-capped tokens ready to store on posts/{postId}.searchTokens.
export const generateSearchTokens = (text: string): string[] => {
  const rawTokens = tokenizeRaw(text);
  const expanded = rawTokens.flatMap(expandToken);
  const deduped = Array.from(new Set(expanded));
  return deduped.slice(0, MAX_SEARCH_TOKENS);
};

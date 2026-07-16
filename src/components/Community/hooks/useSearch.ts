import { useCallback, useEffect, useRef, useState } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { POSTS_COLLECTION } from '../utils/firestorePaths';
import { tokenizeRaw } from '../utils/searchTokens';
import { expandToken } from '../utils/searchSynonyms';
import type { Post, PostWithId } from '../types';

// Firestore's array-contains-any caps a single query at 10 values (D8) —
// this is a query-time constraint, separate from generateSearchTokens'
// storage-time cap of 30 tokens per post.
const MAX_QUERY_TOKENS = 10;
const RESULTS_LIMIT = 20;
// Debounced INSIDE the hook (Phase 6), not left to each caller to remember —
// every call to search() resets this timer, so a fast typer issues at most
// one Firestore read per pause in typing, not one per keystroke.
const SEARCH_DEBOUNCE_MS = 300;

const buildQueryTokens = (rawQuery: string): string[] => {
  const baseTokens = tokenizeRaw(rawQuery);
  const expanded = baseTokens.flatMap(expandToken);
  return Array.from(new Set(expanded)).slice(0, MAX_QUERY_TOKENS);
};

interface UseSearchResult {
  results: PostWithId[];
  loading: boolean;
  hasSearched: boolean;
  error: string | null;
  search: (rawQuery: string) => void;
  clear: () => void;
}

// Debounced + stale-response-guarded (Phase 6 fix): search() is safe to call
// on every keystroke — it only ever issues a Firestore read after
// SEARCH_DEBOUNCE_MS of no further calls, and a request-generation counter
// (mirroring useFeed.ts/usePost.ts's proven pattern) ensures a slow older
// response can never overwrite a faster newer one's already-applied results.
export const useSearch = (): UseSearchResult => {
  const [results, setResults] = useState<PostWithId[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
  }, []);

  const runSearch = useCallback(async (rawQuery: string, localId: number) => {
    const queryTokens = buildQueryTokens(rawQuery);
    if (localId !== requestIdRef.current) return;

    if (queryTokens.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(
        query(
          collection(firestoreDb, POSTS_COLLECTION),
          where('status', '==', 'active'),
          where('searchTokens', 'array-contains-any', queryTokens),
          orderBy('createdAt', 'desc'),
          limit(RESULTS_LIMIT),
        ),
      );
      if (localId !== requestIdRef.current) return; // a newer search superseded this one
      setResults(snap.docs.map(d => ({ id: d.id, ...(d.data() as Post) })));
    } catch (err) {
      if (localId !== requestIdRef.current) return;
      setError('تعذّر البحث. حاول مرة أخرى.');
      console.error('[useSearch]', err);
    } finally {
      if (localId === requestIdRef.current) setLoading(false);
    }
  }, []);

  const search = useCallback((rawQuery: string) => {
    setHasSearched(true);
    // Reflected immediately (not only once the debounce timer fires) so the
    // UI shows an honest "searching" state for the whole debounce window
    // instead of silently sitting on the previous query's stale results.
    setLoading(true);
    setError(null);
    const localId = ++requestIdRef.current;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      runSearch(rawQuery, localId);
    }, SEARCH_DEBOUNCE_MS);
  }, [runSearch]);

  const clear = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    requestIdRef.current += 1; // invalidate any in-flight/pending search
    setResults([]);
    setHasSearched(false);
    setError(null);
    setLoading(false);
  }, []);

  return { results, loading, hasSearched, error, search, clear };
};

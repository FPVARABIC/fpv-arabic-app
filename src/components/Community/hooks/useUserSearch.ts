import { useCallback, useEffect, useRef, useState } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { USERS_COLLECTION } from '../utils/firestorePaths';
import { normalizeDisplayName, prefixRangeEnd, MIN_USER_SEARCH_QUERY_LENGTH } from '../utils/userSearch';
import type { CommunityUser } from '../types';

const RESULTS_LIMIT = 15;
// Same debounce window as useSearch.ts (post search) — a fast typer issues
// at most one Firestore read per pause in typing.
const SEARCH_DEBOUNCE_MS = 300;

// Explicit allow-list projection, NOT a spread of the raw users/{uid}
// document — a deliberate, defense-in-depth code-level privacy boundary.
// The current schema never stores email on users/{uid} at all (see
// firestore.rules' create-rule field allow-list), so there is nothing to
// leak today, but this type still only carries what the UI is allowed to
// show: no role/status/lastPostAt/lastCommentAt/joinedAt/postsCount either
// — a search result card is not a profile view.
export interface PublicUserSearchResult {
  uid: string;
  displayName: string;
  photoURL: string | null;
}

interface UseUserSearchResult {
  results: PublicUserSearchResult[];
  loading: boolean;
  hasSearched: boolean;
  error: string | null;
  search: (rawQuery: string) => void;
  clear: () => void;
}

// User (account) search (Phase 6) — honest PREFIX matching only, not
// full-text: a query for "مد" matches a displayName whose normalized form
// STARTS WITH "مد", never a name merely containing "مد" mid-word or
// mid-name. Bounded (RESULTS_LIMIT), debounced, stale-response-guarded
// (mirrors useSearch.ts's Phase 6 fix exactly), and never an unbounded
// collection scan — the Firestore range query itself only ever reads
// documents whose displayNameNormalized falls in [prefix, prefix+""],
// not the whole users collection.
export const useUserSearch = (): UseUserSearchResult => {
  const [results, setResults] = useState<PublicUserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
  }, []);

  const runSearch = useCallback(async (rawQuery: string, localId: number) => {
    const prefix = normalizeDisplayName(rawQuery);
    if (localId !== requestIdRef.current) return;

    if (prefix.length < MIN_USER_SEARCH_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(
        query(
          collection(firestoreDb, USERS_COLLECTION),
          where('displayNameNormalized', '>=', prefix),
          where('displayNameNormalized', '<=', prefixRangeEnd(prefix)),
          orderBy('displayNameNormalized'),
          limit(RESULTS_LIMIT),
        ),
      );
      if (localId !== requestIdRef.current) return; // a newer search superseded this one
      setResults(
        snap.docs.map(d => {
          const data = d.data() as CommunityUser;
          return { uid: d.id, displayName: data.displayName, photoURL: data.photoURL };
        }),
      );
    } catch (err) {
      if (localId !== requestIdRef.current) return;
      setError('تعذّر البحث عن الحسابات. حاول مرة أخرى.');
      console.error('[useUserSearch]', err);
    } finally {
      if (localId === requestIdRef.current) setLoading(false);
    }
  }, []);

  const search = useCallback((rawQuery: string) => {
    setHasSearched(true);
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
    requestIdRef.current += 1;
    setResults([]);
    setHasSearched(false);
    setError(null);
    setLoading(false);
  }, []);

  return { results, loading, hasSearched, error, search, clear };
};

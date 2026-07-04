import { useCallback, useState } from 'react';
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
  search: (rawQuery: string) => Promise<void>;
  clear: () => void;
}

export const useSearch = (): UseSearchResult => {
  const [results, setResults] = useState<PostWithId[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (rawQuery: string) => {
    const queryTokens = buildQueryTokens(rawQuery);
    setHasSearched(true);

    if (queryTokens.length === 0) {
      setResults([]);
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
      setResults(snap.docs.map(d => ({ id: d.id, ...(d.data() as Post) })));
    } catch (err) {
      setError('تعذّر البحث. حاول مرة أخرى.');
      console.error('[useSearch]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setHasSearched(false);
    setError(null);
  }, []);

  return { results, loading, hasSearched, error, search, clear };
};

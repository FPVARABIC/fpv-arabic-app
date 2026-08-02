import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';

/**
 * KB reading progress + bookmarks + notes + last position.
 *
 * Deliberately a SEPARATE storage key from the existing `ProgressState`
 * (lessons / roadmap / checklists). Widening the old shape would change what
 * `overallProgress` means for every existing user mid-flight; a new key can
 * only ever add, never reinterpret what is already stored.
 */

const KEY = 'fpv_kb_progress';

export interface KbProgressState {
  /** Article ids the user marked as read. */
  read: string[];
  /** Article ids bookmarked for quick return. */
  bookmarks: string[];
  /** Free-text user notes, keyed by article id. */
  notes: Record<string, string>;
  /** Last article opened, for "continue where you left off". */
  lastArticleId?: string;
  /** Quiz answers, keyed `${articleId}:${quizId}` → chosen option id. */
  quiz: Record<string, string>;
}

const EMPTY: KbProgressState = { read: [], bookmarks: [], notes: {}, quiz: {} };

export function useKbProgress() {
  const [state, setState] = useLocalStorage<KbProgressState>(KEY, EMPTY);

  // Stored objects from an older shape (or a hand-edited localStorage value)
  // must not crash the whole encyclopedia, so every field is normalised on read
  // rather than trusted. Memoised because the fallback literals below would
  // otherwise be a fresh identity on every render, invalidating every useCallback
  // that depends on them and defeating their purpose.
  const read = useMemo(() => (Array.isArray(state.read) ? state.read : []), [state.read]);
  const bookmarks = useMemo(() => (Array.isArray(state.bookmarks) ? state.bookmarks : []), [state.bookmarks]);
  const notes = useMemo(() => (state.notes && typeof state.notes === 'object' ? state.notes : {}), [state.notes]);
  const quiz = useMemo(() => (state.quiz && typeof state.quiz === 'object' ? state.quiz : {}), [state.quiz]);

  const isRead = useCallback((id: string) => read.includes(id), [read]);
  const isBookmarked = useCallback((id: string) => bookmarks.includes(id), [bookmarks]);

  const toggleRead = useCallback((id: string) => {
    setState(prev => {
      const list = Array.isArray(prev.read) ? prev.read : [];
      return { ...prev, read: list.includes(id) ? list.filter(x => x !== id) : [...list, id] };
    });
  }, [setState]);

  const markRead = useCallback((id: string) => {
    setState(prev => {
      const list = Array.isArray(prev.read) ? prev.read : [];
      return list.includes(id) ? prev : { ...prev, read: [...list, id] };
    });
  }, [setState]);

  const toggleBookmark = useCallback((id: string) => {
    setState(prev => {
      const list = Array.isArray(prev.bookmarks) ? prev.bookmarks : [];
      return { ...prev, bookmarks: list.includes(id) ? list.filter(x => x !== id) : [...list, id] };
    });
  }, [setState]);

  const setNote = useCallback((id: string, text: string) => {
    setState(prev => {
      const next = { ...(prev.notes ?? {}) };
      if (text.trim()) next[id] = text;
      else delete next[id];
      return { ...prev, notes: next };
    });
  }, [setState]);

  const setLastArticle = useCallback((id: string) => {
    setState(prev => (prev.lastArticleId === id ? prev : { ...prev, lastArticleId: id }));
  }, [setState]);

  const answerQuiz = useCallback((articleId: string, quizId: string, optionId: string) => {
    setState(prev => ({ ...prev, quiz: { ...(prev.quiz ?? {}), [`${articleId}:${quizId}`]: optionId } }));
  }, [setState]);

  const getQuizAnswer = useCallback(
    (articleId: string, quizId: string) => quiz[`${articleId}:${quizId}`],
    [quiz],
  );

  const readCountIn = useCallback(
    (articleIds: string[]) => articleIds.filter(id => read.includes(id)).length,
    [read],
  );

  return {
    read, bookmarks, notes, quiz,
    lastArticleId: state.lastArticleId,
    isRead, isBookmarked, toggleRead, markRead, toggleBookmark,
    setNote, setLastArticle, answerQuiz, getQuizAnswer, readCountIn,
  };
}

export const KB_PROGRESS_STORAGE_KEY = KEY;

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  doc, getDoc, collection, query, where, orderBy, limit, startAfter, getDocs, onSnapshot,
} from 'firebase/firestore';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { postPath, commentsPath, commentPath } from '../utils/firestorePaths';
import type { Post, Comment, PostWithId, CommentWithId } from '../types';

// Firestore's FirestoreError.code is the raw backend code string (e.g.
// 'permission-denied'), never prefixed with 'firestore/' — confirmed against
// the installed @firebase/firestore 4.16.0 source. Both forms are handled
// defensively in case a future SDK version changes this.
type CommentsErrorType = 'network' | 'permission' | 'index' | 'unknown';

const classifyCommentsError = (err: unknown): CommentsErrorType => {
  const code = (err as { code?: string } | null)?.code ?? '';
  const bare = code.includes('/') ? code.split('/')[1] : code;
  switch (bare) {
    case 'permission-denied':
    case 'unauthenticated':
      return 'permission';
    case 'failed-precondition':
      return 'index';
    case 'unavailable':
    case 'deadline-exceeded':
      return 'network';
    default:
      return 'unknown';
  }
};

// Only the network case gets a distinct message — permission/index/unknown
// share one safe generic string rather than inventing three near-duplicate
// Arabic strings for a distinction that changes no other user-facing behavior.
const commentsErrorMessage = (type: CommentsErrorType): string =>
  type === 'network'
    ? 'تعذّر تحميل التعليقات، تحقق من الاتصال وحاول مرة أخرى.'
    : 'تعذّر تحميل التعليقات حالياً.';

// Bounded page size (Phase 6, corrected) — a documented, disclosed judgment
// call (not a formally derived constant), same status as the anti-spam
// window constants in functions/src/index.ts. 25 keeps a single page's read
// cost small and predictable regardless of how large a thread grows, while
// still showing a substantial first screen without an extra tap.
const COMMENTS_PAGE_SIZE = 25;

// REAL-TIME (Phase 10) — the comments-tail live listener's safety cap. Only
// ever attached once one-shot pagination has fully caught up
// (commentsHasMore === false), at which point the entire existing thread is
// already loaded — so this listener's own initial snapshot re-reads the
// WHOLE thread from scratch (a deliberate, disclosed cost: it's what lets a
// LIKE on an already-loaded comment update live too, "riding along" on the
// same listener, rather than requiring a second, comment-scoped listener
// per comment — see the effect below). 500 is a defensive ceiling against a
// pathological thread size, not a realistic one: at this app's current
// stage no thread is remotely close to it, and even 500 extra reads is
// trivial against the Spark plan's 50,000/day quota.
const COMMENTS_TAIL_SAFETY_LIMIT = 500;

interface CommentsPage {
  items: CommentWithId[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

const fetchCommentsPage = async (
  targetPostId: string,
  afterDoc: QueryDocumentSnapshot<DocumentData> | null,
): Promise<CommentsPage> => {
  const constraints = [
    where('status', '==', 'active'),
    orderBy('createdAt', 'asc'),
    ...(afterDoc ? [startAfter(afterDoc)] : []),
    limit(COMMENTS_PAGE_SIZE),
  ];
  const snap = await getDocs(query(collection(firestoreDb, commentsPath(targetPostId)), ...constraints));
  return {
    items: snap.docs.map(d => ({ id: d.id, ...(d.data() as Comment) })),
    lastDoc: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
    hasMore: snap.docs.length === COMMENTS_PAGE_SIZE,
  };
};

interface PostState {
  postId: string;
  post: PostWithId | null;
  error: string | null;
  done: boolean;
}

interface CommentsState {
  postId: string;
  comments: CommentWithId[];
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  errorType: CommentsErrorType | null;
}

interface UsePostResult {
  post: PostWithId | null;
  comments: CommentWithId[];
  loading: boolean;
  error: string | null;
  commentsLoading: boolean;
  commentsLoadingMore: boolean;
  commentsHasMore: boolean;
  commentsError: string | null;
  commentsErrorType: CommentsErrorType | null;
  // Bounded cursor-based "load more" — fetches the next COMMENTS_PAGE_SIZE
  // comments after the last-loaded one. Never re-fetches already-loaded
  // pages, never duplicates (dedup by id as a defensive belt-and-braces
  // check against the cursor itself already guaranteeing no overlap).
  loadMoreComments: () => void;
  // Re-runs the FIRST page only — the comments-failure retry action.
  retryComments: () => void;
  // Fetches exactly one comment by id and appends/updates it locally. This
  // is what CommentInput calls after a successful createComment response
  // instead of re-running the whole paginated query: since comments are
  // ordered oldest-first, a newly created (or duplicate-collapsed, per
  // functions/src/index.ts) comment is always logically last, so a single
  // targeted read is enough — no matter how many pages are already loaded,
  // and it can never introduce a duplicate (upsert by id).
  appendCreatedComment: (commentId: string) => Promise<void>;
  // Local removal only (no re-fetch) — the comment's `status` was already
  // flipped to 'deleted' by a direct, Rules-governed client update
  // (CommentsList.tsx), so the source of truth already reflects this; a
  // network round-trip to confirm it would be a wasted read.
  removeCommentLocally: (commentId: string) => void;
}

// REAL-TIME (Phase 10): the post document itself is now a live listener
// (gives live likesCount + live status — e.g. the post being hidden/deleted
// while open), scoped to this hook's own mount/postId lifecycle. Comments
// pagination stays exactly the one-shot cursor-based model it always was;
// only a SEPARATE, later-attached tail listener (see the dedicated effect
// below) goes live, and only once the entire existing thread has already
// been paginated in (commentsHasMore === false) — see that effect's own
// comment for why attaching any earlier would be actively wrong, not just
// unnecessary.
export const usePost = (postId: string): UsePostResult => {
  const [postState, setPostState] = useState<PostState>({ postId, post: null, error: null, done: false });
  const [commentsState, setCommentsState] = useState<CommentsState>({
    postId, comments: [], hasMore: false, loading: false, loadingMore: false, error: null, errorType: null,
  });

  // A single monotonically-increasing generation counter guards every async
  // completion (post fetch, initial comments page, load-more page, retry,
  // append) against writing state for a postId this hook has since moved
  // away from — simpler than a separate ref per request type, and correct
  // because every one of those requests is only ever meaningful for the
  // postId that was current when it was issued.
  const generationRef = useRef(0);
  const cursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  // Which generation currently has (or is in the process of attaching) the
  // comments-tail live listener — null when none. Guarantees the tail
  // listener attaches AT MOST ONCE per postId, exactly at the render where
  // commentsHasMore first becomes false, even though the effect that
  // attaches it re-runs on every commentsState change (loading/hasMore/
  // error all changing repeatedly during normal pagination).
  const tailAttachedGenerationRef = useRef<number | null>(null);

  // Derived, not stored: whether the currently committed state actually
  // belongs to the postId this render is asking about. When it doesn't (a
  // postId change whose effect hasn't resolved yet), the hook reports
  // "loading" / an empty list by comparison alone — no synchronous
  // setState-to-reset-state is needed inside the effect below, which is
  // what the previous version of this hook did and is exactly the
  // set-state-in-effect pattern this correction pass avoids repeating (see
  // useCommentLike.ts for the same fix applied to a different hook).
  const postIsCurrent = postState.postId === postId;
  const commentsAreCurrent = commentsState.postId === postId;

  const loading = !postIsCurrent || !postState.done;
  const post = postIsCurrent ? postState.post : null;
  const error = postIsCurrent ? postState.error : null;

  const commentsLoading = !commentsAreCurrent || commentsState.loading;
  const commentsLoadingMore = commentsAreCurrent && commentsState.loadingMore;
  const commentsHasMore = commentsAreCurrent && commentsState.hasMore;
  const commentsError = commentsAreCurrent ? commentsState.error : null;
  const commentsErrorType = commentsAreCurrent ? commentsState.errorType : null;
  const comments = commentsAreCurrent ? commentsState.comments : [];

  const runInitialCommentsLoad = useCallback(async (targetPostId: string, myGeneration: number) => {
    setCommentsState({
      postId: targetPostId, comments: [], hasMore: false, loading: true, loadingMore: false, error: null, errorType: null,
    });
    try {
      const page = await fetchCommentsPage(targetPostId, null);
      if (generationRef.current !== myGeneration) return;
      cursorRef.current = page.lastDoc;
      setCommentsState({
        postId: targetPostId, comments: page.items, hasMore: page.hasMore,
        loading: false, loadingMore: false, error: null, errorType: null,
      });
    } catch (err) {
      if (generationRef.current !== myGeneration) return;
      const type = classifyCommentsError(err);
      setCommentsState({
        postId: targetPostId, comments: [], hasMore: false, loading: false, loadingMore: false,
        error: commentsErrorMessage(type), errorType: type,
      });
      console.error('[usePost] comments', err);
    }
  }, []);

  useEffect(() => {
    const myGeneration = ++generationRef.current;
    cursorRef.current = null;
    tailAttachedGenerationRef.current = null;
    // Guards against runInitialCommentsLoad being kicked off more than once
    // for this generation — the live post-doc listener below fires again on
    // every subsequent change (a like, a status flip), not just the first
    // snapshot, and comments should only ever be (re-)loaded from scratch
    // once per postId, exactly like the one-shot getDoc version did.
    let commentsLoadStarted = false;
    let cancelled = false;

    const unsubscribe = onSnapshot(
      doc(firestoreDb, postPath(postId)),
      snap => {
        if (cancelled || generationRef.current !== myGeneration) return;

        const postData = snap.exists() ? (snap.data() as Post) : null;
        if (!postData || postData.status !== 'active') {
          setPostState({ postId, post: null, error: null, done: true });
          return;
        }

        setPostState({ postId, post: { id: snap.id, ...postData }, error: null, done: true });
        if (!commentsLoadStarted) {
          commentsLoadStarted = true;
          void runInitialCommentsLoad(postId, myGeneration);
        }
      },
      err => {
        if (cancelled || generationRef.current !== myGeneration) return;
        setPostState({ postId, post: null, error: 'تعذّر تحميل المنشور.', done: true });
        console.error('[usePost] post', err);
      },
    );

    // Unmount (or a postId change starting the next effect run) invalidates
    // anything still in flight for this generation and detaches the live
    // post listener. `cancelled` covers a snapshot callback already queued
    // from THIS run landing after cleanup fires — onSnapshot's own
    // unsubscribe is synchronous, but that in-flight callback is not
    // retroactively cancelled by calling it, which matters under fast
    // in/out navigation (open a post, immediately hit back).
    return () => {
      cancelled = true;
      generationRef.current += 1;
      unsubscribe();
    };
  }, [postId, runInitialCommentsLoad]);

  // REAL-TIME (Phase 10) comments-tail listener. Re-runs on every
  // commentsState change (loading/hasMore/error all flip repeatedly during
  // normal one-shot pagination), but tailAttachedGenerationRef ensures the
  // actual `onSnapshot` call happens AT MOST ONCE per postId generation —
  // exactly at the render where commentsHasMore first becomes false.
  //
  // WHY NOT EARLIER: comments are paginated oldest-first (createdAt asc).
  // While commentsHasMore is still true, more comments that ALREADY EXIST
  // server-side simply haven't been paginated into view yet — there is no
  // field distinguishing "existed already, not yet loaded" from "created
  // after I opened this post". A listener scoped to "newer than the last
  // loaded page" attached at that point would incorrectly present
  // already-existing, not-yet-paginated comments as if they'd just arrived
  // live. Only once the user (or the initial auto-load) has caught up to
  // the true end of the thread is "anything from here on is genuinely new"
  // a safe assumption.
  //
  // WHY THE FULL QUERY, NOT startAfter(cursor): a query scoped to
  // createdAt > cursor would only ever match brand-new comments, so a like
  // on an ALREADY-loaded comment (no createdAt change) would never re-enter
  // that window and could never update live. Re-querying the full thread
  // (see COMMENTS_TAIL_SAFETY_LIMIT above) lets likesCount on every
  // already-loaded comment ride along on this same listener too, with no
  // second, comment-scoped listener needed.
  useEffect(() => {
    if (!commentsAreCurrent) return undefined;
    if (commentsState.loading || commentsState.loadingMore) return undefined;
    if (commentsState.hasMore) return undefined;
    if (commentsState.error) return undefined;

    const myGeneration = generationRef.current;
    if (tailAttachedGenerationRef.current === myGeneration) return undefined;
    tailAttachedGenerationRef.current = myGeneration;

    let cancelled = false;
    const q = query(
      collection(firestoreDb, commentsPath(postId)),
      where('status', '==', 'active'),
      orderBy('createdAt', 'asc'),
      limit(COMMENTS_TAIL_SAFETY_LIMIT),
    );

    const unsubscribe = onSnapshot(
      q,
      snap => {
        if (cancelled || generationRef.current !== myGeneration) return;
        setCommentsState(prev => {
          if (prev.postId !== postId) return prev;
          // Map preserves insertion order: updating an EXISTING id's value
          // (a like landing) keeps its original position; a brand-new id
          // is appended at the end via .set() — correct here specifically
          // because snap.docs already arrives createdAt-ascending, and
          // anything not already in prev.comments at this point is, by
          // construction, newer than everything already loaded.
          const byId = new Map(prev.comments.map(c => [c.id, c] as const));
          for (const d of snap.docs) {
            byId.set(d.id, { id: d.id, ...(d.data() as Comment) });
          }
          return { ...prev, comments: Array.from(byId.values()) };
        });
      },
      err => {
        if (cancelled || generationRef.current !== myGeneration) return;
        // Deliberately no user-facing error here — the already-loaded
        // comments (from one-shot pagination) remain fully valid and
        // visible; only NEW comments/like updates silently stop arriving
        // live until the post is reopened.
        console.error('[usePost] comments tail listener', err);
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
      if (tailAttachedGenerationRef.current === myGeneration) tailAttachedGenerationRef.current = null;
    };
  }, [postId, commentsAreCurrent, commentsState.loading, commentsState.loadingMore, commentsState.hasMore, commentsState.error]);

  const loadMoreComments = useCallback(() => {
    if (commentsState.postId !== postId) return;
    if (commentsState.loading || commentsState.loadingMore || !commentsState.hasMore) return;
    const myGeneration = generationRef.current;
    const afterDoc = cursorRef.current;

    setCommentsState(prev => (prev.postId === postId ? { ...prev, loadingMore: true, error: null, errorType: null } : prev));

    (async () => {
      try {
        const page = await fetchCommentsPage(postId, afterDoc);
        if (generationRef.current !== myGeneration) return;
        if (page.lastDoc) cursorRef.current = page.lastDoc;
        setCommentsState(prev => {
          if (prev.postId !== postId) return prev;
          const existingIds = new Set(prev.comments.map(c => c.id));
          const newItems = page.items.filter(c => !existingIds.has(c.id));
          return { ...prev, comments: [...prev.comments, ...newItems], hasMore: page.hasMore, loadingMore: false };
        });
      } catch (err) {
        if (generationRef.current !== myGeneration) return;
        const type = classifyCommentsError(err);
        setCommentsState(prev =>
          prev.postId === postId ? { ...prev, loadingMore: false, error: commentsErrorMessage(type), errorType: type } : prev,
        );
        console.error('[usePost] loadMore comments', err);
      }
    })();
  }, [postId, commentsState.postId, commentsState.loading, commentsState.loadingMore, commentsState.hasMore]);

  const retryComments = useCallback(() => {
    const myGeneration = generationRef.current;
    cursorRef.current = null;
    void runInitialCommentsLoad(postId, myGeneration);
  }, [postId, runInitialCommentsLoad]);

  const appendCreatedComment = useCallback(async (commentId: string) => {
    const myGeneration = generationRef.current;
    try {
      const snap = await getDoc(doc(firestoreDb, commentPath(postId, commentId)));
      if (generationRef.current !== myGeneration || !snap.exists()) return;
      const comment: CommentWithId = { id: snap.id, ...(snap.data() as Comment) };
      setCommentsState(prev => {
        if (prev.postId !== postId) return prev;
        const alreadyPresent = prev.comments.some(c => c.id === comment.id);
        return {
          ...prev,
          comments: alreadyPresent
            ? prev.comments.map(c => (c.id === comment.id ? comment : c))
            : [...prev.comments, comment],
        };
      });
    } catch (err) {
      console.error('[usePost] appendCreatedComment', err);
    }
  }, [postId]);

  const removeCommentLocally = useCallback((commentId: string) => {
    setCommentsState(prev =>
      prev.postId === postId ? { ...prev, comments: prev.comments.filter(c => c.id !== commentId) } : prev,
    );
  }, [postId]);

  return {
    post, comments, loading, error,
    commentsLoading, commentsLoadingMore, commentsHasMore, commentsError, commentsErrorType,
    loadMoreComments, retryComments, appendCreatedComment, removeCommentLocally,
  };
};

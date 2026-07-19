/**
 * E2E-test-only harness — dynamically imported by
 * scripts/testCommunityRealtime.ts via realtime-harness.html /
 * realtimeHarnessMain.tsx, never by any real application entry point (so
 * Vite never includes it in the production bundle — see e2eAuth.ts's own
 * comment for the same reasoning applied there).
 *
 * Why this exists: useFeed/usePost's real-time behavior (Phase 10) needs to
 * be exercised end-to-end against the actual Firestore emulator in a real
 * browser, but the full app's real sign-in bootstrap (AuthContext,
 * useEnsureCommunityUser) depends on a Firestore round-trip that this
 * sandbox's Playwright/Chromium cannot always complete in time (documented,
 * pre-existing, unrelated to this feature — see scripts/testCommunityE2E.ts,
 * confirmed via git-stash comparison against the pre-Phase-10 baseline to
 * reproduce identically). Both hooks under test only ever perform PUBLIC
 * reads (posts/comments are publicly readable per firestore.rules) — no
 * sign-in is actually required to exercise them — so this harness mounts
 * them directly, sidestepping the unrelated auth-bootstrap path entirely
 * while still exercising the real, unmodified hook code against the real
 * emulator.
 */
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useFeed, type FeedCategory } from '../hooks/useFeed';
import { usePost } from '../hooks/usePost';

declare global {
  interface Window {
    __setCategory: (c: FeedCategory) => void;
    __setFeedActive: (a: boolean) => void;
    __feedLoadMore: () => void;
    __feedRefresh: () => void;
    __feedState: {
      postIds: string[];
      loading: boolean;
      hasMore: boolean;
      error: string | null;
      loadMoreError: string | null;
    };
    __setPostId: (id: string | null) => void;
    __postLoadMoreComments: () => void;
    __postState: {
      postId: string | null;
      postLikesCount: number | null;
      postStatus: string | null;
      commentIds: string[];
      commentLikeCounts: Record<string, number>;
      commentsHasMore: boolean;
      commentsLoading: boolean;
    };
    __harnessReady: boolean;
  }
}

export const FeedHarness: React.FC = () => {
  const [category, setCategory] = useState<FeedCategory>('all');
  const [active, setActive] = useState(true);
  const feed = useFeed(category, active);

  // Exposing hook output to `window` is itself a side effect (test-only
  // instrumentation, not application behavior) — done in an effect rather
  // than during render, same rule this codebase already applies to every
  // real Firebase read.
  useEffect(() => {
    window.__setCategory = setCategory;
    window.__setFeedActive = setActive;
    window.__feedLoadMore = feed.loadMore;
    window.__feedRefresh = feed.refresh;
    window.__feedState = {
      postIds: feed.posts.map(p => p.id),
      loading: feed.loading,
      hasMore: feed.hasMore,
      error: feed.error,
      loadMoreError: feed.loadMoreError,
    };
  }, [feed.loadMore, feed.refresh, feed.posts, feed.loading, feed.hasMore, feed.error, feed.loadMoreError]);

  return null;
};

export const PostHarness: React.FC = () => {
  const [postId, setPostId] = useState<string | null>(null);
  const result = usePost(postId ?? '__none__');

  useEffect(() => {
    window.__setPostId = setPostId;
    window.__postLoadMoreComments = result.loadMoreComments;
    window.__postState = {
      postId,
      postLikesCount: result.post?.likesCount ?? null,
      postStatus: result.post ? 'active' : (result.loading ? 'loading' : 'gone'),
      commentIds: result.comments.map(c => c.id),
      commentLikeCounts: Object.fromEntries(result.comments.map(c => [c.id, c.likesCount ?? 0])),
      commentsHasMore: result.commentsHasMore,
      commentsLoading: result.commentsLoading,
    };
  }, [result.loadMoreComments, result.post, result.loading, result.comments, result.commentsHasMore, result.commentsLoading, postId]);

  return null;
};

export const HarnessRoot: React.FC = () => (
  <>
    <FeedHarness />
    <PostHarness />
  </>
);

const container = document.getElementById('harness-root');
if (container) {
  createRoot(container).render(<HarnessRoot />);
  window.__harnessReady = true;
}

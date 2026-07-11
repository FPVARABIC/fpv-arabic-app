import { AppShell } from '../components/AppShell';
import { ProfileSheet } from '../components/ProfileSheet';
import { CommunityHome } from '../components/Community/CommunityHome';
import { PostDetail } from '../components/Community/PostPage/PostDetail';
import { SearchScreen } from '../components/Community/Search/SearchScreen';
import { PublicProfile } from '../components/Community/Profile/PublicProfile';
import { PostComposer } from '../components/Community/Composer/PostComposer';
import { SavedPostsScreen } from '../components/Community/Saved/SavedPostsScreen';
import { SavedPostIdsProvider } from '../components/Community/hooks/useSavedPostIds';
import { useFeed } from '../components/Community/hooks/useFeed';
import type { ChipValue } from '../components/Community/Feed/CategoryChips';
import { useAuthContext } from '../contexts/AuthContext';
import { HomeDashboardLegacy } from './HomeDashboardLegacy';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

// Phase 3 rollout flag. Flip to false for immediate rollback.
const RENDER_COMMUNITY = true;

type Screen =
  | { name: 'feed' }
  | { name: 'post'; postId: string }
  | { name: 'search' }
  | { name: 'saved' }
  | { name: 'compose' }
  | { name: 'profile'; authorId: string };

const getScrollY = (): number => window.scrollY;

const setScrollY = (y: number): void => window.scrollTo(0, y);

const CommunityHomeScreens: React.FC = () => {
  const [screen, setScreen] = useState<Screen>({ name: 'feed' });
  const [menuOpen, setMenuOpen] = useState(false);
  const [category, setCategory] = useState<ChipValue>('all');
  const { currentUser, isGuest } = useAuthContext();
  const feed = useFeed(category);

  const scrollTopRef = useRef(0);
  const authKeyRef = useRef(isGuest ? 'guest' : (currentUser?.uid ?? null));
  const isFirstCategoryRenderRef = useRef(true);

  // Auth-identity change: treated the same as a category change — a fresh,
  // correct reload, scrolled to top, rather than preserving a different
  // session's state. Community post reads are public regardless of viewer,
  // so this is a freshness/correctness measure, not a privacy boundary.
  useEffect(() => {
    const nextAuthKey = isGuest ? 'guest' : (currentUser?.uid ?? null);
    if (nextAuthKey !== authKeyRef.current) {
      authKeyRef.current = nextAuthKey;
      scrollTopRef.current = 0;
      setScrollY(0);
      feed.refresh();
    }
  }, [isGuest, currentUser?.uid, feed]);

  // Category change: the newly selected category always starts at the top —
  // the previous category's scroll position must never carry over. Skipped
  // on the very first render (mount), where scrollTop is already 0.
  useLayoutEffect(() => {
    if (isFirstCategoryRenderRef.current) {
      isFirstCategoryRenderRef.current = false;
      return;
    }
    scrollTopRef.current = 0;
    setScrollY(0);
  }, [category]);

  // Restores scroll position on a normal return to the feed screen. Runs as
  // a useLayoutEffect (after DOM mutation, before paint) so preserved posts
  // are already rendered and the restore is invisible. FeedList's own
  // observer-creating effect is a plain useEffect, which React guarantees
  // flushes after every useLayoutEffect in the same commit, so the observer
  // can only ever see this already-restored position.
  useLayoutEffect(() => {
    if (screen.name !== 'feed') return;
    setScrollY(scrollTopRef.current);
  }, [screen.name]);

  const goTo = useCallback((next: Screen) => {
    if (screen.name === 'feed') {
      scrollTopRef.current = getScrollY();
    }
    setScreen(next);
  }, [screen.name]);

  // Eager reset at the moment publication succeeds — by the time the user
  // returns to the feed, the fresh reload has typically already completed,
  // so the return path needs no special-casing at all.
  const handlePosted = useCallback((postId: string) => {
    scrollTopRef.current = 0;
    setScrollY(0);
    feed.refresh();
    setScreen({ name: 'post', postId });
  }, [feed]);

  return (
    <>
      {screen.name === 'feed' && (
        <CommunityHome
          category={category}
          onCategoryChange={setCategory}
          feed={feed}
          onOpenPost={postId => goTo({ name: 'post', postId })}
          onOpenAuthor={authorId => goTo({ name: 'profile', authorId })}
          onOpenSearch={() => goTo({ name: 'search' })}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenSaved={() => goTo({ name: 'saved' })}
          onOpenCompose={() => goTo({ name: 'compose' })}
        />
      )}
      {screen.name === 'post' && (
        <PostDetail
          postId={screen.postId}
          onBack={() => setScreen({ name: 'feed' })}
          onOpenAuthor={authorId => setScreen({ name: 'profile', authorId })}
        />
      )}
      {screen.name === 'search' && (
        <SearchScreen
          onBack={() => setScreen({ name: 'feed' })}
          onOpenPost={postId => setScreen({ name: 'post', postId })}
          onOpenAuthor={authorId => setScreen({ name: 'profile', authorId })}
        />
      )}
      {screen.name === 'saved' && (
        <SavedPostsScreen
          onBack={() => setScreen({ name: 'feed' })}
          onOpenPost={postId => setScreen({ name: 'post', postId })}
          onOpenAuthor={authorId => setScreen({ name: 'profile', authorId })}
        />
      )}
      {screen.name === 'compose' && (
        <PostComposer
          onPosted={handlePosted}
          onCancel={() => setScreen({ name: 'feed' })}
        />
      )}
      {screen.name === 'profile' && (
        <PublicProfile uid={screen.authorId} onBack={() => setScreen({ name: 'feed' })} />
      )}
      <ProfileSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
};

export const HomeView: React.FC = () => {
  if (!RENDER_COMMUNITY) return <HomeDashboardLegacy />;

  return (
    <AppShell tint="cyan">
      <SavedPostIdsProvider>
        <CommunityHomeScreens />
      </SavedPostIdsProvider>
    </AppShell>
  );
};

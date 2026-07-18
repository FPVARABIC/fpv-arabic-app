import { useLocation } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { ProfileSheet } from '../components/ProfileSheet';
import { CommunityHome } from '../components/Community/CommunityHome';
import { PostDetail } from '../components/Community/PostPage/PostDetail';
import { SearchScreen } from '../components/Community/Search/SearchScreen';
import { PublicProfile } from '../components/Community/Profile/PublicProfile';
import { PostComposer } from '../components/Community/Composer/PostComposer';
import { SavedPostsScreen } from '../components/Community/Saved/SavedPostsScreen';
import { NotificationsScreen } from '../components/Community/Notifications/NotificationsScreen';
import { SavedPostIdsProvider } from '../components/Community/hooks/useSavedPostIds';
import { useFeed } from '../components/Community/hooks/useFeed';
import { useEnsureCommunityUser } from '../components/Community/hooks/useEnsureCommunityUser';
import { useNotifications } from '../components/Community/hooks/useNotifications';
import type { ChipValue } from '../components/Community/Feed/CategoryChips';
import { useAuthContext } from '../contexts/AuthContext';
import { HomeDashboardLegacy } from './HomeDashboardLegacy';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

// Phase 3 rollout flag. Flip to false for immediate rollback.
const RENDER_COMMUNITY = true;

type Screen =
  | { name: 'feed' }
  // returnTo: where "back" should land. Optional and defaulting to undefined
  // (which the render below treats as "return to feed") so every existing
  // caller (feed/search/saved) keeps its exact current behavior unchanged;
  // only profile-originated post navigation sets it, so returning from a
  // post opened via a profile lands back on that same profile instead of
  // always on the feed.
  | { name: 'post'; postId: string; returnTo?: Screen }
  | { name: 'search' }
  | { name: 'saved' }
  | { name: 'compose' }
  | { name: 'notifications' }
  | { name: 'profile'; authorId: string };

const getScrollY = (): number => window.scrollY;

const setScrollY = (y: number): void => window.scrollTo(0, y);

const CommunityHomeScreens: React.FC = () => {
  const [screen, setScreen] = useState<Screen>({ name: 'feed' });
  const [menuOpen, setMenuOpen] = useState(false);
  const [category, setCategory] = useState<ChipValue>('all');
  const { currentUser, isGuest } = useAuthContext();
  const feed = useFeed(category);
  const notifications = useNotifications();
  const location = useLocation();
  const lastHomeResetRef = useRef<number | undefined>(undefined);
  // Single dedicated lifecycle owner for the Community user-document
  // bootstrap (Phase 5) — CommunityHomeScreens is the stable, never-
  // unmounting Community-experience owner, matching the same architectural
  // role it already plays for feed/category state (Phase 4). Its state is
  // propagated down to PublicProfile so Follow can refuse to send a write
  // known to fail while bootstrap hasn't finished.
  const communityBootstrap = useEnsureCommunityUser();

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

  // BottomNavigation's Home button (see that file's own comment) sends a
  // fresh `homeReset` value in navigation state every time it is pressed —
  // the only reliable signal available when the route is already '/home'
  // and therefore never remounts this component on its own. Resets every
  // piece of Community-internal navigation state in one place: the screen
  // stack collapses to the feed, the profile-menu sheet closes, and the
  // feed scroll position returns to the top — regardless of which
  // Community sub-screen was open when Home was pressed. Guarded by
  // comparing against the last-seen value (not merely "is it defined") so
  // this never fires on a render that didn't originate from a fresh Home
  // press, and safely no-ops if Home is pressed while already on the feed
  // (setScreen to an equal value is a cheap, safe no-op).
  useEffect(() => {
    const homeReset = (location.state as { homeReset?: number } | null)?.homeReset;
    if (homeReset !== undefined && homeReset !== lastHomeResetRef.current) {
      lastHomeResetRef.current = homeReset;
      setScreen({ name: 'feed' });
      setMenuOpen(false);
      scrollTopRef.current = 0;
      setScrollY(0);
      notifications.refresh();
    }
    // notifications.refresh is a stable useCallback keyed only on currentUid;
    // the `notifications` object itself is a new literal every render, so
    // depending on it (as exhaustive-deps requests) would re-fire this reset
    // effect every single render instead of only on a fresh Home press.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, notifications.refresh]);

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
          onOpenNotifications={() => goTo({ name: 'notifications' })}
          unreadNotificationsCount={notifications.unreadCount}
        />
      )}
      {screen.name === 'post' && (
        <PostDetail
          postId={screen.postId}
          onBack={() => setScreen(screen.returnTo ?? { name: 'feed' })}
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
      {screen.name === 'notifications' && (
        <NotificationsScreen
          notifications={notifications.notifications}
          loading={notifications.loading}
          error={notifications.error}
          markAsRead={notifications.markAsRead}
          onBack={() => setScreen({ name: 'feed' })}
          onOpenPost={postId => setScreen({ name: 'post', postId })}
          onOpenAuthor={authorId => setScreen({ name: 'profile', authorId })}
        />
      )}
      {screen.name === 'profile' && (
        <PublicProfile
          uid={screen.authorId}
          onBack={() => setScreen({ name: 'feed' })}
          onOpenPost={postId => setScreen({ name: 'post', postId, returnTo: screen })}
          onOpenAuthor={authorId => setScreen({ name: 'profile', authorId })}
          bootstrapState={communityBootstrap.state}
          onRetryBootstrap={communityBootstrap.retry}
        />
      )}
      <ProfileSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenProfile={uid => setScreen({ name: 'profile', authorId: uid })}
      />
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

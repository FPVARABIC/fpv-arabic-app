/**
 * TEMP — Phase 1 evidence only, removed in Phase 3 Home-swap diff.
 *
 * Standalone route (/community-preview) that exercises the Community
 * read-only slice before the real Home-tab integration lands (D14). Renders
 * ONLY Phase 1 read-only screens — no composer, no comment input, no report
 * button, no saved posts. Not a backdoor for early Phase 2 access.
 *
 * NOT excluded from production by any build flag: whatever is on this branch
 * is what Vercel builds, so this route is live at /community-preview on any
 * deployment between now and the Phase 3 diff that deletes this file and its
 * App.tsx route line together.
 *
 * Renders inside the real AppShell with the default showNav (true), so the
 * existing, untouched BottomNavigation is visible — this route's whole point
 * is showing how Community will actually sit inside the real app shell.
 * AppShell and BottomNavigation are not modified by this file.
 *
 * D1.3/D14 amendment: the Community header needs its own access point to
 * the account/settings/contact/about surface, since Community becomes the
 * Home tab's content in Phase 3 and must not remove that access. This
 * reuses the EXISTING ProfileSheet component and its existing open/close
 * behavior exactly as-is (same pattern HomeView already uses) — ProfileSheet
 * itself is not modified, not reimplemented, not duplicated.
 */
import React, { useState } from 'react';
import { AppShell } from '../components/AppShell';
import { ProfileSheet } from '../components/ProfileSheet';
import { CommunityHome } from '../components/Community/CommunityHome';
import { PostDetail } from '../components/Community/PostPage/PostDetail';
import { SearchScreen } from '../components/Community/Search/SearchScreen';
import { PublicProfile } from '../components/Community/Profile/PublicProfile';

type Screen =
  | { name: 'feed' }
  | { name: 'post'; postId: string }
  | { name: 'search' }
  | { name: 'profile'; authorId: string };

export const CommunityPreviewView: React.FC = () => {
  const [screen, setScreen] = useState<Screen>({ name: 'feed' });
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <AppShell tint="cyan">
      {screen.name === 'feed' && (
        <CommunityHome
          onOpenPost={postId => setScreen({ name: 'post', postId })}
          onOpenAuthor={authorId => setScreen({ name: 'profile', authorId })}
          onOpenSearch={() => setScreen({ name: 'search' })}
          onOpenMenu={() => setMenuOpen(true)}
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
      {screen.name === 'profile' && (
        <PublicProfile uid={screen.authorId} onBack={() => setScreen({ name: 'feed' })} />
      )}
      <ProfileSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
    </AppShell>
  );
};

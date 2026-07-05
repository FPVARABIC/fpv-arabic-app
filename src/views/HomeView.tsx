import { AppShell } from '../components/AppShell';
import { ProfileSheet } from '../components/ProfileSheet';
import { CommunityHome } from '../components/Community/CommunityHome';
import { PostDetail } from '../components/Community/PostPage/PostDetail';
import { SearchScreen } from '../components/Community/Search/SearchScreen';
import { PublicProfile } from '../components/Community/Profile/PublicProfile';
import { PostComposer } from '../components/Community/Composer/PostComposer';
import { SavedPostsScreen } from '../components/Community/Saved/SavedPostsScreen';
import { SavedPostIdsProvider } from '../components/Community/hooks/useSavedPostIds';
import { HomeDashboardLegacy } from './HomeDashboardLegacy';

import React, { useState } from 'react';

// Phase 3 rollout flag. Flip to false for immediate rollback.
const RENDER_COMMUNITY = true;

type Screen =
  | { name: 'feed' }
  | { name: 'post'; postId: string }
  | { name: 'search' }
  | { name: 'saved' }
  | { name: 'compose' }
  | { name: 'profile'; authorId: string };

const CommunityHomeScreens: React.FC = () => {
  const [screen, setScreen] = useState<Screen>({ name: 'feed' });
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {screen.name === 'feed' && (
        <CommunityHome
          onOpenPost={postId => setScreen({ name: 'post', postId })}
          onOpenAuthor={authorId => setScreen({ name: 'profile', authorId })}
          onOpenSearch={() => setScreen({ name: 'search' })}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenSaved={() => setScreen({ name: 'saved' })}
          onOpenCompose={() => setScreen({ name: 'compose' })}
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
          onPosted={postId => setScreen({ name: 'post', postId })}
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

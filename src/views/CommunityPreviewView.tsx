/**
 * TEMP — Phase 1/2 evidence only, removed in Phase 3 Home-swap diff.
 *
 * Standalone route (/community-preview) that exercises the Community slice
 * before the real Home-tab integration lands (D14).
 *
 * NOT excluded from production by any build flag: whatever is on this branch
 * is what Vercel builds, so this route is live at /community-preview on any
 * deployment between now and the Phase 3 diff that deletes this file and its
 * App.tsx route line together.
 *
 * Renders inside the real AppShell with the default showNav (true), so the
 * existing, untouched BottomNavigation is visible. AppShell and
 * BottomNavigation are not modified by this file.
 *
 * D1.3/D14 amendment: the Community header reuses the EXISTING ProfileSheet
 * component and its existing open/close behavior exactly as-is (same
 * pattern HomeView already uses) — ProfileSheet itself is not modified.
 *
 * Phase 2 DEV sign-in panel: visually separated from the Community UI
 * entirely (dashed border, monospace label, fixed corner), gated behind
 * VITE_USE_FIREBASE_EMULATOR so it can never appear in a real dev/staging/
 * production build. It signs into the Auth Emulator directly via the
 * Firebase Auth SDK (create-if-missing, then sign in) — AuthContext.tsx is
 * not modified; its existing onAuthStateChanged listener picks up the
 * resulting session automatically, exactly as it would for a real
 * Google-popup sign-in.
 */
import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { AppShell } from '../components/AppShell';
import { ProfileSheet } from '../components/ProfileSheet';
import { firebaseAuth } from '../lib/firebase';
import { useAuthContext } from '../contexts/AuthContext';
import { CommunityHome } from '../components/Community/CommunityHome';
import { PostDetail } from '../components/Community/PostPage/PostDetail';
import { SearchScreen } from '../components/Community/Search/SearchScreen';
import { PublicProfile } from '../components/Community/Profile/PublicProfile';
import { PostComposer } from '../components/Community/Composer/PostComposer';
import { SavedPostsScreen } from '../components/Community/Saved/SavedPostsScreen';
import { SavedPostIdsProvider } from '../components/Community/hooks/useSavedPostIds';

const IS_EMULATOR_MODE = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';
const DEV_TEST_EMAIL = 'dev-test-pilot@example.com';
const DEV_TEST_PASSWORD = 'dev-test-password-123';
const DEV_TEST_DISPLAY_NAME = 'مستخدم تجريبي';

type Screen =
  | { name: 'feed' }
  | { name: 'post'; postId: string }
  | { name: 'search' }
  | { name: 'saved' }
  | { name: 'compose' }
  | { name: 'profile'; authorId: string };

const DevAuthPanel: React.FC = () => {
  const { currentUser } = useAuthContext();
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    setBusy(true);
    try {
      try {
        const cred = await createUserWithEmailAndPassword(firebaseAuth, DEV_TEST_EMAIL, DEV_TEST_PASSWORD);
        await updateProfile(cred.user, { displayName: DEV_TEST_DISPLAY_NAME });
      } catch {
        await signInWithEmailAndPassword(firebaseAuth, DEV_TEST_EMAIL, DEV_TEST_PASSWORD);
      }
    } catch (err) {
      console.error('[DevAuthPanel]', err);
    } finally {
      setBusy(false);
    }
  };

  const signOutDev = async () => {
    setBusy(true);
    try {
      await firebaseSignOut(firebaseAuth);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 62, right: 8, zIndex: 100,
      border: '1px dashed #f59e0b', borderRadius: 8, padding: '6px 10px',
      background: 'rgba(0,0,0,0.75)', fontFamily: 'monospace', fontSize: 10,
      color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span>DEV</span>
      <span style={{ color: '#fff' }}>{currentUser ? currentUser.displayName ?? currentUser.email : 'logged out'}</span>
      {currentUser ? (
        <button onClick={signOutDev} disabled={busy} style={{ fontFamily: 'monospace', fontSize: 10, background: 'none', border: '1px solid #f59e0b', color: '#f59e0b', borderRadius: 4, cursor: 'pointer', padding: '2px 6px' }}>
          sign out
        </button>
      ) : (
        <button onClick={signIn} disabled={busy} style={{ fontFamily: 'monospace', fontSize: 10, background: 'none', border: '1px solid #f59e0b', color: '#f59e0b', borderRadius: 4, cursor: 'pointer', padding: '2px 6px' }}>
          sign in
        </button>
      )}
    </div>
  );
};

const CommunityPreviewScreens: React.FC = () => {
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

export const CommunityPreviewView: React.FC = () => (
  <AppShell tint="cyan">
    <SavedPostIdsProvider>
      <CommunityPreviewScreens />
    </SavedPostIdsProvider>
    {IS_EMULATOR_MODE && <DevAuthPanel />}
  </AppShell>
);

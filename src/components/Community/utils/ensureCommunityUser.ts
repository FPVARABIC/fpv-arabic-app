import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { userPath } from './firestorePaths';
import { normalizeDisplayName } from './userSearch';

export interface CommunityIdentity {
  displayName: string | null;
  photoURL: string | null;
}

// Existing app convention (unchanged from useComposer.ts/useCommentComposer.ts's
// prior inline bootstrap) — never falls back to email, which would leak a
// private field onto a publicly-readable document.
const FALLBACK_DISPLAY_NAME = 'مستخدم';

// Single, dedicated, idempotent bootstrap for users/{uid} (Phase 5). Safe to
// call redundantly from multiple sites (Community-entry, first post, first
// comment) and safe under concurrent duplicate calls — two browser tabs,
// React Strict Mode's double effect invocation, or a transaction retry all
// converge on exactly one created document, and calling this against an
// already-bootstrapped user is a pure no-op: it never overwrites, resets, or
// touches any existing field (role/status/postsCount/activity timestamps
// are left completely alone).
export async function ensureCommunityUser(uid: string, identity: CommunityIdentity): Promise<void> {
  const userRef = doc(firestoreDb, userPath(uid));
  await runTransaction(firestoreDb, async (tx) => {
    const snap = await tx.get(userRef);
    if (snap.exists()) return;
    const displayName = identity.displayName ?? FALLBACK_DISPLAY_NAME;
    tx.set(userRef, {
      displayName,
      photoURL: identity.photoURL ?? null,
      joinedAt: serverTimestamp(),
      postsCount: 0,
      role: 'user',
      status: 'active',
      lastPostAt: null,
      lastCommentAt: null,
      // Powers user (account) search — see utils/userSearch.ts. Written once
      // at bootstrap and never updated after (displayName itself has no V1
      // edit path either, so the two can never drift apart for a given
      // user). Pre-existing users bootstrapped before this field existed
      // need scripts/migrateDisplayNameNormalized.ts, run once, to become
      // searchable — see that script for the disclosed backfill plan.
      displayNameNormalized: normalizeDisplayName(displayName),
    });
  });
}

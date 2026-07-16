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
// already-bootstrapped user is a pure no-op for every field EXCEPT
// displayNameNormalized (Phase 8) — see the backfill branch below. It never
// overwrites, resets, or touches displayName/photoURL/role/status/
// postsCount/activity timestamps on an existing document.
export async function ensureCommunityUser(uid: string, identity: CommunityIdentity): Promise<void> {
  const userRef = doc(firestoreDb, userPath(uid));
  await runTransaction(firestoreDb, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) {
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
        // Powers user (account) search — see utils/userSearch.ts.
        displayNameNormalized: normalizeDisplayName(displayName),
      });
      return;
    }

    // Backfill (Phase 8) — self-healing for the SIGNED-IN user's own
    // document: a pre-existing account bootstrapped before
    // displayNameNormalized existed (or, defensively, one whose stored
    // value has gone stale relative to its own displayName) becomes
    // searchable again the next time its owner authenticates, with no
    // migration script needed for that specific account. Derived from the
    // document's OWN stored displayName — never from the freshly-passed
    // `identity` param — so this can never drift from the name that's
    // actually public/searchable, and never touches displayName itself or
    // any other field (a single-field update, structurally incapable of
    // touching anything else — see firestore.rules' matching branch).
    // Historical accounts that never sign back in still require
    // scripts/migrateDisplayNameNormalizedProd.ts run once against
    // production — this per-login backfill does not replace that.
    const data = snap.data();
    const storedDisplayName = typeof data.displayName === 'string' ? data.displayName : FALLBACK_DISPLAY_NAME;
    const expectedNormalized = normalizeDisplayName(storedDisplayName);
    if (data.displayNameNormalized !== expectedNormalized) {
      tx.update(userRef, { displayNameNormalized: expectedNormalized });
    }
  });
}

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  collection,
  collectionGroup,
  query,
  where,
  getCountFromServer,
} from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { useAuthContext } from '../../../contexts/AuthContext';
import { FOLLOWING_COLLECTION, followingRelationPath } from '../utils/firestorePaths';
import type { FollowStatus } from '../types';
import type { CommunityBootstrapState } from './useEnsureCommunityUser';

export interface UseFollowResult {
  status: FollowStatus;
  statusError: string | null;
  followersCount: number | null;
  followingCount: number | null;
  countsError: string | null;
  mutating: boolean;
  mutationError: string | null;
  follow: () => void;
  unfollow: () => void;
}

// Follow/unfollow + live follower/following counts for a viewed profile
// (Phase 5). Canonical single-document relation nested under the follower's
// own user doc (users/{followerUid}/following/{followedUid}) — the document
// ID is the followed uid alone, never a delimited concatenation of two uids.
// Counts are always aggregation-derived (getCountFromServer) against the
// real relation documents — never a stored, client-writable counter field.
// Follow/unfollow run as transactions specifically so that a duplicate call
// (two tabs, a double-tap, React Strict Mode) resolves as a genuine no-op
// rather than a rejected/failed write.
//
// Privacy (Option B, approved): follower/following relationships and counts
// are authenticated-only. A guest (currentUid === null) never triggers any
// relation read at all — loadCounts short-circuits before any Firestore
// call, and loadStatus already short-circuits to 'not-following' for the
// guest/own-profile case.
//
// bootstrapState gates writes only (not reads): the Community-user
// bootstrap only affects whether the *caller's own* users/{uid} document
// exists, which the create rule requires — reads of a relation document
// carry no such requirement under Option B (`allow read: if isSignedIn()`
// alone). Follow/unfollow refuse to even attempt a write until
// bootstrapState === 'ready', instead of sending a write already known to
// be rejected by the rules.
//
// Lifecycle safety: THREE separate monotonic generation counters, each with
// exactly one responsibility — no isMountedRef boolean, no shared/general
// purpose ref.
// - statusRequestIdRef: status-read generation only. Bumped on
//   profileUid/currentUid change and on unmount.
// - countsRequestIdRef: counts-read generation only. Critically, this is
//   minted INSIDE loadCounts itself on every single invocation, not passed
//   in by a caller or effect. loadCounts is invoked from two independent
//   call sites — the profile/identity-change effect, and a successful
//   Follow/Unfollow mutation — and those two calls can resolve out of
//   order (e.g. the effect's initial load is slow and a subsequent
//   Follow-triggered reload finishes first). Because every loadCounts call
//   mints its own strictly-increasing id and only ever applies its result
//   if that id is still the current one, an older call can never overwrite
//   a newer call's already-applied result, regardless of resolution order.
// - mutationIdRef: mutation generation only. Bumped on the same
//   profile/identity-change triggers as the other two. A stale in-flight
//   Follow/Unfollow that outlives a profile or auth-identity change can
//   never touch the new profile's state, and the new profile never
//   inherits a stuck `mutating` flag.
//
// Mutation success vs. count-refresh failure: a successful Follow/Unfollow
// transaction is a complete, terminal success in its own right — `status`
// updates, `mutationError` stays null, and `mutating` clears — the instant
// the transaction itself resolves. The follow-up `loadCounts()` call that
// refreshes the displayed follower/following numbers is a separate,
// independent operation; if it fails, that failure can only ever surface as
// `countsError`. It is never allowed to overwrite `mutationError` or make a
// successful mutation look failed, because it is invoked outside the
// mutation's own try/catch/finally, gated on a local `mutationSucceeded`
// flag rather than being nested inside the mutation's error handling.
export const useFollow = (profileUid: string, bootstrapState: CommunityBootstrapState): UseFollowResult => {
  const { currentUser } = useAuthContext();
  const currentUid = currentUser?.uid ?? null;

  const [status, setStatus] = useState<FollowStatus>('loading');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [followersCount, setFollowersCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [countsError, setCountsError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const statusRequestIdRef = useRef(0);
  const countsRequestIdRef = useRef(0);
  const mutationIdRef = useRef(0);

  const loadCounts = useCallback(async () => {
    // Mint a fresh generation for THIS invocation alone. Whichever call
    // resolves last no longer "wins" by default — only the call whose id
    // still matches countsRequestIdRef.current at resolution time is
    // allowed to apply its result, so an older call can never clobber a
    // newer call's already-applied state even if it resolves after it.
    const localCountsId = ++countsRequestIdRef.current;
    if (!currentUid) {
      // Guests are never allowed to query follow relationships or counts
      // under the approved Option B privacy policy — skip the network
      // calls entirely rather than attempting a request the rules would
      // deny anyway. This guarantees zero relation-count reads for guests.
      setFollowersCount(null);
      setFollowingCount(null);
      setCountsError(null);
      return;
    }
    try {
      // Followers: a collection-group query across every user's `following`
      // subcollection, filtered to this profile — requires the explicit
      // authenticated-only recursive rule + the explicit collection-group
      // index (see firestore.rules / firestore.indexes.json).
      const followersQuery = query(
        collectionGroup(firestoreDb, FOLLOWING_COLLECTION),
        where('followedId', '==', profileUid),
      );
      // Following: simply this profile's own subcollection, no filter needed.
      const followingQuery = collection(firestoreDb, 'users', profileUid, FOLLOWING_COLLECTION);

      const [followersSnap, followingSnap] = await Promise.all([
        getCountFromServer(followersQuery),
        getCountFromServer(followingQuery),
      ]);
      if (localCountsId !== countsRequestIdRef.current) return;
      setFollowersCount(followersSnap.data().count);
      setFollowingCount(followingSnap.data().count);
      setCountsError(null);
    } catch (err) {
      if (localCountsId !== countsRequestIdRef.current) return;
      setCountsError('تعذّر تحميل الإحصائيات.');
      console.error('[useFollow:counts]', err);
    }
  }, [profileUid, currentUid]);

  const loadStatus = useCallback(async (localStatusId: number) => {
    if (!currentUid || currentUid === profileUid) {
      if (localStatusId !== statusRequestIdRef.current) return;
      setStatus('not-following');
      setStatusError(null);
      return;
    }
    try {
      const snap = await getDoc(doc(firestoreDb, followingRelationPath(currentUid, profileUid)));
      if (localStatusId !== statusRequestIdRef.current) return;
      setStatus(snap.exists() ? 'following' : 'not-following');
      setStatusError(null);
    } catch (err) {
      if (localStatusId !== statusRequestIdRef.current) return;
      setStatus('loading');
      setStatusError('تعذّر التحقق من حالة المتابعة.');
      console.error('[useFollow:status]', err);
    }
  }, [currentUid, profileUid]);

  useEffect(() => {
    const localStatusId = ++statusRequestIdRef.current;
    // Invalidate any in-flight mutation from a previous profile/identity —
    // its eventual completion must never touch this (new) profile's state.
    mutationIdRef.current += 1;

    setStatus('loading');
    setStatusError(null);
    // Synchronously clear any stale counts/count-error from the previous
    // profile or identity BEFORE the new loadCounts() call has a chance to
    // resolve — a previously-viewed profile's numbers (or a previous
    // authenticated identity's numbers) must never remain visible even
    // momentarily under the new profile/identity.
    setFollowersCount(null);
    setFollowingCount(null);
    setCountsError(null);
    // A new profile/identity never inherits a stuck mutation state.
    setMutating(false);
    setMutationError(null);

    loadCounts();
    loadStatus(localStatusId);

    return () => {
      statusRequestIdRef.current += 1;
      countsRequestIdRef.current += 1;
      mutationIdRef.current += 1;
    };
  }, [profileUid, currentUid, loadCounts, loadStatus]);

  const follow = useCallback(() => {
    if (!currentUid || currentUid === profileUid || mutating || bootstrapState !== 'ready') return;
    // Mint a fresh generation for THIS accepted invocation alone — reading
    // mutationIdRef.current without incrementing it would let two calls
    // issued in the same event-loop turn (before React re-renders with
    // mutating === true in the closure) both capture the same generation
    // and both believe themselves current. Minting here, synchronously,
    // guarantees every accepted invocation is uniquely and immediately
    // distinguishable regardless of render timing.
    const localMutationId = ++mutationIdRef.current;
    setMutating(true);
    setMutationError(null);
    (async () => {
      let mutationSucceeded = false;
      try {
        const ref = doc(firestoreDb, followingRelationPath(currentUid, profileUid));
        await runTransaction(firestoreDb, async (tx) => {
          const snap = await tx.get(ref);
          if (snap.exists()) return; // already following — idempotent no-op, no error
          tx.set(ref, { followedId: profileUid, createdAt: serverTimestamp() });
        });
        mutationSucceeded = true;
        if (localMutationId !== mutationIdRef.current) return;
        setStatus('following');
      } catch (err) {
        if (localMutationId !== mutationIdRef.current) return;
        console.error('[useFollow:follow]', err);
        setMutationError('تعذّرت المتابعة. حاول مرة أخرى.');
      } finally {
        if (localMutationId === mutationIdRef.current) setMutating(false);
      }
      // Deliberately OUTSIDE the try/catch/finally above: a failure here
      // must only ever set countsError, and must never be able to flip a
      // successful mutation's already-finalized status/mutationError back
      // to an error state.
      if (mutationSucceeded && localMutationId === mutationIdRef.current) {
        await loadCounts();
      }
    })();
  }, [currentUid, profileUid, mutating, bootstrapState, loadCounts]);

  const unfollow = useCallback(() => {
    if (!currentUid || currentUid === profileUid || mutating || bootstrapState !== 'ready') return;
    // See the matching comment in follow() above: minting a fresh generation
    // here (not merely reading the current one) is what makes two same-tick
    // invocations distinguishable even before React re-renders.
    const localMutationId = ++mutationIdRef.current;
    setMutating(true);
    setMutationError(null);
    (async () => {
      let mutationSucceeded = false;
      try {
        const ref = doc(firestoreDb, followingRelationPath(currentUid, profileUid));
        await runTransaction(firestoreDb, async (tx) => {
          const snap = await tx.get(ref);
          if (!snap.exists()) return; // already not following — idempotent no-op, no error
          tx.delete(ref);
        });
        mutationSucceeded = true;
        if (localMutationId !== mutationIdRef.current) return;
        setStatus('not-following');
      } catch (err) {
        if (localMutationId !== mutationIdRef.current) return;
        console.error('[useFollow:unfollow]', err);
        setMutationError('تعذّر إلغاء المتابعة. حاول مرة أخرى.');
      } finally {
        if (localMutationId === mutationIdRef.current) setMutating(false);
      }
      if (mutationSucceeded && localMutationId === mutationIdRef.current) {
        await loadCounts();
      }
    })();
  }, [currentUid, profileUid, mutating, bootstrapState, loadCounts]);

  return {
    status, statusError, followersCount, followingCount, countsError,
    mutating, mutationError, follow, unfollow,
  };
};

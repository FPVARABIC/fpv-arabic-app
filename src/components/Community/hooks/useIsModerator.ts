import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { userPath } from '../utils/firestorePaths';
import { useAuthContext } from '../../../contexts/AuthContext';

interface UseIsModeratorResult {
  isModerator: boolean;
  loading: boolean;
}

interface ModeratorFetchState {
  uid: string | null;
  isModerator: boolean;
}

// Admin dashboard (Phase 2) — the FIRST client-side read of `role` for UI
// gating; every prior use of role/status was Rules-only (isModerator() in
// firestore.rules). Reads the signed-in caller's OWN users/{uid} doc —
// already publicly readable (`allow read: if true`), so this needs no Rules
// change, only this new hook. Every call site that renders moderator-only UI
// should call this itself rather than trust a boolean passed down from a
// parent — the entry point being hidden is UX only; this hook (and, for any
// actual write, the Rules-side isModerator() check) is the real gate.
//
// Derived, not stored (mirrors usePost.ts's own documented fix for this
// exact trap): `state.uid` records which identity the last fetch actually
// completed for, and `loading`/`isModerator` below are computed by comparing
// it against the CURRENT identity — no synchronous setState-to-reset is
// needed inside the effect when the signed-in identity changes.
export const useIsModerator = (): UseIsModeratorResult => {
  const { currentUser, isGuest } = useAuthContext();
  const [state, setState] = useState<ModeratorFetchState>({ uid: null, isModerator: false });

  useEffect(() => {
    if (isGuest || !currentUser) return;
    let cancelled = false;
    getDoc(doc(firestoreDb, userPath(currentUser.uid)))
      .then(snap => {
        if (cancelled) return;
        setState({ uid: currentUser.uid, isModerator: snap.exists() && snap.data().role === 'moderator' });
      })
      .catch(err => {
        if (cancelled) return;
        console.error('[useIsModerator]', err);
        setState({ uid: currentUser.uid, isModerator: false });
      });
    return () => { cancelled = true; };
  }, [currentUser, isGuest]);

  const currentUid = isGuest ? null : (currentUser?.uid ?? null);
  const isCurrent = state.uid === currentUid;
  const loading = !isGuest && !!currentUser && !isCurrent;

  return { isModerator: isCurrent && state.isModerator, loading };
};

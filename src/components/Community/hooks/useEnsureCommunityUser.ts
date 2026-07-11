import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthContext } from '../../../contexts/AuthContext';
import { ensureCommunityUser } from '../utils/ensureCommunityUser';

export type CommunityBootstrapState = 'idle' | 'bootstrapping' | 'ready' | 'error';

export interface UseEnsureCommunityUserResult {
  state: CommunityBootstrapState;
  error: string | null;
  retry: () => void;
}

// Single dedicated lifecycle owner for the Community user-document bootstrap
// (Phase 5) — invoked once from the stable Community-experience owner
// (CommunityHomeScreens) whenever the authenticated identity changes.
// Guests are never bootstrapped ('idle', not an error). Exposes `error` (a
// safe, fixed Arabic message — never raw Firebase error text) and `retry()`
// so a genuine failure (e.g. a transient network error) can be explicitly
// retried by the UI rather than leaving the user stuck with no way forward.
//
// Lifecycle safety: uses ONLY a monotonically increasing requestIdRef — no
// isMountedRef boolean. A boolean "mounted" flag is unsafe under React
// Strict Mode's development-only mount -> cleanup -> mount cycle: the
// cleanup sets it false, but the *second* setup never has a chance to set
// it back to true (the effect body only registers a new cleanup closure),
// so the flag would be permanently stuck at false and every future async
// completion would be silently discarded forever, leaving `state` stuck at
// 'bootstrapping'. A monotonically increasing counter has no such stuck
// state: every effect invocation (including Strict Mode's second one and
// every retry() call) captures a brand-new, unique generation number, and
// the cleanup from any earlier cycle only invalidates *that* cycle's
// number — it can never invalidate a later, still-active generation. This
// is proven in this phase's Strict Mode harness (see report).
export const useEnsureCommunityUser = (): UseEnsureCommunityUserResult => {
  const { currentUser, isGuest } = useAuthContext();
  const [state, setState] = useState<CommunityBootstrapState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (isGuest || !currentUser) {
      setState('idle');
      setError(null);
      return undefined;
    }
    const localRequestId = ++requestIdRef.current;
    setState('bootstrapping');
    setError(null);
    ensureCommunityUser(currentUser.uid, {
      displayName: currentUser.displayName,
      photoURL: currentUser.photoURL,
    })
      .then(() => {
        if (localRequestId === requestIdRef.current) setState('ready');
      })
      .catch(err => {
        if (localRequestId === requestIdRef.current) {
          setState('error');
          setError('تعذّر تجهيز الحساب. حاول مرة أخرى.');
        }
        console.error('[useEnsureCommunityUser]', err);
      });

    return () => {
      // Invalidates only this cycle's generation. If this is a genuine
      // unmount, no future setup will ever run and the discarded result is
      // simply never applied. If this is Strict Mode's simulated
      // mount->cleanup->mount, the very next line executed synchronously
      // afterwards is the *next* effect setup, which immediately mints a
      // newer generation of its own — so real, final state transitions are
      // never lost.
      requestIdRef.current += 1;
    };
  }, [currentUser, isGuest, retryTick]);

  const retry = useCallback(() => {
    setRetryTick(t => t + 1);
  }, []);

  return { state, error, retry };
};

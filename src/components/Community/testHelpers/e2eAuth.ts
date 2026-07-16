/**
 * E2E-test-only helper — dynamically imported by
 * scripts/testCommunityE2E.ts via the Vite dev server's ES module URL
 * (`/src/components/Community/testHelpers/e2eAuth.ts`). No application code
 * imports this file, so Vite never includes it in the production bundle
 * (only modules reachable from a real entry point get bundled).
 *
 * Why this exists at all: the app's only real sign-in path
 * (AuthContext.signInWithGoogle → signInWithPopup + GoogleAuthProvider)
 * always attempts to load https://apis.google.com/js/api.js as part of its
 * popup flow, before it ever reaches the Auth Emulator's local fake-IDP
 * redirect. That external domain is unreachable from this test environment's
 * network-restricted sandbox regardless of how correctly the emulator is
 * wired up — confirmed empirically (net::ERR_TUNNEL_CONNECTION_FAILED),
 * not assumed. Anonymous sign-in against the SAME Auth Emulator produces a
 * real, distinct uid that AuthContext's onAuthStateChanged picks up exactly
 * like any other signed-in user — the rest of the app (Community's Rules,
 * the createComment/toggleCommentLike Cloud Functions) only ever cares about
 * request.auth.uid and the bootstrapped users/{uid} document, never about
 * which auth provider produced that uid — so this substitutes only the
 * credential-acquisition step, not anything under actual test.
 */
import { signInAnonymously, updateProfile, updateEmail } from 'firebase/auth';
import { firebaseAuth } from '../../../lib/firebase';

export interface E2EProfile {
  displayName: string;
  email: string;
}

// Anonymous sign-in, then immediately layer on a realistic displayName +
// email — the same shape a real Google sign-in would have populated
// (AuthContext/Community code never distinguishes by provider, only by
// uid + the bootstrapped users/{uid} document), so the rest of the app
// behaves identically to a real signed-in user for every test scenario,
// including the "is MY OWN email ever shown to anyone else" checks that
// would otherwise be untestable (a bare anonymous account has no email at
// all).
export async function e2eSignIn(profile: E2EProfile): Promise<string> {
  const cred = await signInAnonymously(firebaseAuth);
  await updateProfile(cred.user, { displayName: profile.displayName });
  await updateEmail(cred.user, profile.email);
  return cred.user.uid;
}

/**
 * One-off evidence script (not a permanent test) — drives the exact same
 * createUserWithEmailAndPassword + updateProfile sequence AuthContext.tsx's
 * signUpWithEmail uses, against the real Firebase Auth Emulator, to capture
 * the real raw error code+message for the account-creation failure being
 * investigated. Uses a standalone demo Firebase app pointed only at the
 * emulator — never touches the real production project.
 *
 * Run with:
 *   npx firebase emulators:exec --project demo-community-rules-test \
 *     --only auth "npx tsx scripts/reproduceSignupError.ts"
 */
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';

const app = initializeApp({ apiKey: 'demo-key', projectId: 'demo-community-rules-test' });
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });

function report(label: string, err: unknown) {
  const code = (err as { code?: string })?.code ?? '(no code)';
  const message = (err as { message?: string })?.message ?? String(err);
  console.log(`\n[${label}]`);
  console.log(`  code:    ${code}`);
  console.log(`  message: ${message}`);
}

async function main() {
  const email = 'ahmed.pilot@example.com';
  const password = 'FpvArabic2026!';

  // Scenario A — brand-new account, realistic name/password (mirrors
  // AuthContext.signUpWithEmail exactly: create, then await updateProfile).
  console.log('=== Scenario A: fresh signUpWithEmail ===');
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: 'أحمد', photoURL: '/avatars/pilot1.png' });
    console.log('  SUCCESS — uid:', result.user.uid, 'displayName:', result.user.displayName);
  } catch (err) {
    report('Scenario A', err);
  }

  // Scenario B — the exact real-world failure this task is investigating:
  // the user (or a previous attempt) already created this email in the
  // emulator/project, and now retries signUpWithEmail with the SAME email.
  console.log('\n=== Scenario B: repeat signUpWithEmail with an already-registered email ===');
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: 'أحمد', photoURL: null });
    console.log('  SUCCESS (unexpected) — uid:', result.user.uid);
  } catch (err) {
    report('Scenario B', err);
  }

  // Scenario C — weak password (Firebase's own server-side minimum, 6 chars).
  console.log('\n=== Scenario C: weak password ===');
  try {
    await createUserWithEmailAndPassword(auth, 'another.pilot@example.com', '123');
    console.log('  SUCCESS (unexpected)');
  } catch (err) {
    report('Scenario C', err);
  }

  // Scenario D — malformed email.
  console.log('\n=== Scenario D: malformed email ===');
  try {
    await createUserWithEmailAndPassword(auth, 'not-an-email', password);
    console.log('  SUCCESS (unexpected)');
  } catch (err) {
    report('Scenario D', err);
  }

  // Scenario E — signInWithEmail against the account created in Scenario A,
  // with the WRONG password (confirms the sign-in path's error shape too).
  console.log('\n=== Scenario E: signInWithEmail wrong password ===');
  try {
    await signInWithEmailAndPassword(auth, email, 'wrong-password-here');
    console.log('  SUCCESS (unexpected)');
  } catch (err) {
    report('Scenario E', err);
  }

  // Scenario F — resetPassword (forgot password) for the real account.
  console.log('\n=== Scenario F: resetPassword for existing account ===');
  try {
    await sendPasswordResetEmail(auth, email);
    console.log('  SUCCESS — reset email queued (emulator does not actually send mail; check the Auth emulator UI/API for the generated link)');
  } catch (err) {
    report('Scenario F', err);
  }

  // Scenario G — resetPassword for a NON-existent account (must not reveal
  // account existence — same as Google's own security posture).
  console.log('\n=== Scenario G: resetPassword for a non-existent account ===');
  try {
    await sendPasswordResetEmail(auth, 'nobody-signed-up@example.com');
    console.log('  SUCCESS — Firebase does not error here even when the account does not exist (privacy-safe by design)');
  } catch (err) {
    report('Scenario G', err);
  }
}

main().then(() => process.exit(0)).catch(err => { console.error('SCRIPT FAILURE:', err); process.exit(1); });

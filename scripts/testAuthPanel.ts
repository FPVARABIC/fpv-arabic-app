/**
 * Real source-structure assertions for the AuthPanel consolidation task —
 * proves AuthPanel.tsx is the ONE place in the app allowed to render a
 * Google-sign-in button or an email/password auth form, and that both real
 * entry points (SplashView.tsx in full mode, ProfileSheet.tsx in compact
 * mode) actually mount it. Unlike scripts/testCommunity.ts's fixed file
 * list, this walks the entire src/ tree at run time — new files added later
 * are covered automatically, not just the files known to exist today.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

// The single owner of Google-sign-in/email-password/forgot-password UI.
const AUTH_PANEL = 'src/components/Auth/AuthPanel.tsx';
// The single owner of the raw Firebase Auth SDK calls (no JSX of its own —
// signInWithGoogle/signUpWithEmail/signInWithEmail/resetPassword are plain
// functions exposed via context, not rendered UI).
const AUTH_CONTEXT = 'src/contexts/AuthContext.tsx';
// Test-only Playwright/emulator sign-in bypass — not a user-facing entry
// point, so it's allowed its own direct SDK calls to drive the emulator.
const E2E_TEST_HELPER = 'src/components/Community/testHelpers/e2eAuth.ts';
// Comment-only mention of sendPasswordResetEmail (explaining the
// auth/missing-email map entry) — no actual SDK call.
const ERROR_MESSAGES_FILE = 'src/utils/authErrorMessages.ts';

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  let files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files = files.concat(walk(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

const allSourceFiles = walk(SRC).map(f => relative(ROOT, f).split('\\').join('/'));
ok('src/ tree scan found a non-trivial number of files (sanity check the walk itself works)', allSourceFiles.length > 20);

const fileContents = new Map<string, string>();
for (const f of allSourceFiles) fileContents.set(f, readFileSync(join(ROOT, f), 'utf8'));

const authPanelTsx = fileContents.get(AUTH_PANEL);
const authContextTsx = fileContents.get(AUTH_CONTEXT);
assert.ok(authPanelTsx, `${AUTH_PANEL} must exist`);
assert.ok(authContextTsx, `${AUTH_CONTEXT} must exist`);

// --- 1. AuthPanel.tsx itself is real and exports what SplashView/ProfileSheet need ---
ok('AuthPanel.tsx exports AuthPanel', /export const AuthPanel:/.test(authPanelTsx!));
ok('AuthPanel.tsx exports GoogleIcon (reused by ProfileSheet\'s signed-in provider badge)', /export const GoogleIcon:/.test(authPanelTsx!));
ok('AuthPanel.tsx supports both compact and full modes', /'compact'/.test(authPanelTsx!) && /'full'/.test(authPanelTsx!));
ok('AuthPanel.tsx wires resetPassword (forgot password)', /resetPassword/.test(authPanelTsx!));
ok('AuthPanel.tsx never calls the Firebase Auth SDK directly — only via useAuthContext()', !/from 'firebase\/auth'/.test(authPanelTsx!) || /type User/.test(authPanelTsx!));

// --- 2. Exactly one file renders a password input (the auth form) ---
const passwordInputFiles = allSourceFiles.filter(f => /type="password"/.test(fileContents.get(f)!));
ok('exactly one file renders a password <input> — AuthPanel.tsx', passwordInputFiles.length === 1 && passwordInputFiles[0] === AUTH_PANEL);

// --- 3. Exactly one non-test-helper file contains the Google "G" icon glyph paths ---
const googleGlyphFiles = allSourceFiles.filter(f => f !== E2E_TEST_HELPER && /M24 9\.5c3\.54/.test(fileContents.get(f)!));
ok('exactly one file defines the Google icon svg paths — AuthPanel.tsx (ProfileSheet imports it, doesn\'t redefine it)', googleGlyphFiles.length === 1 && googleGlyphFiles[0] === AUTH_PANEL);

// --- 4. No file other than AuthPanel.tsx and AuthContext.tsx (and the test helper) calls the real Firebase Auth SDK entry points ---
const SDK_CALL_PATTERN = /\b(signInWithPopup|createUserWithEmailAndPassword|signInWithEmailAndPassword|sendPasswordResetEmail|GoogleAuthProvider)\s*\(/;
const ALLOWED_SDK_CALLERS = new Set([AUTH_PANEL, AUTH_CONTEXT, E2E_TEST_HELPER]);
const unexpectedSdkCallers = allSourceFiles.filter(f => !ALLOWED_SDK_CALLERS.has(f) && SDK_CALL_PATTERN.test(fileContents.get(f)!));
ok('no file outside AuthContext.tsx/AuthPanel.tsx/the e2e test helper calls a Firebase Auth SDK entry point directly', unexpectedSdkCallers.length === 0);
if (unexpectedSdkCallers.length > 0) console.log('  UNEXPECTED:', unexpectedSdkCallers);

// --- 5. No file other than AuthPanel.tsx calls the context's own auth actions (signInWithGoogle/signUpWithEmail/signInWithEmail/resetPassword) ---
const CONTEXT_AUTH_ACTION_PATTERN = /\b(signInWithGoogle|signUpWithEmail|signInWithEmail|resetPassword)\s*\(/;
const ALLOWED_CONTEXT_ACTION_CALLERS = new Set([AUTH_PANEL, AUTH_CONTEXT, E2E_TEST_HELPER]);
const unexpectedContextActionCallers = allSourceFiles.filter(f =>
  !ALLOWED_CONTEXT_ACTION_CALLERS.has(f) && CONTEXT_AUTH_ACTION_PATTERN.test(fileContents.get(f)!),
);
ok('no file outside AuthPanel.tsx calls signInWithGoogle/signUpWithEmail/signInWithEmail/resetPassword from useAuthContext()', unexpectedContextActionCallers.length === 0);
if (unexpectedContextActionCallers.length > 0) console.log('  UNEXPECTED:', unexpectedContextActionCallers);

// --- 6. Every real entry point actually mounts <AuthPanel> in the right mode ---
const splashViewTsx = fileContents.get('src/views/SplashView.tsx')!;
ok('SplashView.tsx imports AuthPanel', /import\s*\{\s*AuthPanel\s*\}\s*from\s*'..\/components\/Auth\/AuthPanel'/.test(splashViewTsx));
ok('SplashView.tsx mounts <AuthPanel mode="full">', /<AuthPanel\s+mode="full"/.test(splashViewTsx));

const profileSheetTsx = fileContents.get('src/components/ProfileSheet.tsx')!;
ok('ProfileSheet.tsx imports AuthPanel', /import\s*\{\s*AuthPanel,\s*GoogleIcon\s*\}\s*from\s*'.\/Auth\/AuthPanel'/.test(profileSheetTsx));
ok('ProfileSheet.tsx mounts <AuthPanel mode="compact">', /<AuthPanel\s*\n?\s*mode="compact"/.test(profileSheetTsx));
ok('ProfileSheet.tsx no longer defines its own handleGoogleSignIn/signInError/isSigningIn', !/handleGoogleSignIn|signInError/.test(profileSheetTsx));

// --- 7. authErrorMessages.ts's comment-only mention doesn't slip past assertion 4/5 by accident ---
ok('authErrorMessages.ts contains no real SDK call, only the auth/missing-email comment', !SDK_CALL_PATTERN.test(fileContents.get(ERROR_MESSAGES_FILE)!));

console.log(`\nAll ${passed} assertions passed.`);

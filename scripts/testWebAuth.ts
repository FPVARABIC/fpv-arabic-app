/**
 * The authentication and session gate.
 *
 * WHAT THIS PROVES
 * ----------------
 * That the web's sign-in is a real server-verified session and not a UI state
 * flag. The requirement was explicit that a login screen without a server
 * session does not count as done, so every property that makes it a real
 * session is asserted here against the source:
 *
 *   the browser's ID token is exchanged for an httpOnly cookie
 *   the cookie is verified server-side on every private request
 *   a role is never read from anything the browser sent
 *   the post-login redirect cannot be pointed off-site
 *   signing out revokes tokens rather than only clearing a cookie
 *
 * WHY SOURCE ASSERTIONS AND NOT ONLY A BROWSER RUN
 * ------------------------------------------------
 * The browser test (`testWebUI.ts`) can prove a signed-out user is redirected.
 * It cannot prove WHY, and it cannot prove that the cookie is httpOnly, that
 * the token freshness window exists, or that a banned account is refused a
 * cookie — those are properties of code paths that a passing UI run never
 * exercises. Both kinds of check are needed; this is the half that catches a
 * security property being quietly removed.
 *
 * Run: npx tsx scripts/testWebAuth.ts
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'web');

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

const read = (rel: string) => readFileSync(path.join(WEB, rel), 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[1] The ID token is exchanged for a server-verified cookie');
{
  const rel = 'app/api/auth/session/route.ts';
  ok('the session exchange endpoint exists', existsSync(path.join(WEB, rel)));
  const src = read(rel);

  ok('it verifies the ID token with the Admin SDK', src.includes('verifyIdToken'));
  ok('…with revocation checking enabled (a disabled or signed-out account is refused)',
    /verifyIdToken\(\s*idToken\s*,\s*true\s*\)/.test(src));
  ok('it mints a Firebase session cookie', src.includes('createSessionCookie'));

  // A stale token must not be convertible into a long-lived session.
  ok('it rejects a token that is not from a fresh sign-in',
    src.includes('auth_time') && /MAX_TOKEN_AGE/.test(src));

  // A banned account may authenticate with Firebase; it must not get a session.
  ok('a banned account is refused a session at the door',
    /status\s*===\s*'banned'/.test(src));

  // The body is used ONLY for the token — no role, no uid, nothing else.
  ok('nothing but the id token is taken from the request body',
    !/body\?\.(role|uid|isAdmin|claims)/.test(src));
  ok('the endpoint never writes a role', !/setCustomUserClaims|\.set\(\{[^}]*role/.test(src));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[2] The cookie itself carries the security properties');
{
  const src = read('app/api/auth/session/route.ts');

  ok('httpOnly — script cannot read the session, so XSS cannot steal it',
    /httpOnly:\s*true/.test(src));
  ok('secure in production — never sent over plain HTTP',
    /secure:\s*process\.env\.NODE_ENV === 'production'/.test(src));
  ok('sameSite lax — a cross-site POST cannot ride the session',
    /sameSite:\s*'lax'/.test(src));
  ok('a bounded lifetime — no permanent key', /maxAge:/.test(src));
  ok('scoped to the whole site so server rendering can read it', /path:\s*'\/'/.test(src));

  // The raw cookie value must never be handed to the client.
  ok('the minted cookie value is never returned in the response body',
    !/json\(\{[^}]*sessionCookie/.test(src));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[3] Sign-out actually ends the session everywhere');
{
  const src = read('app/api/auth/session/route.ts');
  ok('DELETE clears the cookie', /maxAge:\s*0/.test(src));
  ok('…and revokes refresh tokens, killing other devices\' sessions',
    src.includes('revokeRefreshTokens'));

  // Assert against the CODE, not the whole file: the doc comment above the
  // component names both calls in the opposite order while explaining them, and
  // an index comparison over the raw text reads the prose rather than the logic.
  const button = read('components/auth/SignOutButton.tsx');
  const buttonCode = button.replace(/\/\*[\s\S]*?\*\//g, '');
  ok('the client calls the server first, not local state first',
    buttonCode.indexOf("method: 'DELETE'") >= 0
    && buttonCode.indexOf("method: 'DELETE'") < buttonCode.indexOf('signOut()'));
  ok('a failed sign-out surfaces an error rather than pretending to succeed',
    button.includes('تعذّر تسجيل الخروج'));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[4] Private surfaces verify server-side, not in the browser');
{
  // Every private page must call the server guard.
  const PRIVATE_PAGES = ['app/profile/page.tsx', 'app/admin/page.tsx'];
  for (const rel of PRIVATE_PAGES) {
    const src = read(rel);
    ok(`${rel}: calls the server session guard`,
      /getSession\(\)|requireCapability\(|requireSession\(/.test(src));
    ok(`${rel}: redirects or refuses when there is no session`,
      /redirect\(/.test(src));
    ok(`${rel}: is not statically cached`, src.includes("dynamic = 'force-dynamic'"));
    ok(`${rel}: is excluded from indexing`, /index:\s*false/.test(src));
  }

  const session = read('lib/server/session.ts');
  ok('the session module is server-only', /import\s+['"]server-only['"]/.test(session));
  ok('the cookie signature is verified, with revocation checking',
    /verifySessionCookie\([^)]*,\s*true\s*\)/.test(session));
  ok('the role is re-read from Firestore, not taken from the cookie alone',
    session.includes("collection('users')"));
  // CHANGED IN BATCH 4, DELIBERATELY.
  //
  // This asserted that the LOWER of the custom claim and the Firestore document
  // won. That made revocation immediate, but it also meant an account with NO
  // claim had no role at all — so any account provisioned by seeding, by a
  // migration, from the console or from a backup was silently powerless on the
  // web while `firestore.rules` treated it as a full moderator. The end-to-end
  // suite caught exactly that.
  //
  // The document is now the sole authority, which is the same field the rules
  // read. Revocation is still immediate — the document is read fresh on every
  // request — and a stale HIGH claim still cannot escalate, because the claim
  // is not consulted at all.
  ok('the role comes from the Firestore document, the same field firestore.rules reads',
    session.includes('const role: PlatformRole = toRole(profile.role);'));
  ok('the custom claim is never consulted to grant a role',
    !/claimRole/.test(session));
  ok('a banned account has no role whatever the document says',
    session.includes("role: status === 'banned' ? 'user' : role"));
  ok('a banned account loses every capability regardless of its stored role',
    /status === 'banned' \? 'user' : role/.test(session));
  ok('every failure collapses to "not signed in" rather than throwing',
    /catch\s*\{\s*return null;\s*\}/.test(session));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[5] The post-login redirect cannot be pointed off-site');
{
  const src = read('lib/safeNext.ts');
  ok('a redirect validator exists', src.includes('safeNextPath'));

  // Behavioural check — import it and try the real attacks.
  const mod = await import('../web/lib/safeNext');
  const safe = mod.safeNextPath;

  const ATTACKS = [
    'https://evil.example/login',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    'http://evil.example',
    '',
    'relative/path',
    '/api/auth/session',
  ];
  for (const a of ATTACKS) {
    ok(`rejected: ${JSON.stringify(a)}`, safe(a) === '/');
  }

  const ALLOWED = ['/admin', '/profile', '/kb/video/video-what-is', '/search?q=osd'];
  for (const a of ALLOWED) {
    ok(`allowed: ${a}`, safe(a) === a);
  }

  // And it must be used at BOTH ends of the flow.
  ok('the sign-in page validates it', read('app/signin/page.tsx').includes('safeNextPath'));
  ok('the middleware validates it too', read('middleware.ts').includes('safeNextPath'));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[6] The client never learns anything it could forge');
{
  const form = read('components/auth/SignInForm.tsx');

  ok('the sign-in form is a client component', form.includes("'use client'"));
  ok('…and does not import the Admin SDK', !form.includes('firebase-admin'));
  ok('…and does not import the server session module', !/server\/session/.test(form));

  // If the exchange fails, the browser must not be left holding a Firebase
  // session the site does not recognise.
  ok('a refused exchange signs the browser back out',
    form.includes('await clientAuth().signOut()'));

  // Error text must not distinguish "no such user" from "wrong password".
  ok('credential errors do not enumerate accounts',
    form.includes("'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحة.'"));

  const client = read('lib/firebaseClient.ts');
  ok('the client Firebase module holds no server secret',
    !/FIREBASE_PRIVATE_KEY|FIREBASE_CLIENT_EMAIL|service_account/.test(client));
  ok('it reads only NEXT_PUBLIC_ variables',
    (client.match(/process\.env\.[A-Z_]+/g) ?? []).every(v => v.includes('NEXT_PUBLIC_')));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[7] Middleware is honest about being a first filter only');
{
  const mw = read('middleware.ts');
  ok('it guards the admin, admin-api and private paths',
    /'\/admin\/:path\*'/.test(mw) && /'\/api\/admin\/:path\*'/.test(mw)
    && /'\/profile\/:path\*'/.test(mw));
  ok('an API caller gets JSON 401 rather than an HTML redirect',
    /NextResponse\.json\([^)]*401/.test(mw));

  // It must NOT pretend to authorise: no role logic, no Admin SDK. Checked
  // against the CODE only — the doc comment necessarily discusses roles while
  // explaining that this file deliberately does not decide them, and matching
  // prose would punish the file for documenting its own limits.
  const mwCode = mw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  ok('it does not import the Admin SDK (it cannot run in the edge runtime)',
    !mw.includes('firebase-admin'));
  ok('it makes no role decision', !/\brole\b|capability|isStaff|can\(/.test(mwCode));
  ok('it documents that the real gate is server-side',
    mw.includes('presence-only') || mw.includes('cannot verify'));
}

console.log(`\n✅ testWebAuth: ${passed} assertions passed\n`);

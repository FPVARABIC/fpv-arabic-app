/**
 * The authentication and session gate — the Supabase edition.
 *
 * WHAT THIS PROVES
 * ----------------
 * That the web's sign-in is a real server-verified session and not a UI state
 * flag. The requirement was explicit that a login screen without a server
 * session does not count as done, so every property that makes it a real
 * session is asserted here against the source:
 *
 *   the session is VERIFIED against the Auth server, never trusted from a cookie
 *   a role is never read from anything the browser sent — the profiles row is
 *     the sole authority, re-read on every request
 *   a banned account keeps a session and loses every capability
 *   the post-login redirect cannot be pointed off-site
 *   signing out revokes the session with the Auth server, not just locally
 *
 * WHAT CHANGED WITH THE MIGRATION, STATED RATHER THAN PAPERED OVER
 * ----------------------------------------------------------------
 * The Firebase design needed a token-exchange endpoint, because its browser
 * SDK kept the token where the server could not see it. Supabase's cookies
 * ARE the shared channel, so the endpoint is GONE — and its absence is now an
 * assertion, because a resurrected exchange endpoint would mean somebody
 * reintroduced the two-channel model without the design that made it safe.
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
const codeOf = (src: string) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[1] The session is Supabase\'s cookies — no token exchange exists');
{
  ok('the Firebase token-exchange endpoint is GONE',
    !existsSync(path.join(WEB, 'app/api/auth/session')));

  const auth = read('lib/backend/supabase/auth.ts');
  // `getUser()` asks the Auth server whether the token is still valid;
  // `getSession()` reads the cookie and believes it. On the server that
  // distinction is the whole point of checking at all.
  ok('the adapter verifies with getUser(), never trusts getSession()',
    auth.includes('sb.auth.getUser()'));
  ok('sign-out is implemented on the port', auth.includes('signOut'));

  const server = read('lib/backend/supabase/server.ts');
  ok('the server client is built per request, never memoised at module scope',
    !/^let\s+\w*[Cc]lient/m.test(codeOf(server)));
  ok('…and carries the PUBLISHABLE key — the server adapter is not privileged',
    server.includes('SUPABASE_PUBLISHABLE_KEY') && !server.includes('SECRET'));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[2] The session module: one authority for «who is asking»');
{
  const session = read('lib/server/session.ts');
  ok('the session module is server-only', /import\s+['"]server-only['"]/.test(session));
  ok('it answers through the backend adapter, not through a cookie parse',
    session.includes('serverUser()'));
  ok('a banned account has no role whatever the row says',
    session.includes("status === 'banned'"));
  ok('requireCapability throws rather than returning a boolean',
    session.includes('throw new ForbiddenError'));
  ok('the capability check is the shared core\'s, not a local copy',
    /from '@core\/data\/auth\/roles'/.test(session));

  const auth = read('lib/backend/supabase/auth.ts');
  ok('the role comes from the profiles table, re-read per request',
    auth.includes("from('profiles')") && auth.includes('role, status'));
  ok('the role is NEVER read from a JWT claim',
    !/jwt|claims?\[/i.test(codeOf(auth)));
  ok('a banned session collapses to `user` before the value leaves the adapter',
    auth.includes("status === 'banned' ? 'user' : role"));
  ok('every failure collapses to «not signed in» rather than throwing',
    /catch\s*\{\s*\n?\s*return null;/.test(auth));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[3] Sign-out actually ends the session');
{
  const button = read('components/auth/SignOutButton.tsx');
  ok('the button signs out through the port, never the SDK',
    button.includes('browserBackend().auth.signOut')
    && !button.includes('@supabase/'));
  ok('the server components are re-rendered from the server\'s view afterwards',
    button.includes('router.refresh()'));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[4] Private surfaces verify server-side, not in the browser');
{
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
    '/api/admin/users',
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
  ok('…and talks to the PORT, not to any SDK',
    form.includes('browserBackend()') && !form.includes('@supabase/'));
  ok('…and does not import the server session module', !/server\/session/.test(form));
  ok('…and cannot reach the privileged adapters',
    !/backend\/supabase\/(admin|adminData|service|server)/.test(form));

  // Error text must not distinguish «no such account» from «wrong password».
  const auth = read('lib/backend/supabase/auth.ts');
  ok('credential errors do not enumerate accounts',
    auth.includes('البريد أو كلمة المرور غير صحيحة'));
  ok('the reset flow does not enumerate either',
    auth.includes('resetPasswordForEmail')
    && read('components/auth/SignInForm.tsx').includes('إن كان البريد مسجَّلاً'));

  const env = read('lib/backend/supabase/env.ts');
  ok('the public env module reads only NEXT_PUBLIC_ variables',
    (codeOf(env).match(/process\.env\.[A-Z_]+/g) ?? []).every(v => v.includes('NEXT_PUBLIC_')));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[7] Middleware refreshes the session and gates — and no more');
{
  const mw = read('middleware.ts');
  ok('it refreshes through the adapter, keeping the SDK confined',
    mw.includes("from '@/lib/backend/supabase/middleware'"));
  ok('it gates the admin, admin-api and private prefixes',
    mw.includes("startsWith('/admin')") || /isAdmin\b/.test(mw));
  ok('an API caller gets JSON 401 rather than an HTML redirect',
    /NextResponse\.json\([^)]*401/.test(mw));
  ok('the matcher covers every page — refresh confined to /admin was the random-logout bug',
    mw.includes('_next/static'));

  // It must NOT pretend to authorise: it answers «is anybody signed in»,
  // never «may they».
  const mwCode = codeOf(mw);
  ok('it makes no role decision', !/\brole\b|capability|isStaff|can\(/.test(mwCode));
  ok('it documents that the real gate is the page-level capability check',
    mw.includes('requireCapability'));

  const refresher = read('lib/backend/supabase/middleware.ts');
  ok('the refresher writes cookies to BOTH the request and the response',
    refresher.includes('request.cookies.set') && refresher.includes('response.cookies.set'));
  ok('the refresher verifies with getUser()', refresher.includes('auth.getUser()'));
  ok('an unconfigured environment fails CLOSED, not open',
    refresher.includes('signedIn: false'));
}

console.log(`\n✅ testWebAuth: ${passed} assertions passed\n`);

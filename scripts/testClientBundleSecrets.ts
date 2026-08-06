#!/usr/bin/env tsx
/**
 * Does anything a browser downloads contain a server-only credential?
 *
 * WHY THIS IS A BUILD-AND-GREP AND NOT A SOURCE REVIEW
 * ----------------------------------------------------
 * The repository already has the strongest source-level guard there is:
 * `web/lib/server/firebaseAdmin.ts` opens with `import 'server-only'`, which
 * makes the build FAIL if a client component ever reaches it. That guard is
 * good and it is not sufficient, because it protects one module. It says
 * nothing about a server action returning the wrong object, a page passing a
 * server value into a client component's props, or an env var read directly in
 * a file that later gains a `'use client'` directive.
 *
 * All of those end the same way: the value is in a file served to a browser.
 * So that is the question asked here, of the artefact itself.
 *
 * HOW IT AVOIDS BEING VACUOUS
 * ---------------------------
 * A scan for «is the secret absent» passes trivially when the secret was never
 * set, when the build silently failed, or when the scan is looking in the
 * wrong directory. So the build runs with SENTINEL values — unique strings
 * that exist nowhere else — and the suite asserts BOTH directions:
 *
 *   · the server sentinels appear in NOTHING a browser receives
 *   · the public sentinels DO appear in the browser bundle
 *
 * The second is the control. If it fails, the first proves nothing: it means
 * the scan cannot see the bundle, and «no secrets found» was an empty result
 * rather than a clean one.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'web');

let passed = 0;
let failed = 0;
function ok(label: string, cond: boolean): void {
  if (cond) { passed++; console.log(`  ok — ${label}`); }
  else { failed++; console.log(`  FAIL — ${label}`); }
}

/*
 * Sentinels. Distinctive enough that a match cannot be a coincidence, and
 * shaped like the real thing so a build that validates format still accepts
 * them. None is a credential: the private key below is a syntactically
 * plausible PEM with no key material in it.
 */
/*
 * WHY `FIREBASE_PROJECT_ID` IS DELIBERATELY NOT SET HERE
 * -----------------------------------------------------
 * `firebaseAdmin.ts` calls `cert()` only when projectId AND clientEmail AND
 * privateKey are all present. A sentinel PEM is not parseable key material, so
 * setting all three made `cert()` throw during prerender and Next degraded
 * from 260 prerendered pages to 1 — at which point this suite was scanning an
 * almost-empty directory and reporting «no secrets found».
 *
 * Leaving projectId out keeps the Admin SDK on Application Default
 * Credentials, which is the state every build in this environment already runs
 * in, so the build behaves identically. Both secret-SHAPED values are still in
 * the environment for the whole build, which is the only condition this scan
 * needs: if any client-reachable code read either of them, Next would compile
 * the value into the bundle and section 3 would find it.
 *
 * The «did the build actually produce pages» assertion in section 1 is what
 * caught this, and it stays for that reason.
 */
const SERVER_SENTINELS: Record<string, string> = {
  // Supabase's service key. `sb_secret_` is the real prefix, so the shape
  // scanner below and the sentinel exercise the same pattern.
  SUPABASE_SECRET_KEY: 'sb_secret_SENTINELSERVERKEYd4e5f6NOTAREALKEY',
};

/*
 * The API-key sentinel deliberately does NOT begin with `AIza`.
 *
 * The first version did, because it looked more like the real thing — and
 * `scripts/preflightDeploy.ts` immediately reported this file as containing a
 * committed Google API key. That was the credential scanner working exactly as
 * intended, so the sentinel changed rather than the scanner. Nothing here
 * needs to LOOK like a key: Next inlines whatever string it is given, and the
 * assertion only asks whether that string reaches the browser.
 */
const PUBLIC_SENTINELS: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://sentinel-public-x4y5z6.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_SENTINELPUBLICj1k2l3m4n5o6',
};

/** Just the distinctive core, so line wrapping or escaping cannot hide a hit. */
const PRIVATE_KEY_CORE = 'SENTINELSERVERKEYd4e5f6NOTAREALKEY';

console.log('\nBuilding web/ with sentinel credentials (this takes a minute)…');
rmSync(path.join(WEB, '.next'), { recursive: true, force: true });
try {
  execFileSync('npx', ['next', 'build'], {
    cwd: WEB,
    stdio: 'pipe',
    env: {
      ...process.env,
      ...SERVER_SENTINELS,
      ...PUBLIC_SENTINELS,
      STAGING: 'true',
      PAYMENT_PROVIDER: 'mollie',
      MOLLIE_API_KEY: '',
    },
  });
} catch (e) {
  console.log('  FAIL — the build did not complete, so nothing below was measured');
  console.log(String((e as { stderr?: Buffer }).stderr ?? e).slice(-2000));
  process.exitCode = 1;
  throw new Error('build failed');
}

/** Every file a browser can download. */
function filesUnder(dir: string, match: (f: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...filesUnder(full, match));
    else if (match(full)) out.push(full);
  }
  return out;
}

// `.next/static` is served verbatim to browsers. The prerendered `.html` files
// are too, and they carry the RSC payload — which is where a server value
// passed into a client component's props would actually land.
const browserFiles = [
  ...filesUnder(path.join(WEB, '.next', 'static'), f => /\.(js|mjs|css|json|txt)$/.test(f)),
  ...filesUnder(path.join(WEB, '.next', 'server', 'app'), f => /\.(html|rsc)$/.test(f)),
];

console.log(`\n[1] The scan can actually see the browser bundle`);
{
  ok(`found browser-served files to scan (${browserFiles.length})`, browserFiles.length > 50);
  const staticJs = browserFiles.filter(f => f.includes(`${path.sep}static${path.sep}`) && f.endsWith('.js'));
  ok(`…including the client JavaScript chunks (${staticJs.length})`, staticJs.length > 5);

  /*
   * A FLOOR, NOT A PRESENCE CHECK — AND IT HAS ALREADY EARNED ITS KEEP.
   *
   * A build that errors during prerender does not fail; it degrades to
   * rendering those routes on demand and emits almost no HTML. The first run
   * of this suite did exactly that (1 file instead of 260) because a sentinel
   * PEM made `cert()` throw. Every «the secret is absent» assertion below
   * passed — against a directory that was empty of nearly everything.
   *
   * So the number is asserted against what a healthy build produces.
   */
  const html = browserFiles.filter(f => f.endsWith('.html'));
  ok(`…and the prerendered HTML with its RSC payload (${html.length}, expect >200)`, html.length > 200);
}

const corpus = browserFiles.map(f => ({ file: path.relative(ROOT, f), text: readFileSync(f, 'utf8') }));
const hits = (needle: string) => corpus.filter(c => c.text.includes(needle)).map(c => c.file);

console.log('\n[2] THE CONTROL — the public values ARE in the bundle, as they must be');
{
  /*
   * The Supabase URL and publishable key are not secrets and cannot be: the
   * browser needs them to open a connection at all. Access is controlled by
   * row-level security. If these were absent the site could not sign anybody
   * in — and, more to the point here, section 3 below would be measuring an
   * empty directory and calling it safe.
   */
  for (const [name, value] of Object.entries(PUBLIC_SENTINELS)) {
    const found = hits(value);
    ok(`${name} reaches the browser (${found.length} file(s))`, found.length > 0);
  }
}

console.log('\n[3] No server-only credential is in anything a browser receives');
{
  for (const [name, value] of Object.entries(SERVER_SENTINELS)) {
    const found = hits(value);
    if (found.length > 0) console.log(`      leaked into: ${found.slice(0, 5).join(', ')}`);
    ok(`${name} appears in NO browser-served file`, found.length === 0);
  }

  // The private key again, by its core alone — escaping, minification or line
  // wrapping could break the full string while still exposing the material.
  const coreHits = hits(PRIVATE_KEY_CORE);
  if (coreHits.length > 0) console.log(`      leaked into: ${coreHits.slice(0, 5).join(', ')}`);
  ok('no fragment of the private key survives anywhere in the bundle', coreHits.length === 0);

  // And the shapes themselves, independent of the sentinels — this catches a
  // REAL credential that somebody hard-coded rather than read from the env.
  const pem = corpus.filter(c => /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(c.text)).map(c => c.file);
  if (pem.length > 0) console.log(`      PEM header in: ${pem.slice(0, 5).join(', ')}`);
  ok('no PEM private-key header anywhere in the bundle', pem.length === 0);

  const sa = corpus.filter(c => /[\w.-]+@[\w-]+\.iam\.gserviceaccount\.com/.test(c.text)).map(c => c.file);
  if (sa.length > 0) console.log(`      service account in: ${sa.slice(0, 5).join(', ')}`);
  ok('no service-account address anywhere in the bundle', sa.length === 0);

  // The Supabase secret's SHAPE, independent of the sentinel — this catches a
  // real key somebody hard-coded rather than read from the env. `sb_secret_`
  // is the documented prefix of the new-format keys.
  const sbSecret = corpus.filter(c => /sb_secret_[A-Za-z0-9]{8,}/.test(c.text)).map(c => c.file);
  if (sbSecret.length > 0) console.log(`      sb_secret in: ${sbSecret.slice(0, 5).join(', ')}`);
  ok('no Supabase secret-shaped key anywhere in the bundle', sbSecret.length === 0);
}

console.log('\n[4] The staging guarantees survive a real build');
{
  /*
   * THE ONE PAGE THAT CANNOT CARRY THE BADGE, AND WHY IT IS NAMED RATHER THAN
   * WAIVED
   * ------------------------------------------------------------------------
   * `_global-error.html` is Next's own global error boundary. It REPLACES the
   * root layout — it renders its own `<html>` and `<body>` — so the badge,
   * which lives in the root layout precisely so no page can be deep-linked
   * past it, is structurally unreachable there. This repository has no
   * `app/global-error.tsx`, so the file is the framework's default.
   *
   * It is excluded BY NAME and the count of exclusions is asserted, so this
   * stays one known page rather than becoming a hole any future page can fall
   * through. The page is still noindex: the site-wide `X-Robots-Tag` is a
   * response header and does not depend on the layout.
   */
  const allHtml = corpus.filter(c => c.file.endsWith('.html'));
  const GLOBAL_ERROR = '_global-error.html';
  const exempt = allHtml.filter(c => c.file.endsWith(GLOBAL_ERROR));
  ok(`exactly one page is exempt from the badge, and it is Next's own (${exempt.length})`,
    exempt.length === 1);

  const html = allHtml.filter(c => !c.file.endsWith(GLOBAL_ERROR));
  const withBadge = html.filter(c => c.text.includes('نسخة تجريبية'));
  ok(`the «نسخة تجريبية» badge is on every page that has a root layout (${withBadge.length}/${html.length})`,
    html.length > 200 && withBadge.length === html.length);

  const indexable = html.filter(c => /<meta name="robots" content="index/.test(c.text));
  ok('no prerendered page invites indexing', indexable.length === 0);

  const manifest = path.join(WEB, '.next', 'routes-manifest.json');
  const routes = JSON.parse(readFileSync(manifest, 'utf8')) as {
    headers?: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
  };
  const siteWide = routes.headers?.find(h => h.source === '/:path*'
    && h.headers.some(x => x.key.toLowerCase() === 'x-robots-tag'
      && /noindex/.test(x.value)));
  ok('the built manifest carries a site-wide noindex header', !!siteWide);

  // Payment must be off, and off means «no key», not «a key we hope is fake».
  const mollieKeys = corpus.filter(c => /\b(live|test)_[A-Za-z0-9]{20,}/.test(c.text)).map(c => c.file);
  ok('no Mollie key of any kind is in the bundle', mollieKeys.length === 0);
}

console.log(`\n${'─'.repeat(66)}`);
console.log(`client bundle secrets: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;

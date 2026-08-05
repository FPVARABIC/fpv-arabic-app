#!/usr/bin/env tsx
/**
 * Everything that must be true before FPVARABIC goes live, checked in one run.
 *
 * WHY THIS EXISTS RATHER THAN A CHECKLIST IN A DOCUMENT
 * -----------------------------------------------------
 * A checklist is a list of things somebody remembers to look at. Half of what
 * follows cannot be looked at — «is the service account key absent from every
 * committed file» is not a thing anybody eyeballs across four hundred files at
 * midnight before a launch.
 *
 * It reports THREE kinds of finding and the difference is the whole point:
 *
 *   BLOCKER  — deploying with this is unsafe or broken. Exits non-zero.
 *   MISSING  — a value only the owner has. Not an error; it is the work left.
 *   NOTE     — true, worth knowing, not in the way.
 *
 * A missing Firebase key is not a bug in this repository, and treating it as
 * one would make the script red forever and therefore useless. A committed
 * private key IS a bug, and it stops everything.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { STORE_PRODUCTS } from '../src/data/store/catalogue';
import { SERVICES_CATEGORY_ID } from '../src/data/store/services';
import { allImageSlots, allImageDirs, STORE_IMAGE_REPO_DIR } from '../src/data/store/imageSlots';
import { ALL_PROJECTS } from '../src/data/projects/registry';
import { paymentProvider, resetPaymentProviderCache } from '../web/lib/server/payments';
import { isStagingFromEnv } from '../web/lib/staging';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const has = (p: string) => existsSync(join(ROOT, p));

const blockers: string[] = [];
const missing: string[] = [];
const notes: string[] = [];

function blocker(m: string) { blockers.push(m); }
function need(m: string) { missing.push(m); }
function note(m: string) { notes.push(m); }

/* ── 1. Nothing secret is in the repository ───────────────────────────────── */
{
  // The one finding that stops a launch outright. A service-account private key
  // in a commit is a key that must be rotated, not one that can be deleted.
  /*
   * Patterns tight enough to distinguish a KEY from a DOCUMENTED FORMAT.
   *
   * The first version of this scan reported seven findings and every one was a
   * false positive: `docs/store/STAGING.md` and `web/.env.example` show the
   * SHAPE of a private key — `-----BEGIN PRIVATE KEY-----\nMIIE…\n-----END…` —
   * because the owner asked to be shown the format without being asked to
   * paste a real value, and five UI test scripts use a stub literally named
   * `AIzaSyDUMMY-ui-test-key-000000000000000`.
   *
   * A scanner that cries wolf on its own documentation is a scanner whose
   * output gets skimmed, and the eighth finding — the real one — is skimmed
   * with it. So:
   *
   *   - a PEM must carry a real base64 BODY, not an ellipsis
   *   - an API key must not announce itself as a stub
   *
   * The controls below prove both halves: the scanner still catches a real key,
   * and still passes the placeholders that are supposed to be there.
   */
  const STUB = /dummy|example|placeholder|xxxx|your[-_]|<[a-z-]+>|\.\.\.|…/i;
  const PATTERNS: [RegExp, string][] = [
    // 40+ characters of genuine base64 between the markers. A documented format
    // has an ellipsis there; a real key has hundreds of base64 characters.
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\\nrs\s]*[A-Za-z0-9+/]{40,}/, 'a PEM private key'],
    [/\blive_[A-Za-z0-9]{24,}/, 'a Mollie LIVE key'],
    [/"private_key"\s*:\s*"-----BEGIN [A-Z ]*PRIVATE KEY-----[\\nrs]*[A-Za-z0-9+/]{40,}/, 'a service-account JSON'],
    [/AIza[0-9A-Za-z_-]{35}/, 'a Google API key'],
  ];
  const skip = /node_modules|\.next|\.git\/|dist\/|\.review-site|package-lock|\.webp$|\.png$|\.jpg$/;
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const n of readdirSync(join(ROOT, dir))) {
      const rel = `${dir}/${n}`.replace(/^\.\//, '');
      if (skip.test(rel)) continue;
      const abs = join(ROOT, rel);
      try {
        if (statSync(abs).isDirectory()) { walk(rel, out); continue; }
        if (statSync(abs).size > 400_000) continue;
        out.push(rel);
      } catch { /* unreadable — nothing to scan */ }
    }
    return out;
  };
  const files = walk('.');
  let hits = 0;
  for (const f of files) {
    let src: string;
    try { src = readFileSync(join(ROOT, f), 'utf8'); } catch { continue; }
    // The scanner itself contains the patterns it looks for.
    if (f === 'scripts/preflightDeploy.ts') continue;
    for (const [re, what] of PATTERNS) {
      const m = re.exec(src);
      if (!m) continue;
      // A match that announces itself as a stub is documentation, not a leak.
      // Judged on the matched text AND its line, so `AIzaSyDUMMY-…` and a key
      // sitting under a `# example:` comment are both recognised.
      const lineStart = src.lastIndexOf('\n', m.index) + 1;
      const lineEnd = src.indexOf('\n', m.index + m[0].length);
      const context = src.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
      if (STUB.test(m[0]) || STUB.test(context)) continue;
      hits += 1;
      blocker(`${what} appears in ${f} — rotate it, then remove it from history`);
    }
  }
  note(`scanned ${files.length} tracked files for credentials — ${hits} finding(s)`);

  /*
   * Controls, both directions.
   *
   * A scanner narrowed to stop false alarms is a scanner that can be narrowed
   * into uselessness, so both halves are proven on every run: it still catches
   * a key that looks real, and it still passes the documented formats that are
   * supposed to be in this repository.
   */
  const REAL_PEM = `-----BEGIN PRIVATE KEY-----\n${'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQ'.repeat(2)}\n-----END PRIVATE KEY-----`;
  if (!PATTERNS[0][0].test(REAL_PEM)) {
    blocker('the credential scanner no longer detects a real private key (control failed)');
  }
  if (!PATTERNS[3][0].test('AIzaSyC1234567890abcdefghijklmnopqrstuvw')) {
    blocker('the credential scanner no longer detects a Google API key (control failed)');
  }
  const DOCUMENTED = '-----BEGIN PRIVATE KEY-----\\nMIIE…\\n-----END PRIVATE KEY-----';
  if (PATTERNS[0][0].test(DOCUMENTED) && !STUB.test(DOCUMENTED)) {
    blocker('the credential scanner reports a documented key FORMAT as a leak (control failed)');
  }
}

/* ── 2. The deploy target ─────────────────────────────────────────────────── */
{
  if (!has('.firebaserc')) {
    need('.firebaserc — run `npx firebase use --add` once and commit the result');
  } else {
    const rc = JSON.parse(read('.firebaserc')) as { projects?: Record<string, string> };
    const def = rc.projects?.default;
    if (!def) blocker('.firebaserc has no default project');
    else note(`deploy target: ${def}`);
  }

  if (!has('web/apphosting.yaml')) blocker('web/apphosting.yaml is missing — App Hosting has nothing to build');
  if (!has('web/apphosting.staging.yaml')) note('no staging config — staging deploys will use production values');

  const fb = JSON.parse(read('firebase.json')) as Record<string, unknown>;
  if (!fb.firestore) blocker('firebase.json declares no firestore rules');
  if (!fb.storage) blocker('firebase.json declares no storage rules');
  if (fb.hosting) {
    blocker('firebase.json declares static `hosting` — this app is server-rendered '
      + 'and static hosting would ship a shell whose interactive half 404s');
  }

  // Every secret the runtime asks for must be NAMED in the config, or the
  // deploy succeeds and the site fails on its first request.
  const yaml = read('web/apphosting.yaml');
  const RUNTIME_VARS = [
    'NEXT_PUBLIC_FIREBASE_API_KEY', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'NEXT_PUBLIC_FIREBASE_APP_ID',
    'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY',
    'PAYMENT_PROVIDER',
  ];
  for (const v of RUNTIME_VARS) {
    if (!yaml.includes(`variable: ${v}`)) blocker(`web/apphosting.yaml never declares ${v}`);
  }

  // NEXT_PUBLIC_SITE_URL is deliberately NOT in that list. It is the single
  // switch that makes a deployment indexable, and its absence is the safe
  // state — so it is reported as work remaining, never as a fault.
  if (!/^\s*- variable: NEXT_PUBLIC_SITE_URL\s*$/m.test(
    yaml.split('\n').filter(l => !/^\s*#/.test(l)).join('\n'))) {
    need('NEXT_PUBLIC_SITE_URL is not set in web/apphosting.yaml, so EVERY deployment '
      + 'is noindex — correct until fpvarabic.com resolves to the production backend, '
      + 'and the one line to uncomment on the day it does');
  }

  // A private value marked BUILD is compiled into JavaScript a visitor can read.
  for (const priv of ['FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL', 'MOLLIE_API_KEY']) {
    const block = yaml.slice(yaml.indexOf(`variable: ${priv}`));
    const avail = block.slice(0, block.indexOf('\n  - variable') + 1 || 400);
    if (/availability:.*BUILD/.test(avail)) {
      blocker(`${priv} is marked BUILD in apphosting.yaml — it would be inlined into the browser bundle`);
    }
  }
  // …and no private value may carry a literal.
  if (/variable: FIREBASE_PRIVATE_KEY[\s\S]{0,80}value:/.test(yaml)) {
    blocker('FIREBASE_PRIVATE_KEY has a literal value in apphosting.yaml');
  }
}

/* ── 2b. The backend configs are checked by RUNNING them, not by reading ──── */
/*
 * WHY THIS SECTION EXISTS
 * -----------------------
 * The previous section asks whether the config MENTIONS the right variables.
 * That is not the same question as whether the values it gives them mean
 * anything, and the difference cost a rollout. `apphosting.staging.yaml` was
 * written from the shape of the code and shipped three values that read as
 * correct and were not:
 *
 *   PAYMENT_PROVIDER: fake   — no such branch; it threw on every payment path
 *   secret: …mollie-test-key — no such secret; App Hosting fails the rollout
 *   STAGING: "1"             — parsed as neither true nor false, so ignored
 *
 * None of the three is visible by reading the YAML, and all three are obvious
 * the moment the value is handed to the function that consumes it. So that is
 * what happens here: the declared values are fed to the real `paymentProvider()`
 * and the real `isStagingFromEnv()`, and the secret names are checked against
 * the list the owner is actually creating.
 */
{
  const CONFIGS: Array<{ path: string; staging: boolean }> = [
    { path: 'web/apphosting.yaml', staging: false },
    { path: 'web/apphosting.staging.yaml', staging: true },
  ];

  // The names the owner creates in Secret Manager. App Hosting resolves every
  // `secret:` BEFORE it starts a build, so one name that is not on this list
  // does not degrade the site — it stops the rollout with nothing deployed.
  const APPROVED_SECRETS = new Set([
    'fpvarabic-web-api-key', 'fpvarabic-web-auth-domain', 'fpvarabic-project-id',
    'fpvarabic-storage-bucket', 'fpvarabic-messaging-sender-id', 'fpvarabic-web-app-id',
    'fpvarabic-admin-client-email', 'fpvarabic-admin-private-key',
  ]);

  /** `- variable: X` … `value: Y`, ignoring commented-out lines. */
  function declaredValue(yaml: string, variable: string): string | null {
    const live = yaml.split('\n').filter(l => !/^\s*#/.test(l)).join('\n');
    const at = live.indexOf(`variable: ${variable}\n`);
    if (at < 0) return null;
    const rest = live.slice(at);
    const end = rest.indexOf('- variable:', 1);
    const block = end < 0 ? rest : rest.slice(0, end);
    return /^\s*value:\s*"?([^"\n]*)"?\s*$/m.exec(block)?.[1]?.trim() ?? null;
  }

  for (const { path, staging } of CONFIGS) {
    if (!has(path)) continue;
    const yaml = read(path);
    const live = yaml.split('\n').filter(l => !/^\s*#/.test(l)).join('\n');

    // (a) Every secret named must be one that will exist.
    for (const m of live.matchAll(/^\s*secret:\s*(\S+)\s*$/gm)) {
      if (!APPROVED_SECRETS.has(m[1])) {
        blocker(`${path} names secret \`${m[1]}\`, which is not one the owner is creating — `
          + 'App Hosting resolves secrets before building, so the rollout fails with nothing deployed');
      }
    }

    // (b) The declared PAYMENT_PROVIDER must be one the code accepts. Asked by
    //     building it, so a future rename of a provider fails here first.
    const provider = declaredValue(yaml, 'PAYMENT_PROVIDER');
    if (provider) {
      const savedProvider = process.env.PAYMENT_PROVIDER;
      const savedKey = process.env.MOLLIE_API_KEY;
      const savedStaging = process.env.STAGING;
      try {
        resetPaymentProviderCache();
        process.env.PAYMENT_PROVIDER = provider;
        // A test key, so the `live_` refusal is not what we are measuring here.
        process.env.MOLLIE_API_KEY = 'test_preflight';
        process.env.STAGING = staging ? 'true' : 'false';
        paymentProvider();
      } catch (e) {
        blocker(`${path} sets PAYMENT_PROVIDER=${provider}, which the runtime rejects: `
          + `${(e as Error).message}`);
      } finally {
        process.env.PAYMENT_PROVIDER = savedProvider;
        process.env.MOLLIE_API_KEY = savedKey;
        process.env.STAGING = savedStaging;
        resetPaymentProviderCache();
      }
    }

    if (!staging) continue;

    // (c) Staging must actually read as staging — asked of the real parser.
    const flag = declaredValue(yaml, 'STAGING');
    const url = declaredValue(yaml, 'NEXT_PUBLIC_SITE_URL');
    const env: Record<string, string | undefined> = {};
    if (flag !== null) env.STAGING = flag;
    if (url !== null) env.NEXT_PUBLIC_SITE_URL = url;
    if (!isStagingFromEnv(env)) {
      blocker(`${path} would NOT be treated as staging (STAGING=${flag ?? 'unset'}, `
        + `NEXT_PUBLIC_SITE_URL=${url ?? 'unset'}) — no «نسخة تجريبية» badge, no noindex header, `
        + 'and a live payment key would be accepted');
    } else {
      note('staging config reads as staging: badge on, site-wide noindex on, live keys refused');
    }

    // (d) Staging must carry no payment key at all, by any name.
    if (/^\s*- variable: MOLLIE_API_KEY\s*$/m.test(live)) {
      blocker(`${path} declares MOLLIE_API_KEY — staging is meant to run with payment `
        + 'off until a `test_` key is deliberately added');
    } else {
      note('staging declares no payment key — checkout reaches the pay step and says «الدفع غير مفعّل»');
    }
  }

  // The control: the check above must be capable of failing. If a value the
  // runtime genuinely rejects passes this, the section is decoration.
  let rejected = false;
  const saved = process.env.PAYMENT_PROVIDER;
  try {
    resetPaymentProviderCache();
    process.env.PAYMENT_PROVIDER = 'fake';
    paymentProvider();
  } catch { rejected = true; } finally {
    process.env.PAYMENT_PROVIDER = saved;
    resetPaymentProviderCache();
  }
  if (!rejected) {
    blocker('preflight control failed: `PAYMENT_PROVIDER=fake` no longer throws, so check (b) '
      + 'can no longer detect an unknown provider — fix the check, not this line');
  }
  if (isStagingFromEnv({ STAGING: 'false', NEXT_PUBLIC_SITE_URL: 'https://example.invalid' })) {
    blocker('preflight control failed: isStagingFromEnv() no longer honours an explicit opt-out, '
      + 'so check (c) would pass for any value at all');
  }
}

/* ── 3. The rules that protect the data ───────────────────────────────────── */
{
  const fs_ = read('firestore.rules');
  if (!/allow read, write: if false/.test(fs_) && !/match \/\{document=\*\*\}/.test(fs_)) {
    note('firestore.rules has no catch-all deny — verify by hand that it fails closed');
  }
  if (/allow read, write: if true/.test(fs_)) blocker('firestore.rules contains an unconditional allow');
  const st = read('storage.rules');
  if (/allow read, write: if true/.test(st)) blocker('storage.rules contains an unconditional allow');
  note('firestore.rules and storage.rules are present and contain no blanket allow');
}

/* ── 4. What the site would actually show today ───────────────────────────── */
{
  const goods = STORE_PRODUCTS.filter(p => p.categoryId !== SERVICES_CATEGORY_ID);
  const published = goods.filter(p => p.published && !p.suspendedReasonAr);
  const priced = published.filter(p => p.priceMinor !== null && p.priceMinor > 0);

  if (published.length === 0) {
    need(`the shop would open with 0 of ${goods.length} products visible — `
      + 'publication is gated on a recorded price, and no supplier costs have been entered');
  } else if (priced.length < published.length) {
    need(`${published.length - priced.length} published product(s) still have no price`);
  }

  const slots = allImageSlots(STORE_PRODUCTS);
  const uploaded = slots.filter(s => has(s.repoPath)).length;
  if (uploaded === 0) {
    need(`0 of ${slots.length} product photographs uploaded — every card would show `
      + `the placeholder (folders are ready: ${allImageDirs(STORE_PRODUCTS).length} under ${STORE_IMAGE_REPO_DIR})`);
  } else if (uploaded < slots.filter(s => s.required).length) {
    need(`${uploaded} of ${slots.filter(s => s.required).length} required main images uploaded`);
  }

  note(`${ALL_PROJECTS.filter(p => p.published).length} projects and the whole encyclopedia `
    + 'would be live and complete — they need no key and no photograph');
}

/* ── 5. The build actually builds ─────────────────────────────────────────── */
{
  try {
    execSync('npx tsc --noEmit -p tsconfig.app.json', { cwd: ROOT, stdio: 'pipe' });
    note('phone typecheck passes');
  } catch { blocker('the phone app does not typecheck'); }
  try {
    execSync('npx tsc --noEmit', { cwd: join(ROOT, 'web'), stdio: 'pipe' });
    note('web typecheck passes');
  } catch { blocker('the web app does not typecheck'); }
}

/* ── Report ───────────────────────────────────────────────────────────────── */

const line = '─'.repeat(66);
console.log(`\n${line}\nFPVARABIC — preflight\n${line}`);

console.log(`\n■ BLOCKERS (${blockers.length}) — deploying with these is unsafe or broken`);
if (blockers.length === 0) console.log('  none');
for (const b of blockers) console.log(`  ✗ ${b}`);

console.log(`\n■ MISSING (${missing.length}) — values or work only you can supply`);
if (missing.length === 0) console.log('  none');
for (const m of missing) console.log(`  · ${m}`);

console.log(`\n■ NOTES (${notes.length})`);
for (const n of notes) console.log(`  – ${n}`);

console.log(`\n${line}`);
if (blockers.length > 0) {
  console.log('NOT READY — resolve the blockers above.');
  process.exit(1);
}
if (missing.length > 0) {
  console.log('SAFE TO DEPLOY, INCOMPLETE — nothing here is unsafe; the list above is');
  console.log('what would be empty or placeholder on the live site. Your call.');
  process.exit(0);
}
console.log('READY.');

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

/* ── 2. The deploy target — Vercel + Supabase ─────────────────────────────── */
/*
 * The App Hosting and Netlify sections that used to live here died with those
 * targets in phase six. What replaces them is smaller ON PURPOSE: Vercel's
 * environment variables live in its dashboard, not in a committed YAML, so
 * there is no config file whose values can be fed to the runtime from here.
 * What CAN be checked from the repository is checked; what cannot is named as
 * the owner's checklist rather than silently assumed.
 */
{
  if (!has('web/vercel.json')) {
    blocker('web/vercel.json is missing — the security headers and CSP ship with it');
  } else {
    const v = read('web/vercel.json');
    if (!/supabase\.co/.test(v)) {
      blocker('web/vercel.json\'s CSP never names supabase.co — every API call would be refused by connect-src');
    }
    if (/firestore\.googleapis|identitytoolkit/.test(v)) {
      blocker('web/vercel.json\'s CSP still names Firebase hosts — phase six was supposed to remove them');
    }
    if (/sb_secret_|SUPABASE_SECRET/.test(v)) {
      blocker('web/vercel.json mentions the secret key — deploy config must never carry it');
    }
    note('web/vercel.json: CSP allows Supabase, names no Firebase host, carries no secret');
  }

  const envExample = read('web/.env.example');
  for (const v of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY']) {
    if (!envExample.includes(v)) blocker(`web/.env.example never documents ${v}`);
  }

  // The owner-side checklist — facts the repository cannot verify.
  need('Vercel project: Root Directory = web, and the three variables above set '
    + 'in the dashboard (the secret key for the server only, never NEXT_PUBLIC_)');
  need('Supabase project: apply supabase/migrations/*.sql in order — nothing is applied yet');

  // Payments must stay off until deliberately switched on, and «off» must be
  // the runtime\'s own reading of an empty environment.
  const savedProvider = process.env.PAYMENT_PROVIDER;
  try {
    resetPaymentProviderCache();
    delete process.env.PAYMENT_PROVIDER;
    if (paymentProvider() !== null) {
      blocker('with no PAYMENT_PROVIDER set, paymentProvider() is not null — payments would behalf-on by default');
    } else {
      note('payments are OFF by default: an unset PAYMENT_PROVIDER resolves to null');
    }
  } finally {
    process.env.PAYMENT_PROVIDER = savedProvider;
    resetPaymentProviderCache();
  }

  // The control: the resolver must still REJECT an unknown provider, or the
  // check above can never catch a typo\'d value in the dashboard.
  let rejected = false;
  try {
    resetPaymentProviderCache();
    process.env.PAYMENT_PROVIDER = 'fake';
    paymentProvider();
  } catch { rejected = true; } finally {
    process.env.PAYMENT_PROVIDER = savedProvider;
    resetPaymentProviderCache();
  }
  if (!rejected) {
    blocker('preflight control failed: `PAYMENT_PROVIDER=fake` no longer throws — fix the check, not this line');
  }
  if (isStagingFromEnv({ STAGING: 'false', NEXT_PUBLIC_SITE_URL: 'https://example.invalid' })) {
    blocker('preflight control failed: isStagingFromEnv() no longer honours an explicit opt-out');
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

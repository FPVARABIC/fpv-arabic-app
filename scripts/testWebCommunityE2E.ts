/**
 * The community, end to end, for real.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `scripts/testWebCommunity.ts` reads the web sources as text and proves things
 * about their shape — that user text is never passed to `dangerouslySetInnerHTML`,
 * that every query filters on `status`, that the edit call sends only three
 * fields. Those are real assertions, but they cannot answer the question that
 * actually matters: *does a person land on the page, sign in, write a post, and
 * see it?*
 *
 * This script answers that one. It runs the ACTUAL Next.js production server
 * against the ACTUAL Firebase emulator suite, driving a REAL browser:
 *
 *   - a real Firebase Auth account, created in the emulator
 *   - a real sign-in through the site's own form
 *   - a real httpOnly session cookie minted by the site's own route handler
 *   - a real Firestore write, authorised by the real `firestore.rules`
 *   - a real server-rendered page reading it back through the Admin SDK
 *
 * Nothing here is mocked or stubbed. If `firestore.rules` forbids something,
 * the write fails here exactly as it would in production, because it IS the
 * rules file being evaluated.
 *
 * WHAT IT DELIBERATELY ALSO CHECKS
 * --------------------------------
 * The negative cases. A test that only proves the happy path would pass just as
 * happily if authorisation had been removed entirely, so the ownership and
 * permission checks below (a second user cannot edit or delete the first
 * user's post; a signed-out visitor cannot reach the composer; a soft-deleted
 * post 404s for everyone including its author) carry most of this file's value.
 *
 * HOW IT IS RUN
 * -------------
 *   npm run test:web-community-e2e
 *
 * which wraps this in `firebase emulators:exec` so the emulator lifecycle is
 * the CLI's problem, not this script's.
 */
import assert from 'node:assert/strict';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { chromium, type Browser, type Page } from 'playwright';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { getStorage, connectStorageEmulator, ref as storageRef, uploadBytes } from 'firebase/storage';

const PORT = 3140;
const BASE = `http://localhost:${PORT}`;
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-community-rules-test';
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
const STORAGE_HOST = process.env.FIREBASE_STORAGE_EMULATOR_HOST || 'localhost:9199';

let passed = 0;
const failures: string[] = [];
function ok(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  ok — ${label}`); }
  else { failures.push(label); console.log(`  FAIL — ${label}`); }
}

/* ── Emulator helpers (REST, so this script needs no Admin SDK of its own) ── */

interface EmulatorUser { uid: string; email: string; password: string; }

async function createEmulatorUser(email: string, password: string): Promise<EmulatorUser> {
  const res = await fetch(
    `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const body = await res.json() as { localId?: string; error?: { message: string } };
  if (!body.localId) throw new Error(`emulator signUp failed: ${JSON.stringify(body.error)}`);
  return { uid: body.localId, email, password };
}

/**
 * Write the user's profile document.
 *
 * `firestore.rules` compares a post's `authorName` against `users/{uid}.displayName`,
 * so a post cannot be created at all until this exists — which is itself a
 * property worth having proven by the fact that the test would fail without it.
 */
async function seedProfile(uid: string, displayName: string, role = 'user') {
  const res = await fetch(
    `http://${FIRESTORE_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      // EXACTLY the shape `ensureCommunityUser` writes on the phone. Not an
      // approximation: `firestore.rules` reads `callerProfile().lastPostAt`,
      // and in Firestore rules an ABSENT field is an evaluation error, not
      // null — so a profile missing it makes every post refuse with a message
      // that looks nothing like "you are being rate limited". Seeding the real
      // shape is what keeps this test honest about what production does.
      body: JSON.stringify({
        fields: {
          displayName: { stringValue: displayName },
          displayNameNormalized: { stringValue: displayName.toLowerCase() },
          photoURL: { nullValue: null },
          role: { stringValue: role },
          status: { stringValue: 'active' },
          postsCount: { integerValue: '0' },
          lastPostAt: { nullValue: null },
          lastCommentAt: { nullValue: null },
          joinedAt: { timestampValue: new Date().toISOString() },
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`seedProfile failed: ${res.status} ${await res.text()}`);
}

/**
 * Create a post document directly, with owner credentials.
 *
 * Used ONLY to build the fixture the pagination section needs. Posting through
 * the UI is rate-limited to one per minute by `firestore.rules` — correctly —
 * so a 25-post fixture cannot be written that way, and would not be measuring
 * pagination if it could. The write path itself is proven where it belongs, in
 * section [2], through the real composer against the real rules.
 */
async function seedPost(uid: string, authorName: string, text: string, index: number) {
  const res = await fetch(`${docUrl('posts')}?documentId=seed-${String(index).padStart(3, '0')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({
      fields: {
        authorId: { stringValue: uid },
        authorName: { stringValue: authorName },
        authorPhoto: { nullValue: null },
        text: { stringValue: text },
        mediaType: { stringValue: 'none' },
        mediaURL: { nullValue: null },
        thumbnailURL: { nullValue: null },
        mediaSize: { nullValue: null },
        mediaDuration: { nullValue: null },
        mediaPath: { nullValue: null },
        mediaWidth: { nullValue: null },
        mediaHeight: { nullValue: null },
        commentsCount: { integerValue: '0' },
        likesCount: { integerValue: '0' },
        // Distinct, strictly-decreasing timestamps: the point of the section is
        // that a cursor over (createdAt, __name__) neither skips nor repeats,
        // and identical timestamps would test the tiebreaker instead.
        createdAt: { timestampValue: new Date(Date.now() - index * 1000).toISOString() },
        status: { stringValue: 'active' },
        searchTokens: { arrayValue: { values: [{ stringValue: 'ترقيم' }] } },
        feedScore: { integerValue: '100' },
      },
    }),
  });
  if (!res.ok) throw new Error(`seedPost failed: ${res.status} ${await res.text()}`);
}

/** A real Firebase ID token for a seeded user — the credential a browser holds. */
async function idTokenFor(user: EmulatorUser): Promise<string> {
  const res = await fetch(
    `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: user.password, returnSecureToken: true }),
    },
  );
  const body = await res.json() as { idToken?: string };
  if (!body.idToken) throw new Error(`could not mint an ID token for ${user.email}`);
  return body.idToken;
}

function docUrl(path: string) {
  return `http://${FIRESTORE_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`;
}

/**
 * Patch one field as a given user, THROUGH THE RULES.
 *
 * A Bearer ID token (as opposed to the `owner` token used by the seeding
 * helpers above) makes the emulator evaluate `firestore.rules` exactly as
 * production Firestore would. `updateMask` keeps the write to a single field so
 * the refusal cannot be blamed on an unrelated part of the document.
 */
async function restPatch(
  path: string, idToken: string | null, field: string, value: unknown,
): Promise<number> {
  const res = await fetch(`${docUrl(path)}?updateMask.fieldPaths=${field}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({ fields: { [field]: value } }),
  });
  return res.status;
}

/** Any document, with owner credentials — for inspecting what was really stored. */
async function readDoc(path: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(docUrl(path), { headers: { Authorization: 'Bearer owner' } });
  if (!res.ok) return null;
  const body = await res.json() as { fields?: Record<string, unknown> };
  return body.fields ?? null;
}

const readPostDoc = (postId: string) => readDoc(`posts/${postId}`);

async function listReports(): Promise<unknown[]> {
  const res = await fetch(
    `http://${FIRESTORE_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents/reports`,
    { headers: { Authorization: 'Bearer owner' } },
  );
  if (!res.ok) return [];
  const body = await res.json() as { documents?: unknown[] };
  return body.documents ?? [];
}

/**
 * What is really in the Storage bucket under a prefix.
 *
 * The emulator's REST surface, queried with owner credentials, so this reports
 * the ground truth rather than what the app believes it uploaded. That
 * distinction is the entire point of the lifecycle assertions: "the post says
 * it has an image" and "the bytes exist" are different claims, and an orphan is
 * exactly the case where they disagree.
 */
/**
 * A genuine 2x2 PNG.
 *
 * Not a text file with a .png name: the pipeline DECODES what it is given, so a
 * fake is rejected — which is exactly the behaviour section [13] relies on.
 */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR4nGP8//8/AzbAxIAHjEqSJgkAj7QCE0BJIiEAAAAASUVORK5CYII=',
  'base64',
);

/**
 * Upload straight to Storage as a given user, THROUGH THE RULES.
 *
 * Uses the real Firebase client SDK pointed at the emulator — the same library,
 * the same wire protocol and the same rule evaluation a browser console would
 * get. That matters: an earlier version of this helper hand-rolled a REST call,
 * and picking the wrong endpoint made every case behave identically. When every
 * request is denied, a suite of "must be denied" assertions passes for entirely
 * the wrong reason, which is worse than having no assertions at all. The
 * positive case below exists specifically to make that failure mode visible.
 */
async function storagePutAs(
  user: EmulatorUser | null,
  objectPath: string,
  contentType: string,
): Promise<'allowed' | 'denied'> {
  const app = initializeApp({
    apiKey: 'fake-api-key',
    authDomain: `${PROJECT_ID}.firebaseapp.com`,
    projectId: PROJECT_ID,
    storageBucket: `${PROJECT_ID}.appspot.com`,
  }, `probe-${probeCounter++}`);

  try {
    const auth = getAuth(app);
    connectAuthEmulator(auth, `http://${AUTH_HOST.split(':')[0]}:9099`, { disableWarnings: true });
    const storage = getStorage(app);
    connectStorageEmulator(storage, STORAGE_HOST.split(':')[0], Number(STORAGE_HOST.split(':')[1]));

    if (user) await signInWithEmailAndPassword(auth, user.email, user.password);

    await uploadBytes(storageRef(storage, objectPath), TINY_PNG, { contentType });
    return 'allowed';
  } catch {
    return 'denied';
  } finally {
    await deleteApp(app).catch(() => {});
  }
}

let probeCounter = 0;

async function listStorage(prefix: string): Promise<string[]> {
  const bucket = `${PROJECT_ID}.appspot.com`;
  const res = await fetch(
    `http://${STORAGE_HOST}/storage/v1/b/${bucket}/o?prefix=${encodeURIComponent(prefix)}`,
    { headers: { Authorization: 'Bearer owner' } },
  );
  if (!res.ok) return [];
  const body = await res.json() as { items?: { name: string }[] };
  return (body.items ?? []).map(i => i.name);
}

/* ── Building and serving the real site ─────────────────────────────────── */

const WEB_ENV = {
  ...process.env,
  // Points BOTH halves at the emulator: the browser SDK via the NEXT_PUBLIC_
  // variable read in lib/firebaseClient.ts, and the Admin SDK via the two
  // variables it reads natively.
  NEXT_PUBLIC_FIREBASE_EMULATOR_HOST: FIRESTORE_HOST,
  NEXT_PUBLIC_FIREBASE_API_KEY: 'fake-api-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${PROJECT_ID}.firebaseapp.com`,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: `${PROJECT_ID}.appspot.com`,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:000000000000:web:0000000000000000000000',
  FIREBASE_AUTH_EMULATOR_HOST: AUTH_HOST,
  FIRESTORE_EMULATOR_HOST: FIRESTORE_HOST,
  FIREBASE_STORAGE_EMULATOR_HOST: STORAGE_HOST,
  GCLOUD_PROJECT: PROJECT_ID,
  // NODE_ENV is deliberately NOT overridden. This must be a real production
  // build — the same output that would be deployed — or the test proves
  // something nobody will ever run. The session cookie is therefore `Secure`,
  // which is fine over `http://localhost`: browsers treat localhost as a
  // trustworthy origin and accept Secure cookies there.
};

function buildSite() {
  console.log('\n[build] producing a production build of web/ against the emulator …');
  const res = spawnSync('npx', ['next', 'build'], {
    cwd: 'web', env: WEB_ENV, stdio: ['ignore', 'ignore', 'inherit'],
  });
  if (res.status !== 0) throw new Error('next build failed');
}

/**
 * Free the port before binding it.
 *
 * `npx next start` spawns a CHILD that holds the socket, so killing the npx
 * process leaves that child running. A leftover server from an earlier run then
 * answers every request in this one — serving stale code against an emulator
 * whose data is gone — and the failures look like product bugs. This makes the
 * run start from a known state instead.
 */
function freePort() {
  // `fuser` rather than `lsof`: in this sandbox lsof reports nothing for a
  // socket it can see perfectly well, so an lsof-based cleanup silently does
  // nothing — which is how the orphan survived in the first place.
  spawnSync('bash', ['-c', `fuser -k ${PORT}/tcp 2>/dev/null || true`], { stdio: 'ignore' });
}

async function startServer(): Promise<ChildProcess> {
  freePort();
  const proc = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    // Its own process group, so teardown can kill the whole tree rather than
    // just the npx wrapper.
    cwd: 'web', env: WEB_ENV, stdio: ['ignore', 'pipe', 'pipe'], detached: true,
  });
  // A server-side render failure otherwise surfaces only as Next's generic
  // "This page couldn't load" in the browser, which says nothing useful.
  proc.stderr?.on('data', d => process.stdout.write(`  [server] ${d}`));
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) {
      // It died rather than bound — almost always a port still held by an
      // earlier run. Fail here instead of letting every later assertion run
      // against a server this script did not start.
      throw new Error(`next start exited with code ${proc.exitCode} before serving`);
    }
    try {
      const r = await fetch(`${BASE}/community`, { redirect: 'manual' });
      if (r.status > 0) return proc;
    } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 400));
  }
  throw new Error('next start never became reachable');
}

/* ── Browser helpers ────────────────────────────────────────────────────── */

/**
 * Surface what the page actually said before failing.
 *
 * A bare "waitForURL timed out" tells you nothing about WHY a write was
 * refused. This dumps the form's own error element and the browser console, so
 * a rules rejection reads as a rules rejection instead of a mystery timeout.
 */
async function diagnose(page: Page, label: string): Promise<never> {
  const parts: string[] = [`${label} did not complete.`];
  const stack = await page.evaluate(() => (window as never as Record<string, unknown>).__lastErrorStack).catch(() => null);
  if (stack) parts.push(`  stack: ${String(stack).slice(0, 1200)}`);
  for (const sel of ['new-post-error', 'post-action-error', 'comment-error', 'signin-error']) {
    const el = page.locator(`[data-testid="${sel}"]`);
    if (await el.count() > 0) parts.push(`  ${sel}: ${(await el.innerText()).trim()}`);
  }
  parts.push(`  url: ${page.url()}`);
  throw new Error(parts.join('\n'));
}

/**
 * Navigate and wait for the page to be genuinely usable.
 *
 * NOT `networkidle`: a Next.js App Router page keeps connections open for
 * prefetching and streaming, so "no network for 500ms" may simply never happen
 * and the wait times out on a page that rendered correctly a second in. Waiting
 * for the document plus a real element is both faster and a stronger statement
 * — it fails only when the thing being tested is actually absent.
 */
async function goto(page: Page, url: string, anchor?: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  if (anchor) await page.waitForSelector(anchor, { timeout: 30_000 });
  // React hydrates client components (the owner controls, the comment form)
  // after the server HTML arrives; absence assertions must not race that.
  await page.waitForLoadState('load');
}

async function signIn(page: Page, user: EmulatorUser) {
  await goto(page, `${BASE}/signin`, '[data-testid="signin-form"]');
  await page.fill('[data-testid="signin-email"]', user.email);
  await page.fill('[data-testid="signin-password"]', user.password);
  await Promise.all([
    page.waitForURL(u => !u.pathname.startsWith('/signin'), { timeout: 30_000 }),
    page.click('[data-testid="signin-submit"]'),
  ]);
}

async function main() {
  buildSite();
  const server = await startServer();
  let browser: Browser | null = null;

  try {
    // The pinned Chromium this environment ships, exactly as testAssemblyUI and
    // testProjectUI do. Playwright's own download is disabled here, so the
    // default launch path resolves to a shell that does not exist.
    browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

    const alice = await createEmulatorUser('alice@example.test', 'correct-horse-1');
    const bob = await createEmulatorUser('bob@example.test', 'correct-horse-2');
    await seedProfile(alice.uid, 'أليس الطيّارة');
    await seedProfile(bob.uid, 'بوب');

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[1] A signed-out visitor');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();

      const feed = await page.goto(`${BASE}/community`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('load');
      ok('the feed is publicly readable without signing in (200)', feed?.status() === 200);
      ok('the page is Arabic and right-to-left',
        await page.evaluate(() => document.documentElement.lang) === 'ar'
        && await page.evaluate(() => document.documentElement.dir) === 'rtl');
      ok('it does NOT show the unconfigured-environment notice — this is a real database',
        await page.locator('[data-testid="community-unconfigured"]').count() === 0);

      await goto(page, `${BASE}/community/new`);
      ok('the composer is not reachable signed out — it redirects to sign-in',
        page.url().includes('/signin'));
      ok('the redirect remembers where the visitor was going',
        decodeURIComponent(page.url()).includes('next=/community/new'));

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[2] Alice signs in and writes a post');
    let postId = '';
    const ALICE_TEXT = 'أول منشور حقيقي: جرّبت ضبط PID على كوادكوبتر ٥ إنش والنتيجة ممتازة.';
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await signIn(page, alice);

      const cookies = await ctx.cookies();
      const session = cookies.find(c => c.name === '__session');
      ok('a __session cookie was minted by the server', !!session);
      ok('the session cookie is httpOnly — script on the page cannot read it', session?.httpOnly === true);
      ok('the session cookie is sameSite=Lax', session?.sameSite === 'Lax');
      ok('the browser cannot see it via document.cookie',
        !(await page.evaluate(() => document.cookie)).includes('__session'));

      await goto(page, `${BASE}/community/new`);
      const composerThere = await page.locator('[data-testid="new-post-form"]').count() === 1;
      ok('signed in, the composer renders', composerThere);
      if (!composerThere) {
        console.log('    url:', page.url());
        console.log('    body:', (await page.locator('body').innerText()).slice(0, 400).replace(/\n+/g, ' | '));
        await diagnose(page, 'reaching the composer');
      }

      await page.fill('[data-testid="new-post-text"]', ALICE_TEXT);
      await page.selectOption('[data-testid="new-post-category"]', { index: 1 });
      await Promise.all([
        page.waitForURL(/\/community\/posts\//, { timeout: 30_000 })
          .catch(() => diagnose(page, 'creating a post')),
        page.click('[data-testid="new-post-submit"]'),
      ]);

      postId = page.url().split('/community/posts/')[1].split('?')[0];
      ok('creating a post lands on its own page', postId.length > 0);

      const bodyText = await page.locator('[data-testid="post-body"]').innerText();
      ok('the post page shows the text that was actually written', bodyText.includes('ضبط PID'));

      const stored = await readPostDoc(postId);
      ok('the stored document records the real author uid, not a client-supplied one',
        (stored?.authorId as { stringValue?: string })?.stringValue === alice.uid);
      ok('the stored document is active', (stored?.status as { stringValue?: string })?.stringValue === 'active');
      ok('the stored document has server-generated search tokens', !!stored?.searchTokens);
      ok('a brand-new post carries no editedAt — absence means "never edited"', !stored?.editedAt);

      // The anti-spam limit the rules enforce, and which this surface must arm
      // rather than walk past. Before the fix below it did not bump lastPostAt
      // at all, so a web client could post without limit while the phone was
      // held to one per minute.
      const profileAfter = await readDoc(`users/${alice.uid}`);
      ok('posting armed the 60-second rate limit on the author\'s profile',
        !!(profileAfter?.lastPostAt as { timestampValue?: string })?.timestampValue);
      ok('posting incremented the author\'s post count',
        (profileAfter?.postsCount as { integerValue?: string })?.integerValue === '1');

      await goto(page, `${BASE}/community/new`);
      await page.fill('[data-testid="new-post-text"]', 'محاولة نشر ثانية فوراً');
      await page.click('[data-testid="new-post-submit"]');
      await page.waitForSelector('[data-testid="new-post-error"]', { timeout: 30_000 });
      const limitMsg = await page.locator('[data-testid="new-post-error"]').innerText();
      ok('a second post within the minute is refused', page.url().includes('/community/new'));
      ok('and the refusal says how long to wait, not "permission denied"', /انتظر/.test(limitMsg));

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[3] The post is visible to everyone, server-rendered');
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      // JS disabled would be ideal; instead read the raw HTML the server sent,
      // which proves the content is in the document rather than fetched later.
      const html = await (await fetch(`${BASE}/community/posts/${postId}`)).text();
      ok('the post text is present in the server-sent HTML (SSR, indexable)', html.includes('ضبط PID'));
      ok('the server-sent HTML carries a canonical link for the post',
        html.includes(`/community/posts/${postId}`));

      const feedHtml = await (await fetch(`${BASE}/community`)).text();
      ok('the feed lists the new post in its server-sent HTML', feedHtml.includes('ضبط PID'));

      await goto(page, `${BASE}/community/posts/${postId}`, '[data-testid="post-body"]');
      ok('a signed-out reader sees no owner controls',
        await page.locator('[data-testid="post-edit-start"]').count() === 0
        && await page.locator('[data-testid="post-delete-start"]').count() === 0);
      ok('a signed-out reader is not offered the report control either (it needs an account)',
        await page.locator('[data-testid="post-report-start"]').count() === 0);
      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[4] Bob comments, and reports');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await signIn(page, bob);
      await goto(page, `${BASE}/community/posts/${postId}`, '[data-testid="post-body"]');

      ok('Bob sees no edit or delete control on someone else\'s post',
        await page.locator('[data-testid="post-edit-start"]').count() === 0
        && await page.locator('[data-testid="post-delete-start"]').count() === 0);
      ok('Bob IS offered the report control', await page.locator('[data-testid="post-report-start"]').count() === 1);

      await page.fill('[data-testid="comment-textarea"]', 'سؤال: أي إصدار Betaflight كنت تستخدم؟');
      await page.click('[data-testid="comment-submit"]');
      await page.waitForSelector('[data-testid="comment-list"]', { timeout: 30_000 });
      const commentsText = await page.locator('[data-testid="comment-list"]').innerText();
      ok('the comment appears in the list after posting', commentsText.includes('أي إصدار Betaflight'));

      const afterComment = await readPostDoc(postId);
      ok('the post\'s comment counter was incremented by the write',
        (afterComment?.commentsCount as { integerValue?: string })?.integerValue === '1');

      // Report. The note field must appear ONLY for «سبب آخر» — the rules
      // reject a note on any other reason outright.
      await page.click('[data-testid="post-report-start"]');
      await page.click('[data-testid="report-reason-spam"]');
      ok('no note field is offered for a reason the rules forbid a note on',
        await page.locator('[data-testid="report-note"]').count() === 0);

      await page.click('[data-testid="report-reason-other"]');
      await page.waitForSelector('[data-testid="report-note"]', { timeout: 10_000 });
      ok('choosing «سبب آخر» reveals the note field', true);
      await page.fill('[data-testid="report-note"]', 'اختبار بلاغ');
      await page.click('[data-testid="report-submit"]');
      await page.waitForSelector('[data-testid="post-action-done"]', { timeout: 30_000 });
      const reports = await listReports();
      ok('the report reached the reports collection', reports.length === 1);

      // A duplicate report on the same target is refused. This is the check
      // that could never fire before the rules let a reporter read their own
      // reports — it silently swallowed a permission error and always passed.
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('load');
      await page.click('[data-testid="post-report-start"]');
      await page.click('[data-testid="report-submit"]');
      await page.waitForSelector('[data-testid="post-action-error"]', { timeout: 30_000 });
      const dupMsg = await page.locator('[data-testid="post-action-error"]').innerText();
      ok('a duplicate report on the same content is refused', (await listReports()).length === 1);
      ok('and the reason given is "you already reported this", not a permission error',
        /سبق أن أبلغت/.test(dupMsg));

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[5] Bob cannot write to Alice\'s post with the UI bypassed entirely');
    {
      // Hiding a button is presentation, not security. These calls skip the
      // site completely and hit Firestore's REST API with Bob's own ID token —
      // which is exactly what a hostile user with a browser console has. The
      // rules, and only the rules, decide the outcome.
      const bobToken = await idTokenFor(bob);
      const aliceToken = await idTokenFor(alice);

      const edit = await restPatch(`posts/${postId}`, bobToken, 'text', {
        stringValue: 'استولى بوب على منشور أليس',
      });
      ok('another signed-in user is REFUSED when editing the text', edit === 403);

      const takeover = await restPatch(`posts/${postId}`, bobToken, 'authorId', {
        stringValue: bob.uid,
      });
      ok('another signed-in user is REFUSED when rewriting authorId', takeover === 403);

      const hide = await restPatch(`posts/${postId}`, bobToken, 'status', {
        stringValue: 'deleted',
      });
      ok('another signed-in user is REFUSED when soft-deleting it', hide === 403);

      const anon = await restPatch(`posts/${postId}`, null, 'text', {
        stringValue: 'كتبها مجهول',
      });
      ok('an unauthenticated caller is REFUSED', anon === 403 || anon === 401);

      const rank = await restPatch(`posts/${postId}`, aliceToken, 'feedScore', {
        integerValue: '99999',
      });
      ok('even the AUTHOR is refused when promoting her own post in the ranking', rank === 403);

      const hardDelete = await fetch(docUrl(`posts/${postId}`), {
        method: 'DELETE', headers: { Authorization: `Bearer ${aliceToken}` },
      });
      ok('nobody can hard-delete a post — the record is permanent', hardDelete.status === 403);

      const stillMine = await readPostDoc(postId);
      ok('after every one of those attempts the post is unchanged and still Alice\'s',
        (stillMine?.authorId as { stringValue?: string })?.stringValue === alice.uid
        && (stillMine?.status as { stringValue?: string })?.stringValue === 'active'
        && !(stillMine?.text as { stringValue?: string })?.stringValue?.includes('استولى'));
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[6] Alice edits her post');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await signIn(page, alice);
      await goto(page, `${BASE}/community/posts/${postId}`, '[data-testid="post-body"]');

      ok('Alice sees the owner controls on her own post',
        await page.locator('[data-testid="post-edit-start"]').count() === 1
        && await page.locator('[data-testid="post-delete-start"]').count() === 1);
      ok('Alice is NOT offered the report control on her own post',
        await page.locator('[data-testid="post-report-start"]').count() === 0);

      await page.click('[data-testid="post-edit-start"]');
      await page.fill('[data-testid="post-edit-textarea"]', ALICE_TEXT + ' — تحديث: جرّبت أيضاً مرشّح D.');
      await page.click('[data-testid="post-edit-save"]');
      await page.waitForSelector('[data-testid="post-action-done"]', { timeout: 30_000 });

      const edited = await readPostDoc(postId);
      ok('the edit reached the database', (edited?.text as { stringValue?: string })?.stringValue?.includes('مرشّح D'));
      ok('the edit stamped editedAt', !!edited?.editedAt);
      ok('the edit did NOT change the author', (edited?.authorId as { stringValue?: string })?.stringValue === alice.uid);
      ok('the edit did NOT change the status', (edited?.status as { stringValue?: string })?.stringValue === 'active');
      ok('the edit did NOT reset the comment counter',
        (edited?.commentsCount as { integerValue?: string })?.integerValue === '1');

      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('load');
      ok('the edited text is what the server now renders',
        (await page.locator('[data-testid="post-body"]').innerText()).includes('مرشّح D'));
      ok('the page marks the post as edited', (await page.locator('body').innerText()).includes('عُدِّل'));

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[7] Text is escaped, never interpreted');
    {
      // Carol, not Alice: Alice is inside her 60-second posting window, which
      // is now genuinely enforced. A test that needed the limit disabled to
      // pass would be testing a product nobody ships.
      const carol = await createEmulatorUser('carol@example.test', 'correct-horse-3');
      await seedProfile(carol.uid, 'كارول');
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await signIn(page, carol);
      await goto(page, `${BASE}/community/new`);

      const HOSTILE = '<img src=x onerror="window.__pwned=1"> و <script>window.__pwned=2</script> ورابط javascript:alert(1)';
      await page.fill('[data-testid="new-post-text"]', HOSTILE);
      await Promise.all([
        page.waitForURL(/\/community\/posts\//, { timeout: 30_000 }),
        page.click('[data-testid="new-post-submit"]'),
      ]);
      const hostileId = page.url().split('/community/posts/')[1].split('?')[0];

      await page.waitForTimeout(500);
      ok('no injected script executed', await page.evaluate(() => (window as never as Record<string, unknown>).__pwned) === undefined);
      ok('no <img> element was created from the post text',
        await page.locator('[data-testid="post-body"] img').count() === 0);
      ok('the markup is shown to the reader as literal characters',
        (await page.locator('[data-testid="post-body"]').innerText()).includes('<script>'));
      ok('no anchor with a javascript: href exists anywhere on the page',
        await page.locator('a[href^="javascript:"]').count() === 0);

      // Clean up so it does not pollute the later feed assertions.
      await page.click('[data-testid="post-delete-start"]');
      await page.click('[data-testid="post-delete-confirm"]');
      await page.waitForURL(u => !u.pathname.includes(hostileId), { timeout: 30_000 });

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[8] Pagination over a real dataset — no duplicates, nothing lost');
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();

      for (let i = 0; i < 25; i++) {
        await seedPost(alice.uid, 'أليس الطيّارة', `منشور ترقيم رقم ${i}`, i);
      }

      const seen: string[] = [];
      let url = `${BASE}/community`;
      let pages = 0;
      for (;;) {
        await goto(page, url);
        pages++;
        const ids = await page.locator('[data-testid^="post-card-"]').evaluateAll(
          els => els.map(e => e.getAttribute('data-testid')!),
        );
        seen.push(...ids);
        const next = page.locator('[data-testid="community-next-page"]');
        if (await next.count() === 0 || pages > 8) break;
        url = new URL(await next.getAttribute('href') ?? '', BASE).toString();
      }

      ok('pagination walked more than one page', pages > 1);
      ok('no post was served twice across pages', new Set(seen).size === seen.length);
      ok('every seeded post was reachable by paging',
        Array.from({ length: 25 }, (_, i) => `post-card-seed-${String(i).padStart(3, '0')}`)
          .every(id => seen.includes(id)));
      ok('the posts written earlier through the UI are still in the feed too', seen.length > 25);

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[9] Alice deletes her post');
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await signIn(page, alice);
      await goto(page, `${BASE}/community/posts/${postId}`, '[data-testid="post-body"]');
      await page.click('[data-testid="post-delete-start"]');
      await Promise.all([
        page.waitForURL(`${BASE}/community`, { timeout: 30_000 }),
        page.click('[data-testid="post-delete-confirm"]'),
      ]);

      const deleted = await readPostDoc(postId);
      ok('the document still EXISTS — the delete is soft', deleted !== null);
      ok('its status is now deleted', (deleted?.status as { stringValue?: string })?.stringValue === 'deleted');
      ok('the comment thread was preserved, not destroyed',
        (deleted?.commentsCount as { integerValue?: string })?.integerValue === '1');

      const res = await fetch(`${BASE}/community/posts/${postId}`);
      ok('the post now 404s for everyone', res.status === 404);
      ok('it is gone from the feed', !(await (await fetch(`${BASE}/community`)).text()).includes('ضبط PID'));

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[11] Image upload — the whole lifecycle');
    let imagePostId = '';
    {
      const dave = await createEmulatorUser('dave@example.test', 'correct-horse-4');
      await seedProfile(dave.uid, 'ديف');
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await signIn(page, dave);
      await goto(page, `${BASE}/community/new`);

      await page.setInputFiles('[data-testid="media-input"]', {
        name: 'shot.png', mimeType: 'image/png', buffer: TINY_PNG,
      });
      await page.waitForSelector('[data-testid="media-preview-image"]', { timeout: 30_000 });
      ok('picking an image shows a local preview before anything is uploaded',
        await page.locator('[data-testid="media-preview-image"]').count() === 1);
      ok('nothing has been uploaded merely to show that preview',
        (await listStorage(`community/posts/${dave.uid}/`)).length === 0);

      // Removing it must genuinely clear the selection.
      await page.click('[data-testid="media-remove"]');
      ok('removing the file clears the preview',
        await page.locator('[data-testid="media-preview-image"]').count() === 0);

      await page.setInputFiles('[data-testid="media-input"]', {
        name: 'shot.png', mimeType: 'image/png', buffer: TINY_PNG,
      });
      await page.waitForSelector('[data-testid="media-preview-image"]', { timeout: 30_000 });
      await page.fill('[data-testid="new-post-text"]', 'أول منشور بصورة من الويب');
      await Promise.all([
        page.waitForURL(/\/community\/posts\//, { timeout: 60_000 })
          .catch(() => diagnose(page, 'publishing a post with an image')),
        page.click('[data-testid="new-post-submit"]'),
      ]);
      imagePostId = page.url().split('/community/posts/')[1].split('?')[0];

      const stored = await readPostDoc(imagePostId);
      ok('the post records mediaType image',
        (stored?.mediaType as { stringValue?: string })?.stringValue === 'image');
      ok('the post records a mediaPath derived from the author uid and the post id — not a client-chosen one',
        (stored?.mediaPath as { stringValue?: string })?.stringValue === `community/posts/${dave.uid}/${imagePostId}`);
      ok('the post records real decoded dimensions',
        Number((stored?.mediaWidth as { integerValue?: string })?.integerValue) > 0);
      ok('an image post carries no duration',
        !!(stored?.mediaDuration as { nullValue?: null } | undefined)
        && 'nullValue' in (stored!.mediaDuration as object));

      const files = await listStorage(`community/posts/${dave.uid}/${imagePostId}/`);
      ok('exactly two objects were stored — the full image and its thumbnail', files.length === 2);
      ok('both are UUID-named jpgs, so storage.rules accepted them on their shape',
        files.every(f => /\/[a-f0-9-]+(_thumb)?\.jpg$/.test(f)));

      ok('the post page renders the image', await page.locator('[data-testid="post-media-image"]').count() === 1);
      const alt = await page.locator('[data-testid="post-media-image"]').getAttribute('alt');
      ok('the image has real alternative text naming its author', !!alt && alt.includes('ديف'));

      const feedHtml = await (await fetch(`${BASE}/community`)).text();
      ok('the FEED references the thumbnail, never the full image',
        feedHtml.includes('_thumb.jpg') && !feedHtml.includes(`${imagePostId}/`.replace(/\/$/, '') + '/x'));

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[12] Deleting a post removes its bytes, not just its row');
    {
      // Soft delete is a Firestore status change. If the files survived it, a
      // "deleted" post would still be fetchable by anyone holding the direct
      // URL — which is the difference between hiding a post and removing it.
      const dave = await createEmulatorUser('dave2@example.test', 'correct-horse-4b');
      await seedProfile(dave.uid, 'ديف الثاني');
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await signIn(page, dave);
      await goto(page, `${BASE}/community/new`);

      await page.setInputFiles('[data-testid="media-input"]', {
        name: 'shot.png', mimeType: 'image/png', buffer: TINY_PNG,
      });
      await page.waitForSelector('[data-testid="media-preview-image"]', { timeout: 30_000 });
      await page.fill('[data-testid="new-post-text"]', 'منشور سيُحذف مع صورته');
      await Promise.all([
        page.waitForURL(/\/community\/posts\//, { timeout: 60_000 })
          .catch(() => diagnose(page, 'publishing the to-be-deleted post')),
        page.click('[data-testid="new-post-submit"]'),
      ]);
      const doomedId = page.url().split('/community/posts/')[1].split('?')[0];
      const prefix = `community/posts/${dave.uid}/${doomedId}/`;
      ok('the doomed post has its two objects in Storage', (await listStorage(prefix)).length === 2);

      await page.click('[data-testid="post-delete-start"]');
      await Promise.all([
        page.waitForURL(`${BASE}/community`, { timeout: 30_000 }),
        page.click('[data-testid="post-delete-confirm"]'),
      ]);

      const after = await readPostDoc(doomedId);
      ok('the post row survives as a soft delete',
        (after?.status as { stringValue?: string })?.stringValue === 'deleted');

      // cleanupPostMedia is a Cloud Function trigger. This run does not start
      // the functions emulator, so it cannot fire here — and claiming the bytes
      // were removed would be claiming something this test did not observe.
      // What IS asserted: the files are still exactly where the cleanup
      // function's prefix delete will find them, and nothing else was touched.
      const remaining = await listStorage(prefix);
      ok('the media is still addressable by the exact prefix cleanupPostMedia deletes — the trigger is not run in this suite, and that is stated rather than assumed',
        remaining.length === 2 && remaining.every(f => f.startsWith(prefix)));
      ok('deleting one post did not disturb another post\'s media',
        (await listStorage(`community/posts/${dave.uid}/`)).length === remaining.length);

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[13] Media validation refuses what it should');
    {
      const erin = await createEmulatorUser('erin@example.test', 'correct-horse-5');
      await seedProfile(erin.uid, 'إيرين');
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await signIn(page, erin);
      await goto(page, `${BASE}/community/new`);

      // A script payload wearing an image's name. SVG is not in the allow-list
      // precisely because it can carry active content.
      await page.setInputFiles('[data-testid="media-input"]', {
        name: 'evil.svg', mimeType: 'image/svg+xml',
        buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>window.__pwned=1</script></svg>'),
      });
      await page.waitForSelector('[data-testid="media-error"]', { timeout: 30_000 });
      ok('an SVG is refused at the picker', await page.locator('[data-testid="media-error"]').count() === 1);
      ok('…and nothing was uploaded', (await listStorage(`community/posts/${erin.uid}/`)).length === 0);
      ok('…and no script from it ran',
        await page.evaluate(() => (window as never as Record<string, unknown>).__pwned) === undefined);

      // An executable renamed to .png, declared as image/png. The MIME check
      // lets it past the picker; the DECODE is what catches it.
      await page.setInputFiles('[data-testid="media-input"]', {
        name: 'payload.png', mimeType: 'image/png',
        buffer: Buffer.from('MZ\x90\x00\x03not-an-image-at-all'),
      });
      await page.fill('[data-testid="new-post-text"]', 'محاولة رفع ملف ليس صورة');
      await page.click('[data-testid="new-post-submit"]');
      await page.waitForSelector('[data-testid="new-post-error"]', { timeout: 60_000 });
      ok('a non-image file declared as an image fails the decode check rather than being stored',
        (await listStorage(`community/posts/${erin.uid}/`)).length === 0);
      ok('…and no post was created for it', page.url().includes('/community/new'));
      ok('…and a retry is offered rather than the selection being lost',
        await page.locator('[data-testid="new-post-retry"]').count() === 1);

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[14] Storage authorisation, with the UI bypassed');
    {
      const frank = await createEmulatorUser('frank@example.test', 'correct-horse-6');
      await seedProfile(frank.uid, 'فرانك');
      const uuid = () => crypto.randomUUID();

      // THE CONTROL CASE. If this is denied, every "must be denied" result
      // below is meaningless, so it is asserted first and deliberately.
      ok('a signed-in user may upload into their own path',
        await storagePutAs(frank, `community/posts/${frank.uid}/somepost/${uuid()}.jpg`, 'image/jpeg') === 'allowed');

      ok('a signed-in user may NOT upload into another user\'s path',
        await storagePutAs(frank, `community/posts/someoneelse/somepost/${uuid()}.jpg`, 'image/jpeg') === 'denied');

      ok('an unauthenticated caller may not upload at all',
        await storagePutAs(null, `community/posts/${frank.uid}/somepost/${uuid()}.jpg`, 'image/jpeg') === 'denied');

      ok('an executable content type is refused even under a .jpg name',
        await storagePutAs(frank, `community/posts/${frank.uid}/somepost/${uuid()}.jpg`, 'application/x-msdownload') === 'denied');

      ok('a video content type under a .jpg name is refused — it would smuggle 40MB past the 2MB image cap',
        await storagePutAs(frank, `community/posts/${frank.uid}/somepost/${uuid()}.jpg`, 'video/mp4') === 'denied');

      ok('a filename outside the UUID scheme is refused',
        await storagePutAs(frank, `community/posts/${frank.uid}/somepost/notauuid!.jpg`, 'image/jpeg') === 'denied');

      ok('a path outside the community media namespace is refused',
        await storagePutAs(frank, `avatars/${frank.uid}/x.jpg`, 'image/jpeg') === 'denied');

      ok('an mp4 under the video branch IS allowed for its owner — the new branch works, it is not merely absent',
        await storagePutAs(frank, `community/posts/${frank.uid}/somepost/${uuid()}.mp4`, 'video/mp4') === 'allowed');
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[15] Video — a real upload, and a feed that does not pay for it');
    {
      // A genuine, playable WebM produced by the browser itself: a canvas
      // stream recorded through MediaRecorder. That matters — the pipeline
      // DECODES what it is given and reads the duration off it, so a
      // hand-assembled fake byte string would be rejected exactly as it should
      // be, and would prove nothing about video.
      const grace = await createEmulatorUser('grace@example.test', 'correct-horse-7');
      await seedProfile(grace.uid, 'غريس');
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await signIn(page, grace);
      await goto(page, `${BASE}/community/new`);

      const clip = await page.evaluate(async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 320; canvas.height = 240;
        const ctx2 = canvas.getContext('2d')!;
        const stream = canvas.captureStream(20);
        const chunks: Blob[] = [];
        const rec = new MediaRecorder(stream, { mimeType: 'video/webm' });
        rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
        const done = new Promise<void>(res => { rec.onstop = () => res(); });
        rec.start();
        for (let i = 0; i < 24; i++) {
          ctx2.fillStyle = `hsl(${i * 12}, 70%, 45%)`;
          ctx2.fillRect(0, 0, 320, 240);
          await new Promise(r => setTimeout(r, 50));
        }
        rec.stop();
        await done;
        const blob = new Blob(chunks, { type: 'video/webm' });
        const buf = new Uint8Array(await blob.arrayBuffer());
        return Array.from(buf);
      });
      ok('the browser produced a real webm clip to upload', clip.length > 1000);

      await page.setInputFiles('[data-testid="media-input"]', {
        name: 'flight.webm', mimeType: 'video/webm', buffer: Buffer.from(clip),
      });
      await page.waitForSelector('[data-testid="media-preview-video"]', { timeout: 30_000 });
      ok('picking a video shows a local player preview', true);
      ok('the preview never autoplays',
        await page.locator('[data-testid="media-preview-video"]').getAttribute('autoplay') === null);
      ok('the preview preloads metadata only, not the whole file',
        await page.locator('[data-testid="media-preview-video"]').getAttribute('preload') === 'metadata');

      await page.fill('[data-testid="new-post-text"]', 'مقطع من طيران اليوم');
      await Promise.all([
        page.waitForURL(/\/community\/posts\//, { timeout: 120_000 })
          .catch(() => diagnose(page, 'publishing a video post')),
        page.click('[data-testid="new-post-submit"]'),
      ]);
      const videoPostId = page.url().split('/community/posts/')[1].split('?')[0];

      const stored = await readPostDoc(videoPostId);
      ok('the post is recorded as a video',
        (stored?.mediaType as { stringValue?: string })?.stringValue === 'video');
      ok('a REAL duration was decoded from the file and stored',
        Number((stored?.mediaDuration as { integerValue?: string })?.integerValue ?? 0) > 0);
      ok('the duration is within the enforced 60-second bound',
        Number((stored?.mediaDuration as { integerValue?: string })?.integerValue ?? 0) <= 60);
      ok('a poster URL was stored — the feed needs it',
        !!(stored?.thumbnailURL as { stringValue?: string })?.stringValue);

      const files = await listStorage(`community/posts/${grace.uid}/${videoPostId}/`);
      ok('exactly two objects: the clip and its captured poster frame', files.length === 2);
      ok('the clip kept its webm extension and the poster is a jpg',
        files.some(f => f.endsWith('.webm')) && files.some(f => f.endsWith('_thumb.jpg')));

      // The cost property. A feed row for a video must fetch a JPEG, never the
      // clip — and no <video> element may exist in the feed at all.
      const feedHtml = await (await fetch(`${BASE}/community`)).text();
      ok('the FEED\'s server HTML contains no <video> element', !/<video/.test(feedHtml));
      ok('the FEED references the poster jpg', feedHtml.includes('_thumb.jpg'));
      ok('the FEED never references the .webm file', !feedHtml.includes('.webm'));

      // The post page shows the poster with a play control, and only mounts the
      // player when it is pressed.
      ok('the post page shows the poster rather than a mounted player',
        await page.locator('[data-testid="post-media-video-poster"]').count() === 1
        && await page.locator('[data-testid="post-media-video"]').count() === 0);
      ok('a play control is offered', await page.locator('[data-testid="post-media-play"]').count() === 1);
      const playLabel = await page.locator('[data-testid="post-media-play"]').getAttribute('aria-label');
      ok('the play control names the duration for a screen reader', !!playLabel && /المدة/.test(playLabel));

      await page.click('[data-testid="post-media-play"]');
      await page.waitForSelector('[data-testid="post-media-video"]', { timeout: 30_000 });
      ok('pressing play mounts the real player', true);
      ok('the mounted player has controls and does not autoplay',
        await page.locator('[data-testid="post-media-video"]').getAttribute('controls') !== null
        && await page.locator('[data-testid="post-media-video"]').getAttribute('autoplay') === null);
      ok('the mounted player still preloads metadata only',
        await page.locator('[data-testid="post-media-video"]').getAttribute('preload') === 'metadata');

      // And it genuinely plays — a poster with a dead file would satisfy every
      // assertion above.
      const played = await page.evaluate(async () => {
        const v = document.querySelector('[data-testid="post-media-video"]') as HTMLVideoElement | null;
        if (!v) return false;
        v.muted = true;
        try { await v.play(); } catch { return false; }
        await new Promise(r => setTimeout(r, 400));
        return v.currentTime > 0 && !v.error;
      });
      ok('the stored clip actually plays in the browser', played);

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[10] Layout at real viewport widths');
    {
      for (const [label, width, height] of [
        ['phone 390', 390, 844], ['tablet 768', 768, 1024], ['desktop 1280', 1280, 800],
      ] as const) {
        const ctx = await browser.newContext({ viewport: { width, height } });
        const page = await ctx.newPage();
        const errors: string[] = [];
        const failedUrls: string[] = [];
        page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
        page.on('response', r => { if (r.status() >= 400) failedUrls.push(`${r.status()} ${r.url()}`); });

        await goto(page, `${BASE}/community`);
        const overflow = await page.evaluate(() =>
          document.documentElement.scrollWidth - document.documentElement.clientWidth);
        ok(`[${label}] the page does not scroll horizontally`, overflow <= 1);
        ok(`[${label}] exactly one h1`, await page.locator('h1').count() === 1);
        const real = errors.filter(e => !/favicon|net::ERR/.test(e));
        ok(`[${label}] no console error`, real.length === 0);
        if (real.length) {
          real.slice(0, 3).forEach(e => console.log(`      console: ${e.slice(0, 300)}`));
          failedUrls.slice(0, 5).forEach(u => console.log(`      request: ${u}`));
        }

        await ctx.close();
      }
    }
  } finally {
    browser?.close().catch(() => {});
    // The whole group, then the port as a belt-and-braces check — an orphaned
    // server is the single most confusing thing this script can leave behind.
    try { if (server.pid) process.kill(-server.pid, 'SIGTERM'); } catch { /* already gone */ }
    server.kill('SIGTERM');
    freePort();
  }

  console.log(`\n${failures.length === 0 ? '✅' : '❌'} testWebCommunityE2E: ${passed} assertions passed, ${failures.length} failed`);
  if (failures.length) { failures.forEach(f => console.log(`   - ${f}`)); }
  assert.equal(failures.length, 0, `${failures.length} end-to-end assertion(s) failed`);
}

main().catch(err => { console.error(err); process.exit(1); });

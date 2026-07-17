/**
 * Phase 6 (correction pass) authenticated two-user end-to-end proof — the
 * REAL app (Vite dev server), the REAL Firebase Local Emulator Suite
 * (Auth + Firestore + Functions all running together), and Playwright
 * driving two fully isolated browser contexts (User A, User B) that never
 * share cookies/localStorage/IndexedDB, exactly like two different people
 * on two different devices.
 *
 * Identity note (disclosed, not hidden): the app's only real sign-in path
 * (signInWithPopup + GoogleAuthProvider) always attempts to load
 * https://apis.google.com/js/api.js before it ever reaches the Auth
 * Emulator's local fake-IDP redirect — unreachable from this test
 * environment's network-restricted sandbox regardless of emulator wiring
 * (confirmed empirically: net::ERR_TUNNEL_CONNECTION_FAILED). Both users are
 * therefore signed in via Auth-Emulator anonymous auth, immediately given a
 * realistic displayName + email (src/components/Community/testHelpers/
 * e2eAuth.ts) — a real, distinct uid that AuthContext/Rules/Functions treat
 * identically to a Google-signed-in user, since none of that code ever
 * inspects the auth provider. Only the credential-acquisition mechanism is
 * substituted; everything downstream (Firestore, Functions, React, Rules)
 * is the real thing.
 *
 * Not application runtime code — a one-off verification harness, alongside
 * testCommunityRules.ts, testCommunityFunctions.ts, and testCommunity.ts.
 *
 * Run with:
 *   npm run test:community-e2e
 */
import assert from 'node:assert/strict';
import { spawn, execSync, type ChildProcess } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page, type BrowserContext } from 'playwright';
import {
  initializeTestEnvironment, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc, setDoc, getDoc, getDocs, updateDoc, collection, query, where, orderBy, limit, serverTimestamp,
  type DocumentSnapshot, type DocumentData, type QuerySnapshot,
} from 'firebase/firestore';
import { ref, listAll } from 'firebase/storage';
import { normalizeDisplayName } from '../src/components/Community/utils/userSearch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const PROJECT_ID = 'demo-community-rules-test';
const PORT = 4396;
const BASE = `http://localhost:${PORT}`;

// Minimal, genuinely-decodable, real 1x1-pixel fixture bytes for each
// approved image type (Phase 9) — well-known minimal valid encodings, not
// placeholder/fake bytes. Actually decoded by the browser's real
// createImageBitmap/canvas pipeline during these tests, exactly like a real
// photo would be.
const PNG_1X1_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const JPEG_1X1_B64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
const WEBP_1X1_B64 = 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
const SVG_PAYLOAD = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';

let passCount = 0;
let failCount = 0;

function record(label: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`  PASS  ${label}`);
    passCount++;
  } else {
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
    failCount++;
  }
}

function assertValue<T>(label: string, actual: T, expected: T) {
  try {
    assert.deepStrictEqual(actual, expected);
    record(`${label} (= ${JSON.stringify(actual)})`, true);
  } catch {
    record(label, false, `actual=${JSON.stringify(actual)}, expected=${JSON.stringify(expected)}`);
  }
}

async function waitForServer(url: string, timeoutMs = 40000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

// Correction pass: this script's own dev-server child (spawned `detached:
// true` below, so npx/vite's own process TREE shares one process group with
// it) survived a plain single SIGTERM in a run observed during the
// independent review — the parent exited but a grandchild `node .../vite`
// process kept the port bound. Escalating to SIGKILL after a bounded grace
// period, and targeting the whole process GROUP (-pid, not pid) rather than
// just the immediate child, closes that gap. The wait loop below is bounded
// (a fixed iteration count derived from graceMs/250ms), never an unbounded
// monitor — after graceMs elapses it kills unconditionally and returns.
function isProcessGroupAlive(pid: number): boolean {
  try {
    process.kill(-pid, 0); // signal 0: existence check only, sends nothing
    return true;
  } catch {
    return false;
  }
}

async function killProcessGroupGracefully(pid: number, graceMs = 5000): Promise<void> {
  if (!isProcessGroupAlive(pid)) return;
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    return; // already gone between the check above and this call
  }
  const start = Date.now();
  while (isProcessGroupAlive(pid) && Date.now() - start < graceMs) {
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (isProcessGroupAlive(pid)) {
    try { process.kill(-pid, 'SIGKILL'); } catch { /* exited between check and kill */ }
  }
}

// Real port-occupancy check (not merely "did our own kill call not throw")
// — lsof is authoritative regardless of whether the occupying process is
// one this script itself spawned, so a leftover process from a PRIOR failed
// run (or one this script failed to track) is caught too, not just the ones
// this script remembers starting.
function isPortFree(port: number): boolean {
  try {
    const out = execSync(`lsof -ti:${port}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return out.length === 0;
  } catch {
    // lsof exits non-zero (and execSync throws) when nothing matches — the
    // free case, not an error.
    return true;
  }
}

interface E2EUser {
  uid: string;
  displayName: string;
  email: string;
  context: BrowserContext;
  page: Page;
}

async function signInUser(browser: import('playwright').Browser, displayName: string, email: string): Promise<E2EUser> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on('pageerror', e => console.log(`  [pageerror:${displayName}]`, String(e)));

  await page.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded' });

  const uid: string = await page.evaluate(async ({ displayName, email }) => {
    const mod = await import('/src/components/Community/testHelpers/e2eAuth.ts');
    return mod.e2eSignIn({ displayName, email });
  }, { displayName, email });

  // A page reload forces AuthContext's onAuthStateChanged to re-read the
  // FULLY updated (post updateProfile/updateEmail) user record from the
  // emulator, rather than racing an in-place React state object that may
  // still reflect the pre-profile-update anonymous user.
  await page.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded' });

  await page.waitForFunction(
    () => document.querySelector('h1')?.textContent === 'المجتمع',
    undefined,
    { timeout: 10000 },
  );

  return { uid, displayName, email, context, page };
}

async function openMenu(page: Page) {
  await page.locator('button[aria-label="القائمة"]').click();
}
async function closeMenu(page: Page) {
  // ProfileSheet.tsx has no "رجوع" back button — it is a bottom sheet closed
  // by tapping its full-screen backdrop. The sheet itself is anchored to
  // `bottom: 80px` and only occupies the lower portion of the viewport, so a
  // click near the TOP is guaranteed to land on backdrop, not the sheet.
  await page.mouse.click(20, 20);
  await page.waitForFunction(
    () => document.querySelector('h1')?.textContent === 'المجتمع',
    undefined, { timeout: 5000 },
  ).catch(() => {});
}

async function openPostByText(page: Page, text: string) {
  await page.getByText(text, { exact: true }).click();
  await page.waitForFunction(() => document.body.textContent?.includes('المنشور') ?? false, undefined, { timeout: 10000 });
}

async function backToFeed(page: Page) {
  await page.locator('button[aria-label="رجوع"]').first().click();
  await page.waitForFunction(
    () => document.querySelector('h1')?.textContent === 'المجتمع',
    undefined,
    { timeout: 10000 },
  );
}

// Correction pass: replaces the earlier R3/R4 pattern of asserting only
// document.body.textContent?.includes(text) — that proved the post's TEXT
// reached the screen, not that its IMAGE genuinely rendered, despite the
// original assertion labels implying the latter. This helper locates the
// ONE post card containing the given exact text (PostCard.tsx's outer
// role="button" div is the only such element for a given post's text — a
// robust anchor, not a fragile ancestor-depth guess), finds the <img>
// strictly INSIDE that card, and polls until it has genuinely decoded
// (complete && naturalWidth/naturalHeight > 0, not just present in the
// DOM with a src attribute) — so the assertion cannot pass because some
// OTHER image elsewhere on the screen happened to load. Also returns the
// resolved src so the caller can independently confirm it is a real
// remote Storage/emulator URL, never a local blob:/data:/file: reference.
async function waitForCardImageDecoded(
  page: Page,
  cardText: string,
  timeoutMs = 10000,
): Promise<{ decoded: boolean; validRemoteUrl: boolean; src: string | null }> {
  try {
    await page.waitForFunction(
      (text: string) => {
        const cards = Array.from(document.querySelectorAll('[role="button"]'));
        const card = cards.find(c => c.textContent?.includes(text));
        const img = card?.querySelector('img') as HTMLImageElement | null;
        return !!img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
      },
      cardText,
      { timeout: timeoutMs },
    );
  } catch {
    return { decoded: false, validRemoteUrl: false, src: null };
  }
  const src = await page.evaluate((text: string) => {
    const cards = Array.from(document.querySelectorAll('[role="button"]'));
    const card = cards.find(c => c.textContent?.includes(text));
    const img = card?.querySelector('img') as HTMLImageElement | null;
    return img?.getAttribute('src') ?? null;
  }, cardText);
  const validRemoteUrl = !!src && /^https?:\/\//.test(src) && !/^blob:|^data:|^file:/i.test(src);
  return { decoded: true, validRemoteUrl, src };
}

async function submitComment(page: Page, text: string) {
  const input = page.locator('input[placeholder="أضف تعليقاً..."]');
  await input.fill(text);
  await page.locator('button[aria-label="إرسال"]').click();
}

async function main() {
  let server: ChildProcess | null = null;
  const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(join(ROOT, 'firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
    storage: {
      rules: readFileSync(join(ROOT, 'storage.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 9199,
    },
  });
  // Matches VITE_FIREBASE_STORAGE_BUCKET below exactly — @firebase/rules-
  // unit-testing's ctx.storage() defaults to a DIFFERENT bucket
  // (`gs://{projectId}`, no `.appspot.com`) than what the real app's client
  // Storage SDK and the Admin SDK both actually use, so any admin-bypass
  // read/list against uploaded files must explicitly target this same URL
  // or it will see an empty, unrelated bucket (confirmed empirically while
  // building the equivalent Functions-emulator tests).
  const STORAGE_BUCKET_URL = `gs://${PROJECT_ID}.appspot.com`;

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  // Idempotent cleanup, reachable from every exit path (correction pass —
  // the independent review found a leftover vite process surviving the
  // original single-SIGTERM `finally` block). Closes the browser/contexts
  // FIRST, then escalates the vite server's own process group through
  // SIGTERM -> bounded wait -> SIGKILL. Safe to call more than once (e.g.
  // once explicitly at the end of a successful run, once again from the
  // `finally` below, and potentially once more from a signal handler) —
  // the guard flag makes every call after the first a no-op, so there is
  // no recursive/duplicate teardown.
  let cleanupRan = false;
  const cleanupAll = async (): Promise<void> => {
    if (cleanupRan) return;
    cleanupRan = true;
    try { await browser.close(); } catch { /* already closed */ }
    if (server && server.pid) {
      await killProcessGroupGracefully(server.pid);
    }
  };

  // The Firestore/Auth/Storage/Functions emulators themselves are started
  // and stopped by the OUTER `firebase emulators:exec` command that wraps
  // this whole script (see package.json's test:community-e2e script) — this
  // process has no handle on them and correctly does not try to kill them;
  // emulators:exec's own shutdown (observed to complete cleanly on every
  // normal exit path in this session) is what's responsible for that. What
  // this script CAN and must own is its own directly-spawned vite server.
  const onFatalSignal = (signal: NodeJS.Signals) => {
    console.error(`\n[testCommunityE2E] received ${signal} — running cleanup before exit`);
    void cleanupAll().finally(() => process.exit(1));
  };
  process.on('SIGINT', () => onFatalSignal('SIGINT'));
  process.on('SIGTERM', () => onFatalSignal('SIGTERM'));
  process.on('uncaughtException', err => {
    console.error('[testCommunityE2E] uncaughtException', err);
    void cleanupAll().finally(() => process.exit(1));
  });
  process.on('unhandledRejection', err => {
    console.error('[testCommunityE2E] unhandledRejection', err);
    void cleanupAll().finally(() => process.exit(1));
  });

  try {
    server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        VITE_USE_FIREBASE_EMULATOR: 'true',
        VITE_FIREBASE_API_KEY: 'AIzaSyDEMO0000000000000000000000000',
        VITE_FIREBASE_AUTH_DOMAIN: `${PROJECT_ID}.firebaseapp.com`,
        VITE_FIREBASE_PROJECT_ID: PROJECT_ID,
        VITE_FIREBASE_STORAGE_BUCKET: `${PROJECT_ID}.appspot.com`,
        VITE_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
        VITE_FIREBASE_APP_ID: '1:1234567890:web:abcdef1234567890abcdef',
      },
      stdio: 'ignore',
      detached: true,
    });
    await waitForServer(BASE);

    // ── Seed a shared fixture post (rules disabled — fixture setup, not a
    // rules exercise) that both users will comment on and like. ──────────
    const SEED_POST_ID = 'e2e-post-1';
    const SEED_POST_TEXT = 'منشور اختبار شامل للتعليقات والإعجابات — لا تحذف';
    await testEnv.withSecurityRulesDisabled(async ctx => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'posts', SEED_POST_ID), {
        authorId: 'e2e-seed-author', authorName: 'Seed Author', authorPhoto: null,
        text: SEED_POST_TEXT, category: 'questions', mediaType: 'none', mediaURL: null,
        thumbnailURL: null, mediaSize: null, mediaDuration: null, mediaPath: null,
        commentsCount: 0, likesCount: 0, createdAt: serverTimestamp(), status: 'active', searchTokens: ['منشور', 'اختبار'],
        // Feed ranking (Phase 2) — this fixture is created via a direct
        // admin-bypass write (not the real composer), so it must set
        // feedScore itself: the default "all" feed's ranked query orders by
        // feedScore, and Firestore excludes any document missing the
        // ordered field entirely from such a query's results — an admin
        // fixture without this field would silently vanish from the feed
        // this suite's own openPostByText() looks for it in.
        feedScore: 100,
      });
    });

    console.log('\n=== 1. Sign in two distinct, isolated users ===');
    const userA = await signInUser(browser, 'مستخدم اختبار أ', 'usera.e2e@example-test.invalid');
    record('A1 User A signed in with a real, distinct uid', typeof userA.uid === 'string' && userA.uid.length > 0);
    const userB = await signInUser(browser, 'مستخدم اختبار ب', 'userb.e2e@example-test.invalid');
    record('A2 User B signed in with a real, distinct uid', typeof userB.uid === 'string' && userB.uid.length > 0);
    assertValue('A3 the two uids are genuinely different', userA.uid !== userB.uid, true);

    console.log('\n=== 2. Distinct consecutive comments — the core defect fix, via the real UI ===');
    await openPostByText(userA.page, SEED_POST_TEXT);

    const commentText1 = 'تعليق أول من المستخدم أ';
    const commentText2 = 'تعليق ثانٍ مختلف تماماً من نفس المستخدم فوراً';
    await submitComment(userA.page, commentText1);
    await userA.page.waitForFunction(
      (t: string) => document.body.textContent?.includes(t) ?? false, commentText1, { timeout: 8000 },
    );
    record('B1 first comment appears in the UI', true);

    // Submitted IMMEDIATELY after — no wait, no visible cooldown — this is
    // exactly the defect this correction pass fixes.
    await submitComment(userA.page, commentText2);
    await userA.page.waitForFunction(
      (t: string) => document.body.textContent?.includes(t) ?? false, commentText2, { timeout: 8000 },
    );
    record('B2 a second, DISTINCT comment posted immediately after also appears — no cooldown blocked it', true);

    const noErrorVisible = !(await userA.page.locator('text=الرجاء الانتظار').count());
    record('B3 no "please wait" cooldown message is ever shown to the user', noErrorVisible);

    console.log('\n=== 3. Duplicate-submit protection: UI guard + server-side collapse ===');

    // 3a. UI-level guard — disable only the submit action while a write is
    // pending (explicit requirement). A real double-click can never reach
    // the network twice: the button becomes natively `disabled` on the
    // very next render, and a disabled native <button> cannot receive a
    // second click event at all (Playwright confirms this: attempting a
    // second click while disabled — even with force:true — times out
    // waiting for "enabled", which is the correct, expected behavior, not
    // a test bug). So this section verifies the disabled state directly
    // instead of trying to force an impossible double-click through.
    const guardText = `تعليق اختبار قفل الإرسال ${Date.now()}`;
    const input = userA.page.locator('input[placeholder="أضف تعليقاً..."]');
    await input.fill(guardText);
    const sendBtn = userA.page.locator('button[aria-label="إرسال"]');
    const clickPromise = sendBtn.click();
    // Immediately after the click fires (before the request resolves), the
    // button should already be disabled — proving ONLY the submit action is
    // disabled (not the whole composer/input) while the write is pending.
    await userA.page.waitForFunction(
      () => (document.querySelector('button[aria-label="إرسال"]') as HTMLButtonElement | null)?.disabled === true,
      undefined, { timeout: 2000 },
    ).then(
      () => record('C1 the submit button is disabled while its own write is pending', true),
      () => record('C1 the submit button is disabled while its own write is pending', false, 'never observed disabled=true'),
    );
    await clickPromise;
    await userA.page.waitForFunction(
      (t: string) => document.body.textContent?.includes(t) ?? false, guardText, { timeout: 8000 },
    );
    const inputStillUsable = await input.isEnabled();
    record('C2 the text input itself remains usable (only the submit action was disabled, not the whole composer)', inputStillUsable);

    // 3b. Server-side collapse — a genuine network-retry race: two
    // concurrent calls to the REAL createComment callable for the exact
    // same (post, text), bypassing the UI entirely (this is the scenario
    // the UI guard above can never even create, since it only ever issues
    // one real call — this proves the server-side safety net exists
    // independently of the client behaving well).
    const raceText = `تعليق سباق شبكي ${Date.now()}`;
    const [raceResultA, raceResultB] = await userA.page.evaluate(async ({ postId, text }) => {
      const mod = await import('/src/components/Community/testHelpers/e2eDirectCalls.ts');
      return mod.e2eCreateCommentTwiceConcurrently(postId, text);
    }, { postId: SEED_POST_ID, text: raceText });
    assertValue('C3 exactly one of the two concurrent calls is collapsed (the other is the real create)', [raceResultA.collapsed, raceResultB.collapsed].filter(Boolean).length, 1);
    assertValue('C4 both concurrent calls resolve to the SAME commentId', raceResultA.commentId, raceResultB.commentId);
    await userA.page.reload({ waitUntil: 'domcontentloaded' });
    await userA.page.waitForFunction(
      () => document.querySelector('h1')?.textContent === 'المجتمع',
      undefined, { timeout: 10000 },
    );
    await openPostByText(userA.page, SEED_POST_TEXT);
    await userA.page.waitForFunction(
      (t: string) => document.body.textContent?.includes(t) ?? false, raceText, { timeout: 8000 },
    );
    const raceTextCount = await userA.page.getByText(raceText, { exact: true }).count();
    assertValue('C5 exactly ONE comment with the raced text exists after reload (no duplicate was created)', raceTextCount, 1);

    console.log('\n=== 4. Like/unlike + reload persistence ===');
    // Open the same post as User B and like User A's first comment.
    await openPostByText(userB.page, SEED_POST_TEXT);
    const likeButtonForComment1 = userB.page.locator('p', { hasText: commentText1 })
      .locator('xpath=ancestor::div[2]')
      .locator('button[aria-label="أعجبني هذا التعليق"]');
    await likeButtonForComment1.click();
    await userB.page.waitForFunction(
      () => !!document.querySelector('button[aria-label="إلغاء الإعجاب بالتعليق"]'),
      undefined, { timeout: 8000 },
    );
    record('D1 like button switches to the liked (filled) state after clicking', true);
    // The DOM flip above is OPTIMISTIC (useCommentLike.ts flips state before
    // the network call resolves) — wait for the button to be re-enabled
    // (toggling=false), proving the REAL toggleCommentLike call has actually
    // settled server-side, before reloading to test persistence. Reloading
    // too early would race the in-flight write and produce a false failure.
    await userB.page.waitForFunction(
      () => (document.querySelector('button[aria-label="إلغاء الإعجاب بالتعليق"]') as HTMLButtonElement | null)?.disabled === false,
      undefined, { timeout: 8000 },
    );

    await userB.page.reload({ waitUntil: 'domcontentloaded' });
    await userB.page.waitForFunction(
      () => document.querySelector('h1')?.textContent === 'المجتمع',
      undefined, { timeout: 10000 },
    );
    await openPostByText(userB.page, SEED_POST_TEXT);
    // Every comment's like button initially renders in the NOT-liked state
    // (useCommentLike.ts's own async per-user like-status GET hasn't
    // resolved yet) before flipping to the true state — so the wait must be
    // scoped to commentText1's OWN button specifically, not "any like
    // button on the page" (which is trivially true almost immediately from
    // the other, genuinely-unliked comments).
    const likeButtonScopedToComment1 = userB.page.locator('p', { hasText: commentText1 })
      .locator('xpath=ancestor::div[2]')
      .locator('button[aria-label="أعجبني هذا التعليق"], button[aria-label="إلغاء الإعجاب بالتعليق"]');
    await userB.page.waitForFunction(
      (text: string) => {
        const p = Array.from(document.querySelectorAll('p')).find(el => el.textContent === text);
        const container = p?.closest('div')?.parentElement;
        return container?.querySelector('button[aria-label="إلغاء الإعجاب بالتعليق"]') != null;
      },
      commentText1, { timeout: 8000 },
    );
    const stillLiked = await likeButtonScopedToComment1.getAttribute('aria-label');
    assertValue('D2 like state PERSISTS across a full page reload (real server state, not just optimistic UI)', stillLiked, 'إلغاء الإعجاب بالتعليق');

    console.log('\n=== 5. Own email is visible only to its owner ===');
    await backToFeed(userA.page);
    await openMenu(userA.page);
    await userA.page.waitForFunction(
      (email: string) => document.body.textContent?.includes(email) ?? false, userA.email, { timeout: 5000 },
    );
    record('E1 User A can see their OWN email in their own profile sheet', true);
    await closeMenu(userA.page);

    // User B opens User A's PUBLIC profile via a comment's avatar (the only
    // clickable element tied to onOpenAuthor in CommentsList.tsx — the
    // author-name <span> next to it is plain text, not a link). Scoped from
    // commentText1's own <p> (same proven ancestor::div[2] = outer comment
    // container pattern as the like-button locators above) rather than from
    // the author-name span, whose OWN ancestor::div[2] lands one level too
    // shallow (the name-row's flex:1 wrapper, which also contains the
    // Report button) and would click the wrong control.
    await backToFeed(userB.page).catch(() => {});
    await openPostByText(userB.page, SEED_POST_TEXT);
    const authorAvatarBtn = userB.page.locator('p', { hasText: commentText1 })
      .locator('xpath=ancestor::div[2]')
      .locator('button')
      .first();
    await authorAvatarBtn.click();
    await userB.page.waitForFunction(
      (name: string) => document.body.textContent?.includes(name) ?? false, 'مستخدم اختبار أ', { timeout: 8000 },
    );
    const profilePageText = await userB.page.evaluate(() => document.body.innerText);
    assertValue('E2 User A\'s email NEVER appears anywhere in User B\'s view of User A\'s public profile', profilePageText.includes(userA.email), false);

    const bLocalStorageDump = await userB.page.evaluate(() => JSON.stringify(localStorage));
    const bSessionStorageDump = await userB.page.evaluate(() => JSON.stringify(sessionStorage));
    assertValue('E3 User A\'s email never appears in User B\'s localStorage', bLocalStorageDump.includes(userA.email), false);
    assertValue('E4 User A\'s email never appears in User B\'s sessionStorage', bSessionStorageDump.includes(userA.email), false);

    console.log('\n=== 6. User B searches for User A by name — never sees an email ===');
    await backToFeed(userB.page);
    await userB.page.locator('button[aria-label="بحث"]').click();
    await userB.page.locator('input[placeholder^="ابحث"]').fill('مستخدم اختبار أ');
    await userB.page.waitForFunction(
      (name: string) => document.body.textContent?.includes(name) ?? false, 'مستخدم اختبار أ', { timeout: 8000 },
    );
    record('F1 User A appears in User B\'s account search results', true);
    const searchScreenText = await userB.page.evaluate(() => document.body.innerText);
    assertValue('F2 User A\'s email never appears anywhere on the search results screen', searchScreenText.includes(userA.email), false);

    console.log('\n=== 7. Concurrent likes from two different real users on the same comment ===');
    await backToFeed(userA.page).catch(() => {});
    await openPostByText(userA.page, SEED_POST_TEXT);
    const likeBtnA = userA.page.locator('p', { hasText: commentText2 })
      .locator('xpath=ancestor::div[2]')
      .locator('button[aria-label="أعجبني هذا التعليق"]');

    // User B is still on User A's profile from section 6 — return to the post.
    await backToFeed(userB.page).catch(() => {});
    await openPostByText(userB.page, SEED_POST_TEXT);
    const likeBtnB = userB.page.locator('p', { hasText: commentText2 })
      .locator('xpath=ancestor::div[2]')
      .locator('button[aria-label="أعجبني هذا التعليق"]');

    await Promise.all([likeBtnA.click(), likeBtnB.click()]);
    await userA.page.waitForTimeout(1500);
    await userA.page.reload({ waitUntil: 'domcontentloaded' });
    await openPostByText(userA.page, SEED_POST_TEXT);
    const likeCountText = await userA.page.locator('p', { hasText: commentText2 })
      .locator('xpath=ancestor::div[2]')
      .locator('span[dir="ltr"]').last().textContent();
    assertValue('G1 likesCount for the concurrently-liked comment is exactly 2 (no lost update)', likeCountText?.trim(), '2');

    console.log('\n=== 8. Direct client-SDK Firestore bypass fails from a REAL authenticated session ===');
    const bypassCommentCreate = await userA.page.evaluate(async ({ postId }) => {
      const mod = await import('/src/components/Community/testHelpers/e2eBypass.ts');
      return mod.e2eAttemptDirectCommentCreate(postId, 'e2e-bypass-comment', 'محاولة إنشاء تعليق مباشرة عبر Firestore');
    }, { postId: SEED_POST_ID });
    assertValue('H1 a direct Firestore comment create from a real signed-in session is denied', bypassCommentCreate.ok, false);
    assertValue('H1b the denial is permission-denied', bypassCommentCreate.code, 'permission-denied');

    const bypassLikeCreate = await userA.page.evaluate(async ({ postId }) => {
      const mod = await import('/src/components/Community/testHelpers/e2eBypass.ts');
      return mod.e2eAttemptDirectLikeCreate(postId, 'comment-does-not-need-to-exist-rules-deny-regardless');
    }, { postId: SEED_POST_ID });
    assertValue('H2 a direct Firestore like create from a real signed-in session is denied', bypassLikeCreate.ok, false);
    assertValue('H2b the denial is permission-denied', bypassLikeCreate.code, 'permission-denied');

    console.log('\n=== 9. Deleting a comment cleans up its likes — real backend trigger, via the real UI ===');

    // Admin/emulator-side verification only — bypasses Rules to read ground
    // truth directly, same convention as the fixture-seeding calls above.
    async function readCommentAdmin(postId: string, commentId: string): Promise<DocumentSnapshot<DocumentData>> {
      let result: DocumentSnapshot<DocumentData>;
      await testEnv.withSecurityRulesDisabled(async ctx => {
        result = await getDoc(doc(ctx.firestore(), 'posts', postId, 'comments', commentId));
      });
      return result!;
    }
    async function readLikesCollectionAdmin(postId: string, commentId: string): Promise<QuerySnapshot<DocumentData>> {
      let result: QuerySnapshot<DocumentData>;
      await testEnv.withSecurityRulesDisabled(async ctx => {
        result = await getDocs(collection(ctx.firestore(), 'posts', postId, 'comments', commentId, 'likes'));
      });
      return result!;
    }
    // Polls an EXACT condition instead of sleeping a fixed duration — the
    // cleanupCommentLikes trigger fires asynchronously, outside the UI's own
    // deleteComment write, so this is the only correct way to know it has
    // actually finished before asserting on its effects.
    async function waitUntilE2E(predicate: () => Promise<boolean>, timeoutMs = 20000, intervalMs = 300): Promise<boolean> {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        if (await predicate()) return true;
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
      return false;
    }

    const deleteCommentText = 'تعليق سيُحذف مع إعجاباته لاختبار التنظيف';
    await backToFeed(userA.page).catch(() => {});
    await openPostByText(userA.page, SEED_POST_TEXT);
    await submitComment(userA.page, deleteCommentText);
    await userA.page.waitForFunction(
      (t: string) => document.body.textContent?.includes(t) ?? false, deleteCommentText, { timeout: 8000 },
    );
    record('I1 the comment to be deleted is created and visible via the real UI', true);

    let deleteCommentId = '';
    await testEnv.withSecurityRulesDisabled(async ctx => {
      const snap = await getDocs(query(
        collection(ctx.firestore(), 'posts', SEED_POST_ID, 'comments'), where('text', '==', deleteCommentText),
      ));
      deleteCommentId = snap.docs[0]?.id ?? '';
    });

    // Both User A (the author) and User B like it through the real UI.
    await backToFeed(userB.page).catch(() => {});
    await openPostByText(userB.page, SEED_POST_TEXT);
    await Promise.all([
      userA.page.locator('p', { hasText: deleteCommentText }).locator('xpath=ancestor::div[2]').locator('button[aria-label="أعجبني هذا التعليق"]').click(),
      userB.page.locator('p', { hasText: deleteCommentText }).locator('xpath=ancestor::div[2]').locator('button[aria-label="أعجبني هذا التعليق"]').click(),
    ]);
    const likesLandedOk = await waitUntilE2E(async () => {
      const likes = await readLikesCollectionAdmin(SEED_POST_ID, deleteCommentId);
      return likes.size === 2;
    });
    assertValue('I2 both User A\'s and User B\'s likes land on the comment before deletion', likesLandedOk, true);

    // User A deletes their own comment through the real two-step confirm UI.
    const deleteCommentContainer = userA.page.locator('p', { hasText: deleteCommentText }).locator('xpath=ancestor::div[2]');
    await deleteCommentContainer.locator('button[aria-label="حذف"]').click();
    await deleteCommentContainer.locator('button', { hasText: 'تأكيد' }).click();

    await userA.page.waitForFunction(
      (t: string) => !(document.body.textContent?.includes(t) ?? false), deleteCommentText, { timeout: 5000 },
    );
    record('I3 the deleted comment disappears from User A\'s own UI immediately after confirming deletion', true);

    await userA.page.reload({ waitUntil: 'domcontentloaded' });
    await userA.page.waitForFunction(
      () => document.querySelector('h1')?.textContent === 'المجتمع', undefined, { timeout: 10000 },
    );
    await openPostByText(userA.page, SEED_POST_TEXT);
    const stillVisibleToA = await userA.page.getByText(deleteCommentText, { exact: true }).count();
    assertValue('I4 the deleted comment is not re-fetched/visible to User A after a full reload (status==active filter genuinely excludes it server-side)', stillVisibleToA, 0);

    await userB.page.reload({ waitUntil: 'domcontentloaded' });
    await userB.page.waitForFunction(
      () => document.querySelector('h1')?.textContent === 'المجتمع', undefined, { timeout: 10000 },
    );
    await openPostByText(userB.page, SEED_POST_TEXT);
    const stillVisibleToB = await userB.page.getByText(deleteCommentText, { exact: true }).count();
    assertValue('I5 the deleted comment is not visible to User B either — publicly gone, not just hidden from its own author', stillVisibleToB, 0);

    const cleanupDone = await waitUntilE2E(async () => {
      const likes = await readLikesCollectionAdmin(SEED_POST_ID, deleteCommentId);
      const c = await readCommentAdmin(SEED_POST_ID, deleteCommentId);
      return likes.size === 0 && c.data()?.likesCount === 0;
    });
    assertValue('I6 the cleanupCommentLikes backend trigger completes (Admin/emulator-side polling on an exact condition, not an arbitrary sleep)', cleanupDone, true);

    const finalLikes = await readLikesCollectionAdmin(SEED_POST_ID, deleteCommentId);
    const finalComment = await readCommentAdmin(SEED_POST_ID, deleteCommentId);
    assertValue('I7 both nested like documents are physically removed (Admin/emulator-side verification)', finalLikes.size, 0);
    assertValue('I8 the stored likesCount is exactly 0 after cleanup', finalComment.data()?.likesCount, 0);

    const reLikeAttemptA = await userA.page.evaluate(async ({ postId, commentId }) => {
      const mod = await import('/src/components/Community/testHelpers/e2eDirectCalls.ts');
      return mod.e2eToggleLikeDirect(postId, commentId, 'like');
    }, { postId: SEED_POST_ID, commentId: deleteCommentId });
    assertValue('I9 User A (the comment\'s own author) cannot like the deleted comment — rejected as not-found', reLikeAttemptA.ok, false);
    assertValue('I9b the rejection code is not-found', reLikeAttemptA.code, 'functions/not-found');

    const reLikeAttemptB = await userB.page.evaluate(async ({ postId, commentId }) => {
      const mod = await import('/src/components/Community/testHelpers/e2eDirectCalls.ts');
      return mod.e2eToggleLikeDirect(postId, commentId, 'like');
    }, { postId: SEED_POST_ID, commentId: deleteCommentId });
    assertValue('I10 User B cannot like the deleted comment either — rejected as not-found', reLikeAttemptB.ok, false);
    assertValue('I10b the rejection code is not-found', reLikeAttemptB.code, 'functions/not-found');

    // ProfileSheet.tsx is always mounted (translated off-screen via CSS
    // transform when closed, never unmounted — see its `transform: open ?
    // 'translateY(0)' : 'translateY(100%)'`), so each user's OWN page always
    // contains their OWN email in the DOM; that is the already-proven-safe
    // behavior from section 5 (E1), not a leak. The actual privacy property
    // to check here is that the OTHER user's email never appears.
    const postPageTextA = await userA.page.evaluate(() => document.body.innerText);
    assertValue('I11 User B\'s email never appears anywhere in User A\'s post page UI during/after the deletion+cleanup flow', postPageTextA.includes(userB.email), false);
    const postPageTextB = await userB.page.evaluate(() => document.body.innerText);
    assertValue('I12 User A\'s email never appears anywhere in User B\'s post page UI during/after the deletion+cleanup flow', postPageTextB.includes(userA.email), false);

    console.log('\n=== 10. Post likes — real UI wiring, text and image posts ===');

    async function readPostAdmin(postId: string): Promise<DocumentSnapshot<DocumentData>> {
      let result: DocumentSnapshot<DocumentData>;
      await testEnv.withSecurityRulesDisabled(async ctx => {
        result = await getDoc(doc(ctx.firestore(), 'posts', postId));
      });
      return result!;
    }
    async function readPostLikesCollectionAdmin(postId: string): Promise<QuerySnapshot<DocumentData>> {
      let result: QuerySnapshot<DocumentData>;
      await testEnv.withSecurityRulesDisabled(async ctx => {
        result = await getDocs(collection(ctx.firestore(), 'posts', postId, 'likes'));
      });
      return result!;
    }

    // 10a. Text post: like via the real UI, reload persists it, unlike via the real UI.
    await backToFeed(userA.page).catch(() => {});
    await openPostByText(userA.page, SEED_POST_TEXT);
    const postLikeButtonDetail = userA.page.locator('button[aria-label="أعجبني هذا المنشور"], button[aria-label="إلغاء الإعجاب بهذا المنشور"]');
    await postLikeButtonDetail.click();
    await userA.page.waitForFunction(
      () => !!document.querySelector('button[aria-label="إلغاء الإعجاب بهذا المنشور"]'),
      undefined, { timeout: 8000 },
    );
    record('J1 the post-detail like button switches to the liked (filled) state after clicking', true);
    await userA.page.waitForFunction(
      () => (document.querySelector('button[aria-label="إلغاء الإعجاب بهذا المنشور"]') as HTMLButtonElement | null)?.disabled === false,
      undefined, { timeout: 8000 },
    );

    const postLikedAfterServer = await waitUntilE2E(async () => (await readPostAdmin(SEED_POST_ID)).data()?.likesCount >= 1);
    assertValue('J2 the real togglePostLike call landed server-side — likesCount is at least 1', postLikedAfterServer, true);

    await userA.page.reload({ waitUntil: 'domcontentloaded' });
    await userA.page.waitForFunction(() => document.querySelector('h1')?.textContent === 'المجتمع', undefined, { timeout: 10000 });
    await openPostByText(userA.page, SEED_POST_TEXT);
    const stillLikedAfterReload = await userA.page.waitForFunction(
      () => !!document.querySelector('button[aria-label="إلغاء الإعجاب بهذا المنشور"]'),
      undefined, { timeout: 8000 },
    ).then(() => true, () => false);
    assertValue('J3 the like state PERSISTS across a full page reload (real server state, not just optimistic UI)', stillLikedAfterReload, true);

    await postLikeButtonDetail.click();
    await userA.page.waitForFunction(
      () => !!document.querySelector('button[aria-label="أعجبني هذا المنشور"]'),
      undefined, { timeout: 8000 },
    );
    record('J4 unliking via the real UI switches the button back to the not-liked state', true);

    // 10b. Image post — the composer's own image-upload control is
    // currently disabled in the UI (PostComposer.tsx: `<button disabled
    // aria-describedby="image-upload-disabled-message">`, "رفع الصور غير
    // متاح حالياً — سيتم تفعيله قريباً"), a pre-existing, disclosed, D4
    // product decision entirely unrelated to this task's 3 confirmed bugs
    // — so a real end-to-end image UPLOAD cannot be driven through this
    // build's UI. What CAN and must be proven is that the LIKE mechanism
    // itself is identical for an image post once one exists: seeded here
    // directly (same admin-fixture convention as SEED_POST_ID above),
    // exactly matching the schema useComposer.ts would have produced had
    // upload been enabled, then liked through the real feed AND detail UI.
    const IMAGE_POST_ID = 'e2e-image-post-1';
    const IMAGE_POST_TEXT = 'منشور بصورة لاختبار الإعجاب — لا تحذف';
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'posts', IMAGE_POST_ID), {
        authorId: 'e2e-seed-author', authorName: 'Seed Author', authorPhoto: null,
        text: IMAGE_POST_TEXT, category: 'questions', mediaType: 'image',
        mediaURL: 'https://example-test.invalid/full.jpg', thumbnailURL: 'https://example-test.invalid/thumb.jpg',
        mediaSize: 100000, mediaDuration: null, mediaPath: `community/posts/${IMAGE_POST_ID}`,
        commentsCount: 0, likesCount: 0, createdAt: serverTimestamp(), status: 'active', searchTokens: ['منشور', 'صورة'],
        feedScore: 100, // Phase 2 — see SEED_POST_ID's own comment above for why this is required on every admin fixture
      });
    });

    await backToFeed(userB.page).catch(() => {});
    await userB.page.waitForFunction(
      (t: string) => document.body.textContent?.includes(t) ?? false, IMAGE_POST_TEXT, { timeout: 10000 },
    ).catch(async () => { await userB.page.reload({ waitUntil: 'domcontentloaded' }); });
    const feedImageLikeButton = userB.page.locator('p', { hasText: IMAGE_POST_TEXT })
      .locator('xpath=ancestor::div[1]')
      .locator('button[aria-label="أعجبني هذا المنشور"], button[aria-label="إلغاء الإعجاب بهذا المنشور"]');
    await feedImageLikeButton.click();
    await userB.page.waitForFunction(
      (t: string) => {
        const p = Array.from(document.querySelectorAll('p')).find(el => el.textContent === t);
        const card = p?.closest('div[role="button"]');
        return card?.querySelector('button[aria-label="إلغاء الإعجاب بهذا المنشور"]') != null;
      },
      IMAGE_POST_TEXT, { timeout: 8000 },
    );
    record('K1 an IMAGE post can be liked directly from its FEED card — the like belongs to the post, not a separate per-image system', true);

    await openPostByText(userB.page, IMAGE_POST_TEXT);
    const detailImageLikeCountVisible = await userB.page.waitForFunction(
      () => document.body.textContent?.includes('1') && !!document.querySelector('button[aria-label="إلغاء الإعجاب بهذا المنشور"]'),
      undefined, { timeout: 8000 },
    ).then(() => true, () => false);
    assertValue('K2 the SAME like state and count are visible from the post-detail view immediately after liking from the feed', detailImageLikeCountVisible, true);

    // 10c. Concurrent likes from two different real users on the same post.
    // Reset B's like from 10b first so this section starts from a clean count.
    await userB.page.evaluate(async ({ postId }) => {
      const mod = await import('/src/components/Community/testHelpers/e2eDirectCalls.ts');
      return mod.e2eTogglePostLikeDirect(postId, 'unlike');
    }, { postId: IMAGE_POST_ID });
    // useFeed.ts is a one-time fetch, not a realtime listener — userA's feed
    // was last loaded before the image post existed, so a plain
    // backToFeed()+openPostByText() would race a page that genuinely
    // doesn't have this post yet. A reload forces a fresh fetch.
    await userA.page.reload({ waitUntil: 'domcontentloaded' });
    await userA.page.waitForFunction(() => document.querySelector('h1')?.textContent === 'المجتمع', undefined, { timeout: 10000 });
    await openPostByText(userA.page, IMAGE_POST_TEXT);
    await backToFeed(userB.page).catch(() => {});
    await openPostByText(userB.page, IMAGE_POST_TEXT);
    const postLikeBtnA = userA.page.locator('button[aria-label="أعجبني هذا المنشور"]');
    const postLikeBtnB = userB.page.locator('button[aria-label="أعجبني هذا المنشور"]');
    await Promise.all([postLikeBtnA.click(), postLikeBtnB.click()]);
    const concurrentPostLikeCountOk = await waitUntilE2E(async () => (await readPostAdmin(IMAGE_POST_ID)).data()?.likesCount === 2);
    assertValue('L1 two concurrent real-user likes on the same post resolve to an exact count of 2 (no lost update)', concurrentPostLikeCountOk, true);

    // 10d. Direct client-SDK bypass fails from a real authenticated session.
    const bypassPostLikeCreate = await userA.page.evaluate(async ({ postId }) => {
      const mod = await import('/src/components/Community/testHelpers/e2eBypass.ts');
      return mod.e2eAttemptDirectPostLikeCreate(postId, 'forced-uid-does-not-matter-rules-deny-regardless');
    }, { postId: IMAGE_POST_ID });
    assertValue('M1 a direct Firestore post-like create from a real signed-in session is denied', bypassPostLikeCreate.ok, false);
    assertValue('M1b the denial is permission-denied', bypassPostLikeCreate.code, 'permission-denied');

    const bypassPostLikesCountBump = await userA.page.evaluate(async ({ postId }) => {
      const mod = await import('/src/components/Community/testHelpers/e2eBypass.ts');
      return mod.e2eAttemptDirectPostLikesCountBump(postId);
    }, { postId: IMAGE_POST_ID });
    assertValue('M2 a direct Firestore likesCount bump from a real signed-in session is denied', bypassPostLikesCountBump.ok, false);
    assertValue('M2b the denial is permission-denied', bypassPostLikesCountBump.code, 'permission-denied');

    // 10e. A hidden/deleted post cannot be liked, and a client-supplied uid
    // override in the callable payload is ignored (always request.auth.uid).
    const HIDDEN_POST_ID = 'e2e-hidden-post-1';
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'posts', HIDDEN_POST_ID), {
        authorId: 'e2e-seed-author', authorName: 'Seed Author', authorPhoto: null,
        text: 'منشور مخفي', category: 'questions', mediaType: 'none', mediaURL: null,
        thumbnailURL: null, mediaSize: null, mediaDuration: null, mediaPath: null,
        commentsCount: 0, likesCount: 0, createdAt: serverTimestamp(), status: 'hidden', searchTokens: [],
      });
    });
    const hiddenPostLikeAttempt = await userA.page.evaluate(async ({ postId }) => {
      const mod = await import('/src/components/Community/testHelpers/e2eDirectCalls.ts');
      return mod.e2eTogglePostLikeDirect(postId, 'like');
    }, { postId: HIDDEN_POST_ID });
    assertValue('N1 a hidden post cannot be liked — rejected as not-found', hiddenPostLikeAttempt.ok, false);
    assertValue('N1b the rejection code is not-found', hiddenPostLikeAttempt.code, 'functions/not-found');

    const forgedUidAttempt = await userA.page.evaluate(async ({ postId }) => {
      const mod = await import('/src/components/Community/testHelpers/e2eDirectCalls.ts');
      return mod.e2eTogglePostLikeDirect(postId, 'like', { uid: 'someone-else-entirely' });
    }, { postId: IMAGE_POST_ID });
    const forgedUidLikeDoc = await readPostLikesCollectionAdmin(IMAGE_POST_ID);
    assertValue('N2 a client-supplied "uid" field in the callable payload never creates a like under that forged uid', forgedUidLikeDoc.docs.some(d => d.id === 'someone-else-entirely'), false);
    void forgedUidAttempt;

    console.log('\n=== 11. User search — English case-insensitive prefix, whitespace normalization, and the exact production fix for a pre-existing account ===');
    console.log('    (Arabic prefix search is already covered by section 6 above — User B searching for');
    console.log('    "مستخدم اختبار أ" and finding User A — this section covers the remaining required cases.)');

    // A user document seeded WITHOUT displayNameNormalized — deliberately
    // simulating exactly the deployed production bug: an account bootstrapped
    // before that field existed. No real Auth account is needed behind this
    // uid; PublicProfile.tsx and useUserSearch.ts only ever read the
    // Firestore document by id.
    const LEGACY_UID = 'e2e-legacy-account-no-normalized';
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'users', LEGACY_UID), {
        displayName: 'Legacy English Pilot', photoURL: null, joinedAt: serverTimestamp(),
        postsCount: 0, role: 'user', status: 'active', lastPostAt: null, lastCommentAt: null,
        // displayNameNormalized intentionally omitted — this IS the bug.
      });
    });

    await backToFeed(userB.page).catch(() => {});
    await userB.page.locator('button[aria-label="بحث"]').click();
    await userB.page.locator('input[placeholder^="ابحث"]').fill('Legacy');
    await userB.page.waitForTimeout(600); // clears the 300ms debounce window
    const legacyNotFoundYet = await userB.page.evaluate(() => document.body.innerText).then(t => t.includes('لا توجد حسابات مطابقة'));
    assertValue('O1 an old account missing displayNameNormalized fails SAFELY — no crash, no error, just correctly reports no match (reproduces the exact deployed bug)', legacyNotFoundYet, true);

    // Run the exact backfill the production runbook specifies (same
    // normalizeDisplayName function the real migration scripts use) —
    // proving the documented fix procedure actually closes the gap.
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'users', LEGACY_UID), {
        displayNameNormalized: normalizeDisplayName('Legacy English Pilot'),
      }, { merge: true });
    });

    await userB.page.locator('input[placeholder^="ابحث"]').fill('');
    await userB.page.locator('input[placeholder^="ابحث"]').fill('legacy'); // lowercase — case-insensitive prefix
    const legacyFoundAfterMigration = await userB.page.waitForFunction(
      (name: string) => document.body.textContent?.includes(name) ?? false, 'Legacy English Pilot', { timeout: 8000 },
    ).then(() => true, () => false);
    assertValue('O2 after the exact migration procedure runs, the SAME account is found with a lowercase, case-insensitive query — proving the documented fix closes the gap end-to-end', legacyFoundAfterMigration, true);

    await userB.page.locator('input[placeholder^="ابحث"]').fill('');
    await userB.page.locator('input[placeholder^="ابحث"]').fill('  Legacy  '); // leading/trailing whitespace
    const legacyFoundWithWhitespace = await userB.page.waitForFunction(
      (name: string) => document.body.textContent?.includes(name) ?? false, 'Legacy English Pilot', { timeout: 8000 },
    ).then(() => true, () => false);
    assertValue('O3 leading/trailing whitespace in the query is normalized away — the account is still found', legacyFoundWithWhitespace, true);

    await userB.page.getByText('Legacy English Pilot', { exact: true }).click();
    const legacyProfileOpened = await userB.page.waitForFunction(
      () => document.body.textContent?.includes('الملف الشخصي') ?? false,
      undefined, { timeout: 8000 },
    ).then(() => true, () => false);
    assertValue('O4 selecting the search result opens the correct public profile', legacyProfileOpened, true);
    // PublicProfile.tsx's own user-document fetch is async (shows "جارٍ
    // التحميل..." until it resolves) — wait for the actual name, not just
    // the static header, before checking it.
    const legacyProfileNameShown = await userB.page.waitForFunction(
      (name: string) => document.body.textContent?.includes(name) ?? false, 'Legacy English Pilot', { timeout: 8000 },
    ).then(() => true, () => false);
    assertValue('O4b the opened profile shows the correct account name', legacyProfileNameShown, true);

    console.log('\n=== 12. Signed-in self-heal backfill — a REAL signed-in user\'s own account, no production migration run ===');
    console.log('    (Distinct from section 11 above: O1-O4 exercise a legacy uid with no real session behind it,');
    console.log('    requiring scripts/migrateDisplayNameNormalizedProd.ts. This section exercises User A\'s own,');
    console.log('    currently-signed-in account, which must self-heal merely by signing back in.)');

    async function readUserAdmin(uid: string): Promise<DocumentSnapshot<DocumentData>> {
      let result: DocumentSnapshot<DocumentData>;
      await testEnv.withSecurityRulesDisabled(async ctx => {
        result = await getDoc(doc(ctx.firestore(), 'users', uid));
      });
      return result!;
    }

    // Corrupt User A's OWN document directly (admin bypass — simulating an
    // account bootstrapped before displayNameNormalized existed, or one
    // whose value has gone stale), on the exact uid User A is actually
    // signed in as right now.
    const STALE_VALUE = 'stale-wrong-value-from-a-renamed-account';
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'users', userA.uid), {
        displayNameNormalized: STALE_VALUE,
      }, { merge: true });
    });
    const staleDoc = await readUserAdmin(userA.uid);
    assertValue('P1 the precondition is real: User A\'s own document now carries a stale displayNameNormalized value', staleDoc.data()?.displayNameNormalized, STALE_VALUE);

    await backToFeed(userB.page).catch(() => {});
    await userB.page.locator('button[aria-label="بحث"]').click();
    await userB.page.locator('input[placeholder^="ابحث"]').fill('مستخدم اختبار أ');
    await userB.page.waitForTimeout(600); // clears the 300ms debounce window
    const userANotFoundWhileStale = await userB.page.evaluate(() => document.body.innerText).then(t => t.includes('لا توجد حسابات مطابقة'));
    assertValue('P2 while stale, User A genuinely does not appear in User B\'s search results (the corruption really breaks search, not a no-op)', userANotFoundWhileStale, true);

    // A reload forces AuthContext to resolve a fresh currentUser object,
    // which re-runs useEnsureCommunityUser's bootstrap effect — the SAME
    // per-login mechanism every real sign-in goes through, not a
    // test-only shortcut.
    await userA.page.reload({ waitUntil: 'domcontentloaded' });
    await userA.page.waitForFunction(
      () => document.querySelector('h1')?.textContent === 'المجتمع',
      undefined, { timeout: 10000 },
    );

    const healed = await waitUntilE2E(async () => (await readUserAdmin(userA.uid)).data()?.displayNameNormalized === normalizeDisplayName('مستخدم اختبار أ'));
    assertValue('P3 after User A\'s next sign-in — no production migration script run — displayNameNormalized self-heals back to match their real displayName', healed, true);

    const healedDoc = await readUserAdmin(userA.uid);
    assertValue('P4 the self-heal never touched displayName itself', healedDoc.data()?.displayName, 'مستخدم اختبار أ');

    await userB.page.locator('input[placeholder^="ابحث"]').fill('');
    await userB.page.locator('input[placeholder^="ابحث"]').fill('مستخدم اختبار أ');
    const userAFoundAfterHeal = await userB.page.waitForFunction(
      (name: string) => document.body.textContent?.includes(name) ?? false, 'مستخدم اختبار أ', { timeout: 8000 },
    ).then(() => true, () => false);
    assertValue('P5 User B\'s search finds User A again after the self-heal, end-to-end through the real UI — no production migration was run for this account', userAFoundAfterHeal, true);

    console.log('\n=== 13. Bottom-nav Home button — always returns to the main Home feed ===');

    async function isOnFeed(page: Page): Promise<boolean> {
      return page.evaluate(() => document.querySelector('h1')?.textContent === 'المجتمع');
    }
    // Presses Home and waits for the feed marker to appear, returning
    // whether it actually did within the timeout — the reset is a React
    // state update (async re-render), so checking isOnFeed synchronously
    // right after the click races the render and produces false failures
    // unrelated to the feature itself.
    async function pressHomeAndWaitForFeed(page: Page, timeoutMs = 8000): Promise<boolean> {
      await page.locator('nav button', { hasText: 'الرئيسية' }).click();
      return page.waitForFunction(
        () => document.querySelector('h1')?.textContent === 'المجتمع', undefined, { timeout: timeoutMs },
      ).then(() => true, () => false);
    }
    async function homeTabIsActive(page: Page): Promise<boolean> {
      // isActive() styling in BottomNavigation.tsx applies font-bold to the
      // label span only on the active tab.
      return page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('nav button')).find(b => b.textContent?.includes('الرئيسية'));
        return !!btn?.querySelector('span')?.className.includes('font-bold');
      });
    }

    // 13a. From the SEARCH screen — User B is genuinely still there, left
    // over from section 12's P5 search (input[placeholder^="ابحث"] is only
    // rendered by SearchScreen.tsx, never the feed).
    const onSearchScreen = await userB.page.evaluate(() => !!document.querySelector('input[placeholder^="ابحث"]'));
    assertValue('Q1 precondition: User B is genuinely on the SEARCH screen, not the feed', onSearchScreen, true);
    assertValue('Q1b pressing Home from the SEARCH screen returns to the main feed', await pressHomeAndWaitForFeed(userB.page), true);
    assertValue('Q1c the Home tab is visibly active after the press', await homeTabIsActive(userB.page), true);

    // 13b. From POST-DETAIL.
    await openPostByText(userB.page, SEED_POST_TEXT);
    assertValue('Q2 precondition: User B is genuinely on the post-detail screen, not the feed', await isOnFeed(userB.page), false);
    assertValue('Q2b pressing Home from POST-DETAIL returns to the main feed', await pressHomeAndWaitForFeed(userB.page), true);

    // 13c. From a PUBLIC PROFILE.
    await openPostByText(userB.page, SEED_POST_TEXT);
    const authorAvatarBtnQ = userB.page.locator('p', { hasText: commentText1 })
      .locator('xpath=ancestor::div[2]')
      .locator('button')
      .first();
    await authorAvatarBtnQ.click();
    await userB.page.waitForFunction(
      () => document.body.textContent?.includes('الملف الشخصي') ?? false, undefined, { timeout: 8000 },
    );
    assertValue('Q3 pressing Home from a PUBLIC PROFILE returns to the main feed', await pressHomeAndWaitForFeed(userB.page), true);

    // 13d. From the PRIVATE PROFILE sheet (own profile — "القائمة" menu).
    // ProfileSheet is an overlay rendered ALONGSIDE the current `screen`
    // (which is already 'feed' here), so the feed's own h1 is present
    // underneath even before the sheet closes — checking for the feed
    // marker would prove nothing. The sheet's own content div is always
    // present in the DOM (it's animated closed via a CSS transform, not
    // conditionally unmounted — ProfileSheet.tsx:239-253), so checking for
    // its text is equally useless. The one element ProfileSheet.tsx
    // genuinely conditionally renders only `{open && (...)}` is its
    // backdrop (a fixed div, uniquely identified by zIndex:39 — confirmed
    // no other element in the app uses that exact value) — that presence/
    // absence is the real, non-animated open/closed signal.
    async function isProfileSheetOpen(page: Page): Promise<boolean> {
      return page.evaluate(() => Array.from(document.querySelectorAll('div')).some(d => (d as HTMLElement).style.zIndex === '39'));
    }
    await openMenu(userB.page);
    assertValue('Q4 precondition: User B\'s own (private) profile sheet is genuinely open', await isProfileSheetOpen(userB.page), true);
    await userB.page.locator('nav button', { hasText: 'الرئيسية' }).click();
    const privateProfileClosedAfterHome = await userB.page.waitForFunction(
      () => !Array.from(document.querySelectorAll('div')).some(d => (d as HTMLElement).style.zIndex === '39'),
      undefined, { timeout: 8000 },
    ).then(() => true, () => false);
    assertValue('Q4b pressing Home closes the open private-profile sheet', privateProfileClosedAfterHome, true);
    assertValue('Q4c pressing Home from the private-profile sheet also lands on the main feed', await isOnFeed(userB.page), true);

    // 13e. From SAVED.
    await userB.page.locator('button[aria-label="المحفوظات"]').click();
    await userB.page.waitForFunction(
      () => document.body.textContent?.includes('المنشورات المحفوظة') ?? false, undefined, { timeout: 8000 },
    );
    assertValue('Q5 pressing Home from SAVED returns to the main feed', await pressHomeAndWaitForFeed(userB.page), true);

    // 13f. From COMPOSE — CommunityHome's own compose entry point ("بماذا
    // تحتاج المساعدة اليوم؟", wired to handleComposeEntry -> onOpenCompose).
    await userB.page.getByText('بماذا تحتاج المساعدة اليوم؟', { exact: true }).click();
    await userB.page.waitForFunction(
      () => document.body.textContent?.includes('منشور جديد') ?? false, undefined, { timeout: 8000 },
    );
    assertValue('Q6 pressing Home from COMPOSE returns to the main feed', await pressHomeAndWaitForFeed(userB.page), true);

    // 13g. From an entirely different TOP-LEVEL app route (outside Community/Home altogether).
    await userB.page.goto(`${BASE}/roadmap`, { waitUntil: 'domcontentloaded' });
    await userB.page.waitForFunction(() => !!document.querySelector('nav'), undefined, { timeout: 10000 });
    const onRoadmapNotFeed = await userB.page.evaluate(() => document.querySelector('h1')?.textContent !== 'المجتمع');
    assertValue('Q7 precondition: User B is genuinely off Community entirely (on /roadmap)', onRoadmapNotFeed, true);
    assertValue('Q7b pressing Home from a completely different top-level route (/roadmap) lands on the main feed', await pressHomeAndWaitForFeed(userB.page, 10000), true);
    assertValue('Q7c the URL is genuinely /home after the press', new URL(userB.page.url()).pathname, '/home');

    // 13h. Idempotent when already on the feed — no error, no redirect loop.
    assertValue('Q8 pressing Home again while already on the feed is a safe no-op (still on the feed)', await pressHomeAndWaitForFeed(userB.page), true);
    const noPageErrorAfterIdempotentPress = await userB.page.evaluate(() => document.title.length > 0);
    assertValue('Q8b the page is still alive/functional after the idempotent press (no crash/redirect loop)', noPageErrorAfterIdempotentPress, true);

    console.log('\n=== 14. Secure image uploads for Community posts (Phase 9) ===');

    async function openComposer(page: Page) {
      await page.getByText('بماذا تحتاج المساعدة اليوم؟', { exact: true }).click();
      await page.waitForFunction(() => document.body.textContent?.includes('منشور جديد') ?? false, undefined, { timeout: 8000 });
    }
    async function pickImage(page: Page, base64: string, name: string, mimeType: string) {
      await page.locator('input[type="file"]').setInputFiles({ name, mimeType, buffer: Buffer.from(base64, 'base64') });
    }
    async function previewIsShown(page: Page): Promise<boolean> {
      return page.locator('button[aria-label="إزالة الصورة"]').isVisible().catch(() => false);
    }
    async function submitPost(page: Page) {
      await page.locator('button').filter({ hasText: /^نشر$/ }).click();
    }
    async function findPostIdByText(text: string): Promise<string | null> {
      let result: string | null = null;
      await testEnv.withSecurityRulesDisabled(async ctx => {
        const snap = await getDocs(query(collection(ctx.firestore(), 'posts'), where('text', '==', text)));
        result = snap.empty ? null : snap.docs[0].id;
      });
      return result;
    }
    // findPostIdByText matches on exact text, which does not work for an
    // image-only post (text: '') — an empty-string query would ambiguously
    // match every image-only post ever created in this run, not just the
    // one just published. This instead takes the single most-recent post
    // by a specific author, which is unambiguous immediately after a
    // controlled, sequential test submission.
    async function findLatestPostIdByAuthor(uid: string): Promise<string | null> {
      let result: string | null = null;
      await testEnv.withSecurityRulesDisabled(async ctx => {
        const snap = await getDocs(
          query(collection(ctx.firestore(), 'posts'), where('authorId', '==', uid), orderBy('createdAt', 'desc'), limit(1)),
        );
        result = snap.empty ? null : snap.docs[0].id;
      });
      return result;
    }
    async function countMediaFilesAdmin(uid: string, postId: string): Promise<number> {
      let count = 0;
      await testEnv.withSecurityRulesDisabled(async ctx => {
        const listing = await listAll(ref(ctx.storage(STORAGE_BUCKET_URL), `community/posts/${uid}/${postId}`));
        count = listing.items.length;
      });
      return count;
    }

    // The pre-existing 60s post rate limit (D11, unrelated to this phase) is
    // per-user and keyed off users/{uid}.lastPostAt — this section
    // deliberately submits many posts from the SAME User B session in quick
    // succession purely to exercise the upload pipeline, which would
    // otherwise start colliding with that real, correct rate limit after the
    // very first submission. Resetting it via admin bypass between
    // submissions is a test-harness concession to that unrelated pre-
    // existing feature, not a weakening of it — the rate limit itself is
    // untouched and is exercised on its own in scripts/testCommunityRules.ts.
    async function resetPostRateLimit(uid: string): Promise<void> {
      await testEnv.withSecurityRulesDisabled(async ctx => {
        await updateDoc(doc(ctx.firestore(), 'users', uid), { lastPostAt: null });
      });
    }

    console.log('\n--- 14a. UPLOAD: valid types succeed, real files land in Storage, real dimensions stored ---');

    async function uploadAndVerify(label: string, base64: string, fileName: string, mimeType: string): Promise<string | null> {
      await resetPostRateLimit(userB.uid);
      await backToFeed(userB.page).catch(() => {});
      await openComposer(userB.page);
      const postText = `منشور اختبار ${label} ${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await userB.page.locator('textarea').fill(postText);
      await pickImage(userB.page, base64, fileName, mimeType);
      const preview = await userB.page.waitForFunction(
        () => !!document.querySelector('button[aria-label="إزالة الصورة"]'), undefined, { timeout: 8000 },
      ).then(() => true, () => false);
      assertValue(`U-${label} preview appears after picking a valid ${label} file`, preview, true);

      await submitPost(userB.page);
      const postCreated = await userB.page.waitForFunction(
        () => document.body.textContent?.includes('المنشور') ?? false, undefined, { timeout: 15000 },
      ).then(() => true, () => false);
      assertValue(`U-${label} post-detail opens after a successful ${label} upload+publish`, postCreated, true);

      const postId = await findPostIdByText(postText);
      assertValue(`U-${label} the post document was actually created`, postId !== null, true);
      if (!postId) return null;

      const postDoc = await readPostAdmin(postId);
      const data = postDoc.data();
      assertValue(`U-${label} mediaType is "image"`, data?.mediaType, 'image');
      assertValue(`U-${label} mediaPath is uid-scoped to User B's own uid`, data?.mediaPath, `community/posts/${userB.uid}/${postId}`);
      assertValue(`U-${label} mediaWidth is a real positive number, never fabricated`, typeof data?.mediaWidth === 'number' && data.mediaWidth > 0, true);
      assertValue(`U-${label} mediaHeight is a real positive number, never fabricated`, typeof data?.mediaHeight === 'number' && data.mediaHeight > 0, true);
      // http:// (not https://) here is expected and correct: getDownloadURL()
      // resolves against the LOCAL Storage emulator (127.0.0.1:9199, plain
      // HTTP) in this test environment — production Firebase Storage always
      // serves over https://. The check that actually matters, and holds in
      // both environments, is that it's a real remote URL, never a local
      // blob:/file:/data: reference.
      assertValue(`U-${label} mediaURL is a real remote Storage URL, never a local blob:/file:/data: path`, /^https?:\/\//.test(data?.mediaURL ?? ''), true);

      const fileCount = await countMediaFilesAdmin(userB.uid, postId);
      assertValue(`U-${label} exactly 2 real files (full + thumbnail) exist in Storage at the uid-scoped path`, fileCount, 2);
      return postId;
    }

    const jpegPostId = await uploadAndVerify('JPEG', JPEG_1X1_B64, 'photo.jpg', 'image/jpeg');
    const pngPostId = await uploadAndVerify('PNG', PNG_1X1_B64, 'photo.png', 'image/png');
    await uploadAndVerify('WEBP', WEBP_1X1_B64, 'photo.webp', 'image/webp');

    console.log('\n--- 14b. UPLOAD: client-side rejection before ever reaching Storage ---');

    await backToFeed(userB.page).catch(() => {});
    await openComposer(userB.page);
    const draftTextBeforeRejections = `مسودة نص يجب أن تبقى ${Date.now()}`;
    await userB.page.locator('textarea').fill(draftTextBeforeRejections);

    await pickImage(userB.page, Buffer.from('plain text pretending to be an image').toString('base64'), 'fake.txt', 'text/plain');
    const invalidMimeError = await userB.page.waitForFunction(
      () => document.body.textContent?.includes('الصيغ المسموحة') ?? false, undefined, { timeout: 5000 },
    ).then(() => true, () => false);
    assertValue('U-INVALID-MIME an invalid MIME type is rejected client-side with a clear Arabic error', invalidMimeError, true);
    assertValue('U-INVALID-MIME no preview is shown for the rejected file', await previewIsShown(userB.page), false);

    await pickImage(userB.page, Buffer.from(SVG_PAYLOAD).toString('base64'), 'evil.svg', 'image/svg+xml');
    const svgError = await userB.page.waitForFunction(
      () => document.body.textContent?.includes('الصيغ المسموحة') ?? false, undefined, { timeout: 5000 },
    ).then(() => true, () => false);
    assertValue('U-SVG an SVG file (XML/script-capable, not a raster image) is rejected client-side', svgError, true);

    const oversizedBuffer = Buffer.alloc(21 * 1024 * 1024, 0xff);
    await userB.page.locator('input[type="file"]').setInputFiles({ name: 'huge.jpg', mimeType: 'image/jpeg', buffer: oversizedBuffer });
    const oversizedError = await userB.page.waitForFunction(
      () => document.body.textContent?.includes('حجم الصورة كبير جداً') ?? false, undefined, { timeout: 5000 },
    ).then(() => true, () => false);
    assertValue('U-OVERSIZED a file over the 20MB raw ceiling is rejected client-side, before any compression/upload attempt', oversizedError, true);

    await pickImage(userB.page, Buffer.from('not actually decodable image bytes').toString('base64'), 'corrupt.jpg', 'image/jpeg');
    const corruptError = await userB.page.waitForFunction(
      () => document.body.textContent?.includes('تعذّر قراءة هذه الصورة') ?? false, undefined, { timeout: 8000 },
    ).then(() => true, () => false);
    assertValue('U-CORRUPT a file with an allowed MIME type but undecodable bytes (a renamed non-image) is rejected after the real decode check', corruptError, true);

    console.log('\n--- 14c. UPLOAD: draft text is preserved across a rejected image pick ---');
    const draftTextPreserved = await userB.page.locator('textarea').inputValue();
    assertValue('U-DRAFT the composer\'s text draft is byte-for-byte untouched by any of the 4 rejected picks above', draftTextPreserved, draftTextBeforeRejections);

    console.log('\n--- 14d. UPLOAD: remove and replace work via the real UI ---');
    await pickImage(userB.page, PNG_1X1_B64, 'first.png', 'image/png');
    await userB.page.waitForFunction(() => !!document.querySelector('button[aria-label="إزالة الصورة"]'), undefined, { timeout: 8000 });
    assertValue('U-REPLACE the add-image button now reads "استبدال الصورة" once an image is selected', await userB.page.getByLabel('استبدال الصورة').isVisible(), true);
    await pickImage(userB.page, JPEG_1X1_B64, 'second.jpg', 'image/jpeg');
    await userB.page.waitForTimeout(300);
    assertValue('U-REPLACE picking a new image while one is already selected replaces it (still exactly one preview, not two)', await userB.page.locator('button[aria-label="إزالة الصورة"]').count(), 1);
    await userB.page.locator('button[aria-label="إزالة الصورة"]').click();
    assertValue('U-REMOVE removing the image clears the preview', await previewIsShown(userB.page), false);
    assertValue('U-REMOVE the add-image button reverts to "إضافة صورة" after removal', await userB.page.getByLabel('إضافة صورة').isVisible(), true);

    console.log('\n--- 14e. UPLOAD: duplicate-submit prevention (same established pattern as the comment composer) ---');
    await resetPostRateLimit(userB.uid);
    await userB.page.locator('textarea').fill(`منشور اختبار قفل الإرسال ${Date.now()}`);
    await pickImage(userB.page, JPEG_1X1_B64, 'dup-guard.jpg', 'image/jpeg');
    await userB.page.waitForFunction(() => !!document.querySelector('button[aria-label="إزالة الصورة"]'), undefined, { timeout: 8000 });
    const submitClickPromise = submitPost(userB.page);
    // Correction pass: the button now shows a phase-specific label for an
    // image submission ("جارٍ رفع الصورة..." while uploading, "جارٍ نشر
    // المنشور..." once uploads finish and the Firestore write is underway)
    // instead of one generic "جارٍ النشر..." string — either phase string
    // is valid evidence of "real, honest feedback and disabled," since
    // which one is captured depends on exactly when this poll fires
    // relative to the upload's own progress.
    const submitDisabledWhilePending = await userB.page.waitForFunction(
      () => Array.from(document.querySelectorAll('button')).some(
        b => (b.textContent === 'جارٍ رفع الصورة...' || b.textContent === 'جارٍ نشر المنشور...') && b.disabled,
      ),
      undefined, { timeout: 3000 },
    ).then(() => true, () => false);
    assertValue('U-DUPLICATE the publish button shows real, phase-specific feedback ("جارٍ رفع الصورة..." / "جارٍ نشر المنشور...") and is disabled while the upload+publish is pending', submitDisabledWhilePending, true);
    await submitClickPromise;
    await userB.page.waitForFunction(() => document.body.textContent?.includes('المنشور') ?? false, undefined, { timeout: 15000 });

    console.log('\n--- 14f. UPLOAD: unauthenticated / cross-user Storage bypass attempts are denied ---');

    const guestUploadContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const guestUploadPage = await guestUploadContext.newPage();
    await guestUploadPage.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded' });
    const guestUploadResult = await guestUploadPage.evaluate(async ({ path }) => {
      const mod = await import('/src/components/Community/testHelpers/e2eBypass.ts');
      return mod.e2eAttemptDirectStorageUpload(path, 'image/jpeg');
    }, { path: `community/posts/${userB.uid}/some-post-id/11111111-1111-1111-1111-111111111111.jpg` });
    assertValue('U-GUEST an unauthenticated Storage upload attempt is denied', guestUploadResult.ok, false);
    await guestUploadContext.close();

    const crossUserUploadResult = await userA.page.evaluate(async ({ path }) => {
      const mod = await import('/src/components/Community/testHelpers/e2eBypass.ts');
      return mod.e2eAttemptDirectStorageUpload(path, 'image/jpeg');
    }, { path: `community/posts/${userB.uid}/some-post-id/22222222-2222-2222-2222-222222222222.jpg` });
    assertValue('U-CROSS-USER User A cannot upload into User B\'s uid-scoped Storage path', crossUserUploadResult.ok, false);

    console.log('\n--- 14g. UPLOAD: a successful upload followed by a failed Firestore write cleans up the orphan ---');

    const orphanResult = await userB.page.evaluate(async ({ base64, name, type }) => {
      const mod = await import('/src/components/Community/testHelpers/e2eMediaOrphanCleanup.ts');
      return mod.e2eProveOrphanCleanup({ name, type, dataUrl: `data:${type};base64,${base64}` });
    }, { base64: JPEG_1X1_B64, name: 'orphan.jpg', type: 'image/jpeg' });
    assertValue('U-ORPHAN the upload itself genuinely succeeded (real files reached Storage)', orphanResult.uploadSucceeded, true);
    assertValue('U-ORPHAN the paired Firestore post-create write genuinely failed (an invalid shape, denied by firestore.rules)', orphanResult.firestoreWriteFailed, true);
    assertValue('U-ORPHAN deleteMedia ran to completion without throwing', orphanResult.deleteRanWithoutThrowing, true);
    assertValue('U-ORPHAN deleteMedia\'s own structured result reports fullySucceeded (both real objects genuinely removed, not merely "didn\'t throw")', orphanResult.deleteResult?.fullySucceeded, true);
    if (orphanResult.mediaPath) {
      const orphanFilesRemaining = await (async () => {
        let count = 0;
        await testEnv.withSecurityRulesDisabled(async ctx => {
          const listing = await listAll(ref(ctx.storage(STORAGE_BUCKET_URL), orphanResult.mediaPath!));
          count = listing.items.length;
        });
        return count;
      })();
      assertValue('U-ORPHAN the orphaned files are actually gone from Storage after deleteMedia — no leaked storage cost from the failed post', orphanFilesRemaining, 0);
    }

    console.log('\n--- 14h. UPLOAD: deleteMedia structured result — already-missing and cross-user-denied (correction pass) ---');

    // Case 1: one of the two objects is already gone before deleteMedia
    // runs (real infra can produce this deterministically — the OWNER can
    // delete their own object directly per storage.rules, unlike the
    // "one succeeds / one fails" and "transient-then-retry" cases, which
    // are covered instead by scripts/testMediaDeleteRetry.ts's pure unit
    // tests since both real objects share one owner path and one rule).
    const uploadForMissingTest = await userB.page.evaluate(async ({ base64, name, type }) => {
      const mod = await import('/src/components/Community/testHelpers/e2eMediaOrphanCleanup.ts');
      return mod.e2eUploadMediaForTest({ name, type, dataUrl: `data:${type};base64,${base64}` });
    }, { base64: JPEG_1X1_B64, name: 'missing-thumb.jpg', type: 'image/jpeg' });
    assertValue('U-DELETE-MISSING precondition: the upload for this case genuinely succeeded', uploadForMissingTest.media !== null, true);

    if (uploadForMissingTest.media) {
      const media = uploadForMissingTest.media;
      const thumbPath = `${media.mediaPath}/${media.uuid}_thumb.jpg`;
      const preDeleteThumb = await userB.page.evaluate(async ({ path }) => {
        const mod = await import('/src/components/Community/testHelpers/e2eBypass.ts');
        return mod.e2eAttemptDirectStorageDelete(path);
      }, { path: thumbPath });
      assertValue('U-DELETE-MISSING precondition: the owner can delete their own thumbnail object directly (storage.rules owner-delete)', preDeleteThumb.ok, true);

      const deleteResult = await userB.page.evaluate(async ({ media }) => {
        const mod = await import('/src/components/Community/testHelpers/e2eMediaOrphanCleanup.ts');
        return mod.e2eDeleteMediaAndReport(media);
      }, { media });
      assertValue('U-DELETE-MISSING deleteMedia reports the full image as "deleted" (it was genuinely still there)', deleteResult.full, 'deleted');
      assertValue('U-DELETE-MISSING deleteMedia reports the pre-deleted thumbnail as "already-missing", not "failed"', deleteResult.thumbnail, 'already-missing');
      assertValue('U-DELETE-MISSING an already-missing object still counts as fullySucceeded — idempotent cleanup is success, not failure', deleteResult.fullySucceeded, true);
    }

    // Case 2: a NON-OWNER (User A) attempts to delete User B's still-fully-
    // present media pair. storage.rules denies both objects (uid mismatch),
    // and storage/unauthorized is not a retryable code, so both are
    // classified "failed" immediately -> the aggregate must be fullyFailed,
    // and — critically — the real files must still be verifiably present
    // in Storage afterward, proving deleteMedia never falsely claims
    // success on a genuinely denied delete.
    const uploadForDeniedTest = await userB.page.evaluate(async ({ base64, name, type }) => {
      const mod = await import('/src/components/Community/testHelpers/e2eMediaOrphanCleanup.ts');
      return mod.e2eUploadMediaForTest({ name, type, dataUrl: `data:${type};base64,${base64}` });
    }, { base64: PNG_1X1_B64, name: 'cross-user-delete.png', type: 'image/png' });
    assertValue('U-DELETE-DENIED precondition: the upload for this case genuinely succeeded', uploadForDeniedTest.media !== null, true);

    if (uploadForDeniedTest.media) {
      const media = uploadForDeniedTest.media;
      const deniedResult = await userA.page.evaluate(async ({ media }) => {
        const mod = await import('/src/components/Community/testHelpers/e2eMediaOrphanCleanup.ts');
        return mod.e2eDeleteMediaAndReport(media);
      }, { media });
      assertValue('U-DELETE-DENIED a non-owner\'s deleteMedia call reports BOTH objects as "failed" (storage.rules denies the delete)', deniedResult.fullyFailed, true);
      assertValue('U-DELETE-DENIED fullySucceeded is false — no false success claim on a genuinely denied delete', deniedResult.fullySucceeded, false);

      const stillPresentCount = await (async () => {
        let count = 0;
        await testEnv.withSecurityRulesDisabled(async ctx => {
          const listing = await listAll(ref(ctx.storage(STORAGE_BUCKET_URL), media.mediaPath));
          count = listing.items.length;
        });
        return count;
      })();
      assertValue('U-DELETE-DENIED the real files are STILL present in Storage afterward — the denial was real, not merely reported', stillPresentCount, 2);
    }

    console.log('\n=== 14i. Composer audit: image-only publish is independently valid (correction pass) ===');
    // Root cause of the pre-fix defect: PostComposer.tsx's own canSubmit was
    // `text.trim().length > 0 && !submitting` — it ignored imageFile
    // entirely, so a valid, ready-to-publish image with no text could never
    // enable the publish button. The fix is `(hasValidText ||
    // hasValidImage) && !submitting`, mirrored server-side in
    // firestore.rules (text may be empty when mediaType == 'image', but a
    // text-only post's text must still be genuinely non-whitespace). Every
    // assertion below drives the REAL composer UI, not an admin bypass.

    await resetPostRateLimit(userB.uid);
    await backToFeed(userB.page).catch(() => {});
    await openComposer(userB.page);

    const publishButton = () => userB.page.locator('button').filter({ hasText: /^نشر$/ });

    const emptyComposerDisabled = await publishButton().isDisabled();
    assertValue('IMG1 an entirely empty composer (no text, no image) keeps the publish button disabled', emptyComposerDisabled, true);

    await pickImage(userB.page, JPEG_1X1_B64, 'image-only.jpg', 'image/jpeg');
    await userB.page.waitForFunction(() => !!document.querySelector('button[aria-label="إزالة الصورة"]'), undefined, { timeout: 8000 });

    const enabledAfterImageOnly = await publishButton().isDisabled().then(disabled => !disabled);
    assertValue('IMG2 selecting a valid image with EMPTY text enables the publish button — the core correction-pass fix', enabledAfterImageOnly, true);

    const readinessTextShown = await userB.page.waitForFunction(
      () => document.body.textContent?.includes('الصورة جاهزة للنشر') ?? false, undefined, { timeout: 5000 },
    ).then(() => true, () => false);
    assertValue('IMG3 an honest "الصورة جاهزة للنشر" readiness status appears once the image is locally ready (not yet uploaded)', readinessTextShown, true);

    await userB.page.locator('button[aria-label="إزالة الصورة"]').click();
    const disabledAfterRemovingOnlyImage = await publishButton().isDisabled();
    assertValue('IMG4 removing the ONLY image (with text still empty) disables the publish button again', disabledAfterRemovingOnlyImage, true);

    // Text present + image removed -> still publishable via text alone.
    await userB.page.locator('textarea').fill(`نص فقط بدون صورة ${Date.now()}`);
    const enabledWithTextOnly = await publishButton().isDisabled().then(disabled => !disabled);
    assertValue('IMG5 with text present, the publish button is enabled even with no image selected (unaffected by the image-only fix)', enabledWithTextOnly, true);
    await userB.page.locator('textarea').fill('');

    // Re-pick for the actual image-only publish below.
    await pickImage(userB.page, JPEG_1X1_B64, 'image-only-2.jpg', 'image/jpeg');
    await userB.page.waitForFunction(() => !!document.querySelector('button[aria-label="إزالة الصورة"]'), undefined, { timeout: 8000 });
    await submitPost(userB.page);
    const imageOnlyPublished = await userB.page.waitForFunction(
      () => document.body.textContent?.includes('المنشور') ?? false, undefined, { timeout: 15000 },
    ).then(() => true, () => false);
    assertValue('IMG6 an image-only post (no text at all) publishes successfully end-to-end', imageOnlyPublished, true);

    const imageOnlyPostId = await findLatestPostIdByAuthor(userB.uid);
    assertValue('IMG6b the image-only post document was actually created', imageOnlyPostId !== null, true);

    if (imageOnlyPostId) {
      const imageOnlyDoc = await readPostAdmin(imageOnlyPostId);
      assertValue('IMG7 the created post has mediaType "image"', imageOnlyDoc.data()?.mediaType, 'image');
      assertValue('IMG7b the created post\'s text is genuinely empty, not a placeholder string', imageOnlyDoc.data()?.text, '');

      const noEmptyParagraph = await userB.page.evaluate(() =>
        !Array.from(document.querySelectorAll('p')).some(p => (p.textContent ?? '').trim() === ''),
      );
      assertValue('IMG8 the post-detail screen renders NO empty <p> element for the missing text (no meaningless empty paragraph)', noEmptyParagraph, true);

      const detailImageStillDecodes = await userB.page.waitForFunction(
        () => {
          const img = document.querySelector('main img, div img') as HTMLImageElement | null;
          return !!img && img.complete && img.naturalWidth > 0;
        },
        undefined, { timeout: 8000 },
      ).then(() => true, () => false);
      assertValue('IMG9 the image-only post\'s image still genuinely decodes on its own detail page', detailImageStillDecodes, true);

      // Post-like and comment regression on an image-only post specifically
      // — the like/comment systems must not assume post.text is non-empty.
      const likeButtonBefore = await userB.page.locator('button[aria-label="أعجبني هذا المنشور"]').click().then(() => true, () => false);
      assertValue('IMG10 the real like button on an image-only post\'s detail page is clickable', likeButtonBefore, true);
      // Reuses the file's own waitUntilE2E polling helper (defined above,
      // already used by the likes/cleanup sections earlier in this suite)
      // instead of a duplicated inline poll — same bounded-timeout, exact-
      // condition polling, just not reimplemented a second time.
      const likeLandedOnImageOnly = await waitUntilE2E(
        async () => ((await readPostAdmin(imageOnlyPostId)).data()?.likesCount ?? 0) >= 1,
        10000,
      );
      assertValue('IMG11 liking an image-only post genuinely lands server-side (likesCount >= 1)', likeLandedOnImageOnly, true);

      await submitComment(userB.page, `تعليق على منشور صورة فقط ${Date.now()}`);
      const commentLandedOnImageOnly = await waitUntilE2E(
        async () => ((await readPostAdmin(imageOnlyPostId)).data()?.commentsCount ?? 0) >= 1,
        10000,
      );
      assertValue('IMG12 commenting on an image-only post genuinely lands server-side (commentsCount >= 1)', commentLandedOnImageOnly, true);
    }

    console.log('\n--- 14i(ii). Image + optional caption publishes both correctly ---');
    await resetPostRateLimit(userB.uid);
    await backToFeed(userB.page).catch(() => {});
    await openComposer(userB.page);
    const captionText = `أي نوع من الموتورات هذا؟ ${Date.now()}`;
    await userB.page.locator('textarea').fill(captionText);
    await pickImage(userB.page, PNG_1X1_B64, 'image-caption.png', 'image/png');
    await userB.page.waitForFunction(() => !!document.querySelector('button[aria-label="إزالة الصورة"]'), undefined, { timeout: 8000 });
    await submitPost(userB.page);
    await userB.page.waitForFunction(() => document.body.textContent?.includes('المنشور') ?? false, undefined, { timeout: 15000 });
    const captionPostId = await findPostIdByText(captionText);
    assertValue('IMG13 the image+caption post was created', captionPostId !== null, true);
    if (captionPostId) {
      const captionDoc = await readPostAdmin(captionPostId);
      assertValue('IMG14 the image+caption post keeps mediaType "image"', captionDoc.data()?.mediaType, 'image');
      assertValue('IMG15 the image+caption post\'s text is the real caption, appearing exactly once (not duplicated)', captionDoc.data()?.text, captionText);
    }

    console.log('\n--- 14i(iii). Duplicate-submission proof: a genuine second real click on the same live button ---');
    // A unique per-run marker in the TEXT field (not an image-only post) —
    // deliberately so this section can query Firestore for an EXACT count
    // of posts carrying this marker, scoped to nothing else. This is the
    // correction-pass fix for the prior version's weaker proof, which only
    // checked findLatestPostIdByAuthor's single most-recent post and its
    // file count — that can never distinguish "exactly one post created"
    // from "a second post was also created a moment earlier/later by the
    // same author," since it never queries the total matching set.
    async function countPostsByAuthorAndText(uid: string, text: string): Promise<number> {
      let count = 0;
      await testEnv.withSecurityRulesDisabled(async ctx => {
        const snap = await getDocs(
          query(collection(ctx.firestore(), 'posts'), where('authorId', '==', uid), where('text', '==', text)),
        );
        count = snap.size;
      });
      return count;
    }
    async function findPostIdByAuthorAndText(uid: string, text: string): Promise<string | null> {
      let result: string | null = null;
      await testEnv.withSecurityRulesDisabled(async ctx => {
        const snap = await getDocs(
          query(collection(ctx.firestore(), 'posts'), where('authorId', '==', uid), where('text', '==', text)),
        );
        result = snap.empty ? null : snap.docs[0].id;
      });
      return result;
    }

    await resetPostRateLimit(userB.uid);
    await backToFeed(userB.page).catch(() => {});
    await openComposer(userB.page);
    const dupMarker = `منشور فريد لإثبات منع النقر المزدوج الحقيقي ${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await userB.page.locator('textarea').fill(dupMarker);
    await pickImage(userB.page, WEBP_1X1_B64, 'image-only-dup.webp', 'image/webp');
    await userB.page.waitForFunction(() => !!document.querySelector('button[aria-label="إزالة الصورة"]'), undefined, { timeout: 8000 });

    const dupCountBefore = await countPostsByAuthorAndText(userB.uid, dupMarker);
    assertValue('IMG-DUP-PRE precondition: no post carrying this unique marker exists yet', dupCountBefore, 0);

    const dupButton = publishButton();
    // The FIRST real click on the real DOM button — this is what actually
    // starts the upload+publish flow.
    await dupButton.click();
    // A SECOND real activation attempt on the exact same live button,
    // fired immediately, without waiting for the first submission to
    // settle — a genuine double-click, not merely an inspection of the
    // disabled attribute afterward. force:true bypasses Playwright's own
    // actionability wait (which would otherwise simply refuse to click a
    // disabled/detaching element and never tell us what a real second
    // click would do); if the click is swallowed, that is the BROWSER's
    // own native behavior for a disabled <button> (or one that has since
    // unmounted) receiving a dispatched click — a real observed outcome,
    // not a gap in this test's coverage. Whatever happens, the backend
    // cardinality checks below are the actual proof, not this outcome
    // string alone.
    const secondClickOutcome = await dupButton.click({ force: true, timeout: 2000 }).then(
      () => 'delivered' as const,
      (err: unknown) => `blocked (${String(err).split('\n')[0]})` as const,
    );
    console.log(`    second real click attempt on the same button: ${secondClickOutcome}`);

    await userB.page.waitForFunction(() => document.body.textContent?.includes('المنشور') ?? false, undefined, { timeout: 15000 });

    const dupCountAfter = await countPostsByAuthorAndText(userB.uid, dupMarker);
    assertValue('IMG16 exactly ONE post document exists for this unique marker after a genuine double-click attempt — never zero, never two', dupCountAfter, 1);

    const dupPostId = await findPostIdByAuthorAndText(userB.uid, dupMarker);
    if (dupPostId) {
      const dupFileCount = await countMediaFilesAdmin(userB.uid, dupPostId);
      assertValue('IMG17 exactly 2 Storage objects (1 full image + 1 thumbnail) exist for the surviving post — never 4, which a real duplicate publish would have produced', dupFileCount, 2);

      const dupDoc = await readPostAdmin(dupPostId);
      assertValue('IMG17b the surviving post genuinely carries this test\'s unique marker (proves it is THIS attempt\'s post, not a stray from elsewhere in the run)', dupDoc.data()?.text, dupMarker);
    }

    const dupNoErrorRemains = await userB.page.evaluate(() => !(document.body.textContent ?? '').includes('تعذر نشر المنشور'));
    assertValue('IMG18 no publish-error message remains visible after the double-click attempt settles', dupNoErrorRemains, true);

    // The real, correct "returns to expected state" here is that a
    // SUCCESSFUL publish navigates away from the composer entirely (see
    // HomeView.tsx's handlePosted -> setScreen({ name: 'post', ... })) —
    // there is no idle "نشر" button left to reappear, because the whole
    // composer (including its textarea) unmounts. Asserting a lingering
    // idle button would be asserting behavior this app does not have.
    const composerUnmountedAfterSuccess = await userB.page.locator('textarea').count().then(c => c === 0);
    assertValue('IMG19 the composer itself is gone (navigated to the post-detail screen) after a successful publish — no stray in-flight button left behind either', composerUnmountedAfterSuccess, true);

    console.log('\n=== 15. Image rendering across every Community surface ===');

    const RENDER_POST_TEXT = `منشور اختبار العرض ${Date.now()}`;
    await resetPostRateLimit(userB.uid);
    await backToFeed(userB.page).catch(() => {});
    await openComposer(userB.page);
    await userB.page.locator('textarea').fill(RENDER_POST_TEXT);
    await pickImage(userB.page, JPEG_1X1_B64, 'render-test.jpg', 'image/jpeg');
    await userB.page.waitForFunction(() => !!document.querySelector('button[aria-label="إزالة الصورة"]'), undefined, { timeout: 8000 });
    await submitPost(userB.page);
    await userB.page.waitForFunction(() => document.body.textContent?.includes('المنشور') ?? false, undefined, { timeout: 15000 });
    const renderPostId = await findPostIdByText(RENDER_POST_TEXT);

    const detailImageLoaded = await userB.page.waitForFunction(
      () => {
        const img = document.querySelector('main img, div img') as HTMLImageElement | null;
        return !!img && img.complete && img.naturalWidth > 0;
      },
      undefined, { timeout: 10000 },
    ).then(() => true, () => false);
    assertValue('R1 the uploaded image genuinely loads and decodes in POST DETAIL (naturalWidth > 0, not just a DOM src attribute)', detailImageLoaded, true);

    await backToFeed(userB.page);
    const feedImgCheck = await waitForCardImageDecoded(userB.page, RENDER_POST_TEXT);
    assertValue('R2 the uploaded image\'s thumbnail genuinely decodes in the FEED (naturalWidth/naturalHeight > 0, scoped to THIS post\'s own card — not merely present in the DOM)', feedImgCheck.decoded, true);
    assertValue('R2b the feed thumbnail\'s src is a real remote Storage/emulator URL, never blob:/data:/file:/local', feedImgCheck.validRemoteUrl, true);

    await openMenu(userB.page);
    await userB.page.getByLabel('فتح ملفك الشخصي').first().click().catch(async () => {
      await closeMenu(userB.page);
    });
    const onOwnProfile = await userB.page.waitForFunction(
      () => document.body.textContent?.includes('الملف الشخصي') ?? false, undefined, { timeout: 8000 },
    ).then(() => true, () => false);
    if (onOwnProfile) {
      const profileImgCheck = await waitForCardImageDecoded(userB.page, RENDER_POST_TEXT);
      assertValue('R3 the uploaded image genuinely decodes on the OWN PUBLIC PROFILE, scoped to THIS post\'s own card (not merely its text being present)', profileImgCheck.decoded, true);
      assertValue('R3b the profile thumbnail\'s src is a real remote Storage/emulator URL, never blob:/data:/file:/local', profileImgCheck.validRemoteUrl, true);
    } else {
      record('R3 the uploaded image genuinely decodes on the OWN PUBLIC PROFILE, scoped to THIS post\'s own card', false, 'could not reach own profile screen via the real UI');
      record('R3b the profile thumbnail\'s src is a real remote Storage/emulator URL', false, 'could not reach own profile screen via the real UI');
    }

    // Saves the post through the REAL bookmark button, not a direct
    // Firestore write — SavedPostIdsProvider fetches its id set ONCE on
    // mount (a plain getDocs, not a realtime onSnapshot listener), so a
    // write made outside its own toggleSaved() action is invisible to the
    // already-running session for the rest of this test, exactly as it
    // would be invisible to a real second browser tab until reloaded. Using
    // the real button both sidesteps that and is the more faithful test.
    await backToFeed(userB.page).catch(() => {});
    if (renderPostId) {
      const bookmarkClicked = await userB.page.locator('[role="button"]', { hasText: RENDER_POST_TEXT })
        .locator('button[aria-label="حفظ"]')
        .click()
        .then(() => true, () => false);
      assertValue('R4 precondition: the real bookmark button on the uploaded post\'s card was clicked', bookmarkClicked, true);

      await userB.page.locator('button[aria-label="المحفوظات"]').click();
      const savedImgCheck = await waitForCardImageDecoded(userB.page, RENDER_POST_TEXT);
      assertValue('R4 the uploaded image genuinely decodes in SAVED POSTS, scoped to THIS post\'s own card (not merely its text being present) after saving via the real bookmark button', savedImgCheck.decoded, true);
      assertValue('R4b the saved-post thumbnail\'s src is a real remote Storage/emulator URL, never blob:/data:/file:/local', savedImgCheck.validRemoteUrl, true);
      await backToFeed(userB.page).catch(() => {});
    }

    console.log('\n--- 15b. Full-screen preview ---');
    if (renderPostId) {
      await openPostByText(userB.page, RENDER_POST_TEXT);
      await userB.page.locator('button[aria-label="فتح الصورة بحجمها الكامل"]').click();
      const lightboxOpen = await userB.page.waitForFunction(
        () => !!document.querySelector('button[aria-label="إغلاق المعاينة"]'),
        undefined, { timeout: 5000 },
      ).then(() => true, () => false);
      assertValue('L1 clicking the post image opens a full-screen preview', lightboxOpen, true);
      await userB.page.keyboard.press('Escape');
      const lightboxClosedByEscape = await userB.page.waitForFunction(
        () => !document.querySelector('button[aria-label="إغلاق المعاينة"]'), undefined, { timeout: 5000 },
      ).then(() => true, () => false);
      assertValue('L2 pressing Escape closes the full-screen preview', lightboxClosedByEscape, true);

      await userB.page.locator('button[aria-label="فتح الصورة بحجمها الكامل"]').click();
      await userB.page.waitForFunction(() => !!document.querySelector('button[aria-label="إغلاق المعاينة"]'), undefined, { timeout: 5000 });
      await userB.page.mouse.click(20, 20);
      const lightboxClosedByBackdrop = await userB.page.waitForFunction(
        () => !document.querySelector('button[aria-label="إغلاق المعاينة"]'), undefined, { timeout: 5000 },
      ).then(() => true, () => false);
      assertValue('L3 clicking the backdrop closes the full-screen preview', lightboxClosedByBackdrop, true);

      await userB.page.locator('button[aria-label="فتح الصورة بحجمها الكامل"]').click();
      await userB.page.waitForFunction(() => !!document.querySelector('button[aria-label="إغلاق المعاينة"]'), undefined, { timeout: 5000 });
      await userB.page.locator('button[aria-label="إغلاق المعاينة"]').click();
      const lightboxClosedByButton = await userB.page.waitForFunction(
        () => !document.querySelector('button[aria-label="إغلاق المعاينة"]'), undefined, { timeout: 5000 },
      ).then(() => true, () => false);
      assertValue('L4 clicking the close button closes the full-screen preview', lightboxClosedByButton, true);

      console.log('\n--- 15b(ii). Lightbox dialog semantics + focus management (correction pass) ---');

      const originalBodyOverflow = await userB.page.evaluate(() => document.body.style.overflow);

      await userB.page.locator('button[aria-label="فتح الصورة بحجمها الكامل"]').click();
      await userB.page.waitForFunction(() => !!document.querySelector('button[aria-label="إغلاق المعاينة"]'), undefined, { timeout: 5000 });

      const dialogSemantics = await userB.page.evaluate(() =>
        !!document.querySelector('[role="dialog"][aria-modal="true"]'),
      );
      assertValue('L5 the lightbox container exposes role="dialog" and aria-modal="true"', dialogSemantics, true);

      const focusEnteredDialog = await userB.page.evaluate(() =>
        document.activeElement === document.querySelector('button[aria-label="إغلاق المعاينة"]'),
      );
      assertValue('L6 focus moves onto the close button as soon as the lightbox opens', focusEnteredDialog, true);

      const bodyScrollLocked = await userB.page.evaluate(() => document.body.style.overflow === 'hidden');
      assertValue('L7 body scrolling is locked (document.body.style.overflow === "hidden") while the lightbox is open', bodyScrollLocked, true);

      // The close button is the ONLY focusable element inside the dialog —
      // Tab/Shift+Tab must keep focus pinned there, never escape to the
      // page rendered behind the (visually opaque but otherwise
      // unprotected without a real trap) backdrop.
      await userB.page.keyboard.press('Tab');
      const tabStaysInside = await userB.page.evaluate(() =>
        document.activeElement === document.querySelector('button[aria-label="إغلاق المعاينة"]'),
      );
      assertValue('L8 pressing Tab keeps focus trapped inside the dialog (stays on the close button)', tabStaysInside, true);

      await userB.page.keyboard.press('Shift+Tab');
      const shiftTabStaysInside = await userB.page.evaluate(() =>
        document.activeElement === document.querySelector('button[aria-label="إغلاق المعاينة"]'),
      );
      assertValue('L9 pressing Shift+Tab also keeps focus trapped inside the dialog', shiftTabStaysInside, true);

      await userB.page.keyboard.press('Escape');
      await userB.page.waitForFunction(() => !document.querySelector('button[aria-label="إغلاق المعاينة"]'), undefined, { timeout: 5000 });

      const focusReturnedToOpener = await userB.page.evaluate(() =>
        document.activeElement?.getAttribute('aria-label') === 'فتح الصورة بحجمها الكامل',
      );
      assertValue('L10 closing the lightbox restores focus to the exact button that opened it', focusReturnedToOpener, true);

      const bodyOverflowAfterClose = await userB.page.evaluate(() => document.body.style.overflow);
      assertValue('L11 body scrolling style is restored to its exact pre-open value after the lightbox closes', bodyOverflowAfterClose, originalBodyOverflow);
    }

    console.log('\n--- 15c. Text-only posts remain unaffected ---');
    await resetPostRateLimit(userB.uid);
    await backToFeed(userB.page).catch(() => {});
    await openComposer(userB.page);
    const textOnlyPostText = `منشور نصي فقط بدون صورة ${Date.now()}`;
    await userB.page.locator('textarea').fill(textOnlyPostText);
    await submitPost(userB.page);
    const textOnlyCreated = await userB.page.waitForFunction(
      () => document.body.textContent?.includes('المنشور') ?? false, undefined, { timeout: 10000 },
    ).then(() => true, () => false);
    assertValue('T1 a text-only post (no image ever picked) still publishes normally', textOnlyCreated, true);
    const textOnlyPostId = await findPostIdByText(textOnlyPostText);
    if (textOnlyPostId) {
      const textOnlyDoc = await readPostAdmin(textOnlyPostId);
      assertValue('T2 a text-only post has mediaType "none" and every media field null', textOnlyDoc.data()?.mediaType, 'none');
    }

    console.log('\n=== 16. Media cleanup on hide/delete — real end-to-end proof ===');

    // T1's post-detail (the text-only post) is still the current screen —
    // openPostByText below needs to find RENDER_POST_TEXT's card, which
    // only renders on the feed.
    await backToFeed(userB.page).catch(() => {});

    if (renderPostId) {
      const filesBeforeOwnerDelete = await countMediaFilesAdmin(userB.uid, renderPostId);
      assertValue('C1 precondition: the render-test post\'s media files exist in Storage before deletion', filesBeforeOwnerDelete, 2);

      await openPostByText(userB.page, RENDER_POST_TEXT);
      await userB.page.locator('button[aria-label="حذف"]').click();
      await userB.page.locator('button', { hasText: 'تأكيد الحذف' }).click();
      await userB.page.waitForFunction(() => document.querySelector('h1')?.textContent === 'المجتمع', undefined, { timeout: 10000 });

      const ownerDeleteCleanedUp = await waitUntilE2E(async () => (await countMediaFilesAdmin(userB.uid, renderPostId)) === 0);
      assertValue('C2 owner-deleting an uploaded post (via the real UI) removes its Storage media end-to-end', ownerDeleteCleanedUp, true);
    }

    if (jpegPostId) {
      const filesBeforeHide = await countMediaFilesAdmin(userB.uid, jpegPostId);
      assertValue('C3 precondition: the JPEG upload test post\'s media files still exist before being hidden', filesBeforeHide, 2);
      await testEnv.withSecurityRulesDisabled(async ctx => {
        await updateDoc(doc(ctx.firestore(), 'posts', jpegPostId), { status: 'hidden' });
      });
      const hideCleanedUp = await waitUntilE2E(async () => (await countMediaFilesAdmin(userB.uid, jpegPostId)) === 0);
      assertValue('C4 a MODERATOR-hidden post\'s media is also removed (simulated via the same direct status write a real moderator action performs — this app has no in-UI moderator control, role/status changes are console-only per D10)', hideCleanedUp, true);
    }

    console.log('\n=== 17. Privacy — media metadata carries no private data ===');

    // Reuses the still-alive PNG upload-test post from section 14a (the
    // render-test post was deleted and the JPEG post hidden above, in
    // section 16 — this one was deliberately left untouched).
    if (pngPostId) {
      const doc_ = await readPostAdmin(pngPostId);
      const fullDocText = JSON.stringify(doc_.data());
      assertValue('P1 no email address appears anywhere in an image post\'s document fields', /@/.test(fullDocText), false);
      assertValue('P2 no local file path (file://, C:\\, /Users/, /home/) appears anywhere in an image post\'s document fields', /file:\/\/|[A-Za-z]:\\|\/Users\/|\/home\//.test(fullDocText), false);
      assertValue('P3 mediaURL is a genuine remote Storage URL, never a local blob:/file:/data: URL', /^https?:\/\//.test(doc_.data()?.mediaURL ?? ''), true);
    }

    await testEnv.cleanup();

    console.log('\n=== 18. Suite-owned process/port cleanup verification ===');
    // Runs BEFORE the final results line (so its own pass/fail is part of
    // the reported total, per the correction pass's "fail the suite
    // clearly if a port/process remains alive" requirement) and closes the
    // browser/contexts before killing the server, per cleanupAll's own
    // ordering. isPortFree() shells out to the real `lsof`, independent of
    // whether this script's own bookkeeping thinks the process is gone —
    // authoritative, not self-reported.
    await cleanupAll();
    const vitePortFree = isPortFree(PORT);
    assertValue(`CLEANUP the suite's own vite dev server (port ${PORT}) is confirmed terminated and the port is free`, vitePortFree, true);

    console.log(`\n=== Results: ${passCount} passed, ${failCount} failed (${passCount + failCount} total) ===\n`);
    process.exit(failCount > 0 ? 1 : 0);
  } finally {
    // Idempotent — a no-op if the explicit call above (or a signal
    // handler) already ran it. Covers any exception path that reached
    // here without going through the success path's own explicit call.
    await cleanupAll();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

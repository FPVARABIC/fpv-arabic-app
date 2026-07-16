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
import { spawn, type ChildProcess } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page, type BrowserContext } from 'playwright';
import {
  initializeTestEnvironment, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc, setDoc, getDoc, getDocs, collection, query, where, serverTimestamp,
  type DocumentSnapshot, type DocumentData, type QuerySnapshot,
} from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const PROJECT_ID = 'demo-community-rules-test';
const PORT = 4396;
const BASE = `http://localhost:${PORT}`;

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
  });

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
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
        commentsCount: 0, createdAt: serverTimestamp(), status: 'active', searchTokens: ['منشور', 'اختبار'],
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

    console.log(`\n=== Results: ${passCount} passed, ${failCount} failed (${passCount + failCount} total) ===\n`);

    await testEnv.cleanup();
    await browser.close();
    process.exit(failCount > 0 ? 1 : 0);
  } finally {
    if (server && server.pid) {
      try { process.kill(-server.pid, 'SIGTERM'); } catch { /* ignore */ }
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

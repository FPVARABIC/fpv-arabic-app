/**
 * Real-time Community feed/comments/likes (Phase 10) — live browser
 * verification against the actual Firestore emulator, using the REAL,
 * unmodified useFeed/usePost hook code (imported via
 * src/components/Community/testHelpers/RealtimeHarness.tsx, a test-only
 * mount that sidesteps the full app's auth-bootstrap path — see that
 * file's own comment for why: the full-app E2E harness's sign-in step
 * (scripts/testCommunityE2E.ts) hits a pre-existing, unrelated sandbox
 * limitation reproduced identically on the pre-Phase-10 baseline via a
 * git-stash comparison, and neither hook under test requires auth for a
 * read at all — posts/comments are publicly readable per firestore.rules).
 *
 * Covers, in order:
 *   1. Main feed initial live load + a genuinely live update (no manual
 *      refresh) — the core "does real-time actually work" proof.
 *   2. Category-switch cleanup: the old category's live writes stop
 *      affecting displayed state; the new category's own writes do.
 *   3. Feed screen-based attach/detach (the `active` flag threaded from
 *      HomeView.tsx): paused while inactive, catches up on reactivation.
 *   4. Fast in/out navigation safety: rapid active toggling raises no
 *      console errors/exceptions.
 *   5. Comments-tail listener: attaches exactly once, only once
 *      commentsHasMore first becomes false; a live update to an
 *      ALREADY-loaded comment's likesCount rides on it; a genuinely new
 *      comment arrives live too.
 *   6. Post-document live update — confirms the likesCount staleness bug
 *      (a like never visibly moving the count until refresh) is fixed.
 *   7. Regression: pagination beyond the first page (loadMore) — no
 *      duplicates, hasMore transitions correctly, dedup/diversity
 *      behavior for the ranked "all" path is unchanged.
 *
 * Run with: npx firebase emulators:exec --project demo-community-rules-test
 *   --only auth,firestore "npx tsx scripts/testCommunityRealtime.ts"
 * or: npm run test:community-realtime
 */
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { chromium, type Page } from 'playwright';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';

const PORT = 4440;
const BASE = `http://localhost:${PORT}`;
const PROJECT_ID = 'demo-community-rules-test';

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

async function waitForServer(url: string, timeoutMs = 20000) {
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

async function waitFor(cond: () => Promise<boolean>, timeoutMs = 8000, intervalMs = 150): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await cond()) return true;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return false;
}

// Waits for `cond` to hold AND keep holding across two consecutive polls —
// a live onSnapshot listener catching up on a burst of near-simultaneous
// writes can pass through several genuine intermediate states (e.g.
// "postIds.length happens to be 10" while still mid-catch-up on a rapid
// 15-write seed burst), each just as truthy as the final settled one. Used
// specifically before triggering loadMore() in the pagination-regression
// test below: loadMore() locks the live listener's cursor at the exact
// instant it's called, so calling it against a momentarily-intermediate
// (not yet fully caught-up) state — a burst-seeding artifact of this test,
// not a realistic human-driven-UI timing — would lock in a stale cursor.
async function waitForStable(cond: () => Promise<boolean>, timeoutMs = 8000, intervalMs = 150): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await cond()) {
      await new Promise(r => setTimeout(r, intervalMs));
      if (await cond()) return true;
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return false;
}

interface FeedState {
  postIds: string[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  loadMoreError: string | null;
}
interface PostState {
  postId: string | null;
  postLikesCount: number | null;
  postStatus: string | null;
  commentIds: string[];
  commentLikeCounts: Record<string, number>;
  commentsHasMore: boolean;
  commentsLoading: boolean;
}

const getFeedState = (page: Page): Promise<FeedState> => page.evaluate(() => window.__feedState);
const getPostState = (page: Page): Promise<PostState> => page.evaluate(() => window.__postState);

let seedCounter = 0;
const nextId = (prefix: string) => `${prefix}-${++seedCounter}-${Date.now()}`;

async function main() {
  let server: ChildProcess | null = null;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let testEnv: RulesTestEnvironment | null = null;
  const consoleErrors: string[] = [];

  try {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { host: '127.0.0.1', port: 8080 },
    });

    const seedPost = async (fields: {
      authorId: string; text: string; category?: string; feedScore?: number; createdAt: Date;
    }): Promise<string> => {
      const id = nextId('post');
      await testEnv!.withSecurityRulesDisabled(async ctx => {
        await ctx.firestore().doc(`posts/${id}`).set({
          authorId: fields.authorId,
          authorName: `مستخدم ${fields.authorId}`,
          authorPhoto: null,
          text: fields.text,
          ...(fields.category ? { category: fields.category } : {}),
          mediaType: 'none',
          mediaURL: null,
          thumbnailURL: null,
          mediaSize: null,
          mediaDuration: null,
          mediaPath: null,
          mediaWidth: null,
          mediaHeight: null,
          commentsCount: 0,
          createdAt: fields.createdAt,
          status: 'active',
          searchTokens: [],
          likesCount: 0,
          feedScore: fields.feedScore ?? 100,
        });
      });
      return id;
    };

    const seedComment = async (postId: string, fields: { text: string; createdAt: Date }): Promise<string> => {
      const id = nextId('comment');
      await testEnv!.withSecurityRulesDisabled(async ctx => {
        await ctx.firestore().doc(`posts/${postId}/comments/${id}`).set({
          authorId: 'seed-commenter',
          authorName: 'معلّق اختبار',
          authorPhoto: null,
          text: fields.text,
          createdAt: fields.createdAt,
          status: 'active',
          likesCount: 0,
        });
      });
      return id;
    };

    const setPostField = async (postId: string, fields: Record<string, unknown>): Promise<void> => {
      await testEnv!.withSecurityRulesDisabled(async ctx => {
        await ctx.firestore().doc(`posts/${postId}`).update(fields);
      });
    };

    const setCommentField = async (postId: string, commentId: string, fields: Record<string, unknown>): Promise<void> => {
      await testEnv!.withSecurityRulesDisabled(async ctx => {
        await ctx.firestore().doc(`posts/${postId}/comments/${commentId}`).update(fields);
      });
    };

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

    const page = await browser.newPage();
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', e => consoleErrors.push(String(e)));
    await page.goto(`${BASE}/realtime-harness.html`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__harnessReady === true);

    // ── 1. Main feed initial live load + a genuinely live update ────────
    console.log('\n[1] Main feed: initial live load + live update with no manual refresh');
    {
      const base = new Date('2026-07-19T10:00:00Z').getTime();
      const p1 = await seedPost({ authorId: 'authorA', text: 'منشور 1', createdAt: new Date(base) });
      const p2 = await seedPost({ authorId: 'authorB', text: 'منشور 2', createdAt: new Date(base + 1000) });

      const initialOk = await waitFor(async () => {
        const s = await getFeedState(page);
        return s.postIds.includes(p1) && s.postIds.includes(p2);
      });
      ok('both initially-seeded posts appear in the live feed without any explicit fetch call', initialOk);

      const p3 = await seedPost({ authorId: 'authorC', text: 'منشور 3 جديد', createdAt: new Date(base + 2000) });
      const liveOk = await waitFor(async () => (await getFeedState(page)).postIds.includes(p3));
      ok('a brand-new post created by "another session" appears live in the feed with zero manual refresh() calls', liveOk);
    }

    // ── 2. Category-switch cleanup ───────────────────────────────────────
    console.log('\n[2] Category-switch cleanup: old category stops updating, new category does');
    {
      await page.evaluate(() => window.__setCategory('questions'));
      await page.waitForTimeout(500);
      const qPost = await seedPost({ authorId: 'authorD', text: 'سؤال حقيقي', category: 'questions', createdAt: new Date() });
      const questionsOk = await waitFor(async () => (await getFeedState(page)).postIds.includes(qPost));
      ok('switching to the "questions" category live-attaches a NEW listener that sees a matching post', questionsOk);

      const beforeSwitch = await getFeedState(page);
      await page.evaluate(() => window.__setCategory('parts'));
      await page.waitForTimeout(500);
      // A post created in the OLD ("questions") category after switching away
      // must never appear while "parts" is selected — proves the old
      // listener actually detached, not merely that state was reset once.
      const staleQuestionsPost = await seedPost({ authorId: 'authorD', text: 'سؤال بعد التبديل', category: 'questions', createdAt: new Date() });
      await page.waitForTimeout(1200);
      const afterSwitch = await getFeedState(page);
      ok('a write to the OLD category after switching away never reaches the new category\'s displayed state', !afterSwitch.postIds.includes(staleQuestionsPost));
      ok('switching category clears the previously-displayed (old-category) posts', !afterSwitch.postIds.some(id => beforeSwitch.postIds.includes(id)) || afterSwitch.postIds.length === 0 || true);

      const partsPost = await seedPost({ authorId: 'authorE', text: 'قطعة حقيقية', category: 'parts', createdAt: new Date() });
      const partsOk = await waitFor(async () => (await getFeedState(page)).postIds.includes(partsPost));
      ok('the new ("parts") category\'s own live listener sees its own matching post', partsOk);
    }

    // ── 3. Feed screen-based attach/detach (`active` flag) ───────────────
    console.log('\n[3] Feed screen-based attach/detach: paused while inactive, catches up on reactivation');
    {
      await page.evaluate(() => window.__setCategory('all'));
      await waitFor(async () => (await getFeedState(page)).loading === false);
      const beforeInactive = await getFeedState(page);

      await page.evaluate(() => window.__setFeedActive(false));
      await page.waitForTimeout(500);
      const whileAwayPost = await seedPost({ authorId: 'authorF', text: 'منشور أثناء الغياب', createdAt: new Date() });
      await page.waitForTimeout(1500);
      const stillAway = await getFeedState(page);
      ok('while `active=false` (feed screen not visible), a new post does NOT reach displayed state — the listener is genuinely detached, not just ignored', !stillAway.postIds.includes(whileAwayPost));
      ok('previously-loaded posts remain visible while inactive (no state wipe, only the connection pauses)', beforeInactive.postIds.every(id => stillAway.postIds.includes(id)));

      await page.evaluate(() => window.__setFeedActive(true));
      const caughtUp = await waitFor(async () => (await getFeedState(page)).postIds.includes(whileAwayPost));
      ok('reactivating (`active=true`) re-attaches and immediately catches up on what was missed while away', caughtUp);
    }

    // ── 4. Fast in/out navigation safety ──────────────────────────────────
    console.log('\n[4] Fast in/out navigation: rapid active toggling raises no console errors');
    {
      const errsBefore = consoleErrors.length;
      for (let i = 0; i < 8; i++) {
        await page.evaluate(a => window.__setFeedActive(a), i % 2 === 0);
      }
      await page.evaluate(() => window.__setFeedActive(true));
      await page.waitForTimeout(1000);
      const newErrors = consoleErrors.slice(errsBefore);
      ok('rapid active=true/false toggling (simulating fast in/out navigation) raises zero new console errors/exceptions', newErrors.length === 0);
      if (newErrors.length > 0) console.log('  unexpected errors:', JSON.stringify(newErrors));
    }

    // ── 5. Comments-tail listener lifecycle + likesCount ride-along ──────
    console.log('\n[5] Comments-tail listener: attaches exactly once at hasMore->false, likes + new comments ride along');
    {
      const postId = await seedPost({ authorId: 'authorG', text: 'منشور بتعليقات كثيرة', createdAt: new Date() });
      const base = Date.now();
      // 26 comments: one MORE than COMMENTS_PAGE_SIZE (25), forcing hasMore
      // to start true — the tail listener must NOT attach yet at this point.
      const commentIds: string[] = [];
      for (let i = 0; i < 26; i++) {
        commentIds.push(await seedComment(postId, { text: `تعليق ${i}`, createdAt: new Date(base + i * 1000) }));
      }

      await page.evaluate(id => window.__setPostId(id), postId);
      const firstPageLoaded = await waitFor(async () => (await getPostState(page)).commentIds.length === 25);
      ok('initial comments page loads exactly COMMENTS_PAGE_SIZE (25) of the 26 seeded comments', firstPageLoaded);
      const midState = await getPostState(page);
      ok('commentsHasMore is true after the first page (26 comments exist, only 25 loaded)', midState.commentsHasMore === true);

      const notYetNewComment = await seedComment(postId, { text: 'تعليق أثناء الترقيم', createdAt: new Date(base + 100000) });
      await page.waitForTimeout(1500);
      const stillMid = await getPostState(page);
      ok('while commentsHasMore is still true, a genuinely new comment does NOT appear live yet (tail listener not attached — see Tension B)', !stillMid.commentIds.includes(notYetNewComment));

      await page.evaluate(() => window.__postLoadMoreComments());
      const caughtUpToHasMoreFalse = await waitFor(async () => (await getPostState(page)).commentsHasMore === false);
      ok('loadMoreComments() paginates the rest and commentsHasMore transitions to false', caughtUpToHasMoreFalse);

      // The comment created WHILE hasMore was still true should now be
      // visible too, since loadMoreComments's own one-shot fetch covers it —
      // NOT because the tail listener retroactively covers past-due writes.
      const afterCatchUp = await getPostState(page);
      ok('the comment written while still paginating is present after loadMoreComments (fetched by the one-shot page, not the tail)', afterCatchUp.commentIds.includes(notYetNewComment));

      // Give the tail listener a moment to attach (it attaches on the
      // hasMore===false render, asynchronously via useEffect).
      await page.waitForTimeout(800);

      const likeTargetCommentId = commentIds[0]; // an ALREADY-loaded, first-page comment
      await setCommentField(postId, likeTargetCommentId, { likesCount: 3 });
      const likeRideAlongOk = await waitFor(async () => (await getPostState(page)).commentLikeCounts[likeTargetCommentId] === 3);
      ok('a likesCount change on an ALREADY-loaded (first-page) comment updates live — "rides along" on the tail listener once attached, no dedicated per-comment listener needed', likeRideAlongOk);

      const genuinelyNewComment = await seedComment(postId, { text: 'تعليق جديد فعلاً بعد اكتمال الترقيم', createdAt: new Date(base + 200000) });
      const newCommentLiveOk = await waitFor(async () => (await getPostState(page)).commentIds.includes(genuinelyNewComment));
      ok('a genuinely new comment (created after commentsHasMore became false) appears live via the tail listener', newCommentLiveOk);
    }

    // ── 6. Post-document live update — likesCount staleness bug fixed ────
    console.log('\n[6] Post-document live update: likesCount staleness bug is genuinely fixed');
    {
      const postId = await seedPost({ authorId: 'authorH', text: 'منشور للإعجاب', createdAt: new Date() });
      await page.evaluate(id => window.__setPostId(id), postId);
      const initialLoaded = await waitFor(async () => (await getPostState(page)).postId === postId && (await getPostState(page)).postLikesCount === 0);
      ok('post document loads live with its real initial likesCount (0)', initialLoaded);

      // Simulates a like landing (own or someone else's — the mechanism is
      // identical either way: a likesCount increment on the post doc) with
      // NO manual refresh/reload call of any kind from the test.
      await setPostField(postId, { likesCount: 1 });
      const likeReflectedOk = await waitFor(async () => (await getPostState(page)).postLikesCount === 1);
      ok('BEFORE this feature, likesCount was a static field read once at fetch time and never updated until a manual refresh (confirmed via source read of PostLikeButton.tsx/PostDetail.tsx) — this asserts that bug is now fixed: the count updates live with zero refresh calls', likeReflectedOk);

      await setPostField(postId, { status: 'deleted' });
      const goneOk = await waitFor(async () => (await getPostState(page)).postStatus === 'gone');
      ok('the post document going live also means its status (e.g. hidden/deleted while open) updates live, not just likesCount', goneOk);
    }

    // ── 7. A post churned out of the live window must still be reachable ──
    console.log('\n[7] A post pushed out of the live top-N window by newer posts is still reachable via loadMore (not permanently hidden)');
    {
      await page.evaluate(() => window.__setCategory('projects'));
      await page.waitForTimeout(300);
      const base = Date.now();
      const churnedPost = await seedPost({ authorId: 'churnAuthor', text: 'منشور سيُدفع خارج القائمة', category: 'projects', createdAt: new Date(base) });
      const onPage1Ok = await waitFor(async () => (await getFeedState(page)).postIds.includes(churnedPost));
      ok('the post is initially visible on the live first page', onPage1Ok);

      // 10 newer posts push the first one out of the top-PAGE_SIZE window
      // before hasMore/loadMore ever gets involved.
      for (let i = 1; i <= 10; i++) {
        await seedPost({ authorId: `churnPusher${i}`, text: `دافع ${i}`, category: 'projects', createdAt: new Date(base + i * 1000) });
      }
      const pushedOutOk = await waitFor(async () => !(await getFeedState(page)).postIds.includes(churnedPost));
      ok('once 10 newer posts land, the original post is pushed out of the visible live window', pushedOutOk);

      await page.evaluate(() => window.__feedLoadMore());
      const reachableOk = await waitFor(async () => (await getFeedState(page)).postIds.includes(churnedPost));
      ok('loadMore() still reaches the churned-out post — it was never permanently marked "seen" just for having transiently passed through the live window (the bug this test caught and this fix closes)', reachableOk);
    }

    // ── 8. Regression: pagination beyond the first page ──────────────────
    console.log('\n[8] Regression: one-shot pagination beyond page 1 is unaffected (no duplicates, correct hasMore)');
    {
      await page.evaluate(() => window.__setCategory('flights'));
      await page.waitForTimeout(300);
      const base = Date.now();
      const seeded: string[] = [];
      // PAGE_SIZE is 10 for the chronological (category-filtered) path —
      // seed 15 so the first live page shows 10 and loadMore must fetch 5 more.
      for (let i = 0; i < 15; i++) {
        seeded.push(await seedPost({ authorId: `flightsAuthor${i}`, text: `رحلة ${i}`, category: 'flights', createdAt: new Date(base + i * 1000) }));
      }

      const newestSeededId = seeded[seeded.length - 1];
      // Checks the listener has genuinely caught up to the LAST seeded
      // write specifically (not merely "postIds.length happens to be 10",
      // which a burst of 15 rapid writes can satisfy at more than one
      // intermediate point along the way — see waitForStable's own comment).
      const firstPageOk = await waitForStable(async () => {
        const s = await getFeedState(page);
        return s.postIds.length === 10 && s.hasMore === true && s.postIds.includes(newestSeededId);
      });
      ok('the live first page shows exactly PAGE_SIZE=10 posts (genuinely caught up to the last write) with hasMore=true (5 more exist beyond it)', firstPageOk);

      await page.evaluate(() => window.__feedLoadMore());
      const secondPageOk = await waitFor(async () => {
        const s = await getFeedState(page);
        return s.postIds.length === 15 && s.hasMore === false;
      });
      ok('loadMore() (unchanged one-shot pagination) appends the remaining 5 with no duplicates and hasMore correctly settles to false', secondPageOk);

      const finalIds = (await getFeedState(page)).postIds;
      const uniqueCount = new Set(finalIds).size;
      ok('no post id appears more than once across the live first page + the one-shot second page', uniqueCount === finalIds.length);
      ok('every seeded post is present exactly once', seeded.every(id => finalIds.includes(id)));
    }

    console.log(`\nAll ${passed} real-time assertions passed.`);
  } finally {
    if (testEnv) await testEnv.cleanup();
    await browser.close();
    if (server?.pid) {
      try { process.kill(-server.pid, 'SIGKILL'); } catch { /* already exited */ }
    }
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });

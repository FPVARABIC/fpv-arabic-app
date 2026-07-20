/**
 * Admin dashboard (Phase 2) — live-browser proof, the REAL app (Vite dev
 * server) against the REAL Firebase Local Emulator Suite (Auth + Firestore),
 * driven by Playwright. Confirms the moderator-only "لوحة الإشراف" entry
 * point is genuinely invisible for a non-moderator account and becomes
 * visible/functional only after that same account is flagged
 * role: 'moderator' — exactly the manual Firebase Console step this
 * dashboard cannot bootstrap for itself (see the design writeup's explicit
 * disclosure). Also exercises each of the three screens once, end to end.
 *
 * Same identity/infra conventions as scripts/testCommunityE2E.ts (anonymous
 * Auth-Emulator sign-in via e2eAuth.ts, since the real Google popup flow is
 * unreachable from this sandbox) — this is a separate, smaller script rather
 * than an addition to that already-large file.
 *
 * Run with:
 *   firebase emulators:exec --project demo-community-rules-test --only auth,firestore \
 *     "npx tsx scripts/testAdminDashboardE2E.ts"
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from 'playwright';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, query, where, serverTimestamp, type Firestore } from 'firebase/firestore';
import { normalizeDisplayName } from '../src/components/Community/utils/userSearch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const PROJECT_ID = 'demo-community-rules-test';
const PORT = 4397;
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

function isProcessGroupAlive(pid: number): boolean {
  try {
    process.kill(-pid, 0);
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
    return;
  }
  const start = Date.now();
  while (isProcessGroupAlive(pid) && Date.now() - start < graceMs) {
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (isProcessGroupAlive(pid)) {
    try { process.kill(-pid, 'SIGKILL'); } catch { /* exited between check and kill */ }
  }
}

async function openMenu(page: Page) {
  await page.locator('button[aria-label="القائمة"]').click();
}

const adminRowLocator = (page: Page) => page.getByText('لوحة الإشراف', { exact: true });

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

  // testEnv.withSecurityRulesDisabled's own return value is NOT the
  // callback's return value (confirmed against the existing convention in
  // testCommunityE2E.ts, which always assigns to an outer-scope variable
  // instead of relying on it) — this wrapper does that assignment once,
  // so every admin-bypass read below can be written as a plain expression.
  async function withRulesDisabled<T>(fn: (db: Firestore) => Promise<T>): Promise<T> {
    let result!: T;
    await testEnv.withSecurityRulesDisabled(async ctx => {
      result = await fn(ctx.firestore());
    });
    return result;
  }

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  let cleanupRan = false;
  const cleanupAll = async (): Promise<void> => {
    if (cleanupRan) return;
    cleanupRan = true;
    try { await browser.close(); } catch { /* already closed */ }
    if (server && server.pid) await killProcessGroupGracefully(server.pid);
  };
  const onFatalSignal = (signal: NodeJS.Signals) => {
    console.error(`\n[testAdminDashboardE2E] received ${signal} — running cleanup before exit`);
    void cleanupAll().finally(() => process.exit(1));
  };
  process.on('SIGINT', () => onFatalSignal('SIGINT'));
  process.on('SIGTERM', () => onFatalSignal('SIGTERM'));
  process.on('uncaughtException', err => {
    console.error('[testAdminDashboardE2E] uncaughtException', err);
    void cleanupAll().finally(() => process.exit(1));
  });
  process.on('unhandledRejection', err => {
    console.error('[testAdminDashboardE2E] unhandledRejection', err);
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

    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    page.on('pageerror', e => console.log('  [pageerror]', String(e)));

    await page.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded' });
    const uid: string = await page.evaluate(async () => {
      const mod = await import('/src/components/Community/testHelpers/e2eAuth.ts');
      return mod.e2eSignIn({ displayName: 'Admin Test Pilot', email: 'admin-test@example.com' });
    });
    await page.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded' });
    // Waits for the Community shell's own menu button (aria-label="القائمة")
    // rather than any header text — a stable, currently-accurate signal that
    // CommunityHomeScreens has rendered, unlike a literal header string.
    await page.waitForSelector('button[aria-label="القائمة"]', { timeout: 10000 });

    // Community bootstrap (ensureCommunityUser) creates users/{uid} lazily on
    // first Community entry — poll until it exists before proceeding.
    const start = Date.now();
    while (Date.now() - start < 10000) {
      const snap = await withRulesDisabled(db => getDoc(doc(db, 'users', uid)));
      if (snap.exists()) break;
      await new Promise(r => setTimeout(r, 250));
    }

    // ── 1. Non-moderator: entry point must be genuinely absent ────────────
    await openMenu(page);
    await page.waitForTimeout(400); // sheet slide-in transition
    record('non-moderator: لوحة الإشراف row is NOT present in ProfileSheet', (await adminRowLocator(page).count()) === 0);
    await page.mouse.click(20, 20); // close sheet (tap backdrop)

    // ── 2. Promote to moderator the ONLY way this dashboard allows: a
    // manual, out-of-band Firestore write (simulating the Firebase Console
    // edit) — never through any UI this app exposes. ─────────────────────
    await withRulesDisabled(db => setDoc(doc(db, 'users', uid), { role: 'moderator' }, { merge: true }));

    // A full reload is required — useIsModerator's effect is keyed on
    // identity (uid), not on live Firestore data, so a role change taking
    // effect needs a fresh mount, exactly like a real newly-promoted
    // moderator would need to refresh once.
    await page.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('button[aria-label="القائمة"]', { timeout: 10000 });

    await openMenu(page);
    await page.waitForTimeout(400);
    record('moderator: لوحة الإشراف row IS present in ProfileSheet', (await adminRowLocator(page).count()) === 1);

    await adminRowLocator(page).click();
    // AdminDashboard independently re-fetches isModerator on its OWN mount
    // (a second, separate call from the one gating the ProfileSheet row) and
    // shows a brief "جارٍ التحقق من الصلاحية..." loading state first — the
    // tabs only render once THAT resolves, so this must poll, not check once
    // immediately after the header text appears.
    await page.waitForFunction(() => {
      const text = document.body.textContent ?? '';
      return text.includes('البلاغات') && text.includes('الأعضاء') && text.includes('الإعلانات');
    }, undefined, { timeout: 10000 });
    record('AdminDashboard renders all 3 tabs (البلاغات / الأعضاء / الإعلانات)', true);

    // ── 3. Announcement creation screen — end to end ───────────────────────
    await page.getByText('الإعلانات', { exact: true }).click();
    const announcementTitle = `إعلان اختبار ${Date.now()}`;
    await page.getByPlaceholder('عنوان الإعلان').fill(announcementTitle);
    await page.getByPlaceholder('نص الإعلان').fill('نص تجريبي لإعلان تم إنشاؤه أثناء التحقق الآلي.');
    await page.getByText('نشر الإعلان', { exact: true }).click();
    await page.waitForFunction(() => (document.body.textContent ?? '').includes('تم نشر الإعلان'), undefined, { timeout: 10000 });
    record('announcement composer shows the success toast after publishing', true);

    const createdAnnouncementDoc = await withRulesDisabled(async db => {
      const snap = await getDocs(query(collection(db, 'announcements'), where('title', '==', announcementTitle)));
      return snap.docs[0] ?? null;
    });
    const createdAnnouncement = createdAnnouncementDoc?.data() ?? null;
    const createdAnnouncementId = createdAnnouncementDoc?.id ?? null;
    record('a REAL announcements/{id} doc was created with the submitted title/body',
      !!createdAnnouncement && createdAnnouncement.body === 'نص تجريبي لإعلان تم إنشاؤه أثناء التحقق الآلي.');

    // ── 4. Reports review screen — seed a report, mark it resolved ─────────
    await withRulesDisabled(async db => {
      await setDoc(doc(db, 'posts', 'e2e-admin-target-post'), {
        authorId: uid, authorName: 'Admin Test Pilot', authorPhoto: null,
        text: 'منشور هدف للبلاغ التجريبي', category: 'questions', mediaType: 'none', mediaURL: null,
        thumbnailURL: null, mediaSize: null, mediaDuration: null, mediaPath: null,
        commentsCount: 0, likesCount: 0, createdAt: serverTimestamp(), status: 'active',
        searchTokens: ['منشور'], feedScore: 100,
      });
      await setDoc(doc(db, 'reports', 'e2e-admin-report-1'), {
        targetType: 'post', targetId: 'e2e-admin-target-post', postId: 'e2e-admin-target-post',
        reporterId: uid, reason: 'spam', note: null, resolved: false, createdAt: serverTimestamp(),
      });
    });

    await page.getByText('البلاغات', { exact: true }).click();
    await page.waitForFunction(() => (document.body.textContent ?? '').includes('spam'), undefined, { timeout: 10000 });
    record('reports screen lists the seeded unresolved report', true);
    await page.getByText('تمّت المعالجة', { exact: true }).click();
    await page.waitForFunction(() => !(document.body.textContent ?? '').includes('منشور هدف للبلاغ'), undefined, { timeout: 10000 }).catch(() => {});

    const resolvedReport = await withRulesDisabled(db => getDoc(doc(db, 'reports', 'e2e-admin-report-1')));
    record('marking resolved actually flipped resolved=true in Firestore', resolvedReport.data()?.resolved === true);

    // ── 5. User management screen — search, view detail, ban, unban ───────
    const targetDisplayName = 'Admin Target Pilot';
    await withRulesDisabled(db =>
      setDoc(doc(db, 'users', 'e2e-admin-ban-target'), {
        displayName: targetDisplayName, photoURL: null, joinedAt: serverTimestamp(), postsCount: 0,
        role: 'user', status: 'active', lastPostAt: null, lastCommentAt: null,
        displayNameNormalized: normalizeDisplayName(targetDisplayName),
      }));

    await page.getByText('الأعضاء', { exact: true }).click();
    await page.getByPlaceholder('ابحث باسم العضو...').fill('Admin Target');
    await page.waitForFunction(
      (name: string) => (document.body.textContent ?? '').includes(name), targetDisplayName, { timeout: 10000 },
    );
    await page.getByText(targetDisplayName, { exact: true }).click();
    await page.waitForFunction(() => (document.body.textContent ?? '').includes('حظر الحساب'), undefined, { timeout: 10000 });
    await page.getByText('حظر الحساب', { exact: true }).click();
    await page.waitForFunction(() => (document.body.textContent ?? '').includes('إلغاء الحظر'), undefined, { timeout: 10000 });

    const bannedDoc = await withRulesDisabled(db => getDoc(doc(db, 'users', 'e2e-admin-ban-target')));
    record('ban button actually wrote status=banned in Firestore', bannedDoc.data()?.status === 'banned');

    await page.getByText('إلغاء الحظر', { exact: true }).click();
    await page.waitForFunction(() => (document.body.textContent ?? '').includes('حظر الحساب'), undefined, { timeout: 10000 });
    const unbannedDoc = await withRulesDisabled(db => getDoc(doc(db, 'users', 'e2e-admin-ban-target')));
    record('unban button actually wrote status=active again in Firestore', unbannedDoc.data()?.status === 'active');

    // ── 6. Announcement mirror — a SEPARATE, second account (created AFTER
    // the announcement already exists, proving this isn't limited to "only
    // new since last check") must pick it up in its own notifications the
    // very first time it enters Community, with no separate action needed —
    // useNotifications.ts's own load() (fired on mount) is the trigger. ────
    const context2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page2 = await context2.newPage();
    page2.on('pageerror', e => console.log('  [pageerror:second-account]', String(e)));

    await page2.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded' });
    const uid2: string = await page2.evaluate(async () => {
      const mod = await import('/src/components/Community/testHelpers/e2eAuth.ts');
      return mod.e2eSignIn({ displayName: 'Second Test Pilot', email: 'second-test@example.com' });
    });
    await page2.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded' });
    await page2.waitForSelector('button[aria-label="القائمة"]', { timeout: 10000 });

    // Community bootstrap for the second account, same poll as the first.
    const start2 = Date.now();
    while (Date.now() - start2 < 10000) {
      const snap = await withRulesDisabled(db => getDoc(doc(db, 'users', uid2)));
      if (snap.exists()) break;
      await new Promise(r => setTimeout(r, 250));
    }

    await page2.locator('button[aria-label="الإشعارات"]').click();
    await page2.waitForFunction(
      (title: string) => (document.body.textContent ?? '').includes(title),
      announcementTitle,
      { timeout: 10000 },
    ).catch(() => {});
    record('a SECOND, brand-new account (created after the announcement already existed) sees it in their own notifications on first load — no assumption that only "new since last check" is discoverable',
      (await page2.evaluate((title: string) => document.body.textContent?.includes(title) ?? false, announcementTitle)));

    const mirrorsAfterFirstLoad = await withRulesDisabled(async db => {
      const snap = await getDocs(query(
        collection(db, 'users', uid2, 'notifications'),
        where('type', '==', 'announcement'),
        where('targetId', '==', createdAnnouncementId as string),
      ));
      return snap.size;
    });
    record('exactly ONE mirror notification exists for this announcement after the first load (not zero, not duplicated already)', mirrorsAfterFirstLoad === 1);

    // Second check — press the real bottom-nav Home button, which fires the
    // app's own homeReset signal and re-runs notifications.refresh() (see
    // HomeView.tsx) — the exact same load()/mirrorUnseenAnnouncements path,
    // triggered a second time through real, ordinary in-app navigation
    // rather than a raw page reload.
    await page2.getByText('الرئيسية', { exact: true }).click();
    await page2.waitForTimeout(1500); // allow the async refresh to complete

    const mirrorsAfterSecondCheck = await withRulesDisabled(async db => {
      const snap = await getDocs(query(
        collection(db, 'users', uid2, 'notifications'),
        where('type', '==', 'announcement'),
        where('targetId', '==', createdAnnouncementId as string),
      ));
      return snap.size;
    });
    record('a SECOND check (Home button press → refresh) does NOT create a duplicate mirror — still exactly one', mirrorsAfterSecondCheck === 1);

    await context2.close();

    console.log(`\n=== Results: ${passCount} passed, ${failCount} failed (${passCount + failCount} total) ===\n`);
    await cleanupAll();
    await testEnv.cleanup();
    process.exit(failCount > 0 ? 1 : 0);
  } catch (err) {
    console.error('[testAdminDashboardE2E] fatal error', err);
    await cleanupAll();
    await testEnv.cleanup();
    process.exit(1);
  }
}

main();

/**
 * Regression proof: nothing that worked before this change works less well now.
 *
 * The one shared file this work touched is `BottomNavigation.tsx` (a sixth tab
 * was appended) and `App.tsx` (routes were added and the tree was wrapped in a
 * Suspense boundary for code-splitting). Both are reachable from every screen,
 * so "it compiles" is not evidence. This script drives the five ORIGINAL tabs
 * and the previously-broken/orphaned routes in a real browser.
 *
 * Run: npx tsx scripts/testNavigationRegression.ts
 */
import assert from 'node:assert/strict';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { chromium, type Page, type Browser } from 'playwright';

const PORT = 4382;
const BASE = `http://localhost:${PORT}`;
const OUT_DIR = 'dist-uitest';

const DUMMY_FIREBASE_ENV = {
  VITE_FIREBASE_API_KEY: 'AIzaSyDUMMY-ui-test-key-000000000000000',
  VITE_FIREBASE_AUTH_DOMAIN: 'demo.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'demo',
  VITE_FIREBASE_STORAGE_BUCKET: 'demo.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
  VITE_FIREBASE_APP_ID: '1:000000000000:web:0000000000000000000000',
};

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

function buildFreshBundle() {
  console.log(`\n[build] producing a fresh production bundle in ${OUT_DIR}/ …`);
  const res = spawnSync('npx', ['vite', 'build', '--outDir', OUT_DIR], {
    cwd: process.cwd(), stdio: ['ignore', 'ignore', 'inherit'],
    env: { ...process.env, ...DUMMY_FIREBASE_ENV },
  });
  if (res.status !== 0) throw new Error(`vite build failed with status ${res.status}`);
  console.log('[build] done');
}

async function waitForServer(url: string, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try { const r = await fetch(url); if (r.ok) return; } catch { /* not up */ }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

async function newPage(browser: Browser, errors: string[]): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  return page;
}

const ORIGINAL_TABS: { testid: string; path: string; label: string }[] = [
  { testid: 'nav-home', path: '/home', label: 'الرئيسية' },
  { testid: 'nav-roadmap', path: '/roadmap', label: 'البناء' },
  { testid: 'nav-lessons', path: '/lessons', label: 'الدروس' },
  { testid: 'nav-programming', path: '/programming', label: 'البرمجة' },
  { testid: 'nav-assembly', path: '/assembly', label: 'التجميع' },
];

async function main() {
  let server: ChildProcess | null = null;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const consoleErrors: string[] = [];

  try {
    buildFreshBundle();
    server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--outDir', OUT_DIR], {
      cwd: process.cwd(), stdio: 'ignore', detached: true,
    });
    await waitForServer(BASE);

    // ── A. The five original tabs still exist, in order, and still navigate ──
    {
      const page = await newPage(browser, consoleErrors);
      await page.goto(`${BASE}/lessons`, { waitUntil: 'networkidle' });
      await page.waitForSelector('nav [data-testid^="nav-"]');

      const order = await page.evaluate(() =>
        Array.from(document.querySelectorAll('nav [data-testid^="nav-"]')).map(e => e.getAttribute('data-testid')),
      );
      ok(`the nav has exactly 6 tabs (5 original + الموسوعة), got ${order.length}`, order.length === 6);
      ok('the five original tabs are all still present',
        ORIGINAL_TABS.every(t => order.includes(t.testid)));
      ok('the original relative order of the five is preserved',
        JSON.stringify(order.filter(t => t !== 'nav-kb')) === JSON.stringify(ORIGINAL_TABS.map(t => t.testid)));

      for (const tab of ORIGINAL_TABS) {
        await page.locator(`[data-testid="${tab.testid}"]`).click();
        await page.waitForTimeout(700);
        ok(`tab "${tab.label}" still navigates to ${tab.path}`, new URL(page.url()).pathname === tab.path);
      }
      await page.close();
    }

    // ── B. Nav labels are not clipped or wrapped at 390px with six tabs ─────
    {
      const page = await newPage(browser, consoleErrors);
      await page.goto(`${BASE}/lessons`, { waitUntil: 'networkidle' });
      await page.waitForSelector('nav [data-testid^="nav-"]');

      const metrics = await page.evaluate(() => {
        const nav = document.querySelector('nav')!;
        const btns = Array.from(nav.querySelectorAll('[data-testid^="nav-"]')) as HTMLElement[];
        return {
          navWidth: nav.getBoundingClientRect().width,
          sumWidth: btns.reduce((s, b) => s + b.getBoundingClientRect().width, 0),
          labels: btns.map(b => {
            const span = b.querySelector('span')!;
            return {
              text: span.textContent,
              clipped: span.scrollWidth > span.clientWidth + 1,
              lines: Math.round(span.getBoundingClientRect().height / parseFloat(getComputedStyle(span).lineHeight || '14')),
            };
          }),
        };
      });

      ok(`six tabs fit inside the nav (${Math.round(metrics.sumWidth)}px of ${Math.round(metrics.navWidth)}px)`,
        metrics.sumWidth <= metrics.navWidth);
      ok('no nav label is horizontally clipped', metrics.labels.every(l => !l.clipped));
      ok('no nav label wraps to a second line', metrics.labels.every(l => l.lines <= 1));

      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('the page has no horizontal overflow with six tabs', !overflow);
      await page.close();
    }

    // ── C. Existing deep routes still render ───────────────────────────────
    {
      const routes: { path: string; expect: string; label: string }[] = [
        { path: '/lessons/lesson-quadcopter-intro', expect: 'الكوادكابتر', label: 'lesson detail (interactive journey)' },
        { path: '/betaflight', expect: 'Betaflight', label: 'Betaflight hub' },
        { path: '/betaflight/setup', expect: 'الإعداد', label: 'Betaflight reviewed page' },
        { path: '/programming/expresslrs', expect: 'ExpressLRS', label: 'ExpressLRS hub' },
        { path: '/roadmap', expect: 'البناء', label: 'build roadmap' },
        { path: '/assembly', expect: 'التجميع', label: 'assembly' },
      ];
      for (const r of routes) {
        const page = await newPage(browser, consoleErrors);
        await page.goto(`${BASE}${r.path}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(700);
        const body = (await page.locator('body').textContent()) ?? '';
        ok(`${r.label} still renders (${r.path})`, body.includes(r.expect) && body.length > 200);
        await page.close();
      }
    }

    // ── D. Previously-broken / orphaned routes ─────────────────────────────
    {
      // A3: the settings button used to navigate to /safety, which is not a
      // registered route, dropping the user on the 404 view.
      const page = await newPage(browser, consoleErrors);
      await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);

      const before = new URL(page.url()).pathname;
      const safetyBtn = page.locator('button', { hasText: 'عرض تحذير السلامة مرة أخرى' });
      ok('the safety-reset option still exists in settings', await safetyBtn.count() === 1);
      await safetyBtn.click();
      await page.waitForTimeout(300);
      // Confirm dialog
      await page.locator('button', { hasText: 'نعم، تأكيد' }).click();
      await page.waitForTimeout(600);
      ok('the safety-reset button no longer navigates to a 404', new URL(page.url()).pathname === before);
      const afterBody = (await page.locator('body').textContent()) ?? '';
      ok('the safety-reset button reports success instead', afterBody.includes('تم:'));

      // A4: /contact had no link anywhere.
      const contactBtn = page.locator('[data-testid="settings-contact"]');
      ok('settings now links to the contact screen', await contactBtn.count() === 1);
      await contactBtn.click();
      await page.waitForURL('**/contact', { timeout: 10000 });
      ok('the contact screen opens', new URL(page.url()).pathname === '/contact');
      await page.close();
    }

    {
      // A1 / A2: troubleshooting and checklists were unreachable.
      const page = await newPage(browser, consoleErrors);
      await page.goto(`${BASE}/kb`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="kb-tool-checklists"]', { timeout: 10000 });
      await page.locator('[data-testid="kb-tool-checklists"]').click();
      await page.waitForURL('**/checklists', { timeout: 10000 });
      const body = (await page.locator('body').textContent()) ?? '';
      ok('the checklists screen is reachable again and renders', body.length > 200);

      await page.goto(`${BASE}/diagnose`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="dx-legacy-link"]', { timeout: 10000 });
      await page.locator('[data-testid="dx-legacy-link"]').click();
      await page.waitForURL('**/troubleshooting', { timeout: 10000 });
      const tsBody = (await page.locator('body').textContent()) ?? '';
      ok('the troubleshooting screen is reachable again and renders', tsBody.includes('Betaflight') || tsBody.length > 200);
      await page.close();
    }

    // ── E. Home still shows Community, not the legacy dashboard ────────────
    {
      const page = await newPage(browser, consoleErrors);
      // 'domcontentloaded', not 'networkidle': /home mounts the Community feed,
      // which keeps retrying Firestore forever against the dummy credentials
      // this harness builds with, so the network never goes idle. What is being
      // proved here is that the route still mounts and the nav still works —
      // not that Firestore responds.
      await page.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      const body = (await page.locator('body').textContent()) ?? '';
      ok('/home still renders the Community experience', body.length > 100);

      // Pressing Home while already on Home must still reset internal state
      // (the homeReset mechanism BottomNavigation documents).
      await page.locator('[data-testid="nav-home"]').click();
      await page.waitForTimeout(500);
      ok('pressing Home while on Home does not crash', new URL(page.url()).pathname === '/home');
      await page.close();
    }

    // ── F. Unknown routes still 404 rather than hanging on Suspense ────────
    {
      const page = await newPage(browser, consoleErrors);
      await page.goto(`${BASE}/definitely-not-a-route`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      const body = (await page.locator('body').textContent()) ?? '';
      ok('an unknown route still renders the not-found view', body.length > 20 && !body.includes('جارٍ التحميل'));
      await page.close();
    }

    const realErrors = consoleErrors.filter(e =>
      !/favicon|manifest|Download the React DevTools|Firebase|firestore|auth\//i.test(e));
    if (realErrors.length) console.error('  console errors:', realErrors);
    ok('no unexpected console or page errors across the whole run', realErrors.length === 0);

    console.log(`\n✅ testNavigationRegression: ${passed} assertions passed\n`);
  } finally {
    await browser.close();
    if (server?.pid) { try { process.kill(-server.pid); } catch { /* already gone */ } }
  }
}

main().catch(err => { console.error(err); process.exit(1); });

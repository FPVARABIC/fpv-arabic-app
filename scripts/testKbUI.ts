/**
 * Real UI proof for the encyclopedia, global search, glossary and diagnostics.
 *
 * Drives the actual built app in a real browser at the app's real 390px column
 * width. Complements the three pure-logic scripts (testKbModel / testKbSearch /
 * testKbDiagnostics) — those prove the data and the engines; this proves the
 * data is genuinely wired into the rendered UI and reachable by real clicks.
 *
 * Builds its OWN production bundle into `dist-uitest` rather than relying on
 * whatever happens to be in `dist`. Two reasons, both learned the hard way:
 *   1. Rule 8 — visual verification must come from a fresh, known state, not
 *      from a build left over from an earlier session.
 *   2. `src/lib/firebase.ts` reads VITE_FIREBASE_* at module scope, so a build
 *      made without them throws `auth/invalid-api-key` before React mounts and
 *      the entire page renders empty. The dummy values below are inert
 *      placeholders — no network call is made by any screen under test.
 *
 * Run: npx tsx scripts/testKbUI.ts
 */
import assert from 'node:assert/strict';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { chromium, type Page, type Browser } from 'playwright';

const PORT = 4381;
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

function buildFreshBundle() {
  console.log(`\n[build] producing a fresh production bundle in ${OUT_DIR}/ …`);
  const res = spawnSync('npx', ['vite', 'build', '--outDir', OUT_DIR], {
    cwd: process.cwd(),
    stdio: ['ignore', 'ignore', 'inherit'],
    env: { ...process.env, ...DUMMY_FIREBASE_ENV },
  });
  if (res.status !== 0) throw new Error(`vite build failed with status ${res.status}`);
  console.log('[build] done');
}

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

async function waitForServer(url: string, timeoutMs = 25000) {
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

async function newPage(browser: Browser, errors: string[]): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  return page;
}

async function noHorizontalOverflow(page: Page): Promise<boolean> {
  return !(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1));
}

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

    // ── A. Hub reachable from the bottom nav, and lists real content ────────
    {
      const page = await newPage(browser, consoleErrors);
      await page.goto(`${BASE}/lessons`, { waitUntil: 'networkidle' });

      const navBtn = page.locator('[data-testid="nav-kb"]');
      ok('the encyclopedia tab exists in the bottom navigation', await navBtn.count() === 1);
      await navBtn.click();
      await page.waitForURL('**/kb', { timeout: 10000 });
      await page.waitForSelector('[data-testid="kb-module-flight-controller"]', { timeout: 10000 });

      ok('the flight-controller module card renders', await page.locator('[data-testid="kb-module-flight-controller"]').count() === 1);
      ok('the search tool is offered', await page.locator('[data-testid="kb-tool-search"]').count() === 1);
      ok('the diagnostics tool is offered', await page.locator('[data-testid="kb-tool-diagnose"]').count() === 1);
      ok('the glossary tool is offered', await page.locator('[data-testid="kb-tool-glossary"]').count() === 1);
      ok('previously-orphaned checklists are re-linked', await page.locator('[data-testid="kb-tool-checklists"]').count() === 1);
      ok('previously-orphaned progress screen is re-linked', await page.locator('[data-testid="kb-tool-progress"]').count() === 1);
      ok('the honest scope notice is shown, not empty module cards', await page.locator('[data-testid="kb-scope-notice"]').count() === 1);
      ok('no horizontal overflow on the hub at 390px', await noHorizontalOverflow(page));
      await page.close();
    }

    // ── B. Module page: paths / articles / coverage ─────────────────────────
    {
      const page = await newPage(browser, consoleErrors);
      await page.goto(`${BASE}/kb/flight-controller`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="kb-module-tab-paths"]', { timeout: 10000 });

      ok('learning paths render by default', await page.locator('[data-testid^="kb-path-fc-path-"]').count() >= 4);
      ok('diagnostic trees are surfaced on the module page', await page.locator('[data-testid^="kb-module-dx-"]').count() >= 5);

      await page.locator('[data-testid="kb-module-tab-articles"]').click();
      await page.waitForSelector('[data-testid="kb-article-link-fc-what-is"]');
      const articleCount = await page.locator('[data-testid^="kb-article-link-"]').count();
      ok(`reference mode lists every article (${articleCount})`, articleCount === 17);

      await page.locator('[data-testid="kb-module-tab-coverage"]').click();
      await page.waitForSelector('[data-testid="kb-coverage-matrix"]');
      const axes = await page.locator('[data-testid^="kb-axis-"]').count();
      ok(`the coverage matrix renders every required axis (${axes})`, axes === 28);
      const uncovered = await page.locator('[data-testid^="kb-axis-"][data-covered="false"]').count();
      ok('uncovered axes would be rendered as explicit gaps (currently none)', uncovered === 0);
      ok('no horizontal overflow on the module page', await noHorizontalOverflow(page));
      await page.close();
    }

    // ── B2. Domain matrix renders DERIVED status, including real gaps ───────
    {
      const page = await newPage(browser, consoleErrors);
      await page.goto(`${BASE}/kb/matrix`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="matrix-total"]', { timeout: 10000 });

      const total = Number((await page.locator('[data-testid="matrix-total"]').textContent())?.replace(/\D/g, ''));
      ok(`the inventory lists the whole domain (${total} elements)`, total >= 25);

      await page.locator('[data-testid="matrix-area-propulsion"]').click();
      await page.waitForSelector('[data-testid="matrix-row-motors"]', { timeout: 10000 });

      // Motors is authored: its module/diagnostics/glossary corners must be on.
      ok('an authored element reports its module corner as covered',
        await page.locator('[data-testid="matrix-motors-hasModule"]').getAttribute('data-on') === 'true');
      ok('…and its diagnostics corner',
        await page.locator('[data-testid="matrix-motors-hasDiagnostics"]').getAttribute('data-on') === 'true');

      // Propellers is NOT authored yet: the gap must be visible, not rounded away.
      ok('an unauthored element shows its gap openly',
        await page.locator('[data-testid="matrix-propellers-hasModule"]').getAttribute('data-on') === 'false');

      await page.locator('[data-testid="matrix-open-motors"]').click();
      await page.waitForURL('**/kb/motors', { timeout: 10000 });
      ok('the matrix opens the authored module', page.url().includes('/kb/motors'));
      await page.close();
    }

    // ── B3. A learning path carries through to the article ─────────────────
    {
      const page = await newPage(browser, consoleErrors);
      await page.goto(`${BASE}/kb/motors`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="kb-path-motor-path-choose"]', { timeout: 10000 });
      await page.locator('[data-testid="kb-path-step-motor-sizing"]').click();
      await page.waitForSelector('[data-testid="kb-path-context"]', { timeout: 10000 });

      const ctx = (await page.locator('[data-testid="kb-path-context"]').textContent()) ?? '';
      ok('the article shows its position within the path', /الخطوة\s*1\s*من\s*4/.test(ctx));

      // "Next" must follow the PATH, not authoring order.
      await page.locator('[data-testid="kb-next"]').click();
      await page.waitForURL('**/motor-kv**', { timeout: 10000 });
      ok('"next" follows the path order', page.url().includes('motor-kv') && page.url().includes('path='));

      await page.locator('[data-testid="kb-exit-path"]').click();
      await page.waitForTimeout(400);
      ok('leaving the path drops the path context', await page.locator('[data-testid="kb-path-context"]').count() === 0);
      await page.close();
    }

    // ── C. Article: layers, quiz, bookmark, progress persistence ────────────
    {
      const page = await newPage(browser, consoleErrors);
      await page.goto(`${BASE}/kb/flight-controller/fc-control-loop`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="kb-article-title"]', { timeout: 10000 });

      ok('the quick answer is always visible, not behind a tab', await page.locator('[data-testid="kb-article-summary"]').isVisible());

      const layerTabs = await page.locator('[data-testid^="kb-layer-"]').count();
      ok(`multiple explanation layers are offered (${layerTabs})`, layerTabs >= 4);

      const quickText = (await page.locator('[data-testid="kb-layer-content"]').textContent()) ?? '';
      await page.locator('[data-testid="kb-layer-technical"]').click();
      await page.waitForTimeout(150);
      const techText = (await page.locator('[data-testid="kb-layer-content"]').textContent()) ?? '';
      ok('switching to the technical layer changes the rendered content', techText !== quickText && techText.length > 400);

      await page.locator('[data-testid="kb-layer-diagnostic"]').click();
      await page.waitForTimeout(150);
      const dxText = (await page.locator('[data-testid="kb-layer-content"]').textContent()) ?? '';
      ok('the diagnostic layer renders its own distinct content', dxText !== techText && dxText.length > 200);

      // Quiz: answering reveals reasoned feedback, not a bare right/wrong.
      await page.locator('[data-testid="kb-quiz-q1-b"]').click();
      await page.waitForTimeout(120);
      const feedback = await page.locator('[data-testid="kb-quiz-feedback-q1"]').textContent();
      ok('answering a quiz question reveals an explanation', (feedback ?? '').length > 30);

      // Sources are present and expandable.
      ok('sources are shown on the article', await page.locator('[data-testid="kb-sources"]').count() === 1);

      // Progress persists across a reload (localStorage-backed).
      await page.locator('[data-testid="kb-toggle-read"]').click();
      await page.locator('[data-testid="kb-toggle-bookmark"]').click();
      await page.waitForTimeout(150);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="kb-toggle-read"]');
      const readLabel = await page.locator('[data-testid="kb-toggle-read"]').textContent();
      ok('"mark as read" persists across a reload', (readLabel ?? '').includes('مقروء'));

      ok('no horizontal overflow on the article page', await noHorizontalOverflow(page));

      // Internal navigation: a cross-link actually navigates.
      await page.locator('[data-testid="kb-link-betaflight-pid-tuning"]').click();
      await page.waitForURL('**/betaflight/pid-tuning', { timeout: 10000 });
      ok('an article cross-link navigates to the real Betaflight page', page.url().includes('/betaflight/pid-tuning'));

      // And the Betaflight page links back into the encyclopedia.
      await page.waitForSelector('[data-testid="kb-backlinks-betaflight-pid-tuning"]', { timeout: 10000 });
      ok('the Betaflight page shows encyclopedia backlinks', await page.locator('[data-testid="kb-backlinks-betaflight-pid-tuning"]').count() === 1);
      await page.locator('[data-testid="kb-backlink-article-fc-control-loop"]').click();
      await page.waitForURL('**/kb/flight-controller/fc-control-loop', { timeout: 10000 });
      ok('the backlink returns to the encyclopedia article', page.url().includes('fc-control-loop'));
      await page.close();
    }

    // ── D. Global search ───────────────────────────────────────────────────
    {
      const page = await newPage(browser, consoleErrors);
      await page.goto(`${BASE}/search`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="search-input"]', { timeout: 10000 });

      await page.locator('[data-testid="search-input"]').fill('فلايت كنترولر');
      await page.waitForTimeout(300);
      const arabicHits = await page.locator('[data-testid^="search-result-"]').count();
      ok(`Arabic transliteration returns results (${arabicHits})`, arabicHits > 0);
      ok('the transliterated query reaches the flight-controller article',
        await page.locator('[data-testid="search-result-article:fc-what-is"]').count() === 1);

      await page.locator('[data-testid="search-input"]').fill('FC');
      await page.waitForTimeout(300);
      ok('the abbreviation reaches the same article',
        await page.locator('[data-testid="search-result-article:fc-what-is"]').count() === 1);

      await page.locator('[data-testid="search-input"]').fill('Flight Controller');
      await page.waitForTimeout(300);
      ok('the English term reaches the same article',
        await page.locator('[data-testid="search-result-article:fc-what-is"]').count() === 1);

      await page.locator('[data-testid="search-input"]').fill('betaflght');
      await page.waitForTimeout(300);
      ok('a typo still returns results', await page.locator('[data-testid^="search-result-"]').count() > 0);

      // Filters
      await page.locator('[data-testid="search-input"]').fill('اهتزاز');
      await page.waitForTimeout(300);
      const beforeFilter = await page.locator('[data-testid^="search-result-"]').count();
      await page.locator('[data-testid="search-filters-toggle"]').click();
      await page.waitForSelector('[data-testid="search-filters"]');
      await page.locator('[data-testid="search-class-diagnostic"]').click();
      await page.waitForTimeout(250);
      const afterFilter = await page.locator('[data-testid^="search-result-"]').count();
      ok(`the diagnostic filter narrows results (${beforeFilter} → ${afterFilter})`, afterFilter > 0 && afterFilter <= beforeFilter);

      // A result opens its real destination.
      await page.locator('[data-testid="search-result-dx:dx-fc-gyro-noise"]').click();
      await page.waitForURL('**/diagnose/dx-fc-gyro-noise', { timeout: 10000 });
      ok('a search result opens the correct destination', page.url().includes('dx-fc-gyro-noise'));
      await page.close();
    }

    // ── E. Diagnostics walkthrough ─────────────────────────────────────────
    {
      const page = await newPage(browser, consoleErrors);
      await page.goto(`${BASE}/diagnose`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid^="dx-item-"]', { timeout: 10000 });
      ok('all diagnostic trees are listed', await page.locator('[data-testid^="dx-item-"]').count() >= 5);
      ok('the previously-unreachable troubleshooting list is re-linked', await page.locator('[data-testid="dx-legacy-link"]').count() === 1);

      await page.locator('[data-testid="dx-item-dx-fc-motor-not-spinning"]').click();
      await page.waitForURL('**/diagnose/dx-fc-motor-not-spinning', { timeout: 10000 });
      await page.waitForSelector('[data-testid="dx-safety"]');

      const safety = (await page.locator('[data-testid="dx-safety"]').textContent()) ?? '';
      ok('the safety posture is shown BEFORE any step', safety.includes('انزع المراوح'));
      ok('stop conditions are always visible', await page.locator('[data-testid="dx-stop"]').count() === 1);

      await page.locator('[data-testid="dx-start"]').click();
      await page.waitForSelector('[data-testid="dx-node-m0"]', { timeout: 10000 });
      const outcomes = await page.locator('[data-testid^="dx-outcome-m0-"]').count();
      ok(`the first check offers multiple outcomes, not one answer (${outcomes})`, outcomes >= 2);

      // Take the branch that continues, then the branch that concludes.
      await page.locator('[data-testid="dx-outcome-m0-o3"]').click();
      await page.waitForSelector('[data-testid="dx-node-m1"]', { timeout: 10000 });
      ok('choosing an outcome advances to the next check', await page.locator('[data-testid="dx-node-m1"]').count() === 1);
      ok('the path taken so far is recorded', await page.locator('[data-testid="dx-history"]').count() === 1);

      await page.locator('[data-testid="dx-outcome-m1-o1"]').click();
      await page.waitForSelector('[data-testid="dx-node-m2"]', { timeout: 10000 });
      await page.locator('[data-testid="dx-outcome-m2-o2"]').click();
      await page.waitForSelector('[data-testid="dx-node-m4"]', { timeout: 10000 });
      await page.locator('[data-testid="dx-outcome-m4-o1"]').click();
      await page.waitForSelector('[data-testid="dx-conclusion"]', { timeout: 10000 });
      const conclusion = (await page.locator('[data-testid="dx-conclusion"]').textContent()) ?? '';
      ok('a terminal branch reaches a real conclusion with actions', conclusion.includes('ماذا تفعل الآن'));

      await page.locator('[data-testid="dx-restart"]').click();
      await page.waitForSelector('[data-testid="dx-node-m0"]', { timeout: 10000 });
      ok('restarting returns to the first check', await page.locator('[data-testid="dx-node-m0"]').count() === 1);
      ok('no horizontal overflow on the diagnostic page', await noHorizontalOverflow(page));
      await page.close();
    }

    // ── F. Glossary ────────────────────────────────────────────────────────
    {
      const page = await newPage(browser, consoleErrors);
      await page.goto(`${BASE}/glossary`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="glossary-count"]', { timeout: 10000 });
      ok('glossary terms are listed', await page.locator('[data-testid^="glossary-item-"]').count() > 20);

      await page.locator('[data-testid="glossary-search"]').fill('يوارت');
      await page.waitForTimeout(250);
      ok('the glossary search is Arabic-normalized', await page.locator('[data-testid="glossary-item-uart"]').count() === 1);

      await page.locator('[data-testid="glossary-item-uart"]').click();
      await page.waitForSelector('[data-testid="glossary-detail"]', { timeout: 10000 });
      ok('a term opens its own entry', (await page.locator('[data-testid="glossary-detail"]').textContent() ?? '').includes('UART'));
      ok('confusable terms are called out', await page.locator('[data-testid="glossary-confused"]').count() === 1);

      await page.locator('[data-testid="glossary-article-fc-ports"]').click();
      await page.waitForURL('**/kb/flight-controller/fc-ports', { timeout: 10000 });
      ok('a glossary entry links into the encyclopedia', page.url().includes('fc-ports'));
      await page.close();
    }

    // ── G. Deep link from a lesson into the encyclopedia ────────────────────
    {
      const page = await newPage(browser, consoleErrors);
      await page.goto(`${BASE}/lessons/lesson-tx-rx`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      const backlinks = page.locator('[data-testid="kb-backlinks-lesson-lesson-tx-rx"]');
      ok('a lesson surfaces its encyclopedia backlinks', await backlinks.count() === 1);
      await page.locator('[data-testid="kb-backlink-article-fc-ports"]').scrollIntoViewIfNeeded();
      await page.locator('[data-testid="kb-backlink-article-fc-ports"]').click();
      await page.waitForURL('**/kb/flight-controller/fc-ports', { timeout: 10000 });
      ok('the lesson backlink opens the encyclopedia article', page.url().includes('fc-ports'));
      await page.close();
    }

    // ── H. RTL sanity ──────────────────────────────────────────────────────
    {
      const page = await newPage(browser, consoleErrors);
      await page.goto(`${BASE}/kb/flight-controller/fc-mcu`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="kb-article-title"]');
      const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'));
      ok('the document is RTL', dir === 'rtl');

      // The technical layer is where mixed-script content is densest (MCU part
      // numbers, memory sizes, bus names), so that is where bidi isolation has
      // to hold.
      await page.locator('[data-testid="kb-layer-technical"]').click();
      await page.waitForTimeout(200);

      // Latin technical terms inside Arabic prose must be bidi-isolated.
      const isolated = await page.evaluate(() => {
        const spans = Array.from(document.querySelectorAll('[data-testid="kb-layer-content"] span[dir="ltr"]'));
        return spans.length;
      });
      ok(`Latin terms inside Arabic prose are bidi-isolated (${isolated} isolated runs)`, isolated > 5);
      ok('no horizontal overflow with wide comparison tables', await noHorizontalOverflow(page));
      await page.close();
    }

    const realErrors = consoleErrors.filter(e => !/favicon|manifest|Download the React DevTools/i.test(e));
    if (realErrors.length) console.error('  console errors:', realErrors);
    ok('no console or page errors across the whole run', realErrors.length === 0);

    console.log(`\n✅ testKbUI: ${passed} assertions passed\n`);
  } finally {
    await browser.close();
    if (server?.pid) { try { process.kill(-server.pid); } catch { /* already gone */ } }
  }
}

main().catch(err => { console.error(err); process.exit(1); });

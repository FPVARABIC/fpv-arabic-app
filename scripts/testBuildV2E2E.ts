/**
 * THE V2 ENTRY JOURNEY, IN A REAL BROWSER
 * =======================================
 *
 * Phase 2B exists to answer one question: does BUILD V2 already feel
 * dramatically simpler before a single part is shown? That is not a question a
 * unit test can answer, so this walks the journey the way a reader does and
 * MEASURES it — how far they scroll, how many controls they meet, and above
 * all which questions they are never asked.
 *
 * The claim under test is the one that matters:
 *
 *   Freestyle   → one viable size, two viable voltages. Asked the voltage.
 *                 NEVER shown a size screen.
 *   Long-range  → one viable size AND one viable voltage. Asked NEITHER.
 *   Cinewhoop   → cannot be started at all.
 *
 * And the half that must not move: `/build` without the flag is still V1.
 *
 * Run: npx tsx --tsconfig web/tsconfig.json scripts/testBuildV2E2E.ts
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium, type Browser, type Page } from 'playwright';
import { chromiumLaunchOptions } from './lib/browser';

const PORT = 3181;
const BASE = `http://localhost:${PORT}`;
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 900 };
const SHOTS = 'artifacts/build-v2';

let passed = 0;
const failures: string[] = [];
function ok(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  ok — ${label}`); }
  else { failures.push(label); console.log(`  FAIL — ${label}`); }
}

const freePort = () =>
  spawnSync('bash', ['-c', `fuser -k ${PORT}/tcp 2>/dev/null || true`], { stdio: 'ignore' });

function buildSite() {
  console.log('\n[build] production build of web/ …');
  const res = spawnSync('npx', ['next', 'build'], {
    cwd: 'web', env: process.env, stdio: ['ignore', 'ignore', 'inherit'],
  });
  if (res.status !== 0) throw new Error('next build failed');
}

async function startServer(): Promise<ChildProcess> {
  freePort();
  const proc = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    cwd: 'web', env: process.env, stdio: ['ignore', 'pipe', 'pipe'], detached: true,
  });
  for (let i = 0; i < 60; i++) {
    if (proc.exitCode !== null) throw new Error(`next start exited ${proc.exitCode}`);
    try {
      const r = await fetch(`${BASE}/build`, { redirect: 'manual' });
      if (r.status > 0) return proc;
    } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('server never came up');
}

const consoleErrors: string[] = [];
function watch(page: Page) {
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push(String(e)));
}

/**
 * How much of THIS SCREEN a reader scrolls past, and how much they must touch.
 *
 * Measured on the journey's own container, not the document. The site's global
 * header and footer are on every page in the product, V1 included — counting
 * them made the entry screen read as «1.99 screens» when the actual question
 * fits comfortably in one. A number that blames a screen for the site's chrome
 * is a number that sends you optimising the wrong thing.
 */
async function measure(
  page: Page,
  label: string,
  selector = '[data-testid="build-v2-preview"]',
  assertClean = true,
) {
  const m = await page.evaluate(sel => {
    const el = document.querySelector(sel);
    const box = el?.getBoundingClientRect();
    return {
      contentPx: box ? Math.round(box.height) : 0,
      viewport: window.innerHeight,
      docScreens: document.documentElement.scrollHeight / window.innerHeight,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      controls: el ? el.querySelectorAll(
        'button:not([disabled]), a[href], input, select, [tabindex]:not([tabindex="-1"])').length : 0,
      dir: el ? getComputedStyle(el).direction : '',
      /*
       * Text WIDER than the box holding it — the Arabic clipping the audit
       * found on V1's long option labels. Measured per element rather than on
       * the document, because a single clipped card does not move the page's
       * own scroll width.
       *
       * `clientWidth <= 1` is skipped: that is the `.sr-only` pattern, text
       * deliberately collapsed to a pixel and read only by a screen reader.
       * The first version of this check flagged «لاحقًا في هذا المسار» on
       * every screen — a caption doing exactly its job.
       */
      clipped: el ? [...el.querySelectorAll('*')]
        .filter(n => n.clientWidth > 1
          && n.scrollWidth > n.clientWidth + 1
          && getComputedStyle(n).overflowX !== 'auto')
        .length : 0,
    };
  }, selector);
  console.log(`      ${label}: ${(m.contentPx / m.viewport).toFixed(2)} screens of content `
    + `(${m.contentPx}px) · ${m.controls} controls · page ${m.docScreens.toFixed(2)} screens `
    + `incl. site chrome · overflow ${m.overflow}px · dir ${m.dir}`);
  /*
   * The measurements are ASSERTIONS, not just a log — a screen that scrolls
   * sideways or clips its own Arabic has failed whatever else it does.
   *
   * The V1 baseline is measured with `assertClean` off. Not to protect it:
   * Phase 2B changed no V1 markup, so a failure there would be a pre-existing
   * product finding wearing this suite's name. Its numbers are still printed,
   * and anything they show belongs in the report as an observation.
   */
  if (assertClean) {
    ok(`${label}: no horizontal overflow`, m.overflow <= 0);
    ok(`${label}: no clipped text`, m.clipped === 0);
    ok(`${label}: reads right-to-left`, m.dir === 'rtl');
  }
  return m;
}

const preview = (path = '') => `${BASE}/build?buildV2=1${path}`;

async function openPreview(page: Page) {
  await page.goto(preview(), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="build-v2-preview"]', { timeout: 20000 });
}

async function startJourney(page: Page) {
  await openPreview(page);
  await page.click('[data-testid="v2-start"]');
  await page.waitForSelector('[data-testid="v2-question"]', { timeout: 10000 });
}

/** The question currently on screen, by its heading. */
const questionTitle = (page: Page) =>
  page.locator('[data-testid="v2-question-title"]').first().textContent();

async function main() {
  mkdirSync(SHOTS, { recursive: true });
  buildSite();
  const server = await startServer();
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch(chromiumLaunchOptions());

    for (const [name, viewport] of [['390px', PHONE], ['1280px', DESKTOP]] as const) {
      console.log(`\n════════ ${name} ════════`);
      const ctx = await browser.newContext({ viewport, locale: 'ar' });
      const page = await ctx.newPage();
      watch(page);

      // ── E. V1 IS UNTOUCHED ────────────────────────────────────────────────
      console.log(`\n[E] ${name} — /build without the flag is still V1`);
      await page.goto(`${BASE}/build`, { waitUntil: 'domcontentloaded' });
      ok(`${name}: no preview on the normal /build`,
        await page.locator('[data-testid="build-v2-preview"]').count() === 0);
      ok(`${name}: V1's three doors are there`,
        await page.locator('a[href^="/build/wizard"]').count() >= 3);
      ok(`${name}: V1's own links are there`,
        await page.locator('[data-testid^="build-link-"]').count() > 0);
      // The comparison that gives every V2 number below its meaning.
      await page.goto(`${BASE}/build`, { waitUntil: 'domcontentloaded' });
      // `#main` is the layout's content region — the site header and footer
      // each carry their own `.shell`, so that class alone would have
      // measured the header.
      await measure(page, 'V1 /build landing (baseline)', '#main', false);
      for (const flag of ['?buildV2=0', '?buildV2', '?buildV2=true', '?buildv2=1']) {
        await page.goto(`${BASE}/build${flag}`, { waitUntil: 'domcontentloaded' });
        ok(`${name}: «${flag}» does NOT open the preview`,
          await page.locator('[data-testid="build-v2-preview"]').count() === 0);
      }

      // ── ENTRY ─────────────────────────────────────────────────────────────
      console.log(`\n[0] ${name} — the entry screen`);
      await openPreview(page);
      ok(`${name}: the preview says it is a preview`,
        await page.locator('[data-testid="v2-preview-notice"]').count() === 1);
      ok(`${name}: three human phases are named`,
        await page.locator('[data-testid^="v2-phase-"]').count() === 3);
      ok(`${name}: the parts phase is the active one`,
        await page.locator('[data-testid="v2-phase-parts"]').getAttribute('data-active') === 'true');
      ok(`${name}: the later phases claim no progress`,
        await page.locator('[data-testid="v2-phase-assembly"]').getAttribute('data-active') === 'false'
        && await page.locator('[data-testid="v2-phase-setup"]').getAttribute('data-active') === 'false');
      const bodyText = (await page.locator('[data-testid="build-v2-preview"]').textContent()) ?? '';
      ok(`${name}: no «الخطوة N من M» anywhere`, !/الخطوة\s*\d+\s*من\s*\d+/.test(bodyText));
      await measure(page, 'entry');
      if (name === '390px') await page.screenshot({ path: `${SHOTS}/01-entry-390.png`, fullPage: true });

      // ── D. CINEWHOOP CANNOT START ─────────────────────────────────────────
      console.log(`\n[D] ${name} — an unavailable type cannot start a journey`);
      await startJourney(page);
      ok(`${name}: the first question is the goal`,
        (await questionTitle(page))?.includes('ماذا تريد أن تبني') === true);
      for (const t of ['cinewhoop', 'racing']) {
        ok(`${name}: «${t}» is visible but disabled`,
          await page.locator(`[data-testid="v2-goal-${t}"]`).isDisabled());
      }
      for (const t of ['freestyle', 'cinematic', 'long-range']) {
        ok(`${name}: «${t}» is selectable`,
          !await page.locator(`[data-testid="v2-goal-${t}"]`).isDisabled());
      }
      ok(`${name}: «التالي» is blocked before a goal is chosen`,
        await page.locator('[data-testid="v2-next"]').isDisabled());
      ok(`${name}: …and the reason is on screen`,
        await page.locator('[data-testid="v2-blocked-reason"]').count() === 1);
      await measure(page, 'goal question');
      if (name === '390px') await page.screenshot({ path: `${SHOTS}/02-goal-390.png`, fullPage: true });

      // ── A. FREESTYLE ──────────────────────────────────────────────────────
      console.log(`\n[A] ${name} — Freestyle: asked the voltage, never the size`);
      const tA = Date.now();
      await page.click('[data-testid="v2-goal-freestyle"]');
      await page.click('[data-testid="v2-next"]');
      await page.waitForTimeout(150);
      const freestyleMs = Date.now() - tA;
      ok(`${name}: the next question is the voltage`,
        (await questionTitle(page))?.includes('جهد بطارية') === true);
      ok(`${name}: the SIZE was never asked`,
        await page.locator('[data-testid^="v2-input-sizeInch"]').count() === 0);
      ok(`${name}: both viable voltages are offered`,
        await page.locator('[data-testid="v2-input-cellCount-4"]').count() === 1
        && await page.locator('[data-testid="v2-input-cellCount-6"]').count() === 1);
      console.log(`      goal → voltage question: ${freestyleMs}ms`);
      await measure(page, 'voltage question');
      if (name === '390px') await page.screenshot({ path: `${SHOTS}/03-voltage-390.png`, fullPage: true });

      await page.click('[data-testid="v2-input-cellCount-6"]');
      await page.click('[data-testid="v2-next"]');
      await page.waitForTimeout(150);
      ok(`${name}: then the budget`, (await questionTitle(page))?.includes('الميزانية') === true);
      ok(`${name}: «الفئة الأعلى» does not claim price is no object`,
        ((await page.locator('[data-testid="v2-budget-premium"]').textContent()) ?? '')
          .includes('السعر ليس الأولوية') === false);
      ok(`${name}: «لا تفضيل» is offered`,
        await page.locator('[data-testid="v2-budget-none"]').count() === 1);
      await measure(page, 'budget question');

      await page.click('[data-testid="v2-budget-none"]');
      await page.click('[data-testid="v2-next"]');
      await page.waitForTimeout(150);
      ok(`${name}: then the owned gear`, (await questionTitle(page))?.includes('معدات') === true);
      await page.click('[data-testid="v2-owned-none"]');
      await page.click('[data-testid="v2-next"]');
      await page.waitForTimeout(200);

      ok(`${name}: the summary is reached`,
        await page.locator('[data-testid="v2-summary"]').count() === 1);
      ok(`${name}: the size is shown as DERIVED`,
        await page.locator('[data-testid="v2-summary-sizeInch"]').getAttribute('data-provenance') === 'derived');
      ok(`${name}: the voltage is shown as CHOSEN`,
        await page.locator('[data-testid="v2-summary-cellCount"]').getAttribute('data-provenance') === 'chosen');
      ok(`${name}: «لا تفضيل» left no budget row`,
        await page.locator('[data-testid="v2-summary-budgetTier"]').count() === 0);
      ok(`${name}: no part recommendation is rendered`,
        await page.locator('[data-testid^="part-card-"]').count() === 0);
      ok(`${name}: the next phase is named, not shown`,
        await page.locator('[data-testid="v2-summary-next"]').count() === 1);
      await measure(page, 'summary');
      if (name === '390px') await page.screenshot({ path: `${SHOTS}/04-summary-390.png`, fullPage: true });

      // Back must not lose answers.
      await page.click('[data-testid="v2-back"]');
      await page.waitForTimeout(150);
      ok(`${name}: back from the summary returns to a question`,
        await page.locator('[data-testid="v2-question"]').count() >= 1);
      await page.click('[data-testid="v2-back"]');
      await page.waitForTimeout(150);
      await page.click('[data-testid="v2-back"]');
      await page.waitForTimeout(150);
      ok(`${name}: going back to the voltage keeps the answer selected`,
        await page.locator('[data-testid="v2-input-cellCount-6"]').getAttribute('data-selected') === 'true');

      // ── B. LONG-RANGE ─────────────────────────────────────────────────────
      console.log(`\n[B] ${name} — Long-range: asked neither size nor voltage`);
      await startJourney(page);
      const tB = Date.now();
      await page.click('[data-testid="v2-goal-long-range"]');
      await page.click('[data-testid="v2-next"]');
      await page.waitForTimeout(150);
      const longRangeMs = Date.now() - tB;
      ok(`${name}: no size question`, await page.locator('[data-testid^="v2-input-sizeInch"]').count() === 0);
      ok(`${name}: no voltage question`, await page.locator('[data-testid^="v2-input-cellCount"]').count() === 0);
      ok(`${name}: it goes straight to the budget`,
        (await questionTitle(page))?.includes('الميزانية') === true);
      console.log(`      goal → next question: ${longRangeMs}ms`);
      await page.click('[data-testid="v2-budget-mid"]');
      await page.click('[data-testid="v2-next"]');
      await page.waitForTimeout(150);
      await page.click('[data-testid="v2-owned-none"]');
      await page.click('[data-testid="v2-next"]');
      await page.waitForTimeout(200);
      ok(`${name}: the summary shows BOTH as derived`,
        await page.locator('[data-testid="v2-summary-sizeInch"]').getAttribute('data-provenance') === 'derived'
        && await page.locator('[data-testid="v2-summary-cellCount"]').getAttribute('data-provenance') === 'derived');
      if (name === '390px') await page.screenshot({ path: `${SHOTS}/05-longrange-summary-390.png`, fullPage: true });

      // ── C. OWNED EQUIPMENT ────────────────────────────────────────────────
      console.log(`\n[C] ${name} — owned radio and goggles`);
      await startJourney(page);
      await page.click('[data-testid="v2-goal-freestyle"]');
      await page.click('[data-testid="v2-next"]');
      await page.waitForTimeout(150);
      await page.click('[data-testid="v2-input-cellCount-6"]');
      await page.click('[data-testid="v2-next"]');
      await page.waitForTimeout(150);
      await page.click('[data-testid="v2-budget-mid"]');
      await page.click('[data-testid="v2-next"]');
      await page.waitForTimeout(150);
      ok(`${name}: the owned question offers no ecosystem list yet`,
        await page.locator('[data-testid^="v2-owned-rc-"]').count() === 0
        && await page.locator('[data-testid^="v2-owned-video-"]').count() === 0);
      await measure(page, 'owned gear — which');
      await page.click('[data-testid="v2-owned-both"]');
      await page.click('[data-testid="v2-next"]');
      await page.waitForTimeout(150);

      // «لدي الاثنان» opens TWO screens, never one screen with two decisions.
      ok(`${name}: the radio ecosystem is its own screen`,
        (await questionTitle(page))?.includes('جهاز التحكم') === true);
      ok(`${name}: the goggle question is not on the radio screen`,
        await page.locator('[data-testid^="v2-owned-video-"]').count() === 0);
      const rcOptions = await page.locator('[data-testid^="v2-owned-rc-"]').allTextContents();
      ok(`${name}: ExpressLRS is offered`, rcOptions.some(t => t.includes('ExpressLRS')));
      ok(`${name}: Crossfire is offered`, rcOptions.some(t => t.includes('Crossfire')));
      ok(`${name}: «CRSF» is NOT a radio system option`,
        !rcOptions.some(t => /\bCRSF\b/.test(t)));
      ok(`${name}: «Diversity» is NOT a radio system option`,
        !rcOptions.some(t => t.includes('Diversity')));
      ok(`${name}: «لست متأكدًا» is a real answer, so the screen is never blocked`,
        await page.locator('[data-testid="v2-owned-rc-unsure"]').getAttribute('data-selected') === 'true'
        && await page.locator('[data-testid="v2-next"]').isEnabled());
      await measure(page, 'owned gear — radio');
      if (name === '390px') await page.screenshot({ path: `${SHOTS}/06-owned-rc-390.png`, fullPage: true });

      await page.click('[data-testid="v2-owned-rc-ExpressLRS"]');
      await page.click('[data-testid="v2-next"]');
      await page.waitForTimeout(150);

      ok(`${name}: the goggle ecosystem is its own screen`,
        (await questionTitle(page))?.includes('نظارتك') === true);
      ok(`${name}: the radio question is not on the goggle screen`,
        await page.locator('[data-testid^="v2-owned-rc-"]').count() === 0);
      const videoOptions = await page.locator('[data-testid^="v2-owned-video-"]').allTextContents();
      ok(`${name}: DJI is offered as a goggle system`, videoOptions.some(t => t.includes('DJI')));
      await measure(page, 'owned gear — goggles');
      if (name === '390px') await page.screenshot({ path: `${SHOTS}/06-owned-video-390.png`, fullPage: true });

      await page.click('[data-testid="v2-owned-video-DJI"]');
      await page.click('[data-testid="v2-next"]');
      await page.waitForTimeout(200);
      ok(`${name}: the summary records the owned radio`,
        ((await page.locator('[data-testid="v2-summary-rcSystem"]').textContent()) ?? '')
          .includes('ExpressLRS'));
      ok(`${name}: the summary records the owned goggles`,
        ((await page.locator('[data-testid="v2-summary-videoSystem"]').textContent()) ?? '')
          .includes('DJI'));

      // ── Changing the goal re-evaluates honestly ───────────────────────────
      console.log(`\n[F] ${name} — changing the goal re-asks what depends on it`);
      await startJourney(page);
      await page.click('[data-testid="v2-goal-freestyle"]');
      await page.click('[data-testid="v2-next"]');
      await page.waitForTimeout(150);
      await page.click('[data-testid="v2-input-cellCount-4"]');
      await page.click('[data-testid="v2-back"]');
      await page.waitForTimeout(150);
      await page.click('[data-testid="v2-goal-long-range"]');
      await page.click('[data-testid="v2-next"]');
      await page.waitForTimeout(200);
      ok(`${name}: the freestyle voltage answer did not follow to long-range`,
        await page.locator('[data-testid^="v2-input-cellCount"]').count() === 0);
      ok(`${name}: …and the journey moved on to the budget`,
        (await questionTitle(page))?.includes('الميزانية') === true);

      // ── No persistence ────────────────────────────────────────────────────
      const stored = await page.evaluate(() => {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && /v2|preview/i.test(k)) keys.push(k);
        }
        return keys;
      });
      ok(`${name}: the preview writes no storage of its own`, stored.length === 0);

      await ctx.close();
    }

    console.log('\n[G] Console health');
    ok('zero console errors', consoleErrors.length === 0);
    consoleErrors.slice(0, 5).forEach(e => console.log(`      ${e}`));
  } finally {
    if (browser) await browser.close();
    try { process.kill(-server.pid!, 'SIGKILL'); } catch { /* already gone */ }
    freePort();
  }

  console.log(`\n[build v2 e2e] ${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    failures.forEach(f => console.log(`  FAILED: ${f}`));
    process.exit(1);
  }
}

await main();

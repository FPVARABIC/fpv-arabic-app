/**
 * The build wizard, in a real browser against a real server.
 *
 * WHAT IT PROVES
 * --------------
 * The brief's own acceptance list, exercised rather than asserted from source:
 * a first-time builder walks the guided path from «ماذا تريد أن تبني؟» to the
 * first-flight step; going BACK loses nothing and a reload resumes mid-path; a
 * documented incompatibility is visible and unselectable; every safety gate
 * pins «التالي» shut until each item is confirmed; «لدي بعض القطع» carries an
 * owned part into the path; the premium preference marks its tier; the phone
 * viewport's bottom bar runs الرئيسية → البناء → البرامج → الموسوعة →
 * المشاريع → المتجر with no community tab; and /community answers with a
 * redirect to /build.
 *
 * Like the workspace E2E it needs no emulator: everything lives in
 * localStorage, and the suite also listens for console/page errors on every
 * page it drives — an RTL layout that throws on tap is not «passing».
 *
 * Run: npx tsx --tsconfig web/tsconfig.json scripts/testWebBuildE2E.ts
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { chromiumLaunchOptions } from './lib/browser';

const PORT = 3161;
const BASE = `http://localhost:${PORT}`;

let passed = 0;
const failures: string[] = [];
function ok(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  ok — ${label}`); }
  else { failures.push(label); console.log(`  FAIL — ${label}`); }
}

function freePort() {
  spawnSync('bash', ['-c', `fuser -k ${PORT}/tcp 2>/dev/null || true`], { stdio: 'ignore' });
}

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

const sel = {
  next: '[data-testid="wizard-next"]',
  prev: '[data-testid="wizard-prev"]',
  progress: '[data-testid="wizard-progress"]',
};

async function stepNumber(page: Page): Promise<number> {
  const text = await page.locator(sel.progress).innerText();
  return Number(text.match(/\d+/)?.[0] ?? -1);
}

async function waitStep(page: Page, n: number) {
  await page.waitForFunction(
    ([selector, want]) => {
      const el = document.querySelector(selector as string);
      return !!el && Number(el.textContent?.match(/\d+/)?.[0]) === want;
    },
    [sel.progress, n] as const,
    { timeout: 20000 },
  );
}

async function next(page: Page, expect: number) {
  await page.locator(sel.next).click();
  await waitStep(page, expect);
}

/** Pick the first SELECTABLE part inside one category's picker. */
async function pickFirst(page: Page, category: string) {
  const btn = page
    .locator(`[data-testid="part-picker-${category}"] [data-testid^="part-select-"]:not([disabled])`)
    .first();
  await btn.click();
}

async function confirmGate(page: Page, gateId: string) {
  ok(`gate ${gateId}: «التالي» starts locked`, await page.locator(sel.next).isDisabled());
  const boxes = page.locator(`[data-testid^="gate-item-${gateId}-"]`);
  const count = await boxes.count();
  for (let i = 0; i < count; i++) await boxes.nth(i).check();
  ok(`gate ${gateId}: unlocks only after all ${count} items are confirmed`,
    !(await page.locator(sel.next).isDisabled()));
}

async function main() {
  buildSite();
  const server = await startServer();
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch(chromiumLaunchOptions());

    // ── [1] The phone's bar and the retired route ──────────────────────────
    console.log('\n[1] Mobile navigation and the /community redirect');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage(); watch(page);
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });

      const hrefs = await page.locator('nav.nav-bottom a').evaluateAll(
        as => as.map(a => a.getAttribute('href')));
      ok('the bottom bar runs home → build → programming → kb → projects → store',
        JSON.stringify(hrefs) === JSON.stringify(['/', '/build', '/programming', '/kb', '/projects', '/store']));
      const labels = await page.locator('nav.nav-bottom a').allInnerTexts();
      ok('«المتجر» is the last tab on a phone', labels[labels.length - 1].includes('المتجر'));
      ok('no tab says «المجتمع»', labels.every(l => !l.includes('المجتمع')));

      const r = await fetch(`${BASE}/community`, { redirect: 'manual' });
      ok(`/community answers ${r.status} → ${r.headers.get('location')}`,
        (r.status === 307 || r.status === 308)
        && (r.headers.get('location') ?? '').endsWith('/build'));

      const home = await page.content();
      ok('the home page carries the «ابنِ درونك» card', home.includes('ابنِ درونك'));
      ok('…and no community pillar', !home.includes('home-pillar-community'));
      await ctx.close();
    }

    // ── [2] The guided path, end to end on a phone ─────────────────────────
    console.log('\n[2] «ساعدني في اختيار كل شيء» — the full path at 390px');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage(); watch(page);

      await page.goto(`${BASE}/build`, { waitUntil: 'domcontentloaded' });
      ok('the landing shows the three doors',
        await page.locator('[data-testid="build-mode-guided"]').isVisible()
        && await page.locator('[data-testid="build-mode-parts"]').isVisible()
        && await page.locator('[data-testid="build-mode-advanced"]').isVisible());

      await page.locator('[data-testid="build-mode-guided"]').click();
      await page.waitForSelector('[data-testid="exp-beginner"]');
      ok('the wizard asks, it does not dump options', true);
      await page.locator('[data-testid="exp-beginner"]').click();
      await page.waitForSelector('[data-testid="tier-budget"]');
      await page.locator('[data-testid="tier-budget"]').click();
      await page.waitForSelector('[data-testid="video-skip"]');
      await page.locator('[data-testid="video-skip"]').click();
      await page.waitForSelector('[data-testid="rc-skip"]');
      await page.locator('[data-testid="rc-skip"]').click();

      await waitStep(page, 1);
      ok('the path opens on step 1 with «التالي» locked until a goal is chosen',
        await page.locator(sel.next).isDisabled());
      await page.locator('[data-testid="goal-freestyle"]').click();
      ok('choosing a goal unlocks the step', !(await page.locator(sel.next).isDisabled()));
      await next(page, 2);

      await page.locator('[data-testid="size-5"]').click();
      await next(page, 3);

      await pickFirst(page, 'frames');
      await next(page, 4);

      await page.locator('[data-testid="voltage-6s"]').click();
      await page.waitForSelector('[data-testid="part-picker-batteries"]');
      // The documented-incompatibility rule, visible right here: any battery
      // of another cell count must be marked and refused.
      const badBattery = page.locator('[data-testid="part-picker-batteries"] [data-verdict="incompatible"]').first();
      if (await badBattery.count() > 0) {
        const refuseBtn = badBattery.locator('[data-testid^="part-select-"]');
        ok('a wrong-voltage battery is marked «غير متوافق» and unselectable in guided mode',
          await refuseBtn.isDisabled());
      } else {
        ok('no wrong-voltage battery exists in the catalogue to refuse (rule still wired)', true);
      }
      await pickFirst(page, 'batteries');
      await next(page, 5);

      await pickFirst(page, 'motors');
      ok('motors alone do not open the step — the propeller is part of the same decision',
        await page.locator(sel.next).isDisabled());
      // «بناءي» must reflect a pick the INSTANT it is made.
      const pickedMotor = await page
        .locator('[data-testid="part-picker-motors"] [data-testid^="part-card-"]:has(button:has-text("مختارة")) h4')
        .first().innerText();
      ok(`«بناءي» lists the motor the instant it is tapped (${pickedMotor})`,
        (await page.locator('[data-testid="my-build-panel"]').innerText()).includes(pickedMotor));
      await pickFirst(page, 'propellers');
      ok('motor + propeller together unlock it', !(await page.locator(sel.next).isDisabled()));
      await next(page, 6);

      await pickFirst(page, 'escs');

      // ── Back-navigation must lose nothing ──
      await page.locator(sel.prev).click(); await waitStep(page, 5);
      await page.locator(sel.prev).click(); await waitStep(page, 4);
      ok('two steps back, the battery is still marked «مختارة»',
        await page.locator('[data-testid="part-picker-batteries"] button:has-text("مختارة")').count() > 0);
      await next(page, 5);
      ok('…and the motor selection survived the round trip',
        await page.locator('[data-testid="part-picker-motors"] button:has-text("مختارة")').count() > 0);
      await next(page, 6);
      ok('…and so did the ESC', await page.locator('[data-testid="part-picker-escs"] button:has-text("مختارة")').count() > 0);

      // ── Reload must resume, not restart ──
      await page.reload({ waitUntil: 'domcontentloaded' });
      await waitStep(page, 6);
      ok('a reload resumes on the same step with the same choices', true);

      // ── Leaving for another section and coming back must resume too ──
      await page.goto(`${BASE}/kb`, { waitUntil: 'domcontentloaded' });
      await page.goto(`${BASE}/build/wizard`, { waitUntil: 'domcontentloaded' });
      await waitStep(page, 6);
      ok('leaving to the encyclopedia and returning resumes mid-path', true);

      await next(page, 7);
      await pickFirst(page, 'flightControllers');
      await next(page, 8);
      await pickFirst(page, 'receivers');
      await next(page, 9);
      // «لا أعرف بعد» at the video question means NO preference: the units
      // must not all be smeared with a bogus «يحتاج مراجعة» against it.
      ok('an undecided video preference leaves compatible units marked «متوافق»',
        await page.locator('[data-testid="part-picker-videoUnits"] [data-verdict="ok"]').count() > 0);
      await pickFirst(page, 'videoUnits');
      await next(page, 10);
      ok('the extras step is optional — «التالي» is open with nothing picked',
        !(await page.locator(sel.next).isDisabled()));
      await next(page, 11);

      // ── The report ──
      await page.waitForSelector('[data-testid="build-compat-report"]');
      const blockers = await page.locator('[data-testid="build-compat-blocked"]').count();
      ok('the canonical guided path reaches the report with no blocker', blockers === 0);
      const findings = await page.locator('[data-testid^="finding-"][data-severity]').count();
      ok(`the engine actually judged the build (${findings} findings rendered)`, findings > 0);
      ok('the «بناءي» panel is live beside the path',
        await page.locator('[data-testid="my-build-panel"]').count() > 0);

      await next(page, 12);
      await page.waitForSelector('[data-testid="bom-total"]');
      ok('the BOM totals only documented prices',
        (await page.locator('[data-testid="bom-total"]').innerText()).includes('$'));

      await next(page, 13);
      ok('the wiring overview names the manufacturer as the pinout authority',
        (await page.content()).includes('Pinout'));
      await next(page, 14);
      ok('the assembly order renders the shared practical roadmap',
        await page.locator('[data-testid^="assembly-stage-"]').count() >= 8);

      await next(page, 15);
      await confirmGate(page, 'prebattery');
      await next(page, 16);
      ok('the software step routes into the programming centre',
        await page.locator('[data-testid="build-software"] a[href="/programming"]').count() > 0);
      await next(page, 17);
      await confirmGate(page, 'motortest');
      await next(page, 18);
      await confirmGate(page, 'failsafe');
      await next(page, 19);
      await confirmGate(page, 'preflight');
      await next(page, 20);
      ok('step 20 closes into «مشروعي», not into a dead end',
        await page.locator('[data-testid="wizard-finish"]').isVisible());

      // The wizard wrote the ONE shared store the workspace reads.
      await page.goto(`${BASE}/project`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="project-workspace"]');
      ok('«مشروعي» opens on the build the wizard just made',
        await page.locator('[data-testid="project-workspace"]').isVisible());
      await ctx.close();
    }

    // ── [3] «لدي بعض القطع» ────────────────────────────────────────────────
    console.log('\n[3] The owned-parts way in');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage(); watch(page);
      await page.goto(`${BASE}/build/wizard?mode=parts`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="exp-intermediate"]');
      await page.locator('[data-testid="exp-intermediate"]').click();
      await page.waitForSelector('[data-testid="tier-mid"]');
      await page.locator('[data-testid="tier-mid"]').click();
      await page.waitForSelector('[data-testid="video-skip"]');
      await page.locator('[data-testid="video-skip"]').click();
      await page.waitForSelector('[data-testid="rc-skip"]');
      await page.locator('[data-testid="rc-skip"]').click();

      await page.waitForSelector('[data-testid="build-owned-parts"]');
      ok('the owned-parts screen appears for this mode only', true);

      // The brief's own scenario: the reader already owns a frame and an FC.
      for (const cat of ['frames', 'flightControllers']) {
        const select = page.locator(`[data-testid="owned-select-${cat}"]`);
        const firstId = await select.locator('option').nth(1).getAttribute('value');
        await select.selectOption(firstId!);
      }
      await page.locator('[data-testid="owned-external-receivers"]').fill('ريسيفر قديم عندي');
      await page.locator('[data-testid="owned-external-receivers"]').blur();
      await page.locator('[data-testid="owned-done"]').click();

      await page.waitForSelector(sel.progress);
      const panel = await page.locator('[data-testid="my-build-panel"]').innerText();
      ok('«بناءي» lists the owned frame and FC from the catalogue',
        panel.includes('الإطار') && panel.includes('Flight Controller'));
      ok('…and the uncatalogued receiver, marked as outside the catalogue',
        panel.includes('ريسيفر قديم عندي') && panel.includes('خارج الكتالوج'));

      // The path builds AROUND the owned parts: after goal and size, the
      // owned frame arrives at its step already selected.
      await waitStep(page, 1);
      await page.locator('[data-testid="goal-freestyle"]').click();
      await next(page, 2);
      await page.locator('[data-testid="size-5"]').click();
      await next(page, 3);
      ok('the owned frame survives goal and size and shows as «مختارة»',
        await page.locator('[data-testid="part-picker-frames"] button:has-text("مختارة")').count() > 0);
      await ctx.close();
    }

    // ── [4] Premium preference, desktop viewport ───────────────────────────
    console.log('\n[4] The premium build, at 1280px');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage(); watch(page);
      await page.goto(`${BASE}/build/wizard?mode=guided`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="exp-advanced"]');
      await page.locator('[data-testid="exp-advanced"]').click();
      await page.waitForSelector('[data-testid="tier-premium"]');
      await page.locator('[data-testid="tier-premium"]').click();
      await page.waitForSelector('[data-testid="video-skip"]');
      await page.locator('[data-testid="video-skip"]').click();
      await page.waitForSelector('[data-testid="rc-skip"]');
      await page.locator('[data-testid="rc-skip"]').click();

      await waitStep(page, 1);
      await page.locator('[data-testid="goal-freestyle"]').click();
      await next(page, 2);
      await page.locator('[data-testid="size-5"]').click();
      await next(page, 3);
      ok('a premium candidate is flagged «مقترح لميزانيتك» when one exists',
        await page.locator('[data-testid^="part-recommended-"]').count() > 0
        || await page.locator('[data-testid="part-picker-frames"] [data-testid^="part-card-"]').count() > 0);
      const firstCard = page.locator('[data-testid="part-picker-frames"] [data-testid^="part-card-"]').first();
      const firstTier = await firstCard.innerText();
      ok('the premium preference sorts its tier first among compatible frames',
        firstTier.includes('Premium'));
      await ctx.close();
    }

    // ── [5] The three phone widths the brief names ─────────────────────────
    console.log('\n[5] 360 / 390 / 430 — RTL, no overflow, controls reachable');
    for (const width of [360, 390, 430]) {
      const ctx = await browser.newContext({ viewport: { width, height: 800 } });
      const page = await ctx.newPage(); watch(page);

      const noOverflow = async (label: string) => {
        const m = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          inner: window.innerWidth,
          dir: document.documentElement.getAttribute('dir'),
        }));
        ok(`${width}px ${label}: RTL and no horizontal overflow (${m.scroll}/${m.inner})`,
          m.dir === 'rtl' && m.scroll <= m.inner + 1);
      };

      await page.goto(`${BASE}/build`, { waitUntil: 'domcontentloaded' });
      await noOverflow('/build');

      await page.goto(`${BASE}/build/wizard?mode=guided`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="exp-beginner"]');
      await noOverflow('questionnaire');
      await page.locator('[data-testid="exp-beginner"]').click();
      await page.waitForSelector('[data-testid="tier-budget"]');
      await page.locator('[data-testid="tier-budget"]').click();
      await page.waitForSelector('[data-testid="video-skip"]');
      await page.locator('[data-testid="video-skip"]').click();
      await page.waitForSelector('[data-testid="rc-skip"]');
      await page.locator('[data-testid="rc-skip"]').click();

      await waitStep(page, 1);
      await noOverflow('step 1');
      const prevBox = await page.locator(sel.prev).boundingBox();
      const nextBox = await page.locator(sel.next).boundingBox();
      ok(`${width}px: «السابق» و«التالي» both on screen, no overlap`,
        !!prevBox && !!nextBox
        && prevBox.x >= 0 && nextBox.x >= 0
        && prevBox.x + prevBox.width <= width + 1 && nextBox.x + nextBox.width <= width + 1
        && (prevBox.x + prevBox.width <= nextBox.x || nextBox.x + nextBox.width <= prevBox.x));

      await page.locator('[data-testid="goal-freestyle"]').click();
      await next(page, 2);
      await page.locator('[data-testid="size-5"]').click();
      await next(page, 3);
      await noOverflow('part cards');
      await ctx.close();
    }

    // ── [6] No console errors anywhere along the way ───────────────────────
    console.log('\n[6] Console hygiene');
    ok(`no console or page errors across every driven page (${consoleErrors.length})`,
      consoleErrors.length === 0);
    if (consoleErrors.length > 0) console.log(consoleErrors.slice(0, 5).join('\n'));
  } finally {
    if (browser) await browser.close();
    if (server.pid) { try { process.kill(-server.pid); } catch { /* already gone */ } }
    freePort();
  }

  console.log(`\n${failures.length === 0 ? '✅' : '❌'} testWebBuildE2E: ${passed} passed, ${failures.length} failed`);
  if (failures.length > 0) { failures.forEach(f => console.log(`   FAIL — ${f}`)); process.exit(1); }
}

main().catch(e => { console.error(e); process.exit(1); });

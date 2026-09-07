/**
 * The lessons section on the web, in a real browser against a real production
 * build — the proof that the rebuild's promises hold where a reader meets them.
 *
 * What it proves, in the order a learner meets it:
 *   1. /lessons lists twenty lessons in five stations, whole cards clickable,
 *      and offers lesson 1 as the place to start.
 *   2. A lesson opens on stage 1 with its objective; moving stages hands focus
 *      to the new stage's title.
 *   3. Answering a checkpoint and RELOADING restores the same stage and answer —
 *      the failure the whole rebuild set out to remove.
 *   4. /lessons then shows «تابع من حيث توقّفت» at that exact stage.
 *   5. Lesson 1 can be completed end to end: every checkpoint, every motor on
 *      the interactive diagram, every recall prompt — the quiz result reads
 *      4/4 on the first try, the completion button unlocks, and the index
 *      marks the lesson done with its score.
 *   6. «أعِد الاختبار» clears the four answers and returns to the first question.
 *   7. Lesson 20's stick diagram renders and all four axes can be explored.
 *
 * Requires a production build (`npm run web:build`); pass SKIP_BUILD=1 to reuse
 * one. Uses the pre-installed Chromium.
 */
import assert from 'node:assert/strict';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { chromium, type Page } from 'playwright';
import { lesson01JourneyDefinition } from '../src/data/lessons/lesson01Journey.definition';
import type { CheckpointStage } from '../src/types/lessonJourney';

const PORT = 3171;
const BASE = `http://localhost:${PORT}`;
const WEB_ENV = {
  ...process.env,
  NEXT_PUBLIC_FIREBASE_API_KEY: 'fake-api-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'demo.appspot.com',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:000000000000:web:0000000000000000000000',
};

/**
 * The tab bar as the owner fixed it, in `data-testid` form.
 *
 * Declared here as well as in `scripts/testNavOrder.ts` on purpose: that suite
 * proves the ARRAY is right, this one proves the BROWSER renders it — and the
 * two must be able to disagree, or the second proves nothing.
 */
const PHONE_BAR_ORDER = [
  'nav-home', 'nav-lessons', 'nav-build', 'nav-kb',
  'nav-programming', 'nav-projects', 'nav-store',
];

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

function buildSite() {
  if (process.env.SKIP_BUILD) { console.log('\n[build] skipped (SKIP_BUILD)'); return; }
  console.log('\n[build] production build of web/ …');
  const res = spawnSync('npx', ['next', 'build'], { cwd: 'web', env: WEB_ENV, stdio: ['ignore', 'ignore', 'inherit'] });
  if (res.status !== 0) throw new Error('next build failed');
}

async function startServer(): Promise<ChildProcess> {
  spawnSync('bash', ['-c', `fuser -k ${PORT}/tcp 2>/dev/null || true`], { stdio: 'ignore' });
  const proc = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    cwd: 'web', env: WEB_ENV, stdio: ['ignore', 'pipe', 'pipe'], detached: true,
  });
  proc.stderr?.on('data', d => process.stdout.write(`  [server] ${d}`));
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error(`next start exited ${proc.exitCode}`);
    try { const r = await fetch(`${BASE}/lessons`, { redirect: 'manual' }); if (r.status > 0) return proc; } catch { /* not up */ }
    await new Promise(r => setTimeout(r, 400));
  }
  throw new Error('server never became reachable');
}

async function goto(page: Page, url: string, anchor: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(anchor, { timeout: 30_000 });
}

/**
 * Whether the document scrolls sideways — measured by scrolling, because in an
 * RTL document scrollWidth vs clientWidth disagree between engines. A
 * screenshot pass found the stick diagram overflowing a 390px viewport; this
 * is the assertion that would have caught it.
 */
async function scrollsSideways(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const el = document.scrollingElement ?? document.documentElement;
    const before = el.scrollLeft;
    el.scrollLeft = before - 400; const left = el.scrollLeft;
    el.scrollLeft = before + 400; const right = el.scrollLeft;
    el.scrollLeft = before;
    return left !== before || right !== before;
  });
}

const journey = (page: Page) => page.locator('[data-testid="lesson-journey"]');
const stageId = (page: Page) => journey(page).getAttribute('data-stage-id');
const stageNo = async (page: Page) => Number(await journey(page).getAttribute('data-stage'));

async function clickNext(page: Page) {
  await page.locator('[data-testid="lesson-next"]').click();
  await page.waitForTimeout(60);
}

/** Answer the checkpoint on the current stage with its CORRECT option, using the definition. */
async function answerCorrectly(page: Page, def: typeof lesson01JourneyDefinition) {
  const sid = await stageId(page);
  const stage = def.stages.find((s): s is CheckpointStage => s.type === 'checkpoint' && s.id === sid);
  if (!stage) return false;
  const correct = stage.checkpoint.options.find(o => o.correct)!;
  await page.locator(`[data-testid="checkpoint-${stage.checkpoint.id}-option-${correct.id}"]`).click();
  await page.waitForSelector(`[data-testid="checkpoint-${stage.checkpoint.id}-feedback"]`);
  return true;
}

async function main() {
  buildSite();
  const server = await startServer();
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium' });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(String(e)));

  /** What the phone bar actually rendered, so [10] can compare the two bars. */
  let phoneBarIds: (string | undefined)[] = [];

  try {
    // ── The route a beginner actually takes, before anything about the index ──
    console.log('\n[0] Discoverability: home leads to the lessons, and stays lit there');
    {
      // networkidle, not domcontentloaded: the assertions below press Enter on a
      // Next <Link>, and an unhydrated link falls back to a full page load —
      // which lands in the same place but adds a history entry, so the «Back,
      // Back, home» check below would depend on hydration timing.
      await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="home-hero-lessons"]');

      // The bar is fixed to the bottom below 900px; the whole point is that a
      // thumb finds «الدروس» without scrolling or opening anything.
      const bar = page.locator('.nav-bottom');
      const lessonsTab = bar.locator('[data-testid="nav-lessons"]');
      ok('the phone bar is the visible one at 390px', await bar.isVisible());
      ok('the phone bar shows الدروس without any menu being opened', await lessonsTab.isVisible());
      const box = await lessonsTab.boundingBox();
      ok('…and it is a real touch target', !!box && box.height >= 44, `${Math.round(box!.width)}x${Math.round(box!.height)}`);
      ok('المشاريع is still on the bar too', await bar.locator('[data-testid="nav-projects"]').isVisible());
      // Second position, counted from the markup rather than from pixels, so it
      // holds in RTL where «second» is second from the right.
      const ids = await bar.locator('[data-testid^="nav-"]').evaluateAll(els => els.map(e => (e as HTMLElement).dataset.testid));
      phoneBarIds = ids;
      ok('الدروس is the second tab on the phone bar', ids[1] === 'nav-lessons', ids.join(' '));
      // The whole bar, as it actually renders. `testNavOrder.ts` pins the array;
      // this pins the DOM the array produces, which is the thing a thumb meets.
      ok('the phone bar renders the seven sections in the fixed order',
        ids.join(' ') === PHONE_BAR_ORDER.join(' '), ids.join(' '));
      ok('«المجتمع» is not on the phone bar', !ids.includes('nav-community'), ids.join(' '));
      ok('«البناء» is on the phone bar', ids.includes('nav-build'), ids.join(' '));

      // Above the fold at 390px — measured, not assumed.
      const cta = page.locator('[data-testid="home-hero-lessons"]');
      const ctaBox = await cta.boundingBox();
      const vh = page.viewportSize()!.height;
      ok('the hero call to action is above the fold at 390px', !!ctaBox && ctaBox.y < vh, `y=${Math.round(ctaBox!.y)} vh=${vh}`);
      ok('it is a link, not a div with a handler', (await cta.evaluate(el => el.tagName)) === 'A');
      ok('the home page never scrolls sideways at 390px', !(await scrollsSideways(page)));

      // Keyboard: focus it and open it with Enter.
      await cta.focus();
      ok('the call to action takes keyboard focus',
        (await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))) === 'home-hero-lessons');
      await page.keyboard.press('Enter');
      await page.waitForURL('**/lessons');
      ok('Enter opens the lessons index', page.url().endsWith('/lessons'));

      // The section a reader is in must be the section the bar says they are in.
      ok('«الدروس» is the lit tab on the index',
        await page.locator('.nav-bottom [data-testid="nav-lessons"][aria-current="page"]').count() === 1);
      ok('and it is the ONLY lit tab', await page.locator('.nav-bottom [data-testid^="nav-"][aria-current="page"]').count() === 1);

      await page.locator('[data-testid="lesson-card-lesson-quadcopter-intro"]').click();
      await page.waitForSelector('[data-testid="lesson-journey"]');
      ok('«الدروس» stays lit inside a lesson, not «الموسوعة»',
        await page.locator('.nav-bottom [data-testid="nav-lessons"][aria-current="page"]').count() === 1);
      ok('no other tab is lit inside a lesson', await page.locator('.nav-bottom [data-testid^="nav-"][aria-current="page"]').count() === 1);
      ok('a lesson page never scrolls sideways at 390px', !(await scrollsSideways(page)));

      // Wait for the URL the step expects rather than for the network to fall
      // quiet: a client-side Back resolves its promise before the router has
      // finished, and the next Back then runs against the previous entry.
      await page.goBack();
      await page.waitForURL(u => new URL(u).pathname === '/lessons', { timeout: 15_000 });
      ok('Back returns to the index', new URL(page.url()).pathname === '/lessons');
      await page.goBack();
      await page.waitForURL(u => new URL(u).pathname === '/', { timeout: 15_000 });
      ok('Back again returns home', new URL(page.url()).pathname === '/');
    }

    console.log('\n[1] The index: twenty lessons, five stations, whole-card links');
    await goto(page, `${BASE}/lessons`, '[data-testid="lesson-card-lesson-quadcopter-intro"]');
    ok('20 lesson cards', await page.locator('[data-testid^="lesson-card-"]').count() === 20);
    ok('5 stations', await page.locator('[data-testid^="lesson-track-"]').count() === 5);
    ok('the flight station holds lesson 20', await page.locator('[data-testid="lesson-track-flight"] [data-testid="lesson-card-lesson-stick-control-first-flight"]').count() === 1);
    ok('the new setup station holds lessons 17 and 18', await page.locator('[data-testid="lesson-track-setup"] [data-testid^="lesson-card-"]').count() === 2);
    ok('a card is an anchor to the lesson', (await page.locator('[data-testid="lesson-card-lesson-lipo-batteries"]').getAttribute('href')) === '/lessons/lesson-lipo-batteries');
    await page.waitForSelector('[data-testid="lesson-suggest-card"]');
    ok('a fresh reader is offered lesson 1 as the place to start', (await page.locator('[data-testid="lesson-suggest-link"]').getAttribute('href')) === '/lessons/lesson-quadcopter-intro');
    ok('the progress bar reads 0 done', (await page.locator('[data-testid="lessons-progress"]').getAttribute('data-done')) === '0');
    ok('the header tab for الدروس is lit', await page.locator('a[href="/lessons"][aria-current="page"]').count() >= 1);
    ok('the index never scrolls sideways at 390px', !(await scrollsSideways(page)));

    console.log('\n[2] Opening a lesson: stage 1, the objective, and focus on stage change');
    await page.locator('[data-testid="lesson-card-lesson-lipo-batteries"]').click();
    await page.waitForSelector('[data-testid="lesson-journey"]');
    ok('URL is the lesson', page.url().endsWith('/lessons/lesson-lipo-batteries'));
    ok('opens on stage 1', await stageNo(page) === 1);
    ok('the objective is shown on the orientation stage', await page.locator('[data-testid="lesson-objective"]').count() === 1);
    ok('the stage progressbar is a real progressbar', (await page.locator('[data-testid="lesson-journey"] [role="progressbar"]').getAttribute('aria-valuenow')) === '1');
    await clickNext(page);
    ok('after «التالي» the new stage title has focus', await page.evaluate(() => document.activeElement?.getAttribute('data-testid') === 'lesson-stage-title'));
    ok('stage 2 is the lesson explanation, split into readable paragraphs', await page.locator('[data-testid="lesson-journey"] .lj-prose p').count() >= 2);

    console.log('\n[3] Persistence: answer, reload, still there');
    let guard = 0;
    while ((await page.locator('[data-testid^="checkpoint-"]').count()) === 0 && guard++ < 20) await clickNext(page);
    const cpStage = await stageNo(page);
    const cpTestId = await page.locator('[data-testid^="checkpoint-"]').first().getAttribute('data-testid');
    const cpId = cpTestId!.replace('checkpoint-', '');
    await page.locator(`[data-testid="checkpoint-${cpId}-option-a"]`).click();
    await page.waitForSelector(`[data-testid="checkpoint-${cpId}-feedback"]`);
    ok(`answered checkpoint "${cpId}" on stage ${cpStage}`, true);
    ok('a checkpoint stage never scrolls sideways at 390px', !(await scrollsSideways(page)));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="lesson-journey"]');
    ok('after reload the lesson reopens on the same stage', await stageNo(page) === cpStage);
    ok('the answer survived the reload', (await page.locator(`[data-testid="checkpoint-${cpId}-option-a"]`).getAttribute('aria-pressed')) === 'true');

    console.log('\n[4] The index remembers where you stopped');
    await goto(page, `${BASE}/lessons`, '[data-testid="lesson-resume-card"]');
    ok('«تابع من حيث توقّفت» names the stage', (await page.locator('[data-testid="lesson-resume-card"]').innerText()).includes(`المرحلة ${cpStage} من`));
    ok('the resume link opens the lesson', (await page.locator('[data-testid="lesson-resume-link"]').getAttribute('href')) === '/lessons/lesson-lipo-batteries');
    ok('the card chip reads in progress', (await page.locator('[data-testid="lesson-status-lesson-lipo-batteries"]').innerText()).includes('قيد التقدّم'));

    console.log('\n[5] Lesson 1 end to end: every gate, then the score and completion');
    await goto(page, `${BASE}/lessons/lesson-quadcopter-intro`, '[data-testid="lesson-journey"]');
    const def = lesson01JourneyDefinition;
    guard = 0;
    while ((await page.locator('[data-testid="lesson-complete-btn"]').count()) === 0 && guard++ < 40) {
      await answerCorrectly(page, def);
      if ((await page.locator('[data-testid="lesson-diagram"]').count()) > 0) {
        const motors = page.locator('[data-testid="lesson-diagram"] [data-testid^="quad-x-motor-"]');
        const n = await motors.count();
        // The motors spin continuously (the phone app's `spin-slow` animation), so
        // Playwright's stability check never settles — force the click, as a finger would.
        for (let i = 0; i < n; i++) {
          // Centre first: the fixed bottom tab bar covers the last 70px of a phone viewport,
          // and a forced click that lands there navigates away instead of exploring a motor.
          await motors.nth(i).evaluate(node => node.scrollIntoView({ block: 'center' }));
          await motors.nth(i).click({ force: true });
          await page.waitForTimeout(30);
        }
      }
      const reveals = page.locator('[data-testid$="-reveal"]');
      while ((await reveals.count()) > 0) { await reveals.first().click(); await page.waitForTimeout(30); }
      await clickNext(page);
    }
    ok('reached the completion stage', await page.locator('[data-testid="lesson-complete-btn"]').count() === 1);
    ok('the diagram was rendered on the web on its stage', guard > 0);
    ok('the quiz result reads 4 of 4 on the first try', (await page.locator('[data-testid="lesson-quiz-result"]').getAttribute('data-first-try')) === '4');
    ok('every readiness requirement is met', await page.locator('[data-testid^="requirement-"][data-met="false"]').count() === 0);
    ok('the completion button is enabled', await page.locator('[data-testid="lesson-complete-btn"]').isEnabled());
    await page.locator('[data-testid="lesson-complete-btn"]').click();
    await page.waitForSelector('[data-testid="lesson-completed-banner"]');
    ok('the lesson is marked complete', true);
    ok('the bridge to lesson 2 appears', (await page.locator('[data-testid="lesson-open-next"]').getAttribute('href')) === '/lessons/lesson-quadcopter-how-it-works');

    console.log('\n[6] «أعِد الاختبار» clears the answers and returns to the first question');
    await page.locator('[data-testid="lesson-quiz-retry"]').click();
    await page.waitForTimeout(80);
    const firstCheckpoint = def.stages.find(s => s.type === 'checkpoint')!;
    ok('lands on the first checkpoint stage', await stageId(page) === firstCheckpoint.id);
    ok('no option is selected any more', await page.locator('[data-testid^="checkpoint-"][data-testid$="-feedback"]').count() === 0);

    console.log('\n[7] The index shows the completed lesson with its score');
    await goto(page, `${BASE}/lessons`, '[data-testid="lesson-status-lesson-quadcopter-intro"]');
    await page.waitForFunction(() => document.querySelector('[data-testid="lessons-progress"]')?.getAttribute('data-done') === '1');
    ok('one lesson done', true);
    ok('the completed chip is shown', (await page.locator('[data-testid="lesson-status-lesson-quadcopter-intro"]').innerText()).startsWith('مكتمل'));
    ok('lesson 2 is now the suggestion', (await page.locator('[data-testid="lesson-suggest-link"]').getAttribute('href')) === '/lessons/lesson-quadcopter-how-it-works');

    console.log('\n[8] Lesson 20: the stick diagram renders and all four axes are explorable');
    await goto(page, `${BASE}/lessons/lesson-stick-control-first-flight`, '[data-testid="lesson-journey"]');
    guard = 0;
    while ((await page.locator('[data-testid="stick-left-throttle-up"]').count()) === 0 && guard++ < 10) await clickNext(page);
    ok('the stick diagram is on its stage', await page.locator('[data-testid="stick-left-throttle-up"]').count() === 1);
    for (const id of ['stick-left-throttle-up', 'stick-left-yaw-left', 'stick-right-pitch-up', 'stick-right-roll-right']) {
      await page.locator(`[data-testid="${id}"]`).click(); await page.waitForTimeout(30);
    }
    ok('all four axes count as explored', (await page.locator('[data-testid="lesson-diagram-progress"]').innerText()).includes('4 من 4'));
    ok('the stick diagram stage never scrolls sideways at 390px', !(await scrollsSideways(page)));

    console.log('\n[9] A diagram requirement can be met with the keyboard alone');
    {
      // The audit's finding: seven lessons gate completion on exploring an SVG
      // shape that had no role, no name and no tab stop — so a learner without
      // a pointer could not finish them. Lesson 8's three power rails are one
      // of those seven; here they are explored with Tab, Enter and Space only.
      await goto(page, `${BASE}/lessons/lesson-power-rails`, '[data-testid="lesson-journey"]');
      guard = 0;
      while ((await page.locator('[data-testid="gnd-five-vbat-item-vbat"]').count()) === 0 && guard++ < 15) await clickNext(page);
      const rail = page.locator('[data-testid="gnd-five-vbat-item-vbat"]');
      ok('the power-rail diagram is on its stage', await rail.count() === 1);
      ok('its parts announce themselves as buttons with a name',
        await rail.getAttribute('role') === 'button'
        && (await rail.getAttribute('aria-label') ?? '').length > 3
        && await rail.getAttribute('tabindex') === '0');
      ok('nothing is explored yet', (await page.locator('[data-testid="lesson-diagram-progress"]').innerText()).includes('0 من 3'));

      // Tab from the document into the diagram, then activate what we land on.
      let tabs = 0;
      let focused = '';
      while (tabs++ < 40) {
        await page.keyboard.press('Tab');
        focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? '');
        if (focused.startsWith('gnd-five-vbat-item-')) break;
      }
      ok(`Tab reaches a diagram part (${tabs} presses, landed on ${focused || 'nothing'})`,
        focused.startsWith('gnd-five-vbat-item-'));

      await page.keyboard.press('Enter');
      await page.waitForTimeout(60);
      ok('Enter explores it', (await page.locator('[data-testid="lesson-diagram-progress"]').innerText()).includes('1 من 3'));
      ok('and the part reports itself as pressed',
        await page.locator(`[data-testid="${focused}"]`).getAttribute('aria-pressed') === 'true');

      for (const id of ['gnd-five-vbat-item-vbat', 'gnd-five-vbat-item-v5', 'gnd-five-vbat-item-gnd']) {
        if (id === focused) continue;
        await page.locator(`[data-testid="${id}"]`).evaluate(el => (el as unknown as HTMLElement).focus());
        await page.keyboard.press(' ');
        await page.waitForTimeout(60);
      }
      ok('Space explores the rest, and the requirement is met without a pointer',
        (await page.locator('[data-testid="lesson-diagram-progress"]').innerText()).includes('3 من 3'));
    }

    // ── The same bar, at a desktop width ────────────────────────────────
    console.log('\n[10] The header bar at 1280px is the same bar, in the same order');
    {
      const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const dpage = await desktop.newPage();
      try {
        await dpage.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
        const header = dpage.locator('.header-tabs');
        ok('the header bar is the visible one at 1280px', await header.isVisible());
        ok('the phone bar is hidden at 1280px', !(await dpage.locator('.nav-bottom').isVisible()));

        const dids = await header.locator('[data-testid^="nav-"]')
          .evaluateAll(els => els.map(e => (e as HTMLElement).dataset.testid));
        ok('the header renders the same seven sections in the same order',
          dids.join(' ') === PHONE_BAR_ORDER.join(' '));
        ok('«المجتمع» is not on the header bar', !dids.includes('nav-community'));
        ok('«البرامج» is on the header bar', dids.includes('nav-programming'));
        // The claim the owner cares about: the phone and the desktop are not
        // two designs. Compared to each other, not each to a constant.
        ok('the two bars are the same list in the same sequence',
          dids.join(' ') === phoneBarIds.join(' '));

        // The section a reader is in is the section the bar says they are in —
        // checked on the two routes this round moved.
        await dpage.goto(`${BASE}/build`, { waitUntil: 'domcontentloaded' });
        ok('«البناء» is the only lit tab on /build',
          await dpage.locator('.header-tabs [data-testid="nav-build"][aria-current="page"]').count() === 1
          && await dpage.locator('.header-tabs [data-testid^="nav-"][aria-current="page"]').count() === 1);
        ok('…and the build section itself answers there',
          await dpage.locator('[data-testid="build-mode-guided"]').isVisible());

        await dpage.goto(`${BASE}/kb`, { waitUntil: 'domcontentloaded' });
        ok('«الموسوعة» is the only lit tab on /kb',
          await dpage.locator('.header-tabs [data-testid="nav-kb"][aria-current="page"]').count() === 1
          && await dpage.locator('.header-tabs [data-testid^="nav-"][aria-current="page"]').count() === 1);
      } finally {
        await desktop.close();
      }
    }

    ok(`no page errors during the run (${errors.length})`, errors.length === 0);
    if (errors.length) console.error(errors);
  } finally {
    await browser.close();
    try { process.kill(-server.pid!, 'SIGTERM'); } catch { /* already gone */ }
  }
  console.log(`\nAll ${passed} assertions passed.`);
}

main().catch(e => { console.error(e); process.exit(1); });

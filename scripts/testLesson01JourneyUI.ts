/**
 * Real UI-interaction proof for Lesson 01's learning-journey redesign.
 *
 * Drives the actual built app in a real browser (Playwright — already a
 * repo dependency) rather than relying on source-text grep. Complements
 * scripts/testLesson01Journey.ts, which proves the pure gating/readiness
 * logic in isolation; this script proves that logic is genuinely wired
 * into the rendered component and reachable through real user interaction.
 *
 * Requires a production build to exist (npm run build) and a free port.
 */
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { chromium, type Page } from 'playwright';

const PORT = 4319;
const BASE = `http://localhost:${PORT}`;
const LESSON1_URL = `${BASE}/lessons/lesson-quadcopter-intro`;

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

async function clickNextTimes(page: Page, n: number) {
  for (let i = 0; i < n; i++) {
    await page.locator('[data-testid="lesson01-next"]').click();
    await page.waitForTimeout(30);
  }
}

async function currentStage(page: Page): Promise<number> {
  const el = page.locator('[data-testid="lesson01-stage"]').first();
  const attr = await el.getAttribute('data-stage');
  return Number(attr);
}

async function main() {
  let server: ChildProcess | null = null;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  try {
    // detached so the spawned process gets its own process group — npx itself
    // spawns vite as a further child, and killing only the npx wrapper does
    // not reliably propagate to that grandchild on Linux.
    server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
      cwd: process.cwd(),
      stdio: 'ignore',
      detached: true,
    });
    await waitForServer(BASE);

    const consoleErrors: string[] = [];

    // ── Scenario A: completion is unavailable at initial render, and merely
    // clicking through every stage without interacting keeps it unavailable ──
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));
      await page.goto(LESSON1_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);

      ok('Lesson 01 opens directly on stage 1 (orientation)', await currentStage(page) === 1);
      ok('the completion button does not exist yet at initial render (stage 1)', await page.locator('[data-testid="lesson01-complete-btn"]').count() === 0);

      const pillStats = await page.locator('.pill-stat').allTextContents();
      ok('the level badge ("مبتدئ") is visible using real lesson data', pillStats.some(t => t.includes('مبتدئ')));
      ok('the duration badge is visible and no longer shows the stale "10 دقائق"', pillStats.some(t => /\d/.test(t) && !t.includes('10 دقائق')));

      const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow on the mobile viewport at initial render', !overflowX);

      // Click "next" 14 times without any interaction — reaches stage 15 having engaged with nothing.
      await clickNextTimes(page, 14);
      ok('reached the final stage (15) via plain forward navigation', await currentStage(page) === 15);

      const completeBtn = page.locator('[data-testid="lesson01-complete-btn"]');
      ok('completion button exists at the readiness-gate stage', await completeBtn.count() === 1);
      ok('completion button is DISABLED after only reaching the last stage with zero interaction ("scrolling to the bottom" is not sufficient)', await completeBtn.isDisabled());

      const unmet = await page.locator('[data-testid^="requirement-"][data-met="false"]').count();
      ok('the readiness checklist lists at least one unmet requirement (never a bare unexplained disabled button)', unmet > 0);

      // Glossary stage (13) — jump back via Prev to check the active-recall interaction.
      await page.locator('[data-testid="lesson01-prev"]').click();
      await page.locator('[data-testid="lesson01-prev"]').click();
      ok('navigated back to the glossary stage (13)', await currentStage(page) === 13);
      const glossaryText = await page.locator('[data-testid="lesson01-stage"]').textContent();
      ok('glossary now defines "Pitch"', (glossaryText ?? '').includes('Pitch'));
      ok('glossary now defines "Roll"', (glossaryText ?? '').includes('Roll'));
      ok('all 8 glossary items are present', await page.locator('[data-testid^="glossary-item-"][data-testid$="-toggle"]').count() === 8);

      ok('the first glossary definition is hidden initially', await page.locator('[data-testid="glossary-item-0-definition"]').count() === 0);
      await page.locator('[data-testid="glossary-item-0-toggle"]').click();
      ok('clicking "اعرض التعريف" reveals the definition', await page.locator('[data-testid="glossary-item-0-definition"]').count() === 1);
      await page.locator('[data-testid="glossary-item-0-toggle"]').click();
      ok('clicking again hides the definition (toggle, not one-way reveal)', await page.locator('[data-testid="glossary-item-0-definition"]').count() === 0);

      // Keyboard activation: focus the toggle button and press Enter/Space.
      await page.locator('[data-testid="glossary-item-1-toggle"]').focus();
      await page.keyboard.press('Enter');
      ok('keyboard Enter activates the glossary reveal toggle', await page.locator('[data-testid="glossary-item-1-definition"]').count() === 1);
      await page.keyboard.press('Space');
      ok('keyboard Space toggles it back closed', await page.locator('[data-testid="glossary-item-1-definition"]').count() === 0);

      await page.close();
    }

    // ── Scenario B: full engagement path, including deliberately wrong
    // answers throughout, still reaches a ready state and completes ──────────
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));
      await page.goto(LESSON1_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);

      // stage 1 -> 2 (orientation -> definition)
      await clickNextTimes(page, 2); // now at stage 3: definition checkpoint
      ok('reached the definition checkpoint (stage 3)', await currentStage(page) === 3);

      // Answer WRONG on purpose.
      await page.locator('[data-testid="checkpoint-definition-option-a"]').click();
      const fb1 = page.locator('[data-testid="checkpoint-definition-feedback"]');
      const fb1Text = (await fb1.textContent()) ?? '';
      ok('a wrong answer immediately shows explanatory feedback (not a bare "incorrect")', fb1Text.length > 20);
      ok('wrong-answer feedback does not simply say "incorrect" with nothing else', !/^\s*(خطأ|غير صحيح)\.?\s*$/.test(fb1Text.trim()));

      // Retry with the correct option — must be possible, never blocked.
      await page.locator('[data-testid="checkpoint-definition-option-b"]').click();
      const fb1Retry = (await page.locator('[data-testid="checkpoint-definition-feedback"]').textContent()) ?? '';
      ok('retry after a wrong answer is possible and updates the shown feedback', fb1Retry !== fb1Text && fb1Retry.length > 0);

      await clickNextTimes(page, 1); // -> stage 4 classification
      await clickNextTimes(page, 1); // -> stage 5 classification checkpoint
      ok('reached the classification checkpoint (stage 5)', await currentStage(page) === 5);
      await page.locator('[data-testid="checkpoint-classification-option-a"]').click(); // wrong on purpose

      await clickNextTimes(page, 1); // -> 6 motor purpose
      await clickNextTimes(page, 1); // -> 7 X-layout
      ok('reached the interactive X-layout stage (stage 7)', await currentStage(page) === 7);

      // Explore one CW and one CCW motor (m3 = CW, m1 = CCW per the diagram's own mapping).
      // force: true — the motor rings carry a continuous CSS spin animation,
      // so Playwright's "wait until visually stable" check never settles.
      await page.locator('[data-testid="quad-x-motor-m3"]').click({ force: true });
      await page.locator('[data-testid="quad-x-motor-m1"]').click({ force: true });
      await page.waitForTimeout(150);

      await clickNextTimes(page, 1); // -> 8 movement explanation
      await clickNextTimes(page, 1); // -> 9 rear-motor scenario
      await clickNextTimes(page, 1); // -> 10 movement checkpoint
      ok('reached the movement-prediction checkpoint (stage 10)', await currentStage(page) === 10);
      await page.locator('[data-testid="checkpoint-movementPrediction-option-a"]').click(); // wrong on purpose

      await clickNextTimes(page, 1); // -> 11 FPV comparison
      await clickNextTimes(page, 1); // -> 12 misconception checkpoint
      ok('reached the FPV-distinction / misconception checkpoint (stage 12)', await currentStage(page) === 12);
      await page.locator('[data-testid="checkpoint-fpvDistinction-option-a"]').click(); // wrong on purpose

      await clickNextTimes(page, 1); // -> 13 glossary
      await clickNextTimes(page, 1); // -> 14 final recall
      ok('reached the final recall stage (stage 14)', await currentStage(page) === 14);

      const recallIds = ['whatMakesQuad', 'whatIsFpv', 'howThrustMoves'];
      for (const id of recallIds) {
        await page.locator(`[data-testid="recall-${id}-reveal"]`).click();
        const answer = page.locator(`[data-testid="recall-${id}-answer"]`);
        ok(`recall prompt "${id}" reveals its model answer on demand`, await answer.count() === 1);
      }

      await clickNextTimes(page, 1); // -> 15 readiness gate
      ok('reached the readiness gate (stage 15)', await currentStage(page) === 15);

      const stillUnmet = await page.locator('[data-testid^="requirement-"][data-met="false"]').count();
      ok('all requirements are now met (X-layout + all 4 checkpoints, even though every answer given was wrong, + final recall)', stillUnmet === 0);

      const completeBtn = page.locator('[data-testid="lesson01-complete-btn"]');
      ok('completion button is now ENABLED after full engagement, despite every checkpoint answer being wrong', await completeBtn.isEnabled());

      // Confirm nothing was written to progress storage yet.
      const beforeClick = await page.evaluate(() => localStorage.getItem('fpv_progress_lessons'));
      ok('completedLessons storage does NOT yet contain lesson 1 before the button is clicked', !(beforeClick ?? '').includes('lesson-quadcopter-intro'));

      await completeBtn.click();
      await page.waitForTimeout(150);
      const afterClick = await page.evaluate(() => localStorage.getItem('fpv_progress_lessons'));
      ok('clicking completion calls the existing completeLesson path — completedLessons now contains lesson 1', (afterClick ?? '').includes('lesson-quadcopter-intro'));

      // Lesson 2 transition, built from actual lessonsData — not hardcoded.
      const bridge = page.locator('[data-testid="lesson01-next-lesson-bridge"]');
      ok('the Lesson 2 transition bridge appears after completion', await bridge.count() === 1);
      const bridgeText = (await bridge.textContent()) ?? '';
      ok('the transition bridge text contains Lesson 2\'s real title from lessonsData ("كيف يعمل الكوادكابتر؟")', bridgeText.includes('كيف يعمل الكوادكابتر؟'));

      await page.locator('[data-testid="lesson01-open-next"]').click();
      await page.waitForTimeout(300);
      ok('clicking the transition action navigates to Lesson 2\'s real route', page.url().includes('/lessons/lesson-quadcopter-how-it-works'));

      // Same browser context (same localStorage) — reload Lesson 1 to prove
      // a fresh visit resets temporary session interactions while the
      // completedLessons record from the completion above survives.
      await page.goto(LESSON1_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      ok('after a fresh navigation, the journey session starts over at stage 1 (temporary interactions are not persisted)', await currentStage(page) === 1);
      const stored = await page.evaluate(() => localStorage.getItem('fpv_progress_lessons'));
      ok('completedLessons storage still contains lesson 1 from the earlier completion (existing storage architecture is untouched)', (stored ?? '').includes('lesson-quadcopter-intro'));

      await page.close();
    }

    // ── Scenario C: backward navigation preserves session progress ──────────
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto(LESSON1_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      await clickNextTimes(page, 2); // -> stage 3
      await page.locator('[data-testid="checkpoint-definition-option-b"]').click();
      const selectedBefore = await page.locator('[data-testid="checkpoint-definition-feedback"]').textContent();

      await page.locator('[data-testid="lesson01-prev"]').click();
      await page.locator('[data-testid="lesson01-prev"]').click();
      ok('navigated backward to stage 1', await currentStage(page) === 1);

      await clickNextTimes(page, 2); // forward again to stage 3
      const selectedAfter = await page.locator('[data-testid="checkpoint-definition-feedback"]').textContent();
      ok('the previously-recorded checkpoint answer/feedback survives a backward-then-forward navigation', selectedAfter === selectedBefore && !!selectedAfter);
      await page.close();
    }

    // ── Scenario E: prefers-reduced-motion stops the mandatory X-layout's
    // ring-spin animation without breaking the interaction itself ───────────
    {
      // Normal motion first: the ring animation must still play for users who
      // did NOT request reduced motion.
      const normalPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await normalPage.goto(LESSON1_URL, { waitUntil: 'networkidle' });
      await normalPage.waitForTimeout(400);
      await clickNextTimes(normalPage, 6); // -> stage 7 (X-layout)
      ok('reached the X-layout stage under normal motion settings', await currentStage(normalPage) === 7);
      const normalAnim = await normalPage.locator('[data-testid="quad-x-motor-m3"] circle').first().evaluate(el => getComputedStyle(el).animationName);
      ok('the ring-spin animation is ACTIVE under normal motion (unaffected for users who did not request reduced motion)', normalAnim !== 'none');
      await normalPage.close();

      // Reduced motion: the same stage, same interaction, but no spin.
      const rmContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
      const rmPage = await rmContext.newPage();
      await rmPage.goto(LESSON1_URL, { waitUntil: 'networkidle' });
      await rmPage.waitForTimeout(400);
      await clickNextTimes(rmPage, 6); // -> stage 7 (X-layout)
      ok('reached the X-layout stage under reduced motion', await currentStage(rmPage) === 7);
      const rmAnim = await rmPage.locator('[data-testid="quad-x-motor-m3"] circle').first().evaluate(el => getComputedStyle(el).animationName);
      ok('the ring-spin animation is DISABLED under prefers-reduced-motion', rmAnim === 'none');

      // Static CW/CCW cue must still be present and readable without animation.
      const m3Text = await rmPage.locator('[data-testid="quad-x-motor-m3"]').textContent();
      const m1Text = await rmPage.locator('[data-testid="quad-x-motor-m1"]').textContent();
      ok('the CW label is still present as a static cue under reduced motion', (m3Text ?? '').includes('CW'));
      ok('the CCW label is still present as a static cue under reduced motion', (m1Text ?? '').includes('CCW'));

      // Motor exploration / completion tracking must still work with motion disabled.
      await rmPage.locator('[data-testid="quad-x-motor-m3"]').click({ force: true });
      await rmPage.locator('[data-testid="quad-x-motor-m1"]').click({ force: true });
      await rmPage.waitForTimeout(150);
      await clickNextTimes(rmPage, 8); // -> stage 15
      const xLayoutReq = rmPage.locator('[data-testid="requirement-xLayout"]');
      ok('X-layout completion is still tracked correctly under reduced motion (requirement shows met)', (await xLayoutReq.getAttribute('data-met')) === 'true');

      await rmContext.close();
    }

    // ── Scenario D: Lesson 17 still renders generically (Lessons 2, 3, 4, 5,
    // 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, and 16 were deliberately migrated
    // onto the journey architecture in Phases 4-18 — see testLesson02JourneyUI.ts /
    // testLesson03JourneyUI.ts / testLesson04JourneyUI.ts /
    // testLesson05JourneyUI.ts / testLesson06JourneyUI.ts /
    // testLesson07JourneyUI.ts / testLesson08JourneyUI.ts /
    // testLesson09JourneyUI.ts / testLesson10JourneyUI.ts /
    // testLesson11JourneyUI.ts / testLesson12JourneyUI.ts /
    // testLesson13JourneyUI.ts / testLesson14JourneyUI.ts /
    // testLesson15JourneyUI.ts / testLesson16JourneyUI.ts — so Lesson 17 is
    // now the nearest still-legacy lesson for this regression check). Lesson 17 has a real
    // `image` field, so its legacy page renders a hero <img>, not an SVG
    // diagram ────────────────────────────────────────────────────────────
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await page.goto(`${BASE}/lessons/lesson-motor-test`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      ok('Lesson 17 does NOT use the stage-based journey UI', await page.locator('[data-testid="lesson01-stage"]').count() === 0);
      ok('Lesson 17 still shows the generic "الشرح" explanation heading', await page.locator('text=الشرح').count() === 1);
      ok('Lesson 17 still shows its level/duration pill-stat badges', await page.locator('.pill-stat').count() === 2);

      await page.goto(`${BASE}/lessons/lesson-motor-test`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      ok('Lesson 17 (motor-test) still renders its hero image (no regression from the QuadXLayout prop addition)', await page.locator('img').count() > 0);

      const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow on Lesson 17 either', !overflowX);

      await page.close();
    }

    ok('no unexpected browser console error was raised across all scenarios (ignoring known sandbox network errors)',
      consoleErrors.every(e => /firestore|ERR_CONNECTION_RESET|ERR_TUNNEL_CONNECTION_FAILED/i.test(e)));

    console.log(`\nAll ${passed} UI assertions passed.`);
  } finally {
    await browser.close();
    if (server?.pid) {
      try { process.kill(-server.pid, 'SIGTERM'); } catch { /* already exited */ }
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

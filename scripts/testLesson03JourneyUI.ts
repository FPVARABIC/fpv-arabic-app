/**
 * Real UI-interaction proof for Lesson 03's journey, built on the same
 * generic interactive-lesson architecture as Lessons 01 and 02 (no fork, no
 * special-casing). Drives the actual built app in a real browser
 * (Playwright) rather than relying on source-text grep.
 *
 * Complements scripts/testLesson03Journey.ts (pure gating/readiness logic).
 */
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { chromium, type Page } from 'playwright';

const PORT = 4322;
const BASE = `http://localhost:${PORT}`;
const LESSON3_URL = `${BASE}/lessons/lesson-drone-parts`;

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
    server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
      cwd: process.cwd(),
      stdio: 'ignore',
      detached: true,
    });
    await waitForServer(BASE);

    const consoleErrors: string[] = [];

    // ── Scenario A: full walkthrough — every stage, checkpoints (all wrong on
    // purpose), parts-map diagram, glossary, recall, readiness, completion ──
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));
      await page.goto(LESSON3_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);

      ok('Lesson 03 opens directly on stage 1 (orientation)', await currentStage(page) === 1);
      ok('the completion button does not exist yet at initial render', await page.locator('[data-testid="lesson01-complete-btn"]').count() === 0);

      const pillStats = await page.locator('.pill-stat').allTextContents();
      ok('the level badge ("مبتدئ") is visible using real lesson data', pillStats.some(t => t.includes('مبتدئ')));
      ok('the duration badge is visible', pillStats.some(t => /\d/.test(t)));

      const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow on the mobile viewport at initial render', !overflowX);

      await clickNextTimes(page, 14);
      ok('reached the final stage (15) via plain forward navigation', await currentStage(page) === 15);

      const completeBtn = page.locator('[data-testid="lesson01-complete-btn"]');
      ok('completion button exists at the readiness-gate stage', await completeBtn.count() === 1);
      ok('completion button is DISABLED after only reaching the last stage with zero interaction', await completeBtn.isDisabled());

      const unmet = await page.locator('[data-testid^="requirement-"][data-met="false"]').count();
      ok('the readiness checklist lists at least one unmet requirement', unmet > 0);

      // Glossary stage (13) — jump back via Prev.
      await page.locator('[data-testid="lesson01-prev"]').click();
      await page.locator('[data-testid="lesson01-prev"]').click();
      ok('navigated back to the glossary stage (13)', await currentStage(page) === 13);
      const glossaryText = await page.locator('[data-testid="lesson01-stage"]').textContent();
      ok('glossary defines "Frame"', (glossaryText ?? '').includes('Frame'));
      ok('glossary defines "Props"', (glossaryText ?? '').includes('Props'));
      ok('glossary defines "Camera / VTX"', (glossaryText ?? '').includes('Camera'));
      ok('all 8 glossary items are present', await page.locator('[data-testid^="glossary-item-"][data-testid$="-toggle"]').count() === 8);

      ok('the first glossary definition is hidden initially', await page.locator('[data-testid="glossary-item-0-definition"]').count() === 0);
      await page.locator('[data-testid="glossary-item-0-toggle"]').click();
      ok('clicking "اعرض التعريف" reveals the definition', await page.locator('[data-testid="glossary-item-0-definition"]').count() === 1);
      await page.locator('[data-testid="glossary-item-0-toggle"]').click();
      ok('clicking again hides the definition (toggle, not one-way reveal)', await page.locator('[data-testid="glossary-item-0-definition"]').count() === 0);

      // Walk all the way back to stage 1, then forward precisely to each checkpoint.
      for (let i = 0; i < 20; i++) {
        if (await currentStage(page) === 1) break;
        await page.locator('[data-testid="lesson01-prev"]').click();
        await page.waitForTimeout(20);
      }
      ok('navigated all the way back to stage 1', await currentStage(page) === 1);

      await clickNextTimes(page, 2);
      ok('reached the frame-passive checkpoint (stage 3)', await currentStage(page) === 3);
      await page.locator('[data-testid="checkpoint-framePassive-option-a"]').click();
      const fb1 = page.locator('[data-testid="checkpoint-framePassive-feedback"]');
      ok('a wrong answer immediately shows explanatory feedback', await fb1.count() === 1);
      ok('feedback is substantive, not a bare "incorrect"', ((await fb1.textContent()) ?? '').length > 30);
      await page.locator('[data-testid="checkpoint-framePassive-option-b"]').click();
      ok('retry after a wrong answer is possible and updates the shown feedback', ((await fb1.textContent()) ?? '').includes('هيكلي بحت'));

      await clickNextTimes(page, 2);
      ok('reached the three-boards checkpoint (stage 5)', await currentStage(page) === 5);
      await page.locator('[data-testid="checkpoint-threeBoardsDistinction-option-a"]').click(); // wrong on purpose

      await clickNextTimes(page, 3);
      ok('reached the motor-prop checkpoint (stage 8)', await currentStage(page) === 8);
      await page.locator('[data-testid="checkpoint-motorPropDistinction-option-a"]').click(); // wrong on purpose

      await clickNextTimes(page, 1);
      ok('reached the interactive parts-map diagram stage (stage 9)', await currentStage(page) === 9);
      const partIds = ['frame', 'motors', 'fc', 'esc', 'rx', 'vtx', 'lipo', 'props'];
      for (const id of partIds) {
        await page.locator(`[data-testid="parts-map-item-${id}"]`).click({ force: true });
        await page.waitForTimeout(40);
      }

      await clickNextTimes(page, 3);
      ok('reached the camera-vtx checkpoint (stage 12)', await currentStage(page) === 12);
      await page.locator('[data-testid="checkpoint-cameraVtxDistinction-option-a"]').click(); // wrong on purpose

      await clickNextTimes(page, 2);
      ok('reached the final recall stage (stage 14)', await currentStage(page) === 14);
      for (const id of ['threeBoardsRoles', 'whyPropsNeeded', 'cameraVsVtx']) {
        await page.locator(`[data-testid="recall-${id}-reveal"]`).click();
        const answer = page.locator(`[data-testid="recall-${id}-answer"]`);
        ok(`recall prompt "${id}" reveals its model answer on demand`, await answer.count() === 1);
      }

      await clickNextTimes(page, 1);
      ok('reached the readiness gate (stage 15)', await currentStage(page) === 15);

      const stillUnmet = await page.locator('[data-testid^="requirement-"][data-met="false"]').count();
      ok('all requirements are now met (parts-map + all 4 checkpoints, even though every answer given was wrong, + final recall)', stillUnmet === 0);

      ok('completion button is now ENABLED after full engagement, despite every checkpoint answer being wrong', await completeBtn.isEnabled());

      const beforeClick = await page.evaluate(() => localStorage.getItem('fpv_progress_lessons'));
      ok('completedLessons storage does NOT yet contain lesson 3 before the button is clicked', !(beforeClick ?? '').includes('lesson-drone-parts'));
      await completeBtn.click();
      await page.waitForTimeout(100);
      const afterClick = await page.evaluate(() => localStorage.getItem('fpv_progress_lessons'));
      ok('clicking completion calls the existing completeLesson path — completedLessons now contains lesson 3', (afterClick ?? '').includes('lesson-drone-parts'));

      const bridge = page.locator('[data-testid="lesson01-next-lesson-bridge"]');
      ok('the Lesson 4 transition bridge appears after completion', await bridge.count() === 1);
      const bridgeText = (await bridge.textContent()) ?? '';
      ok('the transition bridge text contains Lesson 4\'s real title from lessonsData', bridgeText.includes('لا تشترِ عشوائيًا'));

      await page.locator('[data-testid="lesson01-open-next"]').click();
      await page.waitForTimeout(400);
      ok('clicking the transition action navigates to Lesson 4\'s real route', page.url().includes('/lessons/lesson-define-goal'));

      // ── Refresh semantics (same page/context, so localStorage carries over) ──
      await page.goto(LESSON3_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('after a fresh navigation, the journey session starts over at stage 1 (temporary interactions are not persisted)', await currentStage(page) === 1);
      const completed = await page.evaluate(() => localStorage.getItem('fpv_progress_lessons'));
      ok('completedLessons storage still contains lesson 3 from the earlier completion (existing storage architecture is untouched)', (completed ?? '').includes('lesson-drone-parts'));

      // Keyboard activation check on the glossary toggle (parity with Lesson 01's coverage).
      for (let i = 0; i < 20; i++) {
        if (await currentStage(page) === 13) break;
        await page.locator('[data-testid="lesson01-next"]').click();
        await page.waitForTimeout(20);
      }
      ok('navigated to the glossary stage (13) again for keyboard check', await currentStage(page) === 13);
      await page.locator('[data-testid="glossary-item-1-toggle"]').focus();
      await page.keyboard.press('Enter');
      ok('keyboard Enter activates the glossary reveal toggle', await page.locator('[data-testid="glossary-item-1-definition"]').count() === 1);
      await page.keyboard.press('Space');
      ok('keyboard Space toggles it back closed', await page.locator('[data-testid="glossary-item-1-definition"]').count() === 0);

      await page.close();
    }

    // ── Regression: Lesson 1 & 2 still use their own journeys; Lesson 11 legacy intact ──
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-quadcopter-intro`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 1 still renders its own journey (unaffected by Lesson 3\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 6); // -> stage 7 (X-layout)
      ok('Lesson 1\'s X-layout diagram is unaffected (quad-x-motor testids still present)', await page.locator('[data-testid="quad-x-motor-m1"]').count() === 1);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-quadcopter-how-it-works`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 2 still renders its own journey (unaffected by Lesson 3\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 8); // -> stage 9 (signal-flow diagram)
      ok('Lesson 2\'s signal-flow diagram is unaffected (signal-flow-node testids still present)', await page.locator('[data-testid="signal-flow-node-fc"]').count() === 1);
      await ctx.close();
    }
    {
      // Lessons 4, 5, 6, 7, 8, 9, and 10 were deliberately migrated onto the
      // journey architecture in Phases 6-12 (see testLesson04JourneyUI.ts /
      // testLesson05JourneyUI.ts / testLesson06JourneyUI.ts /
      // testLesson07JourneyUI.ts / testLesson08JourneyUI.ts /
      // testLesson09JourneyUI.ts / testLesson10JourneyUI.ts) — Lesson 11 is
      // now the nearest still-legacy lesson for this regression check.
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-frame-assembly`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 11 still uses the generic legacy lesson page (no journey stage rendered)', await page.locator('[data-testid="lesson01-stage"]').count() === 0);
      ok('Lesson 11 still shows the generic "الشرح" explanation heading', await page.locator('text=الشرح').count() === 1);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-frame-assembly`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 11 (frame-assembly) still renders its hero image (it has an image field, so no SVG diagram is expected; no regression from the PartsMap prop addition)', await page.locator('img').count() > 0);
      const overflow9 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow on Lesson 11 either', !overflow9);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-first-flight`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 18 still uses the generic legacy lesson page (no journey stage rendered)', await page.locator('[data-testid="lesson01-stage"]').count() === 0);
      ok('Lesson 18 still shows a completion button', await page.locator('button:has-text("فهمت وأكملت الدرس")').count() === 1);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('lessons list loads correctly', await page.locator('text=درسًا مكتملًا').count() === 1);
      await ctx.close();
    }

    // ── Layout regression across viewports for Lesson 3 ──
    for (const [label, viewport] of Object.entries({
      tablet: { width: 768, height: 1024 },
      desktop: { width: 1280, height: 900 },
    })) {
      const ctx = await browser.newContext({ viewport });
      const page = await ctx.newPage();
      await page.goto(LESSON3_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok(`no horizontal overflow on Lesson 3 at ${label} width`, !overflow);
      await ctx.close();
    }

    ok('no unexpected browser console error was raised across all scenarios (ignoring known sandbox network errors)',
      consoleErrors.filter(e => !e.includes('net::ERR') && !e.includes('Failed to load resource')).length === 0);

    console.log(`\nAll ${passed} UI assertions passed.`);
  } finally {
    if (server && server.pid) {
      try { process.kill(-server.pid, 'SIGTERM'); } catch { /* already exited */ }
    }
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

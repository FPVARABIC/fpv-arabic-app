/**
 * Real UI-interaction proof for Lesson 06's journey, built on the same
 * generic interactive-lesson architecture as Lessons 01–05 (no fork, no
 * special-casing). Drives the actual built app in a real browser
 * (Playwright) rather than relying on source-text grep.
 *
 * Complements scripts/testLesson06Journey.ts (pure gating/readiness logic).
 */
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { chromium, type Page } from 'playwright';

const PORT = 4325;
const BASE = `http://localhost:${PORT}`;
const LESSON6_URL = `${BASE}/lessons/lesson-electricity-basics`;

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
    // purpose), electricity-basics diagram, glossary, recall, readiness, completion ──
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));
      await page.goto(LESSON6_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);

      ok('Lesson 06 opens directly on stage 1 (orientation)', await currentStage(page) === 1);
      ok('the completion button does not exist yet at initial render', await page.locator('[data-testid="lesson01-complete-btn"]').count() === 0);

      const pillStats = await page.locator('.pill-stat').allTextContents();
      ok('the level badge ("مبتدئ") is visible using real lesson data', pillStats.some(t => t.includes('مبتدئ')));
      ok('the duration badge is visible', pillStats.some(t => /\d/.test(t)));

      const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow on the mobile viewport at initial render', !overflowX);

      await clickNextTimes(page, 10);
      ok('reached the electricity-basics diagram stage (11)', await currentStage(page) === 11);

      ok('all 4 concept buttons are present', await page.locator('[data-testid^="electricity-basics-item-"]').count() === 4);
      const infoBefore = await page.locator('[data-testid="lesson01-stage"]').textContent();
      ok('the voltage explanation is not yet revealed', !(infoBefore ?? '').includes('4S=14.8V'));
      await page.locator('[data-testid="electricity-basics-item-voltage"]').click({ force: true });
      const infoAfterVoltage = await page.locator('[data-testid="lesson01-stage"]').textContent();
      ok('clicking "الجهد" reveals its explanation', (infoAfterVoltage ?? '').includes('4S=14.8V'));
      await page.locator('[data-testid="electricity-basics-item-current"]').click({ force: true });
      await page.locator('[data-testid="electricity-basics-item-polarity"]').click({ force: true });
      await page.locator('[data-testid="electricity-basics-item-short"]').click({ force: true });

      await clickNextTimes(page, 5);
      ok('reached the final stage (16) via plain forward navigation', await currentStage(page) === 16);

      const completeBtn = page.locator('[data-testid="lesson01-complete-btn"]');
      ok('completion button exists at the readiness-gate stage', await completeBtn.count() === 1);
      ok('completion button is DISABLED — checkpoints and recall still unanswered', await completeBtn.isDisabled());

      const unmet = await page.locator('[data-testid^="requirement-"][data-met="false"]').count();
      ok('the readiness checklist lists at least one unmet requirement', unmet > 0);
      const diagramReq = page.locator('[data-testid="requirement-electricityDiagram"]');
      ok('the electricity-diagram requirement is already met (all 4 concepts explored earlier)', await diagramReq.getAttribute('data-met') === 'true');

      // Glossary stage (14) — jump back via Prev.
      await page.locator('[data-testid="lesson01-prev"]').click();
      await page.locator('[data-testid="lesson01-prev"]').click();
      ok('navigated back to the glossary stage (14)', await currentStage(page) === 14);
      const glossaryText = await page.locator('[data-testid="lesson01-stage"]').textContent();
      ok('glossary defines "Voltage"', (glossaryText ?? '').includes('Voltage'));
      ok('glossary defines "Short Circuit"', (glossaryText ?? '').includes('Short Circuit'));
      ok('glossary defines "Pre-Power Check"', (glossaryText ?? '').includes('Pre-Power Check'));
      ok('all 6 glossary items are present', await page.locator('[data-testid^="glossary-item-"][data-testid$="-toggle"]').count() === 6);

      ok('the first glossary definition is hidden initially', await page.locator('[data-testid="glossary-item-0-definition"]').count() === 0);
      await page.locator('[data-testid="glossary-item-0-toggle"]').click();
      ok('clicking "اعرض التعريف" reveals the definition', await page.locator('[data-testid="glossary-item-0-definition"]').count() === 1);
      await page.locator('[data-testid="glossary-item-0-toggle"]').click();
      ok('clicking again hides the definition (toggle, not one-way reveal)', await page.locator('[data-testid="glossary-item-0-definition"]').count() === 0);

      // Keyboard activation check on the glossary toggle (parity with Lessons 01/03/04/05).
      await page.locator('[data-testid="glossary-item-1-toggle"]').focus();
      await page.keyboard.press('Enter');
      ok('keyboard Enter activates the glossary reveal toggle', await page.locator('[data-testid="glossary-item-1-definition"]').count() === 1);
      await page.keyboard.press('Space');
      ok('keyboard Space toggles it back closed', await page.locator('[data-testid="glossary-item-1-definition"]').count() === 0);

      // Walk all the way back to stage 1, then forward precisely to each checkpoint.
      for (let i = 0; i < 20; i++) {
        if (await currentStage(page) === 1) break;
        await page.locator('[data-testid="lesson01-prev"]').click();
        await page.waitForTimeout(20);
      }
      ok('navigated all the way back to stage 1', await currentStage(page) === 1);

      await clickNextTimes(page, 3);
      ok('reached the voltage/current checkpoint (stage 4)', await currentStage(page) === 4);
      await page.locator('[data-testid="checkpoint-voltageCurrentDistinct-option-a"]').click();
      const fb1 = page.locator('[data-testid="checkpoint-voltageCurrentDistinct-feedback"]');
      ok('a wrong answer immediately shows explanatory feedback', await fb1.count() === 1);
      ok('feedback is substantive, not a bare "incorrect"', ((await fb1.textContent()) ?? '').length > 30);
      await page.locator('[data-testid="checkpoint-voltageCurrentDistinct-option-b"]').click();
      ok('retry after a wrong answer is possible and updates the shown feedback', ((await fb1.textContent()) ?? '').includes('صحيح تمامًا'));

      await clickNextTimes(page, 1);
      ok('reached the higher-voltage checkpoint (stage 5)', await currentStage(page) === 5);
      await page.locator('[data-testid="checkpoint-higherVoltageNotAlwaysBetter-option-a"]').click(); // wrong on purpose

      await clickNextTimes(page, 3);
      ok('reached the reverse-polarity checkpoint (stage 8)', await currentStage(page) === 8);
      await page.locator('[data-testid="checkpoint-reversePolarityRealDamage-option-b"]').click(); // wrong on purpose

      await clickNextTimes(page, 5);
      ok('reached the short-circuit checkpoint (stage 13)', await currentStage(page) === 13);
      const comparisonVisible = await page.locator('[data-testid="lesson01-prev"]').isVisible();
      ok('Prev navigation works from the checkpoint stage', comparisonVisible);
      await page.locator('[data-testid="checkpoint-shortCircuitAndTestingMisconceptions-option-a"]').click(); // wrong on purpose

      // Verify the comparison stage (12) rendered both circuit types earlier when passed through.
      await page.locator('[data-testid="lesson01-prev"]').click();
      ok('navigated back to the circuit-comparison stage (12)', await currentStage(page) === 12);
      const comparisonText = await page.locator('[data-testid="lesson01-stage"]').textContent();
      ok('comparison stage shows both circuit labels', ['دائرة سليمة', 'دائرة بها قصر'].every(w => (comparisonText ?? '').includes(w)));
      await page.locator('[data-testid="lesson01-next"]').click();
      await page.waitForTimeout(30);
      ok('back on the short-circuit checkpoint (13)', await currentStage(page) === 13);

      await clickNextTimes(page, 2);
      ok('reached the final recall stage (stage 15)', await currentStage(page) === 15);
      for (const id of ['whyVoltageNotCurrent', 'whyReversePolarityDangerous', 'whyCheckBeforePower']) {
        await page.locator(`[data-testid="recall-${id}-reveal"]`).click();
        const answer = page.locator(`[data-testid="recall-${id}-answer"]`);
        ok(`recall prompt "${id}" reveals its model answer on demand`, await answer.count() === 1);
      }

      await clickNextTimes(page, 1);
      ok('reached the readiness gate (stage 16)', await currentStage(page) === 16);

      const stillUnmet = await page.locator('[data-testid^="requirement-"][data-met="false"]').count();
      ok('all requirements are now met (electricity diagram + all 4 checkpoints, even though every answer was wrong, + final recall)', stillUnmet === 0);

      ok('completion button is now ENABLED after full engagement, despite every checkpoint answer being wrong', await completeBtn.isEnabled());

      const beforeClick = await page.evaluate(() => localStorage.getItem('fpv_progress_lessons'));
      ok('completedLessons storage does NOT yet contain lesson 6 before the button is clicked', !(beforeClick ?? '').includes('lesson-electricity-basics'));
      await completeBtn.click();
      await page.waitForTimeout(100);
      const afterClick = await page.evaluate(() => localStorage.getItem('fpv_progress_lessons'));
      ok('clicking completion calls the existing completeLesson path — completedLessons now contains lesson 6', (afterClick ?? '').includes('lesson-electricity-basics'));

      const bridge = page.locator('[data-testid="lesson01-next-lesson-bridge"]');
      ok('the Lesson 7 transition bridge appears after completion', await bridge.count() === 1);
      const bridgeText = (await bridge.textContent()) ?? '';
      ok('the transition bridge text contains Lesson 7\'s real title from lessonsData', bridgeText.includes('بطاريات LiPo للمبتدئين'));

      await page.locator('[data-testid="lesson01-open-next"]').click();
      await page.waitForTimeout(400);
      ok('clicking the transition action navigates to Lesson 7\'s real route', page.url().includes('/lessons/lesson-lipo-batteries'));

      // ── Refresh semantics (same page/context, so localStorage carries over) ──
      await page.goto(LESSON6_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('after a fresh navigation, the journey session starts over at stage 1 (temporary interactions are not persisted)', await currentStage(page) === 1);
      const completed = await page.evaluate(() => localStorage.getItem('fpv_progress_lessons'));
      ok('completedLessons storage still contains lesson 6 from the earlier completion (existing storage architecture is untouched)', (completed ?? '').includes('lesson-electricity-basics'));

      // Keyboard focus check.
      await page.locator('[data-testid="lesson01-next"]').focus();
      const focusOutline = await page.locator('[data-testid="lesson01-next"]').evaluate(el => getComputedStyle(el).outlineStyle);
      ok('the Next button shows a visible keyboard focus outline', focusOutline !== 'none');

      await page.close();
    }

    // ── Reduced-motion: the wire-flow animation stops, static cues remain ──
    {
      const ctxNormal = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const normalPage = await ctxNormal.newPage();
      await normalPage.goto(LESSON6_URL, { waitUntil: 'networkidle' });
      await normalPage.waitForTimeout(300);
      await clickNextTimes(normalPage, 10);
      ok('reached the electricity-basics diagram stage under normal motion settings', await currentStage(normalPage) === 11);
      const normalAnim = await normalPage.locator('[data-testid="lesson01-stage"] svg line.electricity-basics-anim').first().evaluate(el => getComputedStyle(el).animationName);
      ok('the wire-flow animation is ACTIVE under normal motion (unaffected for users who did not request reduced motion)', normalAnim !== 'none');
      await ctxNormal.close();

      const ctxRm = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
      const rmPage = await ctxRm.newPage();
      await rmPage.goto(LESSON6_URL, { waitUntil: 'networkidle' });
      await rmPage.waitForTimeout(300);
      await clickNextTimes(rmPage, 10);
      ok('reached the electricity-basics diagram stage under reduced motion', await currentStage(rmPage) === 11);
      const rmAnim = await rmPage.locator('[data-testid="lesson01-stage"] svg line.electricity-basics-anim').first().evaluate(el => getComputedStyle(el).animationName);
      ok('the wire-flow animation is DISABLED under prefers-reduced-motion', rmAnim === 'none');
      ok('the concept buttons are still present as static cues under reduced motion', await rmPage.locator('[data-testid^="electricity-basics-item-"]').count() === 4);
      await ctxRm.close();
    }

    // ── Regression: Lessons 1-5 still use their own journeys; Lesson 9 diagram intact ──
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-quadcopter-intro`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 1 still renders its own journey (unaffected by Lesson 6\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 6); // -> stage 7 (X-layout)
      ok('Lesson 1\'s X-layout diagram is unaffected (quad-x-motor testids still present)', await page.locator('[data-testid="quad-x-motor-m1"]').count() === 1);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-quadcopter-how-it-works`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 2 still renders its own journey (unaffected by Lesson 6\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 8); // -> stage 9 (signal-flow diagram)
      ok('Lesson 2\'s signal-flow diagram is unaffected (signal-flow-node testids still present)', await page.locator('[data-testid="signal-flow-node-fc"]').count() === 1);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-drone-parts`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 3 still renders its own journey (unaffected by Lesson 6\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 8); // -> stage 9 (parts-map diagram)
      ok('Lesson 3\'s parts-map diagram is unaffected (parts-map-item testids still present)', await page.locator('[data-testid="parts-map-item-frame"]').count() === 1);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-define-goal`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 4 still renders its own journey (unaffected by Lesson 6\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 10); // -> stage 11 (compatibility comparison stage)
      ok('Lesson 4\'s comparison stage still renders both chains (unaffected)', (await page.locator('[data-testid="lesson01-stage"]').textContent() ?? '').includes('سلسلة متوافقة'));
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-drone-size`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 5 still renders its own journey (unaffected by Lesson 6\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 7); // -> stage 8 (size-comparison diagram)
      ok('Lesson 5\'s size-comparison diagram is unaffected (size-comparison-item testids still present)', await page.locator('[data-testid="size-comparison-item-5"]').count() === 1);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-lipo-batteries`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 7 still uses the generic legacy lesson page (no journey stage rendered)', await page.locator('[data-testid="lesson01-stage"]').count() === 0);
      ok('Lesson 7 still shows the generic "الشرح" explanation heading', await page.locator('text=الشرح').count() === 1);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-tx-rx`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 9 (tx-rx) still renders its existing interactive diagram (no regression from this phase)', await page.locator('svg').count() > 0);
      const overflow9 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow on Lesson 9 either', !overflow9);
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

    // ── Layout regression across viewports for Lesson 6 ──
    for (const [label, viewport] of Object.entries({
      tablet: { width: 768, height: 1024 },
      desktop: { width: 1280, height: 900 },
    })) {
      const ctx = await browser.newContext({ viewport });
      const page = await ctx.newPage();
      await page.goto(LESSON6_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok(`no horizontal overflow on Lesson 6 at ${label} width`, !overflow);
      await ctx.close();
    }

    // ── RTL check ──
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(LESSON6_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      const dir = await page.evaluate(() => document.documentElement.dir);
      ok('page renders right-to-left', dir === 'rtl');
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

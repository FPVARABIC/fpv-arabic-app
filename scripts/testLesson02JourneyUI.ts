/**
 * Real UI-interaction proof for Lesson 02's journey, built on the same
 * generic interactive-lesson architecture as Lesson 01 (no fork, no
 * special-casing). Drives the actual built app in a real browser
 * (Playwright) rather than relying on source-text grep.
 *
 * Complements scripts/testLesson02Journey.ts (pure gating/readiness logic).
 */
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { chromium, type Page } from 'playwright';

const PORT = 4321;
const BASE = `http://localhost:${PORT}`;
const LESSON2_URL = `${BASE}/lessons/lesson-quadcopter-how-it-works`;

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
    // purpose), signal-flow diagram, glossary, recall, readiness, completion ──
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));
      await page.goto(LESSON2_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);

      ok('Lesson 02 opens directly on stage 1 (orientation)', await currentStage(page) === 1);
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
      ok('glossary defines "Flight Controller"', (glossaryText ?? '').includes('Flight Controller'));
      ok('glossary defines "ESC"', (glossaryText ?? '').includes('ESC'));
      ok('glossary defines the closed-loop term', (glossaryText ?? '').includes('حلقة مغلقة'));
      ok('all 7 glossary items are present', await page.locator('[data-testid^="glossary-item-"][data-testid$="-toggle"]').count() === 7);

      ok('the first glossary definition is hidden initially', await page.locator('[data-testid="glossary-item-0-definition"]').count() === 0);
      await page.locator('[data-testid="glossary-item-0-toggle"]').click();
      ok('clicking "اعرض التعريف" reveals the definition', await page.locator('[data-testid="glossary-item-0-definition"]').count() === 1);
      await page.locator('[data-testid="glossary-item-0-toggle"]').click();
      ok('clicking again hides the definition (toggle, not one-way reveal)', await page.locator('[data-testid="glossary-item-0-definition"]').count() === 0);

      // Navigate to each checkpoint (stages 3, 5, 8, 12) and answer WRONG on purpose.
      // Walk all the way back to stage 1 first, then forward precisely.
      for (let i = 0; i < 20; i++) {
        if (await currentStage(page) === 1) break;
        await page.locator('[data-testid="lesson01-prev"]').click();
        await page.waitForTimeout(20);
      }
      ok('navigated all the way back to stage 1', await currentStage(page) === 1);

      await clickNextTimes(page, 2);
      ok('reached the direct-control checkpoint (stage 3)', await currentStage(page) === 3);
      await page.locator('[data-testid="checkpoint-directControl-option-a"]').click();
      const fb1 = page.locator('[data-testid="checkpoint-directControl-feedback"]');
      ok('a wrong answer immediately shows explanatory feedback', await fb1.count() === 1);
      ok('feedback is substantive, not a bare "incorrect"', ((await fb1.textContent()) ?? '').length > 30);
      await page.locator('[data-testid="checkpoint-directControl-option-b"]').click();
      ok('retry after a wrong answer is possible and updates the shown feedback', ((await fb1.textContent()) ?? '').includes('كل خطوة'));

      await clickNextTimes(page, 2);
      ok('reached the receiver-role checkpoint (stage 5)', await currentStage(page) === 5);
      await page.locator('[data-testid="checkpoint-receiverRole-option-a"]').click(); // wrong on purpose

      await clickNextTimes(page, 3);
      ok('reached the closed-loop checkpoint (stage 8)', await currentStage(page) === 8);
      await page.locator('[data-testid="checkpoint-closedLoopNeed-option-a"]').click(); // wrong on purpose

      await clickNextTimes(page, 1);
      ok('reached the interactive signal-flow diagram stage (stage 9)', await currentStage(page) === 9);
      const nodeIds = ['radio', 'rx', 'fc', 'esc', 'motors'];
      for (const id of nodeIds) {
        await page.locator(`[data-testid="signal-flow-node-${id}"]`).click({ force: true });
        await page.waitForTimeout(60);
      }

      await clickNextTimes(page, 3);
      ok('reached the per-motor-command checkpoint (stage 12)', await currentStage(page) === 12);
      await page.locator('[data-testid="checkpoint-perMotorCommand-option-a"]').click(); // wrong on purpose

      await clickNextTimes(page, 2);
      ok('reached the final recall stage (stage 14)', await currentStage(page) === 14);
      for (const id of ['wholeChain', 'whyClosedLoop', 'whyDifferentCommands']) {
        await page.locator(`[data-testid="recall-${id}-reveal"]`).click();
        const answer = page.locator(`[data-testid="recall-${id}-answer"]`);
        ok(`recall prompt "${id}" reveals its model answer on demand`, await answer.count() === 1);
      }

      await clickNextTimes(page, 1);
      ok('reached the readiness gate (stage 15)', await currentStage(page) === 15);

      const stillUnmet = await page.locator('[data-testid^="requirement-"][data-met="false"]').count();
      ok('all requirements are now met (signal-flow + all 4 checkpoints, even though every answer given was wrong, + final recall)', stillUnmet === 0);

      ok('completion button is now ENABLED after full engagement, despite every checkpoint answer being wrong', await completeBtn.isEnabled());

      const beforeClick = await page.evaluate(() => localStorage.getItem('fpv_progress_lessons'));
      ok('completedLessons storage does NOT yet contain lesson 2 before the button is clicked', !(beforeClick ?? '').includes('lesson-quadcopter-how-it-works'));
      await completeBtn.click();
      await page.waitForTimeout(100);
      const afterClick = await page.evaluate(() => localStorage.getItem('fpv_progress_lessons'));
      ok('clicking completion calls the existing completeLesson path — completedLessons now contains lesson 2', (afterClick ?? '').includes('lesson-quadcopter-how-it-works'));

      const bridge = page.locator('[data-testid="lesson01-next-lesson-bridge"]');
      ok('the Lesson 3 transition bridge appears after completion', await bridge.count() === 1);
      const bridgeText = (await bridge.textContent()) ?? '';
      ok('the transition bridge text contains Lesson 3\'s real title from lessonsData', bridgeText.includes('القطع الأساسية في الدرون'));

      await page.locator('[data-testid="lesson01-open-next"]').click();
      await page.waitForTimeout(400);
      ok('clicking the transition action navigates to Lesson 3\'s real route', page.url().includes('/lessons/lesson-drone-parts'));

      // ── Scenario B (same page/context, so localStorage carries over):
      // refresh semantics — session resets, completion persists ──
      await page.goto(LESSON2_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('after a fresh navigation, the journey session starts over at stage 1 (temporary interactions are not persisted)', await currentStage(page) === 1);
      const completed = await page.evaluate(() => localStorage.getItem('fpv_progress_lessons'));
      ok('completedLessons storage still contains lesson 2 from the earlier completion (existing storage architecture is untouched)', (completed ?? '').includes('lesson-quadcopter-how-it-works'));

      await page.close();
    }

    // ── Scenario C: reduced motion on the now-mandatory signal-flow diagram ──
    {
      const ctxNormal = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const normalPage = await ctxNormal.newPage();
      await normalPage.goto(LESSON2_URL, { waitUntil: 'networkidle' });
      await normalPage.waitForTimeout(300);
      await clickNextTimes(normalPage, 8); // -> stage 9 (signal-flow diagram)
      ok('reached the signal-flow diagram stage under normal motion settings', await currentStage(normalPage) === 9);
      await normalPage.locator('[data-testid="signal-flow-node-fc"]').click({ force: true });
      await normalPage.waitForTimeout(100);
      const normalAnim = await normalPage.locator('[data-testid="signal-flow-node-fc"] circle.glow-node').first().evaluate(el => getComputedStyle(el).animationName);
      ok('the glow animation is ACTIVE under normal motion (unaffected for users who did not request reduced motion)', normalAnim !== 'none');
      await ctxNormal.close();

      const ctxRm = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
      const rmPage = await ctxRm.newPage();
      await rmPage.goto(LESSON2_URL, { waitUntil: 'networkidle' });
      await rmPage.waitForTimeout(300);
      await clickNextTimes(rmPage, 8);
      ok('reached the signal-flow diagram stage under reduced motion', await currentStage(rmPage) === 9);
      await rmPage.locator('[data-testid="signal-flow-node-fc"]').click({ force: true });
      await rmPage.waitForTimeout(100);
      const rmAnim = await rmPage.locator('[data-testid="signal-flow-node-fc"] circle.glow-node').first().evaluate(el => getComputedStyle(el).animationName);
      ok('the glow animation is DISABLED under prefers-reduced-motion', rmAnim === 'none');
      const fcLabelText = await rmPage.locator('[data-testid="signal-flow-node-fc"]').textContent();
      ok('the FC label is still present as a static cue under reduced motion', (fcLabelText ?? '').includes('FC'));
      for (const id of ['radio', 'rx', 'esc', 'motors']) {
        await rmPage.locator(`[data-testid="signal-flow-node-${id}"]`).click({ force: true });
        await rmPage.waitForTimeout(40);
      }
      await clickNextTimes(rmPage, 6);
      const diagramReq = rmPage.locator('[data-testid="requirement-signalFlowDiagram"]');
      ok('signal-flow completion is still tracked correctly under reduced motion (requirement shows met)', (await diagramReq.getAttribute('data-met')) === 'true');
      await ctxRm.close();
    }

    // ── Regression: Lesson 1 still uses its own journey; Lessons 17/18 and their section are gone ──
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-quadcopter-intro`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 1 still renders its own journey (unaffected by Lesson 2\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 6); // -> stage 7 (X-layout)
      ok('Lesson 1\'s X-layout diagram is unaffected (quad-x-motor testids still present)', await page.locator('[data-testid="quad-x-motor-m1"]').count() === 1);
      await ctx.close();
    }
    {
      // Lessons 3-16 were deliberately migrated onto the journey architecture
      // in Phases 5-18 (see testLesson03JourneyUI.ts / testLesson04JourneyUI.ts /
      // testLesson05JourneyUI.ts / testLesson06JourneyUI.ts /
      // testLesson07JourneyUI.ts / testLesson08JourneyUI.ts /
      // testLesson09JourneyUI.ts / testLesson10JourneyUI.ts /
      // testLesson11JourneyUI.ts / testLesson12JourneyUI.ts /
      // testLesson13JourneyUI.ts / testLesson14JourneyUI.ts /
      // testLesson15JourneyUI.ts / testLesson16JourneyUI.ts) — Lessons 17/18
      // (the only remaining legacy lessons) and their containing section were
      // removed entirely, so Lesson 16 is now the final lesson in the app.
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-motor-test`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('the removed Lesson 17 route (lesson-motor-test) now shows normal not-found behavior', await page.locator('text=الدرس غير موجود').count() === 1);
      ok('the not-found page for the removed Lesson 17 route renders no journey stage', await page.locator('[data-testid="lesson01-stage"]').count() === 0);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-first-flight`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('the removed Lesson 18 route (lesson-first-flight) now shows normal not-found behavior', await page.locator('text=الدرس غير موجود').count() === 1);
      ok('the not-found page for the removed Lesson 18 route renders no journey stage', await page.locator('[data-testid="lesson01-stage"]').count() === 0);
      await ctx.close();
    }

    // ── Layout regression across viewports for Lesson 2 ──
    for (const [label, viewport] of Object.entries({
      tablet: { width: 768, height: 1024 },
      desktop: { width: 1280, height: 900 },
    })) {
      const ctx = await browser.newContext({ viewport });
      const page = await ctx.newPage();
      await page.goto(LESSON2_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok(`no horizontal overflow on Lesson 2 at ${label} width`, !overflow);
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

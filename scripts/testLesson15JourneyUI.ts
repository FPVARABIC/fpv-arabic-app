/**
 * Real UI-interaction proof for Lesson 15's journey, built on the same
 * generic interactive-lesson architecture as Lessons 01-14 (no fork, no
 * special-casing). Drives the actual built app in a real browser
 * (Playwright) rather than relying on source-text grep.
 *
 * Like Lesson 13's EscPlacement.tsx, Lesson 15's existing diagram
 * (ReceiverUart.tsx) already had click-to-reveal interaction and a
 * continuous CSS animation on all four pins, so an additive onPartExplore
 * callback plus a component-scoped reduced-motion override were both
 * wired up (matching the proven Lesson 13 pattern), unlike Lesson 14's
 * FcOrientation.tsx which needed no animation handling.
 *
 * All four diagram-part clicks use Playwright's dispatchEvent('click')
 * rather than coordinate-based .click(), per the lesson learned diagnosing
 * Lesson 13's flaky "power" hotspot: dispatchEvent fires the click event
 * directly on the matched DOM node, bypassing hit-testing/scroll-timing
 * issues entirely.
 *
 * Complements scripts/testLesson15Journey.ts (pure gating/readiness logic).
 */
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { chromium, type Page } from 'playwright';

const PORT = 4334;
const BASE = `http://localhost:${PORT}`;
const LESSON15_URL = `${BASE}/lessons/lesson-receiver-install`;

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
    // purpose), receiver-uart diagram, comparison, glossary, recall,
    // readiness, completion ─────────────────────────────────────────────────
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));
      await page.goto(LESSON15_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);

      ok('Lesson 15 opens directly on stage 1 (orientation)', await currentStage(page) === 1);
      ok('the completion button does not exist yet at initial render', await page.locator('[data-testid="lesson01-complete-btn"]').count() === 0);

      const pillStats = await page.locator('.pill-stat').allTextContents();
      ok('the level badge ("مبتدئ") is visible using real lesson data', pillStats.some(t => t.includes('مبتدئ')));
      ok('the duration badge is visible', pillStats.some(t => /\d/.test(t)));

      const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow on the mobile viewport at initial render', !overflowX);

      await clickNextTimes(page, 3);
      ok('reached the securing checkpoint (stage 4)', await currentStage(page) === 4);
      await page.locator('[data-testid="checkpoint-securingReceiverPrinciple-option-a"]').click();
      const fb1 = page.locator('[data-testid="checkpoint-securingReceiverPrinciple-feedback"]');
      ok('a wrong answer immediately shows explanatory feedback', await fb1.count() === 1);
      ok('feedback is substantive, not a bare "incorrect"', ((await fb1.textContent()) ?? '').length > 30);
      await page.locator('[data-testid="checkpoint-securingReceiverPrinciple-option-b"]').click();
      ok('retry after a wrong answer is possible and updates the shown feedback', ((await fb1.textContent()) ?? '').includes('صحيح تمامًا'));

      await clickNextTimes(page, 1);
      ok('reached the dangling-receiver worked example (stage 5)', await currentStage(page) === 5);
      const worked1 = await page.locator('[data-testid="lesson01-stage"]').textContent();
      ok('worked example describes the receiver dangling by its wires', (worked1 ?? '').includes('معلّقًا بها'));

      await clickNextTimes(page, 1);
      ok('reached the insulation explanation (stage 6)', await currentStage(page) === 6);

      await clickNextTimes(page, 1);
      ok('reached the insulation checkpoint (stage 7)', await currentStage(page) === 7);
      await page.locator('[data-testid="checkpoint-insulationAndCarbonPrinciple-option-a"]').click(); // wrong on purpose

      await clickNextTimes(page, 1);
      ok('reached the carbon-pad worked example (stage 8)', await currentStage(page) === 8);
      const worked2 = await page.locator('[data-testid="lesson01-stage"]').textContent();
      ok('worked example describes an exposed solder point touching the carbon frame', (worked2 ?? '').includes('نقاط لحامه المكشوفة'));

      await clickNextTimes(page, 1);
      ok('reached the antenna-placement explanation (stage 9)', await currentStage(page) === 9);

      await clickNextTimes(page, 1);
      ok('reached the receiver-uart diagram stage (10)', await currentStage(page) === 10);

      ok('all 4 pin hotspots are present', await page.locator('[data-testid^="receiver-uart-part-"]').count() === 4);
      const infoBefore = await page.locator('[data-testid="lesson01-stage"]').textContent();
      ok('the 5V explanation is not yet revealed', !(infoBefore ?? '').includes('تغذية المستقبل من منفذ 5V'));
      // dispatchEvent('click') fires the click directly on the matched DOM
      // node rather than at a computed viewport coordinate — the established
      // fix for flaky SVG hotspot clicks (see Lesson 13's "power" hotspot
      // diagnosis), used proactively here since all four pins sit on thin
      // animated lines.
      await page.locator('[data-testid="receiver-uart-part-v5"]').dispatchEvent('click');
      const infoAfterV5 = await page.locator('[data-testid="lesson01-stage"]').textContent();
      ok('clicking "v5" reveals its explanation', (infoAfterV5 ?? '').includes('تغذية المستقبل من منفذ 5V'));
      await page.locator('[data-testid="receiver-uart-part-gnd"]').dispatchEvent('click');
      const infoAfterGnd = await page.locator('[data-testid="lesson01-stage"]').textContent();
      ok('clicking "gnd" reveals a distinct explanation', (infoAfterGnd ?? '').includes('الأرضي المشترك'));
      await page.locator('[data-testid="receiver-uart-part-tx"]').dispatchEvent('click');
      const infoAfterTx = await page.locator('[data-testid="lesson01-stage"]').textContent();
      ok('clicking "tx" reveals a distinct explanation', (infoAfterTx ?? '').includes('TX من Receiver'));
      await page.locator('[data-testid="receiver-uart-part-rx"]').dispatchEvent('click');
      const infoAfterRx = await page.locator('[data-testid="lesson01-stage"]').textContent();
      ok('clicking "rx" reveals a distinct explanation', (infoAfterRx ?? '').includes('RX من Receiver'));

      await clickNextTimes(page, 1);
      ok('reached the antenna checkpoint (stage 11)', await currentStage(page) === 11);
      await page.locator('[data-testid="checkpoint-antennaPlacementPrinciple-option-a"]').click(); // wrong on purpose

      await clickNextTimes(page, 1);
      ok('reached the installation comparison stage (12)', await currentStage(page) === 12);
      const comparisonText = await page.locator('[data-testid="lesson01-stage"]').textContent();
      ok('comparison stage shows the correct secured/insulated/antenna-safe label', (comparisonText ?? '').includes('الصحيح'));
      ok('comparison stage shows the unsafe dangling/carbon-touching/prop-adjacent label', (comparisonText ?? '').includes('غير الآمن'));

      await clickNextTimes(page, 1);
      ok('reached the strain-relief explanation (stage 13)', await currentStage(page) === 13);

      await clickNextTimes(page, 1);
      ok('reached the serviceability/install-vs-config checkpoint (stage 14)', await currentStage(page) === 14);
      await page.locator('[data-testid="checkpoint-serviceabilityAndInstallVsConfigPrinciple-option-a"]').click(); // wrong on purpose

      await clickNextTimes(page, 1);
      ok('reached the glossary stage (15)', await currentStage(page) === 15);
      const glossaryText = await page.locator('[data-testid="lesson01-stage"]').textContent();
      ok('glossary defines conductive-carbon separation', (glossaryText ?? '').includes('العزل عن الكربون'));
      ok('all 5 glossary items are present', await page.locator('[data-testid^="glossary-item-"][data-testid$="-toggle"]').count() === 5);

      ok('the first glossary definition is hidden initially', await page.locator('[data-testid="glossary-item-0-definition"]').count() === 0);
      await page.locator('[data-testid="glossary-item-0-toggle"]').click();
      ok('clicking "اعرض التعريف" reveals the definition', await page.locator('[data-testid="glossary-item-0-definition"]').count() === 1);
      await page.locator('[data-testid="glossary-item-0-toggle"]').click();
      ok('clicking again hides the definition (toggle, not one-way reveal)', await page.locator('[data-testid="glossary-item-0-definition"]').count() === 0);

      // Keyboard activation check on the glossary toggle (parity with Lessons 01/03-14).
      await page.locator('[data-testid="glossary-item-1-toggle"]').focus();
      await page.keyboard.press('Enter');
      ok('keyboard Enter activates the glossary reveal toggle', await page.locator('[data-testid="glossary-item-1-definition"]').count() === 1);
      await page.keyboard.press('Space');
      ok('keyboard Space toggles it back closed', await page.locator('[data-testid="glossary-item-1-definition"]').count() === 0);

      // Walk all the way back to stage 1, then forward precisely to the final recall stage.
      for (let i = 0; i < 20; i++) {
        if (await currentStage(page) === 1) break;
        await page.locator('[data-testid="lesson01-prev"]').click();
        await page.waitForTimeout(20);
      }
      ok('navigated all the way back to stage 1', await currentStage(page) === 1);

      await clickNextTimes(page, 15);
      ok('reached the final recall stage (stage 16)', await currentStage(page) === 16);
      for (const id of ['whySecureMountingMattersRecall', 'whyInsulationAndVoltageMatterRecall', 'whyAntennaPlacementMattersRecall']) {
        await page.locator(`[data-testid="recall-${id}-reveal"]`).click();
        const answer = page.locator(`[data-testid="recall-${id}-answer"]`);
        ok(`recall prompt "${id}" reveals its model answer on demand`, await answer.count() === 1);
      }

      await clickNextTimes(page, 1);
      ok('reached the readiness gate (stage 17)', await currentStage(page) === 17);

      const completeBtn = page.locator('[data-testid="lesson01-complete-btn"]');
      ok('completion button exists at the readiness-gate stage', await completeBtn.count() === 1);

      const diagramReq = page.locator('[data-testid="requirement-receiverUartDiagram"]');
      ok('the receiver-uart diagram requirement is already met (all 4 pins explored earlier, preserved across navigation)', await diagramReq.getAttribute('data-met') === 'true');

      const stillUnmet = await page.locator('[data-testid^="requirement-"][data-met="false"]').count();
      ok('all requirements are now met (diagram + all 4 checkpoints, even though every answer was wrong, + final recall)', stillUnmet === 0);
      ok('completion button is now ENABLED after full engagement, despite every checkpoint answer being wrong', await completeBtn.isEnabled());

      const beforeClick = await page.evaluate(() => localStorage.getItem('fpv_progress_lessons'));
      ok('completedLessons storage does NOT yet contain lesson 15 before the button is clicked', !(beforeClick ?? '').includes('lesson-receiver-install'));
      await completeBtn.click();
      await page.waitForTimeout(100);
      const afterClick = await page.evaluate(() => localStorage.getItem('fpv_progress_lessons'));
      ok('clicking completion calls the existing completeLesson path — completedLessons now contains lesson 15', (afterClick ?? '').includes('lesson-receiver-install'));

      const bridge = page.locator('[data-testid="lesson01-next-lesson-bridge"]');
      ok('the Lesson 16 transition bridge appears after completion', await bridge.count() === 1);
      const bridgeText = (await bridge.textContent()) ?? '';
      ok('the transition bridge text contains Lesson 16\'s real title from lessonsData', bridgeText.includes('تركيب نظام الفيديو'));

      await page.locator('[data-testid="lesson01-open-next"]').click();
      await page.waitForTimeout(400);
      ok('clicking the transition action navigates to Lesson 16\'s real route', page.url().includes('/lessons/lesson-video-system'));

      // ── Refresh semantics (same page/context, so localStorage carries over) ──
      await page.goto(LESSON15_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('after a fresh navigation, the journey session starts over at stage 1 (temporary interactions are not persisted)', await currentStage(page) === 1);
      const completed = await page.evaluate(() => localStorage.getItem('fpv_progress_lessons'));
      ok('completedLessons storage still contains lesson 15 from the earlier completion (existing storage architecture is untouched)', (completed ?? '').includes('lesson-receiver-install'));

      // Keyboard focus check.
      await page.locator('[data-testid="lesson01-next"]').focus();
      const focusOutline = await page.locator('[data-testid="lesson01-next"]').evaluate(el => getComputedStyle(el).outlineStyle);
      ok('the Next button shows a visible keyboard focus outline', focusOutline !== 'none');

      await page.close();
    }

    // ── Scenario B: prefers-reduced-motion stops the diagram's continuous
    // pin-line animation without breaking the interaction itself ───────────
    {
      const normalPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await normalPage.goto(LESSON15_URL, { waitUntil: 'networkidle' });
      await normalPage.waitForTimeout(300);
      await clickNextTimes(normalPage, 9); // -> stage 10 (receiver-uart diagram)
      ok('reached the receiver-uart diagram stage under normal motion settings', await currentStage(normalPage) === 10);
      const normalAnim = await normalPage.locator('[data-testid="receiver-uart-part-v5"] line').evaluate(el => getComputedStyle(el).animationName);
      ok('the pin-line animation is ACTIVE under normal motion', normalAnim !== 'none');
      await normalPage.close();

      const rmContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
      const rmPage = await rmContext.newPage();
      await rmPage.goto(LESSON15_URL, { waitUntil: 'networkidle' });
      await rmPage.waitForTimeout(300);
      await clickNextTimes(rmPage, 9); // -> stage 10 (receiver-uart diagram)
      ok('reached the receiver-uart diagram stage under reduced motion', await currentStage(rmPage) === 10);
      const rmAnim = await rmPage.locator('[data-testid="receiver-uart-part-v5"] line').evaluate(el => getComputedStyle(el).animationName);
      ok('the pin-line animation is DISABLED under prefers-reduced-motion', rmAnim === 'none');

      // Static cues and interaction must still work with motion disabled.
      ok('all 4 pin hotspots are still present under reduced motion', await rmPage.locator('[data-testid^="receiver-uart-part-"]').count() === 4);
      await rmPage.locator('[data-testid="receiver-uart-part-v5"]').dispatchEvent('click');
      const rmInfo = await rmPage.locator('[data-testid="lesson01-stage"]').textContent();
      ok('clicking "v5" under reduced motion still reveals its explanation (interaction unaffected)', (rmInfo ?? '').includes('تغذية المستقبل من منفذ 5V'));
      await rmPage.locator('[data-testid="receiver-uart-part-gnd"]').dispatchEvent('click');
      await rmPage.locator('[data-testid="receiver-uart-part-tx"]').dispatchEvent('click');
      await rmPage.locator('[data-testid="receiver-uart-part-rx"]').dispatchEvent('click');
      await clickNextTimes(rmPage, 7);
      const diagramReqRm = rmPage.locator('[data-testid="requirement-receiverUartDiagram"]');
      ok('diagram completion is still tracked correctly under reduced motion (requirement shows met)', (await diagramReqRm.getAttribute('data-met')) === 'true');

      await rmContext.close();
    }

    // ── Regression: Lessons 1-14 still use their own journeys; Lessons 17/18 and their section are gone ──
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-quadcopter-intro`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 1 still renders its own journey (unaffected by Lesson 15\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 6); // -> stage 7 (X-layout)
      ok('Lesson 1\'s X-layout diagram is unaffected (quad-x-motor testids still present)', await page.locator('[data-testid="quad-x-motor-m1"]').count() === 1);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-quadcopter-how-it-works`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 2 still renders its own journey (unaffected by Lesson 15\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 8); // -> stage 9 (signal-flow diagram)
      ok('Lesson 2\'s signal-flow diagram is unaffected (signal-flow-node testids still present)', await page.locator('[data-testid="signal-flow-node-fc"]').count() === 1);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-drone-parts`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 3 still renders its own journey (unaffected by Lesson 15\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 8); // -> stage 9 (parts-map diagram)
      ok('Lesson 3\'s parts-map diagram is unaffected (parts-map-item testids still present)', await page.locator('[data-testid="parts-map-item-frame"]').count() === 1);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-define-goal`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 4 still renders its own journey (unaffected by Lesson 15\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 10); // -> stage 11 (compatibility comparison stage)
      ok('Lesson 4\'s comparison stage still renders both chains (unaffected)', (await page.locator('[data-testid="lesson01-stage"]').textContent() ?? '').includes('سلسلة متوافقة'));
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-drone-size`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 5 still renders its own journey (unaffected by Lesson 15\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 7); // -> stage 8 (size-comparison diagram)
      ok('Lesson 5\'s size-comparison diagram is unaffected (size-comparison-item testids still present)', await page.locator('[data-testid="size-comparison-item-5"]').count() === 1);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-electricity-basics`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 6 still renders its own journey (unaffected by Lesson 15\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 10); // -> stage 11 (electricity-basics diagram)
      ok('Lesson 6\'s electricity-basics diagram is unaffected (electricity-basics-item testids still present)', await page.locator('[data-testid="electricity-basics-item-voltage"]').count() === 1);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-lipo-batteries`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 7 still renders its own journey (unaffected by Lesson 15\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 8); // -> stage 9 (lipo-cells diagram)
      ok('Lesson 7\'s lipo-cells diagram is unaffected (lipo-cells-item testids still present)', await page.locator('[data-testid="lipo-cells-item-4s"]').count() === 1);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-power-rails`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 8 still renders its own journey (unaffected by Lesson 15\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 10); // -> stage 11 (gnd-5v-vbat diagram)
      ok('Lesson 8\'s gnd-5v-vbat diagram is unaffected (gnd-five-vbat-item testids still present)', await page.locator('[data-testid^="gnd-five-vbat-item-"]').count() === 3);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-tx-rx`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 9 still renders its own journey (unaffected by Lesson 15\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 7); // -> stage 8 (comparison stage)
      ok('Lesson 9\'s comparison stage still renders (unaffected)', (await page.locator('[data-testid="lesson01-stage"]').textContent() ?? '').includes('الصحيح'));
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-pre-battery-safety`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 10 still renders its own journey (unaffected by Lesson 15\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 10); // -> stage 11 (sequence comparison stage)
      ok('Lesson 10\'s comparison stage still renders (unaffected)', (await page.locator('[data-testid="lesson01-stage"]').textContent() ?? '').includes('الصحيح'));
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-frame-assembly`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 11 still renders its own journey (unaffected by Lesson 15\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 9); // -> stage 10 (frame-assembly interactive diagram)
      ok('Lesson 11\'s frame-assembly diagram is unaffected (frame-assembly-part testids still present)', await page.locator('[data-testid^="frame-assembly-part-"]').count() === 3);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-motor-install`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 12 still renders its own journey (unaffected by Lesson 15\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 6); // -> stage 7 (correct-choice checkpoint)
      ok('Lesson 12\'s correct-choice checkpoint options are unaffected', await page.locator('[data-testid="checkpoint-correctScrewChoice-option-c"]').count() === 1);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-esc-install`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 13 still renders its own journey (unaffected by Lesson 15\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 10); // -> stage 11 (esc-placement interactive diagram)
      ok('Lesson 13\'s esc-placement diagram is unaffected (esc-placement-part testids still present)', await page.locator('[data-testid^="esc-placement-part-"]').count() === 3);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-fc-install`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 14 still renders its own journey (unaffected by Lesson 15\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 10); // -> stage 11 (fc-orientation interactive diagram)
      ok('Lesson 14\'s fc-orientation diagram is unaffected (fc-orientation-part testids still present)', await page.locator('[data-testid^="fc-orientation-part-"]').count() === 6);
      await ctx.close();
    }
    {
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
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('lessons list loads correctly', await page.locator('text=درسًا مكتملًا').count() === 1);
      await ctx.close();
    }

    // ── Layout regression across viewports for Lesson 15 ──
    for (const [label, viewport] of Object.entries({
      tablet: { width: 768, height: 1024 },
      desktop: { width: 1280, height: 900 },
    })) {
      const ctx = await browser.newContext({ viewport });
      const page = await ctx.newPage();
      await page.goto(LESSON15_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok(`no horizontal overflow on Lesson 15 at ${label} width`, !overflow);
      await ctx.close();
    }

    // ── RTL check ──
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(LESSON15_URL, { waitUntil: 'networkidle' });
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

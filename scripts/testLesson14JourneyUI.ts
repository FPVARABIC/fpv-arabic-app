/**
 * Real UI-interaction proof for Lesson 14's journey, built on the same
 * generic interactive-lesson architecture as Lessons 01-13 (no fork, no
 * special-casing). Drives the actual built app in a real browser
 * (Playwright) rather than relying on source-text grep.
 *
 * Like Lesson 11's FrameAssembly.tsx and Lesson 13's EscPlacement.tsx,
 * Lesson 14's existing diagram (FcOrientation.tsx) already had click-to-reveal
 * interaction, so an additive onPartExplore callback was wired up rather than
 * inventing new behavior. FcOrientation.tsx has no continuous CSS animation
 * (unlike EscPlacement.tsx), so there is no reduced-motion scenario here —
 * matching Lesson 11's precedent.
 *
 * All three diagram-part clicks use Playwright's dispatchEvent('click')
 * rather than coordinate-based .click(), per the lesson learned diagnosing
 * Lesson 13's flaky "power" hotspot: dispatchEvent fires the click event
 * directly on the matched DOM node, bypassing hit-testing/scroll-timing
 * issues entirely. This matters especially here since the grommet circles
 * are small (r=10).
 *
 * Complements scripts/testLesson14Journey.ts (pure gating/readiness logic).
 */
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { chromium, type Page } from 'playwright';

const PORT = 4333;
const BASE = `http://localhost:${PORT}`;
const LESSON14_URL = `${BASE}/lessons/lesson-fc-install`;

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
    // purpose), fc-orientation diagram, comparison, glossary, recall,
    // readiness, completion ─────────────────────────────────────────────────
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));
      await page.goto(LESSON14_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);

      ok('Lesson 14 opens directly on stage 1 (orientation)', await currentStage(page) === 1);
      ok('the completion button does not exist yet at initial render', await page.locator('[data-testid="lesson01-complete-btn"]').count() === 0);

      const pillStats = await page.locator('.pill-stat').allTextContents();
      ok('the level badge ("مبتدئ") is visible using real lesson data', pillStats.some(t => t.includes('مبتدئ')));
      ok('the duration badge is visible', pillStats.some(t => /\d/.test(t)));

      const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow on the mobile viewport at initial render', !overflowX);

      await clickNextTimes(page, 3);
      ok('reached the orientation checkpoint (stage 4)', await currentStage(page) === 4);
      await page.locator('[data-testid="checkpoint-whyPhysicalOrientationMatters-option-a"]').click();
      const fb1 = page.locator('[data-testid="checkpoint-whyPhysicalOrientationMatters-feedback"]');
      ok('a wrong answer immediately shows explanatory feedback', await fb1.count() === 1);
      ok('feedback is substantive, not a bare "incorrect"', ((await fb1.textContent()) ?? '').length > 30);
      await page.locator('[data-testid="checkpoint-whyPhysicalOrientationMatters-option-b"]').click();
      ok('retry after a wrong answer is possible and updates the shown feedback', ((await fb1.textContent()) ?? '').includes('صحيح تمامًا'));

      await clickNextTimes(page, 1);
      ok('reached the backwards-FC worked example (stage 5)', await currentStage(page) === 5);
      const worked1 = await page.locator('[data-testid="lesson01-stage"]').textContent();
      ok('worked example describes the FC mounted backwards', (worked1 ?? '').includes('معكوسًا') || (worked1 ?? '').includes('يشير سهمه للخلف'));

      await clickNextTimes(page, 1);
      ok('reached the physical-correction-preferred explanation (stage 6)', await currentStage(page) === 6);

      await clickNextTimes(page, 1);
      ok('reached the software-fix checkpoint (stage 7)', await currentStage(page) === 7);
      await page.locator('[data-testid="checkpoint-physicalCorrectionPreferredOverSoftwareFix-option-a"]').click(); // wrong on purpose

      await clickNextTimes(page, 1);
      ok('reached the gyro-vibration explanation (stage 8)', await currentStage(page) === 8);

      await clickNextTimes(page, 1);
      ok('reached the hard-mounted-FC worked example (stage 9)', await currentStage(page) === 9);
      const worked2 = await page.locator('[data-testid="lesson01-stage"]').textContent();
      ok('worked example describes the FC mounted directly without grommets', (worked2 ?? '').includes('دون استخدام أي grommets'));

      await clickNextTimes(page, 1);
      ok('reached the grommets checkpoint (stage 10)', await currentStage(page) === 10);
      await page.locator('[data-testid="checkpoint-whyGrommetsMatter-option-a"]').click(); // wrong on purpose

      await clickNextTimes(page, 1);
      ok('reached the fc-orientation diagram stage (11)', await currentStage(page) === 11);

      ok('the arrow hotspot is present', await page.locator('[data-testid="fc-orientation-part-arrow"]').count() === 1);
      ok('the usb hotspot is present', await page.locator('[data-testid="fc-orientation-part-usb"]').count() === 1);
      ok('all 4 grommet circles are present, sharing the same testid', await page.locator('[data-testid="fc-orientation-part-grommet"]').count() === 4);

      const infoBefore = await page.locator('[data-testid="lesson01-stage"]').textContent();
      ok('the arrow explanation is not yet revealed', !(infoBefore ?? '').includes('يجب أن يشير للأمام في اتجاه الطيران'));
      // dispatchEvent('click') fires the click directly on the matched DOM
      // node rather than at a computed viewport coordinate — the established
      // fix for flaky SVG hotspot clicks (see Lesson 13's "power" hotspot
      // diagnosis). Used proactively here since the grommet circles are
      // small (r=10).
      await page.locator('[data-testid="fc-orientation-part-arrow"]').dispatchEvent('click');
      const infoAfterArrow = await page.locator('[data-testid="lesson01-stage"]').textContent();
      ok('clicking "arrow" reveals its explanation', (infoAfterArrow ?? '').includes('يجب أن يشير للأمام في اتجاه الطيران'));

      // Click a grommet circle other than the first, to prove all 4 map to
      // the same 'grommet' variant rather than each being tracked separately.
      await page.locator('[data-testid="fc-orientation-part-grommet"]').nth(2).dispatchEvent('click');
      const infoAfterGrommet = await page.locator('[data-testid="lesson01-stage"]').textContent();
      ok('clicking any grommet circle reveals the shared grommet explanation', (infoAfterGrommet ?? '').includes('تمتص الاهتزاز'));

      await page.locator('[data-testid="fc-orientation-part-usb"]').dispatchEvent('click');
      const infoAfterUsb = await page.locator('[data-testid="lesson01-stage"]').textContent();
      ok('clicking "usb" reveals a distinct explanation', (infoAfterUsb ?? '').includes('اتركه متاحًا دائمًا للوصول'));

      await clickNextTimes(page, 2);
      ok('reached the isolation comparison stage (13)', await currentStage(page) === 13);
      const comparisonText = await page.locator('[data-testid="lesson01-stage"]').textContent();
      ok('comparison stage shows the correct isolated/oriented label', (comparisonText ?? '').includes('الصحيح'));
      ok('comparison stage shows the unsafe rigid/misoriented label', (comparisonText ?? '').includes('غير الآمن'));

      await clickNextTimes(page, 1);
      ok('reached the USB/clearance explanation (stage 14)', await currentStage(page) === 14);

      await clickNextTimes(page, 1);
      ok('reached the serviceability checkpoint (stage 15)', await currentStage(page) === 15);
      await page.locator('[data-testid="checkpoint-serviceabilityAndWirePressureReasoning-option-a"]').click(); // wrong on purpose

      await clickNextTimes(page, 1);
      ok('reached the glossary stage (16)', await currentStage(page) === 16);
      const glossaryText = await page.locator('[data-testid="lesson01-stage"]').textContent();
      ok('glossary defines vibration-isolating grommets', (glossaryText ?? '').includes('Grommets العازلة'));
      ok('all 5 glossary items are present', await page.locator('[data-testid^="glossary-item-"][data-testid$="-toggle"]').count() === 5);

      ok('the first glossary definition is hidden initially', await page.locator('[data-testid="glossary-item-0-definition"]').count() === 0);
      await page.locator('[data-testid="glossary-item-0-toggle"]').click();
      ok('clicking "اعرض التعريف" reveals the definition', await page.locator('[data-testid="glossary-item-0-definition"]').count() === 1);
      await page.locator('[data-testid="glossary-item-0-toggle"]').click();
      ok('clicking again hides the definition (toggle, not one-way reveal)', await page.locator('[data-testid="glossary-item-0-definition"]').count() === 0);

      // Keyboard activation check on the glossary toggle (parity with Lessons 01/03-13).
      await page.locator('[data-testid="glossary-item-1-toggle"]').focus();
      await page.keyboard.press('Enter');
      ok('keyboard Enter activates the glossary reveal toggle', await page.locator('[data-testid="glossary-item-1-definition"]').count() === 1);
      await page.keyboard.press('Space');
      ok('keyboard Space toggles it back closed', await page.locator('[data-testid="glossary-item-1-definition"]').count() === 0);

      const completeBtnPreCheck = page.locator('[data-testid="lesson01-complete-btn"]');
      ok('completion button does not exist yet before reaching the final stage', await completeBtnPreCheck.count() === 0);

      const unmetBefore = await page.locator('[data-testid^="requirement-"]').count();
      ok('requirement checklist is not rendered on the glossary stage (only on the readiness gate)', unmetBefore === 0);

      // Walk all the way back to stage 1, to confirm backward navigation
      // preserves everything recorded above, then forward to the final stage.
      for (let i = 0; i < 20; i++) {
        if (await currentStage(page) === 1) break;
        await page.locator('[data-testid="lesson01-prev"]').click();
        await page.waitForTimeout(20);
      }
      ok('navigated all the way back to stage 1', await currentStage(page) === 1);

      await clickNextTimes(page, 16);
      ok('reached the final recall stage (stage 17)', await currentStage(page) === 17);
      for (const id of ['whyPhysicalOrientationMattersRecall', 'whyGrommetsMatterRecall', 'whyServiceabilityAndClearanceMatterRecall']) {
        await page.locator(`[data-testid="recall-${id}-reveal"]`).click();
        const answer = page.locator(`[data-testid="recall-${id}-answer"]`);
        ok(`recall prompt "${id}" reveals its model answer on demand`, await answer.count() === 1);
      }

      await clickNextTimes(page, 1);
      ok('reached the readiness gate (stage 18)', await currentStage(page) === 18);

      const completeBtn = page.locator('[data-testid="lesson01-complete-btn"]');
      ok('completion button exists at the readiness-gate stage', await completeBtn.count() === 1);

      const diagramReq = page.locator('[data-testid="requirement-fcOrientationDiagram"]');
      ok('the fc-orientation diagram requirement is already met (all 3 parts explored earlier, preserved across navigation)', await diagramReq.getAttribute('data-met') === 'true');

      const stillUnmet = await page.locator('[data-testid^="requirement-"][data-met="false"]').count();
      ok('all requirements are now met (diagram + all 4 checkpoints, even though every answer was wrong, + final recall)', stillUnmet === 0);
      ok('completion button is now ENABLED after full engagement, despite every checkpoint answer being wrong', await completeBtn.isEnabled());

      const beforeClick = await page.evaluate(() => localStorage.getItem('fpv_progress_lessons'));
      ok('completedLessons storage does NOT yet contain lesson 14 before the button is clicked', !(beforeClick ?? '').includes('lesson-fc-install'));
      await completeBtn.click();
      await page.waitForTimeout(100);
      const afterClick = await page.evaluate(() => localStorage.getItem('fpv_progress_lessons'));
      ok('clicking completion calls the existing completeLesson path — completedLessons now contains lesson 14', (afterClick ?? '').includes('lesson-fc-install'));

      const bridge = page.locator('[data-testid="lesson01-next-lesson-bridge"]');
      ok('the Lesson 15 transition bridge appears after completion', await bridge.count() === 1);
      const bridgeText = (await bridge.textContent()) ?? '';
      ok('the transition bridge text contains Lesson 15\'s real title from lessonsData', bridgeText.includes('تركيب Receiver'));

      await page.locator('[data-testid="lesson01-open-next"]').click();
      await page.waitForTimeout(400);
      ok('clicking the transition action navigates to Lesson 15\'s real route', page.url().includes('/lessons/lesson-receiver-install'));

      // ── Refresh semantics (same page/context, so localStorage carries over) ──
      await page.goto(LESSON14_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('after a fresh navigation, the journey session starts over at stage 1 (temporary interactions are not persisted)', await currentStage(page) === 1);
      const completed = await page.evaluate(() => localStorage.getItem('fpv_progress_lessons'));
      ok('completedLessons storage still contains lesson 14 from the earlier completion (existing storage architecture is untouched)', (completed ?? '').includes('lesson-fc-install'));

      // Keyboard focus check.
      await page.locator('[data-testid="lesson01-next"]').focus();
      const focusOutline = await page.locator('[data-testid="lesson01-next"]').evaluate(el => getComputedStyle(el).outlineStyle);
      ok('the Next button shows a visible keyboard focus outline', focusOutline !== 'none');

      await page.close();
    }

    // ── Regression: Lessons 1-13 still use their own journeys; Lesson 16 legacy intact ──
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-quadcopter-intro`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 1 still renders its own journey (unaffected by Lesson 14\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 6); // -> stage 7 (X-layout)
      ok('Lesson 1\'s X-layout diagram is unaffected (quad-x-motor testids still present)', await page.locator('[data-testid="quad-x-motor-m1"]').count() === 1);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-quadcopter-how-it-works`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 2 still renders its own journey (unaffected by Lesson 14\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 8); // -> stage 9 (signal-flow diagram)
      ok('Lesson 2\'s signal-flow diagram is unaffected (signal-flow-node testids still present)', await page.locator('[data-testid="signal-flow-node-fc"]').count() === 1);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-drone-parts`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 3 still renders its own journey (unaffected by Lesson 14\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 8); // -> stage 9 (parts-map diagram)
      ok('Lesson 3\'s parts-map diagram is unaffected (parts-map-item testids still present)', await page.locator('[data-testid="parts-map-item-frame"]').count() === 1);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-define-goal`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 4 still renders its own journey (unaffected by Lesson 14\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 10); // -> stage 11 (compatibility comparison stage)
      ok('Lesson 4\'s comparison stage still renders both chains (unaffected)', (await page.locator('[data-testid="lesson01-stage"]').textContent() ?? '').includes('سلسلة متوافقة'));
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-drone-size`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 5 still renders its own journey (unaffected by Lesson 14\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 7); // -> stage 8 (size-comparison diagram)
      ok('Lesson 5\'s size-comparison diagram is unaffected (size-comparison-item testids still present)', await page.locator('[data-testid="size-comparison-item-5"]').count() === 1);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-electricity-basics`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 6 still renders its own journey (unaffected by Lesson 14\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 10); // -> stage 11 (electricity-basics diagram)
      ok('Lesson 6\'s electricity-basics diagram is unaffected (electricity-basics-item testids still present)', await page.locator('[data-testid="electricity-basics-item-voltage"]').count() === 1);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-lipo-batteries`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 7 still renders its own journey (unaffected by Lesson 14\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 8); // -> stage 9 (lipo-cells diagram)
      ok('Lesson 7\'s lipo-cells diagram is unaffected (lipo-cells-item testids still present)', await page.locator('[data-testid="lipo-cells-item-4s"]').count() === 1);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-power-rails`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 8 still renders its own journey (unaffected by Lesson 14\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 10); // -> stage 11 (gnd-5v-vbat diagram)
      ok('Lesson 8\'s gnd-5v-vbat diagram is unaffected (gnd-five-vbat-item testids still present)', await page.locator('[data-testid^="gnd-five-vbat-item-"]').count() === 3);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-tx-rx`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 9 still renders its own journey (unaffected by Lesson 14\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 7); // -> stage 8 (comparison stage)
      ok('Lesson 9\'s comparison stage still renders (unaffected)', (await page.locator('[data-testid="lesson01-stage"]').textContent() ?? '').includes('الصحيح'));
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-pre-battery-safety`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 10 still renders its own journey (unaffected by Lesson 14\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 10); // -> stage 11 (sequence comparison stage)
      ok('Lesson 10\'s comparison stage still renders (unaffected)', (await page.locator('[data-testid="lesson01-stage"]').textContent() ?? '').includes('الصحيح'));
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-frame-assembly`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 11 still renders its own journey (unaffected by Lesson 14\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 9); // -> stage 10 (frame-assembly interactive diagram)
      ok('Lesson 11\'s frame-assembly diagram is unaffected (frame-assembly-part testids still present)', await page.locator('[data-testid^="frame-assembly-part-"]').count() === 3);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-motor-install`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 12 still renders its own journey (unaffected by Lesson 14\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 6); // -> stage 7 (correct-choice checkpoint)
      ok('Lesson 12\'s correct-choice checkpoint options are unaffected', await page.locator('[data-testid="checkpoint-correctScrewChoice-option-c"]').count() === 1);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-esc-install`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 13 still renders its own journey (unaffected by Lesson 14\'s registration)', await page.locator('[data-testid="lesson01-stage"]').count() === 1);
      await clickNextTimes(page, 10); // -> stage 11 (esc-placement interactive diagram)
      ok('Lesson 13\'s esc-placement diagram is unaffected (esc-placement-part testids still present)', await page.locator('[data-testid^="esc-placement-part-"]').count() === 3);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/lessons/lesson-video-system`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lesson 16 still uses the generic legacy lesson page (no journey stage rendered)', await page.locator('[data-testid="lesson01-stage"]').count() === 0);
      ok('Lesson 16 (video-system) still renders its hero image (it has an image field, so no SVG diagram is expected)', await page.locator('img').count() > 0);
      const overflow16 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow on Lesson 16 either', !overflow16);
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

    // ── Layout regression across viewports for Lesson 14 ──
    for (const [label, viewport] of Object.entries({
      tablet: { width: 768, height: 1024 },
      desktop: { width: 1280, height: 900 },
    })) {
      const ctx = await browser.newContext({ viewport });
      const page = await ctx.newPage();
      await page.goto(LESSON14_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok(`no horizontal overflow on Lesson 14 at ${label} width`, !overflow);
      await ctx.close();
    }

    // ── RTL check ──
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(LESSON14_URL, { waitUntil: 'networkidle' });
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

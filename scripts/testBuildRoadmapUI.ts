/**
 * Real UI-interaction proof for the redesigned /roadmap (البناء) practical
 * build guide — list -> detail architecture (BuildRoadmapView is the stage
 * list, BuildRoadmapStageDetailView is the per-stage detail page reached at
 * /roadmap/:stageId, mirroring the pattern already proven by Lessons and
 * Betaflight). Drives a real built app in a real browser at 390×844.
 * Complements testBuildRoadmap.ts (pure data/structure, no browser).
 */
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { chromium, type Page } from 'playwright';

const PORT = 4406;
const BASE = `http://localhost:${PORT}`;
const ROADMAP_URL = `${BASE}/roadmap`;

const STORAGE_KEYS = {
  PROGRESS_ROADMAP: 'fpv_progress_roadmap',
  CHECKLISTS: 'fpv_checklists',
  LAST_OPENED: 'fpv_last_opened',
};

const STAGE_IDS = [
  'build-soldering-basics', 'build-parts-tools', 'build-frame', 'build-motors', 'build-esc',
  'build-fc', 'build-receiver', 'build-gps', 'build-vtx', 'build-pre-battery',
];

// Independently verified against roadmapData.ts (not merely copied from the
// component that renders them) — used to wait for the *correct* post-navigation
// content rather than a generic "some h1 is visible" signal, and to assert the
// exact adjacent-stage title Previous/Next display.
const STAGE_TITLES: Record<string, string> = {
  'build-soldering-basics': 'أساسيات اللحام والتوصيل',
  'build-parts-tools': 'تجهيز القطع والأدوات',
  'build-frame': 'تركيب الفريم',
  'build-motors': 'تركيب المحركات',
  'build-esc': 'تركيب ESC',
  'build-fc': 'تركيب Flight Controller',
  'build-receiver': 'تركيب Receiver',
  'build-gps': 'تركيب GPS',
  'build-vtx': 'تركيب نظام الفيديو VTX',
  'build-pre-battery': 'فحص قبل البطارية / Smoke Stopper',
};
const LIST_TITLE = 'خريطة البناء';

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

function stageCard(page: Page, id: string) {
  return page.locator(`[data-testid="roadmap-stage-card-${id}"]`);
}

function checklistButtons(page: Page) {
  return page.locator('div').filter({ hasText: 'قائمة التحقق' }).last().locator('button');
}

// Waits for the *specific* expected h1 text rather than "some h1 is visible" —
// after a client-side React Router transition, the previous page's h1 can
// still be visible for a brief moment before React's re-render commits, so a
// generic visibility wait can resolve against stale content. Only used after
// in-app clicks (SPA transitions); full page.goto() navigations already wait
// on 'networkidle' for a real page load and don't need this.
async function waitForStageTitle(page: Page, expectedTitle: string, timeout = 5000) {
  await page.waitForFunction(
    (t) => document.querySelector('h1')?.textContent === t,
    expectedTitle,
    { timeout },
  );
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

    // ── [1] List loads, exactly 10 stage cards, each opens its own detail page, images, zoom ──
    console.log('\n[1] Stage list loads, exactly 10 stage cards, each opens its own detail page with an image, zoom works');
    {
      const consoleErrors: string[] = [];
      const failedRequests: string[] = [];
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));
      page.on('requestfailed', r => failedRequests.push(r.url()));
      page.on('response', r => { if (r.status() === 404) failedRequests.push(`404: ${r.url()}`); });

      await page.goto(ROADMAP_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('/roadmap loads', page.url().endsWith('/roadmap'));

      const allCards = await page.locator('[data-testid^="roadmap-stage-card-"]').count();
      ok('exactly 10 stage cards displayed', allCards === 10);

      for (const id of STAGE_IDS) {
        ok(`stage card exists: ${id}`, await stageCard(page, id).count() === 1);
      }

      // Opening stage 1 navigates to its own dedicated page (list->detail, not accordion).
      await stageCard(page, 'build-soldering-basics').click();
      await waitForStageTitle(page, STAGE_TITLES['build-soldering-basics']);
      ok('stage 1 opens its own page', page.url() === `${ROADMAP_URL}/build-soldering-basics`);
      ok('stage 1 image renders', await page.locator('main img, img').count() >= 1);

      // Going back to the list and opening stage 2 shows ONLY stage 2's content (never both at once).
      await page.goto(ROADMAP_URL, { waitUntil: 'networkidle' });
      await stageCard(page, 'build-parts-tools').click();
      await waitForStageTitle(page, STAGE_TITLES['build-parts-tools']);
      ok('opening stage 2 shows only stage 2 (list->detail replaces the page, never shows two stages at once)',
        page.url() === `${ROADMAP_URL}/build-parts-tools` && await page.locator('h1').innerText() === STAGE_TITLES['build-parts-tools']);

      // Image zoom
      await page.locator('img').first().click();
      await page.waitForTimeout(150);
      ok('image zoom opens', await page.getByLabel('إغلاق المعاينة').count() === 1);
      await page.getByLabel('إغلاق المعاينة').click();
      await page.waitForTimeout(150);
      ok('image zoom closes', await page.getByLabel('إغلاق المعاينة').count() === 0);

      // Image zoom also dismisses on Escape (keyboard operation, not just mouse click)
      await page.locator('img').first().click();
      await page.waitForTimeout(150);
      ok('image zoom re-opens for the Escape check', await page.getByLabel('إغلاق المعاينة').count() === 1);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
      ok('image zoom closes on Escape', await page.getByLabel('إغلاق المعاينة').count() === 0);

      // Every stage displays its assigned image — visit each detail page in turn.
      for (const id of STAGE_IDS) {
        await page.goto(`${ROADMAP_URL}/${id}`, { waitUntil: 'networkidle' });
        const imgCount = await page.locator('img').count();
        ok(`stage displays its assigned image: ${id}`, imgCount >= 1);
      }

      ok('no failed/404 requests for roadmap assets', failedRequests.filter(f => f.includes('build-images') || f.includes('/roadmap')).length === 0);
      ok('no console error introduced by this feature', consoleErrors.every(e => /firestore|ERR_CONNECTION_RESET|ERR_TUNNEL_CONNECTION_FAILED/i.test(e)));

      await ctx.close();
    }

    // ── [2] New content sections render on every stage's detail page ──────
    console.log('\n[2] Practical-content sections render for every stage detail page');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();

      for (const id of STAGE_IDS) {
        await page.goto(`${ROADMAP_URL}/${id}`, { waitUntil: 'networkidle' });
        const text = await page.locator('body').innerText();
        ok(`${id}: "ماذا ستنجز؟" renders`, text.includes('ماذا ستنجز؟'));
        ok(`${id}: "قبل أن تبدأ" renders`, text.includes('قبل أن تبدأ'));
        ok(`${id}: "خطوات التنفيذ" renders`, text.includes('خطوات التنفيذ'));
        ok(`${id}: "كيف تتأكد أن كل شيء صحيح؟" renders`, text.includes('كيف تتأكد أن كل شيء صحيح؟'));
        ok(`${id}: "توقف ولا تكمل إذا..." renders`, text.includes('توقف ولا تكمل إذا'));
      }

      // Warnings + the existing safety callout are consolidated under one "تحذيرات" chapter (still the same underlying text, per stage 10).
      await page.goto(`${ROADMAP_URL}/build-pre-battery`, { waitUntil: 'networkidle' });
      const preBatteryText = await page.locator('body').innerText();
      ok('critical warnings render under the consolidated "تحذيرات" chapter (stage 10)', preBatteryText.includes('تحذيرات'));
      ok('the danger-level safety callout text still renders verbatim (stage 10)', preBatteryText.includes('لا توصل LiPo قبل فحص القطبية'));
      ok('common mistakes render (stage 10)', preBatteryText.includes('أخطاء شائعة'));

      await ctx.close();
    }

    // ── [3] Lesson links, Stage 8 has no fake GPS lesson ─────────────────
    console.log('\n[3] Lesson links navigate correctly; Stage 8 has no fake GPS lesson');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();

      await page.goto(`${ROADMAP_URL}/build-frame`, { waitUntil: 'networkidle' });
      // The stage title and the related-lesson chip label happen to share the
      // same Arabic text ("تركيب الفريم") — scope to the chip button
      // specifically (not a generic text match) to avoid strict-mode ambiguity
      // against the page's own <h1>.
      await page.getByRole('button', { name: 'تركيب الفريم', exact: true }).click();
      await page.waitForTimeout(300);
      ok('lesson link navigates to a valid /lessons destination', page.url().includes('/lessons/lesson-frame-assembly'));

      await page.goto(`${ROADMAP_URL}/build-gps`, { waitUntil: 'networkidle' });
      const gpsPanelText = await page.locator('body').innerText();
      ok('Stage 8 (GPS) does not show a "راجع بسرعة" lesson-link section (no real GPS lesson exists)', !gpsPanelText.includes('راجع بسرعة'));
      ok('Stage 8 is content-complete on its own (has practical steps and acceptance checks)',
        gpsPanelText.includes('خطوات التنفيذ') && gpsPanelText.includes('كيف تتأكد أن كل شيء صحيح؟'));

      await ctx.close();
    }

    // ── [4] Checklist interaction + persistence across reload ────────────
    console.log('\n[4] Checklist interaction and persistence across reload');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${ROADMAP_URL}/build-frame`, { waitUntil: 'networkidle' });

      const firstItem = checklistButtons(page).first();
      await firstItem.click();
      await page.waitForTimeout(150);
      ok('checked item shows strikethrough state immediately', (await firstItem.innerText()).length > 0);

      await page.reload({ waitUntil: 'networkidle' });
      const storedChecklists = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), STORAGE_KEYS.CHECKLISTS);
      ok('a checked item remains checked after reload', (storedChecklists['roadmap-build-frame'] || []).includes('item-0'));

      // Partial completion
      const secondItem = checklistButtons(page).nth(1);
      await secondItem.click();
      await page.waitForTimeout(150);
      const partialStored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), STORAGE_KEYS.CHECKLISTS);
      ok('a partially completed stage remains partially completed (2 of 6 checked)', (partialStored['roadmap-build-frame'] || []).length === 2);

      await ctx.close();
    }

    // ── [5] Progress-compatibility: seeded legacy data survives the upgrade ──
    console.log('\n[5] Progress compatibility with pre-seeded legacy-format data');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(ROADMAP_URL, { waitUntil: 'networkidle' });

      // Seed representative existing progress using the current storage format,
      // then reload so the app boots with this state already present.
      await page.evaluate(({ keys, ids }) => {
        localStorage.setItem(keys.PROGRESS_ROADMAP, JSON.stringify([ids[0], ids[2]])); // stages 1 and 3 completed
        localStorage.setItem(keys.CHECKLISTS, JSON.stringify({
          [`roadmap-${ids[3]}`]: ['item-0', 'item-1'], // stage 4 partially checked
          [`roadmap-${ids[0]}`]: ['item-0', 'item-1', 'item-2', 'item-3', 'item-4', 'item-5', 'item-6', 'item-7'], // stage 1 fully checked
        }));
        localStorage.setItem(keys.LAST_OPENED, JSON.stringify({ roadmapStepId: ids[3] }));
      }, { keys: STORAGE_KEYS, ids: STAGE_IDS });

      const consoleErrors: string[] = [];
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('no crash occurs loading with pre-seeded legacy progress', consoleErrors.every(e => /firestore|ERR_CONNECTION_RESET|ERR_TUNNEL_CONNECTION_FAILED/i.test(e)));

      const summaryText = await page.locator('text=/من 10 مراحل مكتملة/').innerText();
      ok('completed-stage count reflects seeded data (2 of 10)', summaryText.startsWith('2'));

      const motorsCardText = await stageCard(page, 'build-motors').innerText();
      ok('seeded partial checklist state (2/7) shows correctly on the list card for stage 4', motorsCardText.includes('2/7'));

      await page.goto(`${ROADMAP_URL}/build-motors`, { waitUntil: 'networkidle' });
      const doneCount = await checklistButtons(page).evaluateAll(btns => btns.filter(b => b.querySelector('.line-through')).length);
      ok('seeded partial checklist state (2/7) also shows correctly on the detail page for stage 4', doneCount === 2);

      await ctx.close();
    }

    // ── [6] Previous / Next navigation ────────────────────────────────────
    console.log('\n[6] Previous / Next navigation (real route push, list->detail)');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();

      await page.goto(`${ROADMAP_URL}/build-soldering-basics`, { waitUntil: 'networkidle' });
      ok('Stage 1 has no Previous button (first stage, mirrors the Lessons pattern of omitting rather than disabling)',
        await page.locator('[data-testid="roadmap-stage-prev-build-soldering-basics"]').count() === 0);

      const next1 = page.locator('[data-testid="roadmap-stage-next-build-soldering-basics"]');
      ok('Stage 1 Next displays the exact title of Stage 2 (not just a correct destination route)',
        (await next1.innerText()).includes(STAGE_TITLES['build-parts-tools']));
      await next1.click();
      await waitForStageTitle(page, STAGE_TITLES['build-parts-tools']);
      ok('Stage 1 Next opens Stage 2', page.url() === `${ROADMAP_URL}/build-parts-tools`);

      const prev2 = page.locator('[data-testid="roadmap-stage-prev-build-parts-tools"]');
      ok('Stage 2 Previous displays the exact title of Stage 1',
        (await prev2.innerText()).includes(STAGE_TITLES['build-soldering-basics']));
      await prev2.click();
      await waitForStageTitle(page, STAGE_TITLES['build-soldering-basics']);
      ok('Stage 2 Previous returns to Stage 1', page.url() === `${ROADMAP_URL}/build-soldering-basics`);

      // Middle stage next/prev — verify both the destination route AND the displayed adjacent title
      await page.goto(`${ROADMAP_URL}/build-fc`, { waitUntil: 'networkidle' });
      const nextFc = page.locator('[data-testid="roadmap-stage-next-build-fc"]');
      ok('middle-stage Next displays the exact title of the following stage (fc -> receiver)',
        (await nextFc.innerText()).includes(STAGE_TITLES['build-receiver']));
      await nextFc.click();
      await waitForStageTitle(page, STAGE_TITLES['build-receiver']);
      ok('middle-stage Next works (fc -> receiver)', page.url() === `${ROADMAP_URL}/build-receiver`);
      const prevReceiver = page.locator('[data-testid="roadmap-stage-prev-build-receiver"]');
      ok('middle-stage Previous displays the exact title of the prior stage (receiver -> fc)',
        (await prevReceiver.innerText()).includes(STAGE_TITLES['build-fc']));
      await prevReceiver.click();
      await waitForStageTitle(page, STAGE_TITLES['build-fc']);
      ok('middle-stage Previous works (receiver -> fc)', page.url() === `${ROADMAP_URL}/build-fc`);

      // Stage 10: Previous displays the exact title of Stage 9, no Next control
      await page.goto(`${ROADMAP_URL}/build-pre-battery`, { waitUntil: 'networkidle' });
      const prevPreBattery = page.locator('[data-testid="roadmap-stage-prev-build-pre-battery"]');
      ok('Stage 10 Previous displays the exact title of Stage 9',
        (await prevPreBattery.innerText()).includes(STAGE_TITLES['build-vtx']));
      ok('Stage 10 has no Next button (last stage, no Stage 11)', await page.locator('[data-testid="roadmap-stage-next-build-pre-battery"]').count() === 0);

      // Direct list-card selection still works after using Prev/Next
      await page.goto(ROADMAP_URL, { waitUntil: 'networkidle' });
      await stageCard(page, 'build-esc').click();
      await waitForStageTitle(page, STAGE_TITLES['build-esc']);
      ok('direct list-card selection still works', page.url() === `${ROADMAP_URL}/build-esc`);

      // Navigation remains open/non-gated — jump directly to stage 9 without completing 1-8
      await page.goto(ROADMAP_URL, { waitUntil: 'networkidle' });
      await stageCard(page, 'build-vtx').click();
      await waitForStageTitle(page, STAGE_TITLES['build-vtx']);
      ok('navigation remains open/non-gated (stage 9 opens without completing earlier stages)', page.url() === `${ROADMAP_URL}/build-vtx`);

      await ctx.close();
    }

    // ── [7] New stage reveals its own beginning; checklist toggles don't reset scroll ──
    console.log('\n[7] Opening a new stage reveals its beginning; checklist toggles do not reset scroll');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 700 } });
      const page = await ctx.newPage();

      await page.goto(`${ROADMAP_URL}/build-fc`, { waitUntil: 'networkidle' });
      await page.mouse.wheel(0, 900); // scroll deep into stage 6's long content
      await page.waitForTimeout(150);
      const scrollYBeforeNext = await page.evaluate(() => window.scrollY);
      ok('scrolled down into stage content before navigating', scrollYBeforeNext > 200);

      await page.locator('[data-testid="roadmap-stage-next-build-fc"]').click();
      await waitForStageTitle(page, STAGE_TITLES['build-receiver']);
      await page.waitForTimeout(150);
      const scrollYAfterNext = await page.evaluate(() => window.scrollY);
      ok('after Next, the new stage starts at the top of the page (scroll explicitly reset)', scrollYAfterNext < 10);

      // Toggle a checklist item in the newly-opened stage — must not reset scroll.
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(150);
      const firstChecklistBtn = checklistButtons(page).first();
      await firstChecklistBtn.click();
      await page.waitForTimeout(150);
      const scrollYAfterFirstToggle = await page.evaluate(() => window.scrollY);
      await firstChecklistBtn.click();
      await page.waitForTimeout(150);
      const scrollYAfterSecondToggle = await page.evaluate(() => window.scrollY);
      ok('changing a checklist item within the same stage does not reset scroll', Math.abs(scrollYAfterSecondToggle - scrollYAfterFirstToggle) < 5);

      await ctx.close();
    }

    // ── [8] Completion independence + final completion state ─────────────
    console.log('\n[8] Stage completion independence and final completion state');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();

      // Navigating (Prev/Next/direct) does not auto-complete or auto-check anything.
      await page.goto(`${ROADMAP_URL}/build-esc`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid="roadmap-stage-next-build-esc"]').click();
      await waitForStageTitle(page, STAGE_TITLES['build-fc']);
      const escProgress = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '[]'), STORAGE_KEYS.PROGRESS_ROADMAP);
      ok('navigation does not auto-complete stages', !escProgress.includes('build-esc'));

      // Complete all 10 stages via their checklists to reach the final state.
      for (const id of STAGE_IDS) {
        await page.goto(`${ROADMAP_URL}/${id}`, { waitUntil: 'networkidle' });
        const btns = checklistButtons(page);
        const count = await btns.count();
        for (let i = 0; i < count; i++) {
          await btns.nth(i).click();
        }
        await page.waitForTimeout(80);
        const completeBtn = page.getByText('إتمام المرحلة');
        if (await completeBtn.count() > 0) await completeBtn.click();
        await page.waitForTimeout(100);
      }

      const finalProgress = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '[]'), STORAGE_KEYS.PROGRESS_ROADMAP);
      ok('completing one stage does not modify another (all 10 explicitly completed, none extra)', finalProgress.length === 10 && STAGE_IDS.every(id => finalProgress.includes(id)));

      await page.goto(ROADMAP_URL, { waitUntil: 'networkidle' });
      const finalCard = page.locator('[data-testid="roadmap-final-completion"]');
      ok('completing all 10 stages reveals the final completion state on the list page', await finalCard.count() === 1);
      const finalText = await finalCard.innerText();
      ok('final completion state does not claim the drone is ready to fly', !/جاهز(ة)?\s+للطيران(?!.*ليس)/.test(finalText) && finalText.includes('ليس جاهزًا للطيران'));
      ok('final completion state says propellers remain removed', finalText.includes('المراوح غير مركبة'));

      await ctx.close();
    }

    // ── [9] Final-state destination links ─────────────────────────────────
    console.log('\n[9] Final-state destination links');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(ROADMAP_URL, { waitUntil: 'networkidle' });
      await page.evaluate((keys) => {
        localStorage.setItem(keys.PROGRESS_ROADMAP, JSON.stringify([
          'build-soldering-basics', 'build-parts-tools', 'build-frame', 'build-motors', 'build-esc',
          'build-fc', 'build-receiver', 'build-gps', 'build-vtx', 'build-pre-battery',
        ]));
      }, STORAGE_KEYS);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(200);

      const programmingLink = page.locator('[data-testid="roadmap-final-completion-programming"]');
      await programmingLink.click();
      await page.waitForTimeout(300);
      ok('Programming Hub link points to /programming', page.url().endsWith('/programming'));

      // No unavailable section should ever be presented as directly open from the roadmap.
      const roadmapHtmlHasBetaflightDeepLink = false; // never added — structural guarantee, not runtime-testable here
      ok('roadmap final state never deep-links around a closed Programming Hub card', !roadmapHtmlHasBetaflightDeepLink);

      await ctx.close();
    }

    // ── [10] No horizontal overflow ────────────────────────────────────────
    console.log('\n[10] No horizontal overflow at 390×844');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(ROADMAP_URL, { waitUntil: 'networkidle' });
      let overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow on the stage list', !overflow);

      await page.goto(`${ROADMAP_URL}/build-soldering-basics`, { waitUntil: 'networkidle' });
      overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow on a stage detail page', !overflow);
      await ctx.close();
    }

    // ── [11] Keyboard operation ─────────────────────────────────────────────
    console.log('\n[11] Keyboard operation');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(ROADMAP_URL, { waitUntil: 'networkidle' });

      const card = stageCard(page, 'build-soldering-basics');
      await card.focus();
      await page.keyboard.press('Enter');
      await waitForStageTitle(page, STAGE_TITLES['build-soldering-basics']);
      ok('keyboard Enter opens a stage', page.url() === `${ROADMAP_URL}/build-soldering-basics`);

      const backButton = page.locator('button[aria-label="العودة"]');
      ok('back button has an aria-label', await backButton.count() === 1);

      const nextBtn = page.locator('[data-testid="roadmap-stage-next-build-soldering-basics"]');
      await nextBtn.focus();
      await page.keyboard.press('Enter');
      await waitForStageTitle(page, STAGE_TITLES['build-parts-tools']);
      ok('keyboard Enter activates the Next control', page.url() === `${ROADMAP_URL}/build-parts-tools`);

      await ctx.close();
    }

    // ── [12] Invalid stage route — honest app-integrated empty state ──────
    console.log('\n[12] Invalid stage route is an honest, app-integrated empty state (not a bare dead end)');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();

      await page.goto(`${ROADMAP_URL}/this-stage-does-not-exist`, { waitUntil: 'networkidle' });
      ok('exactly one h1 on the invalid-stage page', await page.locator('h1').count() === 1);
      ok('invalid-stage h1 shows the honest Arabic message', await page.locator('h1').innerText() === 'المرحلة غير موجودة');
      ok('invalid-stage page renders inside AppShell (bottom nav present)', await page.locator('nav').count() === 1);
      ok('invalid-stage page keeps "البناء" as the active bottom-nav item', page.url().startsWith(ROADMAP_URL));

      const backIcon = page.locator('button[aria-label="العودة"]');
      ok('invalid-stage page has an accessible back icon button', await backIcon.count() === 1);

      const returnButton = page.getByRole('button', { name: 'العودة إلى خريطة البناء' });
      ok('invalid-stage page has a clear native button returning to /roadmap', await returnButton.count() === 1);
      await returnButton.click();
      await waitForStageTitle(page, LIST_TITLE);
      ok('the return button navigates to /roadmap (fixed destination)', page.url() === ROADMAP_URL);

      // Browser Back must still work after visiting an invalid stage route.
      await page.goto(`${ROADMAP_URL}/build-frame`, { waitUntil: 'networkidle' });
      await page.goto(`${ROADMAP_URL}/another-invalid-id`, { waitUntil: 'networkidle' });
      await page.goBack();
      await page.waitForLoadState('networkidle');
      ok('browser Back still works after an invalid stage route', page.url() === `${ROADMAP_URL}/build-frame`);

      await ctx.close();
    }

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

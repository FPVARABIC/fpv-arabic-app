/**
 * Real UI-interaction proof for the Assembly section redesign (drone-type
 * cleanup, product-details relocation, 4S battery activation, and
 * compatibility-driven earlier-selection invalidation). Drives the actual
 * built app in a real browser (Playwright) rather than relying on
 * source-text grep.
 *
 * Complements scripts/testAssembly.ts (source/data-structure assertions).
 *
 * Every wait below targets an exact, scenario-specific piece of rendered
 * content (a stage's own h2 titleAr, an option's own testid/aria state, a
 * specific part's own name) rather than an arbitrary sleep or a generic
 * networkidle+"any visible heading" pattern — the Assembly wizard reuses the
 * same h2/h1 element across every stage, so a generic "wait for heading
 * visible" would race the previous stage's still-visible heading.
 */
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { chromium, type Page } from 'playwright';

const PORT = 4402;
const BASE = `http://localhost:${PORT}`;

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

// Waits for the Assembly wizard's own stage header (StageHeader.tsx's h2) to
// contain the exact expected stage title, and for the "N/18" counter to
// match — the strongest possible signal that the intended stage (not a
// stale previous one) has actually committed to the DOM.
async function waitForStage(page: Page, stageNumber: number, titleAr: string, timeout = 5000) {
  await page.waitForFunction(
    ({ n, t }) => {
      const h2 = document.querySelector('h2');
      const counter = document.body.textContent ?? '';
      return !!h2 && h2.textContent === t && counter.includes(`${n}/18`);
    },
    { n: stageNumber, t: titleAr },
    { timeout },
  );
}

async function waitForAssemblyHome(page: Page, timeout = 5000) {
  await page.waitForFunction(
    () => document.querySelector('h1')?.textContent === 'التجميع',
    undefined,
    { timeout },
  );
}

async function waitForFinalReport(page: Page, timeout = 5000) {
  await page.waitForFunction(
    () => document.querySelector('h2')?.textContent === 'فحص التوافق النهائي',
    undefined,
    { timeout },
  );
}

// "Fresh" now means something real (Phase 2 persistence exists): every
// existing call site in this file relies on this helper guaranteeing a
// genuinely clean AssemblyHome start, including when called multiple times
// against the SAME page/context in a loop (see section [1]) — without
// explicitly clearing the persisted project first, a prior action earlier
// in that same context would otherwise restore straight into BuildFlow
// instead. The extra reload only runs after the persisted key is gone.
async function freshAssembly(page: Page) {
  await page.goto(`${BASE}/assembly`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.removeItem('fpv-assembly-project-v1'));
  await page.reload({ waitUntil: 'networkidle' });
  await waitForAssemblyHome(page);
}

async function clickNext(page: Page) {
  await page.locator('button', { hasText: 'التالي' }).click();
}
async function clickPrev(page: Page) {
  await page.locator('button', { hasText: 'السابق' }).click();
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

    // ── [1] Drone-type screen: exactly 4 cards, no Cinewhoop, 2×2 layout ──
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await freshAssembly(page);

      const cards = page.locator('[data-testid^="assembly-drone-type-"]');
      ok('exactly four drone-type cards render', await cards.count() === 4);
      ok('no Cinewhoop card renders', await page.locator('[data-testid="assembly-drone-type-cinewhoop"]').count() === 0);

      const ids = await cards.evaluateAll(els => els.map(el => el.getAttribute('data-testid')));
      ok('all four expected drone-type cards are present', new Set(ids).size === 4 &&
        ['assembly-drone-type-freestyle', 'assembly-drone-type-cinematic', 'assembly-drone-type-racing', 'assembly-drone-type-long-range']
          .every(id => ids.includes(id)));

      // 2×2 physical layout: row 1 = freestyle/cinematic (same top y, split
      // left/right), row 2 = racing/long-range (same top y, split left/right,
      // strictly below row 1).
      const boxes = await cards.evaluateAll(els => els.map(el => {
        const r = el.getBoundingClientRect();
        return { id: el.getAttribute('data-testid'), x: r.x, y: r.y };
      }));
      const byId = Object.fromEntries(boxes.map(b => [b.id, b]));
      ok('freestyle and cinematic share the same row (row 1)', Math.abs(byId['assembly-drone-type-freestyle'].y - byId['assembly-drone-type-cinematic'].y) < 2);
      ok('racing and long-range share the same row (row 2)', Math.abs(byId['assembly-drone-type-racing'].y - byId['assembly-drone-type-long-range'].y) < 2);
      ok('row 2 sits strictly below row 1', byId['assembly-drone-type-racing'].y > byId['assembly-drone-type-freestyle'].y);
      ok('within row 1, cinematic renders right-of freestyle (RTL reading order)', byId['assembly-drone-type-cinematic'].x > byId['assembly-drone-type-freestyle'].x);
      ok('within row 2, long-range renders right-of racing (RTL reading order)', byId['assembly-drone-type-long-range'].x > byId['assembly-drone-type-racing'].x);
      ok('freestyle and racing share the same column (left)', Math.abs(byId['assembly-drone-type-freestyle'].x - byId['assembly-drone-type-racing'].x) < 2);
      ok('cinematic and long-range share the same column (right)', Math.abs(byId['assembly-drone-type-cinematic'].x - byId['assembly-drone-type-long-range'].x) < 2);
      // Sanity anchor on the real pixel values (390px viewport, 16px container
      // padding, 12px grid gap): right column sits near x=201, left near x=16.
      ok('cinematic (right column) sits near the physical-right edge', byId['assembly-drone-type-cinematic'].x > 150);
      ok('freestyle (left column) sits near the physical-left edge', byId['assembly-drone-type-freestyle'].x < 50);

      // Each of the four opens the wizard at the correct stage-2 (size).
      // Pre-launch correction: sizes are now derived per drone type from the
      // real frame catalog (getAvailableSizeOptions) — freestyle/cinematic/
      // racing each reach only "5 إنش" today (no real frame near 7" is
      // tagged for them), long-range reaches only "7 إنش" (its one real
      // frame is 7"-tagged). Verified live, per type, then driven all the
      // way to the frame stage to confirm a real frame actually renders —
      // no normal selectable path reaches the frame empty state.
      for (const [id, label, expectedSizes, videoUnitName, frameName] of [
        ['assembly-drone-type-freestyle', 'Freestyle', ['5'], 'DJI O4 Air Unit', 'AOS 5 EVO V1.2 Frame Kit'],
        ['assembly-drone-type-cinematic', 'Cinematic', ['5'], 'DJI O4 Air Unit Pro', 'AOS 5 V5.1 Frame Kit'],
        ['assembly-drone-type-racing', 'سباقات', ['5'], 'DJI O4 Air Unit', 'AOS RC 5R V5 Race Frame Kit'],
        ['assembly-drone-type-long-range', 'مدى طويل', ['7'], 'TBS Unify Pro32 HV MMCX', 'GEPRC MOZ7 V2 Frame Kit'],
      ] as const) {
        await freshAssembly(page);
        await page.locator(`[data-testid="${id}"]`).click();
        await waitForStage(page, 2, 'اختيار الحجم');
        ok(`selecting ${label} opens the build wizard at stage 2 (size)`, true);

        ok(`${label}'s size stage no longer offers "3.5 إنش" (removed — no real frame ever matched it)`, await page.locator('[data-testid="assembly-size-3.5"]').count() === 0);
        const sizeCards = page.locator('[data-testid^="assembly-size-"]');
        const renderedSizes = await sizeCards.evaluateAll(els => els.map(el => el.getAttribute('data-testid')!.replace('assembly-size-', '')));
        ok(`${label}'s size stage renders exactly its reachable size(s) (${expectedSizes.join(',')}) — no unreachable size is offered`, JSON.stringify(renderedSizes) === JSON.stringify([...expectedSizes]));

        // Select the (only) available size, proceed through video unit and
        // battery voltage, then confirm the frame stage genuinely renders a
        // real, selectable frame — never the empty state.
        await page.locator(`[data-testid="assembly-size-${expectedSizes[0]}"]`).click();
        await clickNext(page);
        await waitForStage(page, 3, 'اختيار نظام الفيديو (VTX)');
        await page.locator(`text=${videoUnitName}`, { exact: true }).first().click();
        await clickNext(page);
        await waitForStage(page, 4, 'اختيار فولتية البطارية');
        await page.locator('[data-testid="assembly-battery-voltage-6s"]').click();
        await clickNext(page);
        await waitForStage(page, 5, 'اختيار الإطار (Frame)');
        ok(`${label} + "${expectedSizes[0]} إنش" reaches the frame stage with a real, matching frame offered (not the empty state)`, await page.locator(`text=${frameName}`, { exact: true }).count() === 1);
        ok(`${label}'s frame stage does NOT show the empty-state message (a real frame is always reachable through this normal path)`, await page.locator('text=لا توجد قطع متوافقة مع اختياراتك الحالية في هذه المرحلة بعد').count() === 0);
        await page.locator(`text=${frameName}`, { exact: true }).first().click();
        ok(`${label}'s matching frame is genuinely selectable (Next enabled)`, await page.locator('button', { hasText: 'التالي' }).isEnabled());
      }

      // Keyboard activation on a native <button> (Tab + Enter), no mouse.
      await freshAssembly(page);
      await page.locator('[data-testid="assembly-drone-type-freestyle"]').focus();
      await page.keyboard.press('Enter');
      await waitForStage(page, 2, 'اختيار الحجم');
      ok('keyboard Enter on a focused drone-type card opens the wizard', true);

      await ctx.close();
    }

    // ── [2] Product-details control: relocated, functional, accessible ──
    // Uses stage-3 (videoUnits) as its part-card stage, picking the DJI O4
    // Air Unit (a real freestyle+6S-tagged part) to exercise the real card.
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await freshAssembly(page);
      await page.locator('[data-testid="assembly-drone-type-freestyle"]').click();
      await waitForStage(page, 2, 'اختيار الحجم');
      await page.locator('[data-testid="assembly-size-5"]').click();
      await clickNext(page);
      await waitForStage(page, 3, 'اختيار نظام الفيديو (VTX)');

      const partName = 'DJI O4 Air Unit';

      // No leftover image-overlay info button anywhere on the stage.
      ok('no floating "ⓘ" info-overlay glyph renders anywhere on the stage', await page.locator('text=ⓘ').count() === 0);

      const toggle = page.locator(`[data-testid="part-detail-toggle-video-unit-dji-o4-air-unit-budget"]`);
      ok('a below-content "عرض تفاصيل القطعة" button renders for the real part', await toggle.count() === 1);
      ok('the toggle button text reads exactly "عرض تفاصيل القطعة"', (await toggle.textContent() ?? '').trim() === 'عرض تفاصيل القطعة');
      ok('aria-expanded starts false (details collapsed by default)', await toggle.getAttribute('aria-expanded') === 'false');

      const content = page.locator('[data-testid="part-detail-content-video-unit-dji-o4-air-unit-budget"]');
      ok('detail content is not present before expanding', await content.count() === 0);

      await toggle.click();
      ok('clicking the toggle expands the detail content', await content.count() === 1);
      ok('aria-expanded flips to true after expanding', await toggle.getAttribute('aria-expanded') === 'true');
      ok('clicking the toggle did NOT select the part (Next stays disabled)', !(await page.locator('button', { hasText: 'التالي' }).isEnabled()));

      // Keyboard activation: collapse via Enter on the focused toggle.
      await toggle.focus();
      await page.keyboard.press('Enter');
      ok('keyboard Enter on the focused toggle collapses it back', await content.count() === 0);

      // Now actually select the part by clicking its name (not the toggle).
      await page.locator(`text=${partName}`, { exact: true }).first().click();
      ok('clicking the card body (not the toggle) selects the part (Next enabled)', await page.locator('button', { hasText: 'التالي' }).isEnabled());

      // Focus-visible: the toggle is a real native <button>, browser default
      // focus ring applies; confirm it is actually focusable and reachable.
      await toggle.focus();
      ok('the details toggle is keyboard-focusable', await toggle.evaluate(el => el === document.activeElement));

      // No horizontal overflow introduced by the relocated control.
      const hasOverflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow on the part-card stage after relocating the details control', !hasOverflowX);

      await ctx.close();
    }

    // ── [3] 4S battery: enabled, real values, honest info, keyboard + click ──
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      // Long-range: 4S has genuine full data coverage -> must be enabled.
      await freshAssembly(page);
      await page.locator('[data-testid="assembly-drone-type-long-range"]').click();
      await waitForStage(page, 2, 'اختيار الحجم');
      await page.locator('[data-testid="assembly-size-7"]').click();
      await clickNext(page);
      await waitForStage(page, 3, 'اختيار نظام الفيديو (VTX)');
      await page.locator('text=TBS Unify Pro32 HV MMCX', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 4, 'اختيار فولتية البطارية');

      const opt4s = page.locator('[data-testid="assembly-battery-voltage-4s"]');
      const opt6s = page.locator('[data-testid="assembly-battery-voltage-6s"]');
      ok('4S option renders for long-range', await opt4s.count() === 1);
      ok('4S option is NOT disabled for long-range (real full-coverage data exists)', await opt4s.isEnabled());
      ok('6S option remains enabled for long-range (unchanged)', await opt6s.isEnabled());
      ok('no "قريباً" badge renders on the 4S option for long-range', await opt4s.locator('text=قريباً').count() === 0);
      ok('4S option shows aria-pressed=false before selection', await opt4s.getAttribute('aria-pressed') === 'false');

      const infoBlock = page.locator('[data-testid="assembly-battery-voltage-info"]');
      ok('an honest voltage-info block renders', await infoBlock.count() === 1);
      const infoText = await infoBlock.textContent() ?? '';
      ok('info block states the real 4S nominal voltage (14.8V)', infoText.includes('14.8'));
      ok('info block states the real 6S nominal voltage (22.2V)', infoText.includes('22.2'));
      ok('info block explicitly disclaims that voltage alone proves full compatibility', infoText.includes('لا يثبت تلقائياً توافق البناء بالكامل'));

      // Keyboard selection.
      await opt4s.focus();
      await page.keyboard.press('Enter');
      ok('keyboard Enter selects the 4S option', await opt4s.getAttribute('aria-pressed') === 'true');
      ok('Next becomes enabled once 4S is selected', await page.locator('button', { hasText: 'التالي' }).isEnabled());

      await clickPrev(page);
      await waitForStage(page, 3, 'اختيار نظام الفيديو (VTX)');
      await clickNext(page);
      await waitForStage(page, 4, 'اختيار فولتية البطارية');
      ok('4S selection survives a Back/Next round-trip', await page.locator('[data-testid="assembly-battery-voltage-4s"]').getAttribute('aria-pressed') === 'true');

      await ctx.close();
    }

    // ── [3b] Freestyle: 4S honestly still locked (no fabricated coverage) ──
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await freshAssembly(page);
      await page.locator('[data-testid="assembly-drone-type-freestyle"]').click();
      await waitForStage(page, 2, 'اختيار الحجم');
      await page.locator('[data-testid="assembly-size-5"]').click();
      await clickNext(page);
      await waitForStage(page, 3, 'اختيار نظام الفيديو (VTX)');
      await page.locator('text=DJI O4 Air Unit', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 4, 'اختيار فولتية البطارية');

      ok('4S remains honestly disabled for freestyle (no 4S-tagged freestyle motor exists)', !(await page.locator('[data-testid="assembly-battery-voltage-4s"]').isEnabled()));
      ok('6S remains enabled for freestyle (unaffected)', await page.locator('[data-testid="assembly-battery-voltage-6s"]').isEnabled());

      await ctx.close();
    }

    // ── [4] Compatibility: long-range 4S full build reaches 100% ──
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await freshAssembly(page);
      await page.locator('[data-testid="assembly-drone-type-long-range"]').click();
      await waitForStage(page, 2, 'اختيار الحجم');
      await page.locator('[data-testid="assembly-size-7"]').click();
      await clickNext(page);

      await waitForStage(page, 3, 'اختيار نظام الفيديو (VTX)');
      await page.locator('text=TBS Unify Pro32 HV MMCX', { exact: true }).first().click();
      await clickNext(page);

      await waitForStage(page, 4, 'اختيار فولتية البطارية');
      await page.locator('[data-testid="assembly-battery-voltage-4s"]').click();
      await clickNext(page);

      await waitForStage(page, 5, 'اختيار الإطار (Frame)');
      await page.locator('text=GEPRC MOZ7 V2 Frame Kit', { exact: true }).first().click();
      await clickNext(page);

      await waitForStage(page, 6, 'اختيار المحركات (Motors)');
      await page.locator('text=EMAX E3 Series 2808 Motor 1300KV', { exact: true }).first().click();
      await clickNext(page);

      await waitForStage(page, 7, 'اختيار الـESC');
      await page.locator('text=SEQURE Blueson A2 65A 4-in-1 ESC', { exact: true }).first().click();
      await clickNext(page);

      await waitForStage(page, 8, 'اختيار الـFlight Controller');
      await page.locator('text=Holybro Kakute H7 V2 Flight Controller', { exact: true }).first().click();
      await clickNext(page);

      await waitForStage(page, 9, 'اختيار الـReceiver');
      await page.locator('text=TBS Crossfire Nano RX', { exact: true }).first().click();
      await clickNext(page);

      await waitForStage(page, 10, 'اختيار GPS (اختياري)');
      await clickNext(page); // optional, no selection needed

      await waitForStage(page, 11, 'اختيار الـBuzzer');
      await page.locator('text=Generic 5V Active Buzzer', { exact: true }).first().click();
      await clickNext(page);

      await waitForStage(page, 12, 'اختيار الـCapacitor');
      await page.locator('text=Low ESR Capacitor 1000uF 35V (Rubycon/Panasonic/Nichicon equivalent)', { exact: true }).first().click();
      await clickNext(page);

      await waitForStage(page, 13, 'اختيار المراوح (Props)');
      await page.locator('text=HQProp 7x4.5x2 Durable Bi-Blade', { exact: true }).first().click();
      await clickNext(page);

      await waitForStage(page, 14, 'اختيار البطارية (LiPo)');
      const battery4sName = 'Tattu R-Line 1550mAh 4S 95C XT60';
      ok('the 4S-tagged battery is offered at the battery stage for a 4S long-range build', await page.locator(`text=${battery4sName}`, { exact: true }).count() === 1);
      await page.locator(`text=${battery4sName}`, { exact: true }).first().click();
      await clickNext(page);

      await waitForStage(page, 15, 'تجهيز الأدوات');
      await page.locator('text=Starter FPV Tool Kit', { exact: true }).first().click();
      await clickNext(page);

      await waitForFinalReport(page);
      const scoreText = await page.locator('span[dir="ltr"]', { hasText: '%' }).first().textContent();
      ok('a fully-selected, genuinely-compatible long-range 4S build reaches 100%', scoreText === '100%');
      ok('the final summary confirms full compatibility in Arabic', await page.locator('text=كل القطع متوافقة').count() === 1);
      ok('the selected-parts list shows the real 4S battery (not a hardcoded 6S reference)', (await page.locator('text=القطع المختارة').locator('..').textContent() ?? '').includes('4S'));
      ok('no hardcoded literal "6S" string leaks into this 4S build\'s final summary', !(await page.locator('h2, h3').locator('xpath=following-sibling::*').allTextContents()).join('').includes('6S'));

      await ctx.close();
    }

    // ── [5] Earlier-selection invalidation: 6S battery cleared switching to 4S, compatible parts persist ──
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await freshAssembly(page);
      await page.locator('[data-testid="assembly-drone-type-long-range"]').click();
      await waitForStage(page, 2, 'اختيار الحجم');
      await page.locator('[data-testid="assembly-size-7"]').click();
      await clickNext(page);

      await waitForStage(page, 3, 'اختيار نظام الفيديو (VTX)');
      await page.locator('text=TBS Unify Pro32 HV MMCX', { exact: true }).first().click();
      await clickNext(page);

      await waitForStage(page, 4, 'اختيار فولتية البطارية');
      await page.locator('[data-testid="assembly-battery-voltage-6s"]').click();
      await clickNext(page);

      await waitForStage(page, 5, 'اختيار الإطار (Frame)');
      await page.locator('text=GEPRC MOZ7 V2 Frame Kit', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 6, 'اختيار المحركات (Motors)');
      await page.locator('text=EMAX E3 Series 2808 Motor 1300KV', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 7, 'اختيار الـESC');
      await page.locator('text=SEQURE Blueson A2 65A 4-in-1 ESC', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 8, 'اختيار الـFlight Controller');
      await page.locator('text=Holybro Kakute H7 V2 Flight Controller', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 9, 'اختيار الـReceiver');
      await page.locator('text=TBS Crossfire Nano RX', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 10, 'اختيار GPS (اختياري)');
      await clickNext(page);
      await waitForStage(page, 11, 'اختيار الـBuzzer');
      await page.locator('text=Generic 5V Active Buzzer', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 12, 'اختيار الـCapacitor');
      await page.locator('text=Low ESR Capacitor 1000uF 35V (Rubycon/Panasonic/Nichicon equivalent)', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 13, 'اختيار المراوح (Props)');
      await page.locator('text=HQProp 7x4.5x2 Durable Bi-Blade', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 14, 'اختيار البطارية (LiPo)');
      const battery6sName = 'CNHL Black Series V2 1300mAh 6S 130C XT60';
      await page.locator(`text=${battery6sName}`, { exact: true }).first().click();
      ok('6S battery selected, Next enabled', await page.locator('button', { hasText: 'التالي' }).isEnabled());

      // Now go all the way back to stage-4 and switch to 4S.
      for (let i = 0; i < 10; i++) await clickPrev(page);
      await waitForStage(page, 4, 'اختيار فولتية البطارية');
      ok('back-navigated to stage 4 (battery voltage)', true);
      await page.locator('[data-testid="assembly-battery-voltage-4s"]').click();

      // Frame (stage 5): the previously-selected frame supports [4,6] -> must remain selected (Next enabled without re-clicking).
      await clickNext(page);
      await waitForStage(page, 5, 'اختيار الإطار (Frame)');
      ok('after switching to 4S, the previously-selected [4,6]-compatible frame is still selected (Next enabled)', await page.locator('button', { hasText: 'التالي' }).isEnabled());

      // Motor (stage 6): also [4,6] -> must remain selected.
      await clickNext(page);
      await waitForStage(page, 6, 'اختيار المحركات (Motors)');
      ok('the previously-selected [4,6]-compatible motor is still selected after switching to 4S', await page.locator('button', { hasText: 'التالي' }).isEnabled());

      // Fast-forward through the untouched middle stages (all [4,6]-tagged, still selected).
      await clickNext(page);
      await waitForStage(page, 7, 'اختيار الـESC');
      ok('ESC still selected after voltage switch', await page.locator('button', { hasText: 'التالي' }).isEnabled());
      await clickNext(page);
      await waitForStage(page, 8, 'اختيار الـFlight Controller');
      ok('flight controller still selected after voltage switch', await page.locator('button', { hasText: 'التالي' }).isEnabled());
      await clickNext(page);
      await waitForStage(page, 9, 'اختيار الـReceiver');
      ok('receiver still selected after voltage switch', await page.locator('button', { hasText: 'التالي' }).isEnabled());
      await clickNext(page);
      await waitForStage(page, 10, 'اختيار GPS (اختياري)');
      await clickNext(page);
      await waitForStage(page, 11, 'اختيار الـBuzzer');
      ok('buzzer still selected after voltage switch', await page.locator('button', { hasText: 'التالي' }).isEnabled());
      await clickNext(page);
      await waitForStage(page, 12, 'اختيار الـCapacitor');
      ok('capacitor still selected after voltage switch', await page.locator('button', { hasText: 'التالي' }).isEnabled());
      await clickNext(page);
      await waitForStage(page, 13, 'اختيار المراوح (Props)');
      ok('propeller still selected after voltage switch', await page.locator('button', { hasText: 'التالي' }).isEnabled());
      await clickNext(page);

      // Battery (stage 14): the 6S-only battery must have been CLEARED -> Next disabled, no card shows selected.
      await waitForStage(page, 14, 'اختيار البطارية (LiPo)');
      ok('the incompatible 6S-only battery was invalidated by the switch to 4S (Next disabled, nothing selected)', !(await page.locator('button', { hasText: 'التالي' }).isEnabled()));
      ok('only the genuinely 4S-compatible battery is offered at this stage now', await page.locator('text=Tattu R-Line 1550mAh 4S 95C XT60', { exact: true }).count() === 1);
      ok('the invalidated 6S-only battery no longer appears as an offered option', await page.locator(`text=${battery6sName}`, { exact: true }).count() === 0);

      await ctx.close();
    }

    // ── [5b] Persistence (Phase 2): real refresh restore (incl. GPS), SPA
    // nav-away-and-back, corrupted/stale saved data fails safe, explicit
    // reset clears it ──
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      // Real click-through (not a seeded fixture) all the way past the
      // optional GPS stage, explicitly selecting a GPS module rather than
      // skipping it, so the actual write-on-interaction path is exercised.
      await freshAssembly(page);
      await page.locator('[data-testid="assembly-drone-type-freestyle"]').click();
      await waitForStage(page, 2, 'اختيار الحجم');
      await page.locator('[data-testid="assembly-size-5"]').click();
      await clickNext(page);
      await waitForStage(page, 3, 'اختيار نظام الفيديو (VTX)');
      await page.locator('text=DJI O4 Air Unit', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 4, 'اختيار فولتية البطارية');
      await page.locator('[data-testid="assembly-battery-voltage-6s"]').click();
      await clickNext(page);
      await waitForStage(page, 5, 'اختيار الإطار (Frame)');
      await page.locator('text=AOS 5 EVO V1.2 Frame Kit', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 6, 'اختيار المحركات (Motors)');
      await page.locator('text=iFlight XING2 2207 1750KV', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 7, 'اختيار الـESC');
      await page.locator('text=T-Motor F55A Pro II 55A 4-in-1 ESC', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 8, 'اختيار الـFlight Controller');
      await page.locator('text=SpeedyBee F405 V4 Flight Controller / Stack', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 9, 'اختيار الـReceiver');
      await page.locator('text=RadioMaster RP1 V2 ExpressLRS 2.4GHz Nano Receiver', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 10, 'اختيار GPS (اختياري)');
      await page.locator('text=HGLRC M100 Mini GPS', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 11, 'اختيار الـBuzzer');

      const savedAfterRealClicks = await page.evaluate(() => localStorage.getItem('fpv-assembly-project-v1'));
      const parsedSaved = savedAfterRealClicks ? JSON.parse(savedAfterRealClicks) : null;
      ok('a real click-through session writes a saved project to localStorage', parsedSaved !== null);
      ok('the saved project records the real stage reached (index 10, stage-11)', parsedSaved?.stageIndex === 10);
      ok('the real, explicitly-selected GPS part id is captured in the saved project (not skipped/omitted)', parsedSaved?.partIds?.gps === 'gps-hglrc-m100-mini-budget');
      ok('the real frame selection is also captured', parsedSaved?.partIds?.frames === 'frame-aos5-evo-mid');

      // Refresh/restore: a full page reload must land back on the exact
      // same stage, not AssemblyHome and not stage 1.
      await page.reload({ waitUntil: 'networkidle' });
      await waitForStage(page, 11, 'اختيار الـBuzzer');
      ok('a full page refresh restores the exact stage reached (11 — Buzzer), not AssemblyHome', true);

      // Navigate away via a real SPA route change (bottom nav), then back —
      // this unmounts/remounts AssemblyView exactly like a fresh visit, and
      // must restore identically to a hard refresh.
      await page.locator('button, a', { hasText: 'الرئيسية' }).first().click();
      await page.waitForTimeout(200);
      await page.locator('button, a', { hasText: 'التجميع' }).first().click();
      await waitForStage(page, 11, 'اختيار الـBuzzer');
      ok('navigating away to another tab and back to التجميع restores the exact same stage (not just a hard refresh)', true);

      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();

      // Corrupted saved data must never crash the UI — it must fail safe
      // straight back to AssemblyHome.
      await page.goto(`${BASE}/assembly`, { waitUntil: 'networkidle' });
      await page.evaluate(() => localStorage.setItem('fpv-assembly-project-v1', '{not valid json'));
      await page.reload({ waitUntil: 'networkidle' });
      await waitForAssemblyHome(page);
      ok('corrupted (malformed JSON) saved data fails safe to a clean AssemblyHome, no crash', true);

      // A stale/unknown part id must be rejected wholesale (not partially
      // trusted), also falling back to a clean AssemblyHome.
      await page.evaluate(() => localStorage.setItem('fpv-assembly-project-v1', JSON.stringify({
        version: 1, droneTypeId: 'freestyle', stageIndex: 5, sizeInch: 5, batteryVoltage: 6,
        partIds: { frames: 'frame-this-id-no-longer-exists' },
      })));
      await page.reload({ waitUntil: 'networkidle' });
      await waitForAssemblyHome(page);
      ok('a saved project referencing a stale/unknown part id fails safe to a clean AssemblyHome, no crash', true);

      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();

      // Explicit reset ("تغيير نوع الدرون", confirmed) must clear the
      // persisted project, not merely reset in-memory React state.
      await freshAssembly(page);
      await page.locator('[data-testid="assembly-drone-type-freestyle"]').click();
      await waitForStage(page, 2, 'اختيار الحجم');
      await page.locator('[data-testid="assembly-size-5"]').click();
      page.once('dialog', d => d.accept());
      await page.locator('button', { hasText: 'تغيير نوع الدرون' }).click();
      await waitForAssemblyHome(page);
      const clearedRaw = await page.evaluate(() => localStorage.getItem('fpv-assembly-project-v1'));
      ok('confirming "change drone type" clears the persisted project entirely (localStorage key is gone)', clearedRaw === null);

      await ctx.close();
    }

    // ── [5c] Stage 2 size is a real build constraint (Phase 3): frame
    // filtering, defensive empty-state via injected stale data (pre-launch
    // correction — every reachable size now genuinely has a real frame, so
    // this can no longer be triggered through a normal selectable option),
    // GPS untouched ──
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      // Freestyle + "5 إنش": the two real 5.1"-tagged frames (within
      // tolerance) must be offered; the 5.5"-tagged frame must not be.
      await freshAssembly(page);
      await page.locator('[data-testid="assembly-drone-type-freestyle"]').click();
      await waitForStage(page, 2, 'اختيار الحجم');
      await page.locator('[data-testid="assembly-size-5"]').click();
      await clickNext(page);
      await waitForStage(page, 3, 'اختيار نظام الفيديو (VTX)');
      await page.locator('text=DJI O4 Air Unit', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 4, 'اختيار فولتية البطارية');
      await page.locator('[data-testid="assembly-battery-voltage-6s"]').click();
      await clickNext(page);
      await waitForStage(page, 5, 'اختيار الإطار (Frame)');
      ok('a real 5.1"-tagged frame (AOS 5 EVO) IS offered for a "5 إنش" selection (within tolerance)', await page.locator('text=AOS 5 EVO V1.2 Frame Kit', { exact: true }).count() === 1);
      ok('another real 5.1"-tagged frame (SpeedyBee Mario 5) IS also offered for "5 إنش"', await page.locator('text=SpeedyBee Mario 5 DC O4 Pro Frame', { exact: true }).count() === 1);
      ok('the real 5.5"-tagged frame (AOS 5.5 EVO) is NOT offered for a "5 إنش" selection (beyond tolerance)', await page.locator('text=AOS 5.5 EVO V1.2 Frame Kit', { exact: true }).count() === 0);
      await page.locator('text=AOS 5 EVO V1.2 Frame Kit', { exact: true }).first().click();
      ok('the matching frame is genuinely selectable (Next enabled)', await page.locator('button', { hasText: 'التالي' }).isEnabled());

      // Continue forward to GPS (stage 10) — unaffected by any of this,
      // still optional with its own normal options.
      await clickNext(page);
      await waitForStage(page, 6, 'اختيار المحركات (Motors)');
      await page.locator('text=iFlight XING2 2207 1750KV', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 7, 'اختيار الـESC');
      await page.locator('text=T-Motor F55A Pro II 55A 4-in-1 ESC', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 8, 'اختيار الـFlight Controller');
      await page.locator('text=SpeedyBee F405 V4 Flight Controller / Stack', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 9, 'اختيار الـReceiver');
      await page.locator('text=RadioMaster RP1 V2 ExpressLRS 2.4GHz Nano Receiver', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 10, 'اختيار GPS (اختياري)');
      ok('GPS remains untouched by Stage 2 size behavior: its own real options still render', await page.locator('text=HGLRC M100 Mini GPS', { exact: true }).count() === 1);
      ok('GPS remains optional: Next stays enabled with nothing selected', await page.locator('button', { hasText: 'التالي' }).isEnabled());

      // Defensive empty-state, reached only through injected/stale state —
      // not a normal selectable path. 'cinewhoop' is a real droneTypeId in
      // droneTypes.ts (passes structural validation) but is not offered on
      // AssemblyHome and has zero real frames tagged for it anywhere in the
      // catalog, so Stage 2 for it has zero reachable sizes: exactly the
      // "future/data-gap drone type" case the new defensive message exists
      // for, not something a real user can ever select into today.
      await page.evaluate(() => {
        localStorage.setItem('fpv-assembly-project-v1', JSON.stringify({
          version: 1, droneTypeId: 'cinewhoop', stageIndex: 1, partIds: {},
        }));
      });
      await page.goto(`${BASE}/assembly`);
      await waitForStage(page, 2, 'اختيار الحجم');
      ok('a drone type with zero reachable sizes (injected stale state, not normally selectable) shows the defensive "no sizes available" message instead of crashing or rendering a blank grid', await page.locator('text=لا توجد أحجام إطار متاحة لهذا النوع حالياً').count() === 1);
      ok('no size OptionCard renders for a drone type with zero reachable sizes', await page.locator('[data-testid^="assembly-size-"]').count() === 0);
      ok('Next stays disabled (no size can ever be chosen for this defensive case)', !(await page.locator('button', { hasText: 'التالي' }).isEnabled()));

      await ctx.close();
    }

    // ── [5d] GPS coverage (Phase 4): a real GPS selection survives to the
    // final report AND the copied summary, without affecting the
    // compatibility score; persistence restores it across refresh and
    // SPA navigate-away-and-back ──
    {
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        permissions: ['clipboard-read', 'clipboard-write'],
      });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await freshAssembly(page);
      await page.locator('[data-testid="assembly-drone-type-freestyle"]').click();
      await waitForStage(page, 2, 'اختيار الحجم');
      await page.locator('[data-testid="assembly-size-5"]').click();
      await clickNext(page);
      await waitForStage(page, 3, 'اختيار نظام الفيديو (VTX)');
      await page.locator('text=DJI O4 Air Unit', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 4, 'اختيار فولتية البطارية');
      await page.locator('[data-testid="assembly-battery-voltage-6s"]').click();
      await clickNext(page);
      await waitForStage(page, 5, 'اختيار الإطار (Frame)');
      await page.locator('text=AOS 5 EVO V1.2 Frame Kit', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 6, 'اختيار المحركات (Motors)');
      await page.locator('text=iFlight XING2 2207 1750KV', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 7, 'اختيار الـESC');
      await page.locator('text=T-Motor F55A Pro II 55A 4-in-1 ESC', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 8, 'اختيار الـFlight Controller');
      await page.locator('text=SpeedyBee F405 V4 Flight Controller / Stack', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 9, 'اختيار الـReceiver');
      await page.locator('text=RadioMaster RP1 V2 ExpressLRS 2.4GHz Nano Receiver', { exact: true }).first().click();
      await clickNext(page);

      await waitForStage(page, 10, 'اختيار GPS (اختياري)');
      const gpsName = 'HGLRC M100 Mini GPS';
      await page.locator(`text=${gpsName}`, { exact: true }).first().click();
      ok('a real GPS module is genuinely selectable (Next enabled)', await page.locator('button', { hasText: 'التالي' }).isEnabled());
      await clickNext(page);

      await waitForStage(page, 11, 'اختيار الـBuzzer');
      await page.locator('text=Generic 5V Active Buzzer', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 12, 'اختيار الـCapacitor');
      await page.locator('text=Low ESR Capacitor 1000uF 35V (Rubycon/Panasonic/Nichicon equivalent)', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 13, 'اختيار المراوح (Props)');
      await page.locator('text=HQProp ETHiX S5 5x4x3', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 14, 'اختيار البطارية (LiPo)');
      await page.locator('text=GNB 1100mAh 6S 120C XT60', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 15, 'تجهيز الأدوات');
      await page.locator('text=Starter FPV Tool Kit', { exact: true }).first().click();
      await clickNext(page);

      await waitForFinalReport(page);
      ok('the selected GPS module appears in the final "القطع المختارة" selected-parts summary', (await page.locator('text=القطع المختارة').locator('..').textContent() ?? '').includes(gpsName));
      // buildCompatibilityReport only ever runs the 4 frame/motor/esc/battery/
      // propeller checks — GPS was never wired into any of them, so its
      // presence cannot change scorePercent at all; 100% here proves that,
      // not merely that the other 4 parts happen to be compatible.
      ok('a fully-selected, genuinely-compatible build (GPS included) still reaches 100% — GPS is not itself a compatibility-report item', await page.locator('text=100%').count() === 1);

      await page.locator('button', { hasText: 'نسخ ملخص البناء' }).click();
      const copiedText = await page.evaluate(() => navigator.clipboard.readText());
      ok('the copied build summary genuinely includes the selected GPS module\'s real name', copiedText.includes(gpsName));
      ok('the copied build summary labels it under the real "GPS" category label', copiedText.includes('GPS:'));

      // Persistence (Phase 2 mechanism, unmodified): GPS survives a hard
      // refresh and an SPA navigate-away-and-back, same as any other part.
      await page.reload({ waitUntil: 'networkidle' });
      await waitForFinalReport(page);
      ok('after a full page refresh, the GPS module still appears in the restored final report', await page.locator(`text=${gpsName}`).count() >= 1);

      await page.locator('button, a', { hasText: 'الرئيسية' }).first().click();
      await page.waitForTimeout(200);
      await page.locator('button, a', { hasText: 'التجميع' }).first().click();
      await waitForFinalReport(page);
      ok('after navigating away and back (SPA route change, not a reload), the GPS module still appears in the restored final report', await page.locator(`text=${gpsName}`).count() >= 1);

      await ctx.close();
    }
    {
      // Skipping GPS entirely must still work end-to-end — GPS remains the
      // one genuinely optional category.
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await freshAssembly(page);
      await page.locator('[data-testid="assembly-drone-type-freestyle"]').click();
      await waitForStage(page, 2, 'اختيار الحجم');
      await page.locator('[data-testid="assembly-size-5"]').click();
      await clickNext(page);
      await waitForStage(page, 3, 'اختيار نظام الفيديو (VTX)');
      await page.locator('text=DJI O4 Air Unit', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 4, 'اختيار فولتية البطارية');
      await page.locator('[data-testid="assembly-battery-voltage-6s"]').click();
      await clickNext(page);
      await waitForStage(page, 5, 'اختيار الإطار (Frame)');
      await page.locator('text=AOS 5 EVO V1.2 Frame Kit', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 6, 'اختيار المحركات (Motors)');
      await page.locator('text=iFlight XING2 2207 1750KV', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 7, 'اختيار الـESC');
      await page.locator('text=T-Motor F55A Pro II 55A 4-in-1 ESC', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 8, 'اختيار الـFlight Controller');
      await page.locator('text=SpeedyBee F405 V4 Flight Controller / Stack', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 9, 'اختيار الـReceiver');
      await page.locator('text=RadioMaster RP1 V2 ExpressLRS 2.4GHz Nano Receiver', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 10, 'اختيار GPS (اختياري)');
      await clickNext(page); // skip entirely, no selection
      await waitForStage(page, 11, 'اختيار الـBuzzer');
      await page.locator('text=Generic 5V Active Buzzer', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 12, 'اختيار الـCapacitor');
      await page.locator('text=Low ESR Capacitor 1000uF 35V (Rubycon/Panasonic/Nichicon equivalent)', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 13, 'اختيار المراوح (Props)');
      await page.locator('text=HQProp ETHiX S5 5x4x3', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 14, 'اختيار البطارية (LiPo)');
      await page.locator('text=GNB 1100mAh 6S 120C XT60', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 15, 'تجهيز الأدوات');
      await page.locator('text=Starter FPV Tool Kit', { exact: true }).first().click();
      await clickNext(page);
      await waitForFinalReport(page);
      ok('a build that entirely skips GPS still reaches the final report and 100% (identical score with or without GPS)', await page.locator('text=100%').count() === 1);
      ok('no GPS row appears anywhere in the selected-parts summary when it was skipped', await page.locator('text=GPS').count() === 0);

      await ctx.close();
    }

    // ── [6] Responsive + runtime checks across three viewports ──
    for (const [label, width, height] of [
      ['mobile', 390, 844],
      ['tablet', 768, 1024],
      ['desktop', 1440, 900],
    ] as const) {
      const ctx = await browser.newContext({ viewport: { width, height } });
      const page = await ctx.newPage();
      const localErrors: string[] = [];
      page.on('console', m => { if (m.type() === 'error') localErrors.push(m.text()); });
      page.on('pageerror', e => localErrors.push(String(e)));

      await freshAssembly(page);
      let hasOverflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok(`[${label}] no horizontal overflow on the drone-type screen`, !hasOverflowX);

      await page.locator('[data-testid="assembly-drone-type-long-range"]').click();
      await waitForStage(page, 2, 'اختيار الحجم');
      await page.locator('[data-testid="assembly-size-7"]').click();
      await clickNext(page);
      await waitForStage(page, 3, 'اختيار نظام الفيديو (VTX)');
      hasOverflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok(`[${label}] no horizontal overflow on a part-card stage`, !hasOverflowX);

      await page.locator('text=TBS Unify Pro32 HV MMCX', { exact: true }).first().click();
      await clickNext(page);
      await waitForStage(page, 4, 'اختيار فولتية البطارية');
      hasOverflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok(`[${label}] no horizontal overflow on the battery-voltage stage (with the new info block)`, !hasOverflowX);

      // Bottom-nav clearance: the real "التالي" button must not be visually
      // covered by the fixed bottom-nav bar once scrolled to true max.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const nextBtn = page.locator('button', { hasText: 'التالي' });
      const nextBox = await nextBtn.boundingBox();
      const navBox = await page.locator('nav').first().boundingBox();
      ok(`[${label}] the Next button is not covered by the fixed bottom-nav bar at max scroll`,
        !!nextBox && !!navBox ? nextBox.y + nextBox.height <= navBox.y + 1 : true);

      ok(`[${label}] no unexpected console error occurred (ignoring known sandbox network errors)`,
        localErrors.every(e => /firestore|ERR_CONNECTION_RESET|ERR_TUNNEL_CONNECTION_FAILED/i.test(e)));

      await ctx.close();
    }

    ok('no unexpected browser console error was raised across all scenarios (ignoring known sandbox network errors)',
      consoleErrors.every(e => /firestore|ERR_CONNECTION_RESET|ERR_TUNNEL_CONNECTION_FAILED/i.test(e)));

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

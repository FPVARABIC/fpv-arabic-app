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

async function freshAssembly(page: Page) {
  await page.goto(`${BASE}/assembly`, { waitUntil: 'networkidle' });
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
      for (const [id, label] of [
        ['assembly-drone-type-freestyle', 'Freestyle'],
        ['assembly-drone-type-cinematic', 'Cinematic'],
        ['assembly-drone-type-racing', 'سباقات'],
        ['assembly-drone-type-long-range', 'مدى طويل'],
      ] as const) {
        await freshAssembly(page);
        await page.locator(`[data-testid="${id}"]`).click();
        await waitForStage(page, 2, 'اختيار الحجم');
        ok(`selecting ${label} opens the build wizard at stage 2 (size)`, true);
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

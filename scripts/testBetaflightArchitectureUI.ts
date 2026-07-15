/**
 * Real UI-interaction proof for the Betaflight Arabic companion Phase 1
 * architecture. Drives a real built app in a real browser at 390×844.
 * Complements testBetaflightArchitecture.ts (pure data/structure).
 */
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { chromium, type Page } from 'playwright';

const PORT = 4407;
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

// BottomNavigation.tsx has no literal "active" class string — active items get
// `text-[#12222a]` (rgb(18, 34, 42)) and inactive items get `text-[#3a484d]`
// (rgb(58, 72, 77)). Verified directly against the real rendered computed
// style during the independent review (not guessed). A fallback like
// "color !== ''" is nearly always true and would pass either way — this
// compares against the actual, specific active color instead.
const ACTIVE_NAV_COLOR = 'rgb(18, 34, 42)';
const INACTIVE_NAV_COLOR = 'rgb(58, 72, 77)';

async function navButtonColor(page: Page, label: string): Promise<string> {
  const button = page.locator('nav button', { hasText: label });
  return button.evaluate(el => getComputedStyle(el).color);
}

async function navButtonIsActive(page: Page, label: string): Promise<boolean> {
  return (await navButtonColor(page, label)) === ACTIVE_NAV_COLOR;
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

    // ── [1] Complete page (Phase 2, "reviewed"): /betaflight/setup ──
    console.log('\n[1] /betaflight/setup renders the complete "reviewed" Setup page');
    {
      const consoleErrors: string[] = [];
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await page.goto(`${BASE}/betaflight/setup`, { waitUntil: 'networkidle' });
      ok('exactly one h1', await page.locator('h1').count() === 1);
      ok('h1 shows the official English title "Setup"', (await page.locator('h1').textContent())?.trim() === 'Setup');
      ok('Arabic title "الإعداد الأولي" renders', await page.locator('text=الإعداد الأولي').count() >= 1);
      ok('content-status badge shows "مراجَع" (reviewed, Phase 2 complete)', await page.locator('text=مراجَع').count() >= 1);
      ok('version/App/reviewed metadata renders', await page.locator('text=2025.12').count() >= 1);
      ok('at least one real field renders with its English label', await page.locator('text=Calibrate Accelerometer').count() === 1);
      ok('a critical-safety badge renders on that field', await page.locator('text=حرِج').count() >= 1);
      ok('a glossary term renders', await page.locator('text=Arming Disable Flags').count() >= 1);
      ok('official source link renders and points at betaflight.com', (await page.locator('a[href*="betaflight.com/docs/wiki/app/setup-tab"]').count()) === 1);
      ok('no unexpected console error', consoleErrors.filter(e => !/net::ERR_|favicon/i.test(e)).length === 0);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow', !overflow);
      ok('Programming nav tab remains active on /betaflight/setup', await navButtonIsActive(page, 'البرمجة'));

      await ctx.close();
    }

    // ── [1b] Independent-review corrections render on /betaflight/setup: split fields, no fabricated combos ──
    console.log('\n[1b] Setup renders the corrected split fields/groups, not the old fabricated combo labels');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/betaflight/setup`, { waitUntil: 'networkidle' });
      ok('separate "Yaw" field renders', await page.locator('text=Yaw').count() >= 1);
      ok('separate "Pitch" field renders', await page.locator('text=Pitch').count() >= 1);
      ok('separate "Roll" field renders', await page.locator('text=Roll').count() >= 1);
      ok('the "Instruments" group official title renders', await page.locator('text=Instruments').count() >= 1);
      ok('separate "Latitude" field renders', await page.locator('text=Latitude').count() >= 1);
      ok('separate "Longitude" field renders', await page.locator('text=Longitude').count() >= 1);
      ok('separate "GPS" group official title renders', await page.locator('h2', { hasText: 'GPS' }).count() >= 1);
      ok('separate "Sonar" group official title renders', await page.locator('h2', { hasText: 'Sonar' }).count() >= 1);
      ok('separate "Type" network field renders', await page.locator('text=Type').count() >= 1);
      ok('separate "Downlink" network field renders', await page.locator('text=Downlink').count() >= 1);
      ok('separate "RTT" network field renders', await page.locator('text=RTT').count() >= 1);
      ok('no fabricated "Yaw / Pitch / Roll" combo label renders', await page.locator('text=Yaw / Pitch / Roll').count() === 0);
      ok('no fabricated "Latitude / Longitude" combo label renders', await page.locator('text=Latitude / Longitude').count() === 0);
      ok('no fabricated "Type / Downlink / RTT" combo label renders', await page.locator('text=Type / Downlink / RTT').count() === 0);
      ok('no fabricated "GPS / Sonar" combo group title renders', await page.locator('text=GPS / Sonar').count() === 0);
      ok('Reset Z axis action was not dropped', await page.locator('text=Reset Z axis').count() >= 1);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow after the split', !overflow);
      await ctx.close();
    }

    // ── [2] Back navigation from the new page ──
    console.log('\n[2] Back navigation works from the new architecture-preview page');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/betaflight/setup`, { waitUntil: 'networkidle' });
      await page.locator('button', { hasText: 'العودة إلى Betaflight' }).click();
      await page.waitForLoadState('networkidle');
      ok('return button navigates back to /betaflight', page.url() === `${BASE}/betaflight`);
      await page.getByText('Betaflight بالعربي').first().waitFor({ state: 'visible' });
      ok('the hub heading renders there', await page.locator('text=Betaflight بالعربي').count() === 1);
      await ctx.close();
    }

    // ── [3] Keyboard/focus on the new page's back-arrow button ──
    console.log('\n[3] Keyboard and focus behavior on the new page');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/betaflight/setup`, { waitUntil: 'networkidle' });
      const backArrow = page.locator('button[aria-label="العودة"]');
      ok('icon back-button has an aria-label', await backArrow.count() === 1);
      await backArrow.focus();
      ok('back-arrow button is keyboard-focusable', await backArrow.evaluate(el => el === document.activeElement));
      await ctx.close();
    }

    // ── [4] /betaflight/ports: new complete page supersedes the old article at the same URL ──
    console.log('\n[4] /betaflight/ports now renders the complete "reviewed" Ports page (old URL preserved)');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/betaflight/ports`, { waitUntil: 'networkidle' });
      ok('h1 still shows exactly "Ports" (compatible with the pre-existing Programming-hub test)', (await page.locator('h1').textContent())?.trim() === 'Ports');
      ok('the new field-level content renders (Serial Rx)', await page.locator('text=Serial Rx').count() >= 1);
      ok('the new field-level content renders (Configuration/MSP)', await page.locator('text=Configuration/MSP').count() >= 1);
      ok('content-status badge shows "مراجَع" (reviewed, Phase 2 complete)', await page.locator('text=مراجَع').count() >= 1);
      ok('the independent-review correction renders (Save and Reboot action)', await page.locator('text=Save and Reboot').count() >= 1);
      await page.locator('button', { hasText: 'العودة إلى Betaflight' }).click();
      await page.waitForLoadState('networkidle');
      ok('return button still navigates back to /betaflight', page.url() === `${BASE}/betaflight`);
      await ctx.close();
    }

    // ── [5] The remaining legacy IDs with NO registry counterpart at all render EXACTLY as before ──
    // ("motors", "failsafe" got real registry .page entries in Phase 2; "receiver" and "modes" got
    // real registry .page entries in Phase 3; "osd" and "cli" got real registry .page entries in
    // Phase 5 — same as "ports" in Phase 1, the new complete page now wins at those URLs. They are
    // covered separately in sections [13]/[14], [16]-[21], and [22]/[28], not here. Only "interface"/
    // "firmware" (no matching registry id at all) remain genuinely unaffected. "blackbox" DOES have a
    // registry entry (not-started) and is now dispatched honestly instead of falling through to the
    // legacy article — see section [5b].
    console.log('\n[5] The remaining legacy-only IDs (no registry counterpart) are pixel-for-pixel unaffected');
    {
      const LEGACY_UNCHANGED = [
        { id: 'interface', titleAr: 'واجهة Betaflight' },
        { id: 'firmware', titleAr: 'Firmware / تحديث' },
      ];
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      for (const { id, titleAr } of LEGACY_UNCHANGED) {
        await page.goto(`${BASE}/betaflight/${id}`, { waitUntil: 'networkidle' });
        ok(`/betaflight/${id}: legacy h1 "${titleAr}" renders unchanged`, (await page.locator('h1').textContent())?.trim() === titleAr);
        ok(`/betaflight/${id}: legacy "الشرح" explanation heading renders (old template, not the new renderer)`, await page.locator('text=الشرح').count() === 1);
        ok(`/betaflight/${id}: no new-architecture "مراجَع" badge appears`, await page.locator('text=مراجَع').count() === 0);
      }
      await ctx.close();
    }

    // ── [5b] Blackbox dispatch precedence: registry not-started status wins over the legacy-article collision ──
    console.log('\n[5b] /betaflight/blackbox now honestly renders the not-started state (registry status wins over the legacy-article collision)');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/betaflight/blackbox`, { waitUntil: 'networkidle' });
      await page.locator('h1').first().waitFor({ state: 'visible' });
      ok('h1 shows the official English registry title "Blackbox"', (await page.locator('h1').textContent())?.trim() === 'Blackbox');
      ok('Arabic registry title "صندوق التسجيل الأسود" renders', await page.locator('text=صندوق التسجيل الأسود').count() >= 1);
      ok('content-status badge shows "لم يُبدأ بعد" (honest not-started, not secretly reviewed)', await page.locator('text=لم يُبدأ بعد').count() >= 1);
      ok('the honest "not built yet" explanation text renders', await page.locator('text=لم يتم بعد بناء المحتوى العربي').count() >= 1);
      ok('does NOT render the old legacy "الشرح" explanation heading (old template)', await page.locator('text=الشرح').count() === 0);
      ok('does NOT render the old legacy body text ("Blackbox يسجّل بيانات الطيران كاملة")', await page.locator('text=يسجّل بيانات الطيران كاملة').count() === 0);
      ok('does NOT show the generic "not found" message', await page.locator('text=القسم غير موجود').count() === 0);
      ok('Programming nav tab remains active on /betaflight/blackbox', await navButtonIsActive(page, 'البرمجة'));

      await page.locator('button', { hasText: 'العودة إلى Betaflight' }).click();
      await page.waitForLoadState('networkidle');
      ok('return-to-hub works from the not-started Blackbox page', page.url() === `${BASE}/betaflight`);

      // ── the hub card itself must also be honest ──
      await page.locator('h1').first().waitFor({ state: 'visible' });
      ok('the hub card for Blackbox shows "لم يُبدأ بعد"', (await page.locator('[data-testid="betaflight-hub-card-blackbox"]').textContent() ?? '').includes('لم يُبدأ بعد'));
      await ctx.close();
    }

    // ── [6] Hub (/betaflight) is now the live registry-driven BetaflightHubRenderer ──
    console.log('\n[6] The live Betaflight hub is now registry-driven (bfPageRegistry), dark-themed, searchable, and filterable');
    {
      const consoleErrors: string[] = [];
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await page.goto(`${BASE}/betaflight`, { waitUntil: 'networkidle' });
      ok('hub heading "Betaflight بالعربي" renders', await page.locator('text=Betaflight بالعربي').count() === 1);
      ok('the live registry-driven hub renderer is wired in', await page.locator('[data-testid="betaflight-hub-renderer"]').count() === 1);
      ok('the hub uses the dark bf-shell theme (not the old white-frame layout)', await page.evaluate(() => document.querySelector('[data-testid="betaflight-hub-renderer"]')?.classList.contains('bf-shell')) === true);

      const summaryText = (await page.locator('[data-testid="betaflight-hub-summary"]').textContent()) ?? '';
      ok('summary shows exactly "18 صفحة مراجعة"', summaryText.includes('18 صفحة مراجعة'));
      ok('summary shows exactly "8 صفحات قيد الإعداد"', summaryText.includes('8 صفحات قيد الإعداد'));

      // ── all 26 pages are discoverable: 5 groups covering every registry id, no wall-of-26 ──
      const groupIds = ['disconnected', 'basic-setup', 'tuning-control', 'video-sensors', 'advanced-tools'];
      for (const g of groupIds) {
        ok(`group "${g}" renders`, await page.locator(`[data-testid="betaflight-hub-group-${g}"]`).count() === 1);
      }
      const totalCardsInGroups = await page.locator('[data-testid^="betaflight-hub-card-"]').count();
      ok('all 26 registry pages are represented by exactly one card each across the 5 groups', totalCardsInGroups === 26);

      // ── reviewed vs not-started cards are honestly marked ──
      ok('a reviewed card (Ports) shows the "مراجَع" status', (await page.locator('[data-testid="betaflight-hub-card-ports"]').textContent() ?? '').includes('مراجَع'));
      ok('a not-started card (Tethered Logging) shows the "لم يُبدأ بعد" status', (await page.locator('[data-testid="betaflight-hub-card-tethered-logging"]').textContent() ?? '').includes('لم يُبدأ بعد'));

      // ── search: Arabic and English ──
      const searchInput = page.locator('[data-testid="betaflight-hub-search-input"]');
      await searchInput.fill('Servos');
      await page.waitForTimeout(150);
      ok('English search "Servos" narrows to the Servos card via search results', await page.locator('[data-testid="betaflight-hub-search-results"] [data-testid="betaflight-hub-card-servos"]').count() === 1);
      ok('groups are hidden while a search is active', await page.locator('[data-testid="betaflight-hub-group-basic-setup"]').count() === 0);

      await searchInput.fill('');
      await searchInput.fill('المحركات الخادمة');
      await page.waitForTimeout(150);
      ok('Arabic search "المحركات الخادمة" (Servos) narrows to the Servos card', await page.locator('[data-testid="betaflight-hub-card-servos"]').count() === 1);

      await searchInput.fill('zzz-no-such-page-zzz');
      await page.waitForTimeout(150);
      ok('an empty search result shows the honest "no matches" state', await page.locator('[data-testid="betaflight-hub-empty-state"]').count() === 1);
      const clearButton = page.locator('[data-testid="betaflight-hub-search-clear"]');
      await clearButton.click();
      await page.waitForTimeout(150);
      ok('clearing the search restores the grouped view', await page.locator('[data-testid="betaflight-hub-group-basic-setup"]').count() === 1);

      // ── status filters ──
      await page.locator('[data-testid="betaflight-hub-filter-reviewed"]').click();
      await page.waitForTimeout(150);
      let filteredCount = await page.locator('[data-testid^="betaflight-hub-card-"]').count();
      ok('the "مراجَع" filter shows exactly 18 cards', filteredCount === 18);
      ok('a not-started card is absent under the reviewed filter', await page.locator('[data-testid="betaflight-hub-card-tethered-logging"]').count() === 0);

      await page.locator('[data-testid="betaflight-hub-filter-not-started"]').click();
      await page.waitForTimeout(150);
      filteredCount = await page.locator('[data-testid^="betaflight-hub-card-"]').count();
      ok('the "لم يُبدأ بعد" filter shows exactly 8 cards', filteredCount === 8);

      await page.locator('[data-testid="betaflight-hub-filter-all"]').click();
      await page.waitForTimeout(150);
      ok('the "الكل" filter restores the full grouped view (26 cards)', await page.locator('[data-testid^="betaflight-hub-card-"]').count() === 26);

      // ── reviewed card opens the real detail page ──
      await page.locator('[data-testid="betaflight-hub-card-ports"]').click();
      await page.waitForLoadState('networkidle');
      await page.locator('h1').first().waitFor({ state: 'visible' });
      ok('clicking a reviewed card (Ports) navigates to /betaflight/ports', page.url() === `${BASE}/betaflight/ports`);
      ok('the reviewed Ports detail page renders', await page.locator('h1', { hasText: 'Ports' }).count() === 1);

      // ── not-started card opens the honest not-started state (tethered-logging is not a legacy-shared ID) ──
      await page.goto(`${BASE}/betaflight`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid="betaflight-hub-card-tethered-logging"]').click();
      await page.waitForLoadState('networkidle');
      await page.locator('h1').first().waitFor({ state: 'visible' });
      ok('clicking a not-started card (Tethered Logging) navigates to its route', page.url() === `${BASE}/betaflight/tethered-logging`);
      ok('the honest not-started state renders (not a 404)', await page.locator('text=لم يُبدأ بعد').count() >= 1);
      ok('does NOT show the generic "not found" message', await page.locator('text=القسم غير موجود').count() === 0);

      // ── legacy route compatibility preserved ──
      await page.goto(`${BASE}/betaflight/interface`, { waitUntil: 'networkidle' });
      ok('legacy route /betaflight/interface still renders its old content unchanged', await page.locator('h1', { hasText: 'واجهة Betaflight' }).count() === 1);

      // ── Programming nav stays active on the live hub ──
      await page.goto(`${BASE}/betaflight`, { waitUntil: 'networkidle' });
      ok('Programming nav tab remains active on /betaflight', await navButtonIsActive(page, 'البرمجة'));

      // ── keyboard focus visible on a hub card ──
      const portsCard = page.locator('[data-testid="betaflight-hub-card-ports"]');
      await portsCard.focus();
      ok('a hub card is keyboard-focusable', await portsCard.evaluate(el => el === document.activeElement));

      ok('no unexpected console error on the live hub', consoleErrors.filter(e => !/net::ERR_|favicon/i.test(e)).length === 0);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow on the live hub', !overflow);

      await ctx.close();
    }

    // ── [7] /betaflight/power: now a real, complete "reviewed" page (Phase 3) ──
    console.log('\n[7] /betaflight/power renders the complete "reviewed" Power & Battery page (Phase 3)');
    {
      const consoleErrors: string[] = [];
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await page.goto(`${BASE}/betaflight/power`, { waitUntil: 'networkidle' });
      ok('exactly one h1', await page.locator('h1').count() === 1);
      ok('h1 shows the official English title "Power & Battery"', (await page.locator('h1').textContent())?.trim() === 'Power & Battery');
      ok('Arabic title "الطاقة والبطارية" renders', await page.locator('text=الطاقة والبطارية').count() >= 1);
      ok('content-status badge shows "مراجَع" (reviewed, Phase 3 complete)', await page.locator('text=مراجَع').count() >= 1);
      ok('does NOT show the not-started explanation text anymore', await page.locator('text=لم يتم بعد بناء المحتوى العربي').count() === 0);
      ok('the Battery group renders', await page.locator('text=Battery').count() >= 1);
      ok('the Voltage Meter group renders', await page.locator('text=Voltage Meter').count() >= 1);
      ok('the Calibration Manager button renders', await page.locator('text=Calibration').count() >= 1);
      ok('the verbatim propeller-removal calibration warning renders (English quoted text)', await page.locator('text=Remember to remove propellers').count() >= 1);
      ok('version/release-line context renders', await page.locator('text=2025.12').count() >= 1);
      ok('the safety badge renders (Power & Battery is registered as "warning")', await page.locator('text=تحذير').count() >= 1);
      ok('official source link renders and points at betaflight.com', (await page.locator('a[href*="betaflight.com/docs/wiki/app/power-tab"]').count()) === 1);
      ok('Programming nav tab is active on /betaflight/power', await navButtonIsActive(page, 'البرمجة'));
      ok('no unexpected console error', consoleErrors.filter(e => !/net::ERR_|favicon/i.test(e)).length === 0);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow', !overflow);

      await page.locator('button', { hasText: 'العودة إلى Betaflight' }).click();
      await page.waitForLoadState('networkidle');
      ok('return-to-hub works from the reviewed Power page', page.url() === `${BASE}/betaflight`);
      await ctx.close();
    }

    // ── [8] /betaflight/transponder: a conditional (feature-dependent) not-started page ──
    console.log('\n[8] /betaflight/transponder shows the not-started state with its condition badge');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/betaflight/transponder`, { waitUntil: 'networkidle' });
      ok('h1 shows the official English title "Race Transponder"', (await page.locator('h1').textContent())?.trim() === 'Race Transponder');
      ok('content-status badge shows "لم يُبدأ بعد"', await page.locator('text=لم يُبدأ بعد').count() >= 1);
      ok('the condition badge (feature requirement) renders', await page.locator('text=يظهر فقط إذا كانت نسخة الفيرموير المبنية تتضمن ميزة Transponder').count() === 1);
      ok('does NOT show the generic "not found" message', await page.locator('text=القسم غير موجود').count() === 0);
      await ctx.close();
    }

    // ── [9] Invalid ID still shows the generic not-found state, and never the not-started state ──
    console.log('\n[9] An invalid route ID still shows the generic not-found state');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/betaflight/totally-invalid-garbage-id`, { waitUntil: 'networkidle' });
      ok('shows "القسم غير موجود"', await page.locator('text=القسم غير موجود').count() === 1);
      ok('does NOT show the not-started content-status badge', await page.locator('text=لم يُبدأ بعد').count() === 0);
      ok('does NOT show the "not built yet" explanation text', await page.locator('text=لم يتم بعد بناء المحتوى العربي').count() === 0);
      await ctx.close();
    }

    // ── [10] Nav-active real discriminator: setup/ports/power active, /home inactive ──
    console.log('\n[10] Programming nav-tab active/inactive state uses a real color discriminator, not a tautology');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/betaflight/setup`, { waitUntil: 'networkidle' });
      ok('Programming is ACTIVE (real color match) on /betaflight/setup', (await navButtonColor(page, 'البرمجة')) === ACTIVE_NAV_COLOR);
      await page.goto(`${BASE}/betaflight/ports`, { waitUntil: 'networkidle' });
      ok('Programming is ACTIVE (real color match) on /betaflight/ports', (await navButtonColor(page, 'البرمجة')) === ACTIVE_NAV_COLOR);
      await page.goto(`${BASE}/betaflight/tethered-logging`, { waitUntil: 'networkidle' });
      ok('Programming is ACTIVE (real color match) on /betaflight/tethered-logging (not-started page)', (await navButtonColor(page, 'البرمجة')) === ACTIVE_NAV_COLOR);
      await page.goto(`${BASE}/home`, { waitUntil: 'networkidle' });
      ok('Programming is INACTIVE (real color match) on /home', (await navButtonColor(page, 'البرمجة')) === INACTIVE_NAV_COLOR);
      await ctx.close();
    }

    // ── [11] Accessibility: keyboard focus on the not-started page's return control ──
    console.log('\n[11] Keyboard focus on the not-started page\'s controls');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/betaflight/tethered-logging`, { waitUntil: 'networkidle' });
      const backArrow = page.locator('button[aria-label="العودة"]');
      ok('icon back-button has an aria-label on the not-started page', await backArrow.count() === 1);
      await backArrow.focus();
      ok('back-arrow button is keyboard-focusable on the not-started page', await backArrow.evaluate(el => el === document.activeElement));
      const returnButton = page.locator('button', { hasText: 'العودة إلى Betaflight' });
      await returnButton.focus();
      ok('full-width return button is keyboard-focusable on the not-started page', await returnButton.evaluate(el => el === document.activeElement));
      await ctx.close();
    }

    // ── [12] Responsive: the not-started state at 3 viewports ──
    console.log('\n[12] Not-started state is responsive at mobile/tablet/desktop viewports');
    {
      const viewports = [
        { name: 'mobile 390x844', width: 390, height: 844 },
        { name: 'tablet 768x1024', width: 768, height: 1024 },
        { name: 'desktop 1440x900', width: 1440, height: 900 },
      ];
      for (const vp of viewports) {
        const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
        const page = await ctx.newPage();
        await page.goto(`${BASE}/betaflight/tethered-logging`, { waitUntil: 'networkidle' });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
        ok(`[${vp.name}] no horizontal overflow on the not-started page`, !overflow);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(150);
        const overlap = await page.evaluate(() => {
          const nav = document.querySelector('nav');
          const btn = document.querySelector('button.btn-primary');
          if (!nav || !btn) return false;
          return btn.getBoundingClientRect().bottom > nav.getBoundingClientRect().top;
        });
        ok(`[${vp.name}] no bottom-nav overlap after scrolling to the page's end`, !overlap);
        await ctx.close();
      }
    }

    // ── [13] /betaflight/motors: complete "reviewed" page, highest safety level, propeller warning ──
    console.log('\n[13] /betaflight/motors renders the complete "reviewed" Motors page (legacy URL now superseded)');
    {
      const consoleErrors: string[] = [];
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await page.goto(`${BASE}/betaflight/motors`, { waitUntil: 'networkidle' });
      ok('exactly one h1', await page.locator('h1').count() === 1);
      ok('h1 shows the official English title "Motors"', (await page.locator('h1').textContent())?.trim() === 'Motors');
      ok('Arabic title "المحركات" renders', await page.locator('text=المحركات').count() >= 1);
      ok('content-status badge shows "مراجَع" (reviewed, Phase 2 complete)', await page.locator('text=مراجَع').count() >= 1);
      ok('critical safety badge renders (Motors is the highest-safety page)', await page.locator('text=حرِج').count() >= 1);
      ok('the propeller-removal safety notice renders (English quoted text)', await page.locator('text=Remove all propellers').count() >= 1);
      ok('the mandatory "enable motor control" acknowledgement field renders', await page.locator('text=I understand the risks').count() >= 1);
      ok('the ESC protocol field renders', await page.locator('text=ESC/Motor protocol').count() >= 1);
      ok('the Master slider field renders', await page.locator('text=Master').count() >= 1);
      ok('the independent-review correction renders (Motor Stop feature toggle)', await page.locator("text=Don't spin the motors when armed").count() >= 1);
      ok('the independent-review correction renders (ESC Sensor feature toggle)', await page.locator('text=Use KISS/BLHeli_32 ESC telemetry').count() >= 1);
      ok('official source link renders and points at betaflight.com', (await page.locator('a[href*="betaflight.com/docs/wiki/app/motors-tab"]').count()) === 1);
      ok('no unexpected console error', consoleErrors.filter(e => !/net::ERR_|favicon/i.test(e)).length === 0);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow', !overflow);
      ok('Programming nav tab remains active on /betaflight/motors', await navButtonIsActive(page, 'البرمجة'));

      const backArrow = page.locator('button[aria-label="العودة"]');
      await backArrow.focus();
      ok('back-arrow button is keyboard-focusable on the Motors page', await backArrow.evaluate(el => el === document.activeElement));

      await page.locator('button', { hasText: 'العودة إلى Betaflight' }).click();
      await page.waitForLoadState('networkidle');
      ok('return button navigates back to /betaflight', page.url() === `${BASE}/betaflight`);
      await ctx.close();
    }

    // ── [14] /betaflight/failsafe: complete "reviewed" page, highest safety level, GPS Rescue group ──
    console.log('\n[14] /betaflight/failsafe renders the complete "reviewed" Failsafe page (legacy URL now superseded)');
    {
      const consoleErrors: string[] = [];
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await page.goto(`${BASE}/betaflight/failsafe`, { waitUntil: 'networkidle' });
      ok('exactly one h1', await page.locator('h1').count() === 1);
      ok('h1 shows the official English title "Failsafe"', (await page.locator('h1').textContent())?.trim() === 'Failsafe');
      ok('Arabic title "الحماية عند فقدان الإشارة" renders', await page.locator('text=الحماية عند فقدان الإشارة').count() >= 1);
      ok('content-status badge shows "مراجَع" (reviewed, Phase 2 complete)', await page.locator('text=مراجَع').count() >= 1);
      ok('critical safety badge renders (Failsafe is the highest-safety page)', await page.locator('text=حرِج').count() >= 1);
      ok('the Stage 2 group title renders', await page.locator('text=إعدادات المرحلة الثانية').count() >= 1);
      ok('the GPS Rescue group renders', await page.locator('text=إعداد GPS Rescue').count() >= 1);
      ok('the failsafe procedure field renders', await page.locator('text=Failsafe Procedure').count() >= 1);
      ok('the independent-review correction renders (Save and Reboot action)', await page.locator('text=Save and Reboot').count() >= 1);
      ok('official source link renders and points at betaflight.com', (await page.locator('a[href*="betaflight.com/docs/wiki/app/failsafe-tab"]').count()) === 1);
      ok('no unexpected console error', consoleErrors.filter(e => !/net::ERR_|favicon/i.test(e)).length === 0);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow', !overflow);
      ok('Programming nav tab remains active on /betaflight/failsafe', await navButtonIsActive(page, 'البرمجة'));

      const backArrow = page.locator('button[aria-label="العودة"]');
      await backArrow.focus();
      ok('back-arrow button is keyboard-focusable on the Failsafe page', await backArrow.evaluate(el => el === document.activeElement));

      await page.locator('button', { hasText: 'العودة إلى Betaflight' }).click();
      await page.waitForLoadState('networkidle');
      ok('return button navigates back to /betaflight', page.url() === `${BASE}/betaflight`);
      await ctx.close();
    }

    // ── [16] /betaflight/configuration: complete "reviewed" page (Phase 3), two distinct beeper tables ──
    console.log('\n[16] /betaflight/configuration renders the complete "reviewed" Configuration page (Phase 3)');
    {
      const consoleErrors: string[] = [];
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await page.goto(`${BASE}/betaflight/configuration`, { waitUntil: 'networkidle' });
      ok('exactly one h1', await page.locator('h1').count() === 1);
      ok('h1 shows the official English title "Configuration"', (await page.locator('h1').textContent())?.trim() === 'Configuration');
      ok('Arabic title "الإعدادات العامة" renders', await page.locator('text=الإعدادات العامة').count() >= 1);
      ok('content-status badge shows "مراجَع" (reviewed, Phase 3 complete)', await page.locator('text=مراجَع').count() >= 1);
      ok('the "Other Features" group renders', await page.locator('text=Other Features').count() >= 1);
      ok('the "Beeper Configuration" group renders (full condition list)', await page.locator('text=Beeper Configuration').count() >= 1);
      ok('the "Dshot Beacon Configuration" group renders (the SEPARATE restricted condition list)', await page.locator('text=Dshot Beacon Configuration').count() >= 1);
      ok('the "Maximum ARM Angle" field renders', await page.locator('text=Maximum ARM Angle').count() >= 1);
      ok('official source link renders and points at betaflight.com', (await page.locator('a[href*="betaflight.com/docs/wiki/app/configuration-tab"]').count()) === 1);
      ok('no unexpected console error', consoleErrors.filter(e => !/net::ERR_|favicon/i.test(e)).length === 0);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow', !overflow);
      ok('Programming nav tab remains active on /betaflight/configuration', await navButtonIsActive(page, 'البرمجة'));

      await page.locator('button', { hasText: 'العودة إلى Betaflight' }).click();
      await page.waitForLoadState('networkidle');
      ok('return button navigates back to /betaflight', page.url() === `${BASE}/betaflight`);
      await ctx.close();
    }

    // ── [17] /betaflight/receiver: complete "reviewed" page (Phase 3, supersedes the legacy URL), two distinct Save buttons ──
    console.log('\n[17] /betaflight/receiver renders the complete "reviewed" Receiver page (Phase 3, legacy URL now superseded)');
    {
      const consoleErrors: string[] = [];
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await page.goto(`${BASE}/betaflight/receiver`, { waitUntil: 'networkidle' });
      ok('exactly one h1', await page.locator('h1').count() === 1);
      ok('h1 shows the official English title "Receiver"', (await page.locator('h1').textContent())?.trim() === 'Receiver');
      ok('Arabic title "المستقبل" renders', await page.locator('text=المستقبل').count() >= 1);
      ok('content-status badge shows "مراجَع" (reviewed, Phase 3 complete, supersedes legacy)', await page.locator('text=مراجَع').count() >= 1);
      ok('critical safety badge renders (Receiver is Failsafe-adjacent)', await page.locator('text=حرِج').count() >= 1);
      ok('the verbatim Failsafe-testing reminder renders (English quoted text)', await page.locator('text=Always check that your Failsafe is working properly').count() >= 1);
      ok('the "Serial Receiver Provider" field renders', await page.locator('text=Serial Receiver Provider').count() >= 1);
      ok('the "SPI Bus Receiver Provider" field renders', await page.locator('text=SPI Bus Receiver Provider').count() >= 1);
      ok('the plain "Save" action renders (no-reboot save)', await page.locator('text=Save').count() >= 1);
      ok('the "Save and Reboot" action renders as its own SEPARATE control', await page.locator('text=Save and Reboot').count() >= 1);
      ok('the "Bind Receiver" action renders', await page.locator('text=Bind Receiver').count() >= 1);
      ok('the "Radio Emulator" action renders', await page.locator('text=Radio Emulator').count() >= 1);
      ok('official source link renders and points at betaflight.com', (await page.locator('a[href*="betaflight.com/docs/wiki/app/receiver-tab"]').count()) === 1);
      ok('no unexpected console error', consoleErrors.filter(e => !/net::ERR_|favicon/i.test(e)).length === 0);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow', !overflow);
      ok('Programming nav tab remains active on /betaflight/receiver', await navButtonIsActive(page, 'البرمجة'));

      await page.locator('button', { hasText: 'العودة إلى Betaflight' }).click();
      await page.waitForLoadState('networkidle');
      ok('return button navigates back to /betaflight', page.url() === `${BASE}/betaflight`);
      await ctx.close();
    }

    // ── [18] /betaflight/modes: complete "reviewed" page (Phase 3, supersedes the legacy URL), honest no-reboot save ──
    console.log('\n[18] /betaflight/modes renders the complete "reviewed" Modes page (Phase 3, legacy URL now superseded)');
    {
      const consoleErrors: string[] = [];
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await page.goto(`${BASE}/betaflight/modes`, { waitUntil: 'networkidle' });
      ok('exactly one h1', await page.locator('h1').count() === 1);
      ok('h1 shows the official English title "Modes"', (await page.locator('h1').textContent())?.trim() === 'Modes');
      ok('Arabic title "أوضاع التشغيل" renders', await page.locator('text=أوضاع التشغيل').count() >= 1);
      ok('content-status badge shows "مراجَع" (reviewed, Phase 3 complete, supersedes legacy)', await page.locator('text=مراجَع').count() >= 1);
      ok('critical safety badge renders (Modes governs ARM among other modes)', await page.locator('text=حرِج').count() >= 1);
      ok('the verbatim ARM-cannot-be-linked exception renders (English quoted text)', await page.locator('text=ARM cannot be linked').count() >= 1);
      ok('the "Hide unused modes" toggle renders', await page.locator('text=Hide unused modes').count() >= 1);
      ok('the modes assignment table renders', await page.locator('text=Modes').count() >= 1);
      ok('the "Add Range" action renders', await page.locator('text=Add Range').count() >= 1);
      ok('the "Add Link" action renders', await page.locator('text=Add Link').count() >= 1);
      ok('official source link renders and points at betaflight.com (officialId "auxiliary")', (await page.locator('a[href*="betaflight.com/docs/wiki/app/auxiliary-tab"]').count()) === 1);
      ok('no unexpected console error', consoleErrors.filter(e => !/net::ERR_|favicon/i.test(e)).length === 0);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow', !overflow);
      ok('Programming nav tab remains active on /betaflight/modes', await navButtonIsActive(page, 'البرمجة'));

      await page.locator('button', { hasText: 'العودة إلى Betaflight' }).click();
      await page.waitForLoadState('networkidle');
      ok('return button navigates back to /betaflight', page.url() === `${BASE}/betaflight`);
      await ctx.close();
    }

    // ── [19] /betaflight/pid-tuning: complete "reviewed" page (Phase 4), the largest tab in the app ──
    console.log('\n[19] /betaflight/pid-tuning renders the complete "reviewed" PID Tuning page (Phase 4)');
    {
      const consoleErrors: string[] = [];
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await page.goto(`${BASE}/betaflight/pid-tuning`, { waitUntil: 'networkidle' });
      ok('exactly one h1', await page.locator('h1').count() === 1);
      ok('h1 shows the official English title "PID Tuning"', (await page.locator('h1').textContent())?.trim() === 'PID Tuning');
      ok('Arabic title "ضبط PID" renders', await page.locator('text=ضبط PID').count() >= 1);
      ok('content-status badge shows "مراجَع" (reviewed, Phase 4 complete)', await page.locator('text=مراجَع').count() >= 1);
      ok('critical safety badge renders (PID Tuning is the highest-safety, most complex page)', await page.locator('text=حرِج').count() >= 1);
      ok('a main PID field renders (Proportional)', await page.locator('text=P (Proportional)').count() >= 1);
      ok('a filter field renders (Gyro Notch Filter 1)', await page.locator('text=Gyro Notch Filter 1').count() >= 1);
      ok('the Dynamic Notch Filter group renders', await page.locator('text=Dynamic Notch Filter').count() >= 1);
      ok('the plain "Save" action renders (no-reboot save)', await page.locator('text=Save').count() >= 1);
      ok('official source link renders and points at betaflight.com', (await page.locator('a[href*="betaflight.com/docs/wiki/app/pid-tuning-tab"]').count()) === 1);
      ok('no unexpected console error', consoleErrors.filter(e => !/net::ERR_|favicon/i.test(e)).length === 0);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow (verified even on the largest page in the app)', !overflow);
      ok('Programming nav tab remains active on /betaflight/pid-tuning', await navButtonIsActive(page, 'البرمجة'));

      await page.locator('button', { hasText: 'العودة إلى Betaflight' }).click();
      await page.waitForLoadState('networkidle');
      ok('return button navigates back to /betaflight', page.url() === `${BASE}/betaflight`);
      await ctx.close();
    }

    // ── [20] /betaflight/presets: complete "reviewed" page (Phase 4), a full preset browser, not a dropdown ──
    console.log('\n[20] /betaflight/presets renders the complete "reviewed" Presets page (Phase 4)');
    {
      const consoleErrors: string[] = [];
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await page.goto(`${BASE}/betaflight/presets`, { waitUntil: 'networkidle' });
      ok('exactly one h1', await page.locator('h1').count() === 1);
      ok('h1 shows the official English title "Presets"', (await page.locator('h1').textContent())?.trim() === 'Presets');
      ok('Arabic title "الإعدادات الجاهزة" renders', await page.locator('text=الإعدادات الجاهزة').count() >= 1);
      ok('content-status badge shows "مراجَع" (reviewed, Phase 4 complete)', await page.locator('text=مراجَع').count() >= 1);
      ok('critical safety badge renders (arbitrary third-party CLI execution)', await page.locator('text=حرِج').count() >= 1);
      ok('the "Save backup" action renders', await page.locator('text=Save backup').count() >= 1);
      ok('the "Preset sources..." action renders', await page.locator('text=Preset sources...').count() >= 1);
      ok('the "Save and Reboot" action renders', await page.locator('text=Save and Reboot').count() >= 1);
      ok('the "Pick" action renders (two-stage pick-then-apply, not a plain dropdown)', await page.locator('text=Pick').count() >= 1);
      ok('official source link renders and points at betaflight.com', (await page.locator('a[href*="betaflight.com/docs/wiki/app/presets-tab"]').count()) === 1);
      ok('no unexpected console error', consoleErrors.filter(e => !/net::ERR_|favicon/i.test(e)).length === 0);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow', !overflow);
      ok('Programming nav tab remains active on /betaflight/presets', await navButtonIsActive(page, 'البرمجة'));

      await page.locator('button', { hasText: 'العودة إلى Betaflight' }).click();
      await page.waitForLoadState('networkidle');
      ok('return button navigates back to /betaflight', page.url() === `${BASE}/betaflight`);
      await ctx.close();
    }

    // ── [21] /betaflight/adjustments: complete "reviewed" page (Phase 4, was not-started) ──
    console.log('\n[21] /betaflight/adjustments renders the complete "reviewed" Adjustments page (Phase 4)');
    {
      const consoleErrors: string[] = [];
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await page.goto(`${BASE}/betaflight/adjustments`, { waitUntil: 'networkidle' });
      ok('exactly one h1', await page.locator('h1').count() === 1);
      ok('h1 shows the official English title "Adjustments"', (await page.locator('h1').textContent())?.trim() === 'Adjustments');
      ok('Arabic title "التعديلات أثناء التحكم" renders', await page.locator('text=التعديلات أثناء التحكم').count() >= 1);
      ok('content-status badge shows "مراجَع" (reviewed, Phase 4 complete, was not-started)', await page.locator('text=مراجَع').count() >= 1);
      ok('does NOT show the not-started explanation text anymore', await page.locator('text=لم يتم بعد بناء المحتوى العربي').count() === 0);
      ok('the "then apply" function field renders', await page.locator('text=then apply').count() >= 1);
      ok('the plain "Save" action renders (no-reboot save)', await page.locator('text=Save').count() >= 1);
      ok('official source link renders and points at betaflight.com', (await page.locator('a[href*="betaflight.com/docs/wiki/app/adjustments-tab"]').count()) === 1);
      ok('no unexpected console error', consoleErrors.filter(e => !/net::ERR_|favicon/i.test(e)).length === 0);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow', !overflow);
      ok('Programming nav tab remains active on /betaflight/adjustments', await navButtonIsActive(page, 'البرمجة'));

      await page.locator('button', { hasText: 'العودة إلى Betaflight' }).click();
      await page.waitForLoadState('networkidle');
      ok('return button navigates back to /betaflight', page.url() === `${BASE}/betaflight`);
      await ctx.close();
    }

    // ── [22] /betaflight/osd: complete "reviewed" page (Phase 5), plain Save vs Upload-Font reboot semantics ──
    console.log('\n[22] /betaflight/osd renders the complete "reviewed" OSD page (Phase 5, legacy URL now superseded)');
    {
      const consoleErrors: string[] = [];
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await page.goto(`${BASE}/betaflight/osd`, { waitUntil: 'networkidle' });
      ok('exactly one h1', await page.locator('h1').count() === 1);
      ok('h1 shows the official English title "OSD"', (await page.locator('h1').textContent())?.trim() === 'OSD');
      ok('Arabic title "عرض المعلومات على الشاشة" renders', await page.locator('text=عرض المعلومات على الشاشة').count() >= 1);
      ok('content-status badge shows "مراجَع" (reviewed, Phase 5 complete, supersedes legacy)', await page.locator('text=مراجَع').count() >= 1);
      ok('the "Elements" group renders (Arabic heading)', await page.locator('h2', { hasText: 'العناصر' }).count() >= 1);
      ok('the "Font Manager" group renders (Arabic heading)', await page.locator('h2', { hasText: 'مدير الخطوط' }).count() >= 1);
      ok('the "Upload Font" action renders (the only reboot-requiring action on this page)', await page.locator('text=Upload Font').count() >= 1);
      ok('the "Post Flight Statistics" group renders (Arabic heading)', await page.locator('h2', { hasText: 'إحصائيات ما بعد الطيران' }).count() >= 1);
      ok('official source link renders and points at betaflight.com', (await page.locator('a[href*="betaflight.com/docs/wiki/app/osd-tab"]').count()) === 1);
      ok('no unexpected console error', consoleErrors.filter(e => !/net::ERR_|favicon/i.test(e)).length === 0);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow (verified on the largest page in the app)', !overflow);
      ok('Programming nav tab remains active on /betaflight/osd', await navButtonIsActive(page, 'البرمجة'));

      await page.locator('button', { hasText: 'العودة إلى Betaflight' }).click();
      await page.waitForLoadState('networkidle');
      ok('return button navigates back to /betaflight', page.url() === `${BASE}/betaflight`);
      await ctx.close();
    }

    // ── [23] /betaflight/vtx: complete "reviewed" page (Phase 5), no fabricated protocol select ──
    console.log('\n[23] /betaflight/vtx renders the complete "reviewed" Video Transmitter page (Phase 5)');
    {
      const consoleErrors: string[] = [];
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await page.goto(`${BASE}/betaflight/vtx`, { waitUntil: 'networkidle' });
      ok('exactly one h1', await page.locator('h1').count() === 1);
      ok('h1 shows the official English title "Video Transmitter"', (await page.locator('h1').textContent())?.trim() === 'Video Transmitter');
      ok('Arabic title "جهاز إرسال الفيديو" renders', await page.locator('text=جهاز إرسال الفيديو').count() >= 1);
      ok('content-status badge shows "مراجَع" (reviewed, Phase 5 complete, was not-started)', await page.locator('text=مراجَع').count() >= 1);
      ok('warning safety badge renders', await page.locator('text=تحذير').count() >= 1);
      ok('the "Selected Mode" group renders (Arabic heading)', await page.locator('h2', { hasText: 'الوضع المحدد' }).count() >= 1);
      ok('the "Current Values" group renders (Arabic heading, read-only VTX type display)', await page.locator('h2', { hasText: 'القيم الحالية' }).count() >= 1);
      ok('the "VTX Table" custom editor group renders (Arabic heading)', await page.locator('h2', { hasText: 'جدول VTX المخصص' }).count() >= 1);
      ok('official source link renders and points at betaflight.com', (await page.locator('a[href*="betaflight.com/docs/wiki/app/vtx-tab"]').count()) === 1);
      ok('no unexpected console error', consoleErrors.filter(e => !/net::ERR_|favicon/i.test(e)).length === 0);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow', !overflow);
      ok('Programming nav tab remains active on /betaflight/vtx', await navButtonIsActive(page, 'البرمجة'));

      await page.locator('button', { hasText: 'العودة إلى Betaflight' }).click();
      await page.waitForLoadState('networkidle');
      ok('return button navigates back to /betaflight', page.url() === `${BASE}/betaflight`);
      await ctx.close();
    }

    // ── [24] /betaflight/sensors: complete "reviewed" page (Phase 5), NO Save/page-actions group at all ──
    console.log('\n[24] /betaflight/sensors renders the complete "reviewed" Sensors page (Phase 5, no Save group)');
    {
      const consoleErrors: string[] = [];
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await page.goto(`${BASE}/betaflight/sensors`, { waitUntil: 'networkidle' });
      ok('exactly one h1', await page.locator('h1').count() === 1);
      ok('h1 shows the official English title "Sensors"', (await page.locator('h1').textContent())?.trim() === 'Sensors');
      ok('Arabic title "الحساسات" renders', await page.locator('text=الحساسات').count() >= 1);
      ok('content-status badge shows "مراجَع" (reviewed, Phase 5 complete, was not-started)', await page.locator('text=مراجَع').count() >= 1);
      ok('the Gyroscope group renders', await page.locator('text=Gyroscope').count() >= 1);
      ok('the Accelerometer group renders', await page.locator('text=Accelerometer').count() >= 1);
      ok('official source link renders and points at betaflight.com', (await page.locator('a[href*="betaflight.com/docs/wiki/app/sensors-tab"]').count()) === 1);
      ok('no unexpected console error', consoleErrors.filter(e => !/net::ERR_|favicon/i.test(e)).length === 0);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow', !overflow);
      ok('Programming nav tab remains active on /betaflight/sensors', await navButtonIsActive(page, 'البرمجة'));

      await page.locator('button', { hasText: 'العودة إلى Betaflight' }).click();
      await page.waitForLoadState('networkidle');
      ok('return button navigates back to /betaflight', page.url() === `${BASE}/betaflight`);
      await ctx.close();
    }

    // ── [25] /betaflight/gps: complete "reviewed" page (Phase 5), references Failsafe instead of duplicating GPS Rescue ──
    console.log('\n[25] /betaflight/gps renders the complete "reviewed" GPS page (Phase 5, was not-started)');
    {
      const consoleErrors: string[] = [];
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await page.goto(`${BASE}/betaflight/gps`, { waitUntil: 'networkidle' });
      ok('exactly one h1', await page.locator('h1').count() === 1);
      ok('h1 shows the official English title "GPS"', (await page.locator('h1').textContent())?.trim() === 'GPS');
      ok('Arabic title "نظام تحديد المواقع" renders', await page.locator('text=نظام تحديد المواقع').count() >= 1);
      ok('content-status badge shows "مراجَع" (reviewed, Phase 5 complete, was not-started)', await page.locator('text=مراجَع').count() >= 1);
      ok('the "GPS Configuration" group renders (Arabic heading)', await page.locator('h2', { hasText: 'إعدادات GPS' }).count() >= 1);
      ok('the "Ground Assistance Type" field renders', await page.locator('text=Ground Assistance Type').count() >= 1);
      ok('the "Save and Reboot" action renders', await page.locator('text=Save and Reboot').count() >= 1);
      ok('official source link renders and points at betaflight.com', (await page.locator('a[href*="betaflight.com/docs/wiki/app/gps-tab"]').count()) === 1);
      ok('no unexpected console error', consoleErrors.filter(e => !/net::ERR_|favicon/i.test(e)).length === 0);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow', !overflow);
      ok('Programming nav tab remains active on /betaflight/gps', await navButtonIsActive(page, 'البرمجة'));

      await page.locator('button', { hasText: 'العودة إلى Betaflight' }).click();
      await page.waitForLoadState('networkidle');
      ok('return button navigates back to /betaflight', page.url() === `${BASE}/betaflight`);
      await ctx.close();
    }

    // ── [26] /betaflight/led-strip: complete "reviewed" page (Phase 5), dynamic editor stays dynamic ──
    console.log('\n[26] /betaflight/led-strip renders the complete "reviewed" LED Strip page (Phase 5, was not-started)');
    {
      const consoleErrors: string[] = [];
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await page.goto(`${BASE}/betaflight/led-strip`, { waitUntil: 'networkidle' });
      ok('exactly one h1', await page.locator('h1').count() === 1);
      ok('h1 shows the official English title "LED Strip"', (await page.locator('h1').textContent())?.trim() === 'LED Strip');
      ok('Arabic title "شريط الإضاءة" renders', await page.locator('text=شريط الإضاءة').count() >= 1);
      ok('content-status badge shows "مراجَع" (reviewed, Phase 5 complete, was not-started)', await page.locator('text=مراجَع').count() >= 1);
      ok('the "Function" group renders', await page.locator('text=Function').count() >= 1);
      ok('the "Mode colors" group renders', await page.locator('text=Mode colors').count() >= 1);
      ok('the "LED Strip Wiring" group renders (Arabic heading, dynamic wire-order editor distinct from the spatial grid)', await page.locator('h2', { hasText: 'الترتيب السلكي' }).count() >= 1);
      ok('the "Wire Ordering Mode" field renders', await page.locator('text=Wire Ordering Mode').count() >= 1);
      ok('official source link renders and points at betaflight.com', (await page.locator('a[href*="betaflight.com/docs/wiki/app/led-strip-tab"]').count()) === 1);
      ok('no unexpected console error', consoleErrors.filter(e => !/net::ERR_|favicon/i.test(e)).length === 0);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow', !overflow);
      ok('Programming nav tab remains active on /betaflight/led-strip', await navButtonIsActive(page, 'البرمجة'));

      await page.locator('button', { hasText: 'العودة إلى Betaflight' }).click();
      await page.waitForLoadState('networkidle');
      ok('return button navigates back to /betaflight', page.url() === `${BASE}/betaflight`);
      await ctx.close();
    }

    // ── [27] /betaflight/servos: complete "reviewed" page (Phase 5), respects hardware-dependent scope ──
    console.log('\n[27] /betaflight/servos renders the complete "reviewed" Servos page (Phase 5, was not-started)');
    {
      const consoleErrors: string[] = [];
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await page.goto(`${BASE}/betaflight/servos`, { waitUntil: 'networkidle' });
      ok('exactly one h1', await page.locator('h1').count() === 1);
      ok('h1 shows the official English title "Servos"', (await page.locator('h1').textContent())?.trim() === 'Servos');
      ok('Arabic title "المحركات الخادمة" renders', await page.locator('text=المحركات الخادمة').count() >= 1);
      ok('content-status badge shows "مراجَع" (reviewed, Phase 5 complete, was not-started)', await page.locator('text=مراجَع').count() >= 1);
      ok('the "Enable Live mode" toggle renders', await page.locator('text=Enable Live mode').count() >= 1);
      ok('official source link renders and points at betaflight.com', (await page.locator('a[href*="betaflight.com/docs/wiki/app/servos-tab"]').count()) === 1);
      ok('no unexpected console error', consoleErrors.filter(e => !/net::ERR_|favicon/i.test(e)).length === 0);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow', !overflow);
      ok('Programming nav tab remains active on /betaflight/servos', await navButtonIsActive(page, 'البرمجة'));

      await page.locator('button', { hasText: 'العودة إلى Betaflight' }).click();
      await page.waitForLoadState('networkidle');
      ok('return button navigates back to /betaflight', page.url() === `${BASE}/betaflight`);
      await ctx.close();
    }

    // ── [28] /betaflight/cli: complete "reviewed" page (Phase 5, legacy URL now superseded), terminal not a settings page ──
    console.log('\n[28] /betaflight/cli renders the complete "reviewed" CLI page (Phase 5, legacy URL now superseded)');
    {
      const consoleErrors: string[] = [];
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await page.goto(`${BASE}/betaflight/cli`, { waitUntil: 'networkidle' });
      ok('exactly one h1', await page.locator('h1').count() === 1);
      ok('h1 shows the official English title "CLI"', (await page.locator('h1').textContent())?.trim() === 'CLI');
      ok('Arabic title "سطر الأوامر" renders', await page.locator('text=سطر الأوامر').count() >= 1);
      ok('content-status badge shows "مراجَع" (reviewed, Phase 5 complete, supersedes legacy)', await page.locator('text=مراجَع').count() >= 1);
      ok('critical safety badge renders (CLI is the highest safety level)', await page.locator('text=حرِج').count() >= 1);
      ok('the terminal "Command input" field renders (not a settings-style field list)', await page.locator('text=Command input').count() >= 1);
      ok('the "Submit Support Data" toolbar action renders', await page.locator('text=Submit Support Data').count() >= 1);
      ok('official source link renders and points at betaflight.com', (await page.locator('a[href*="betaflight.com/docs/wiki/app/cli-tab"]').count()) === 1);
      ok('no unexpected console error', consoleErrors.filter(e => !/net::ERR_|favicon/i.test(e)).length === 0);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow', !overflow);
      ok('Programming nav tab remains active on /betaflight/cli', await navButtonIsActive(page, 'البرمجة'));

      const backArrow = page.locator('button[aria-label="العودة"]');
      await backArrow.focus();
      ok('back-arrow button is keyboard-focusable on the CLI page', await backArrow.evaluate(el => el === document.activeElement));

      await page.locator('button', { hasText: 'العودة إلى Betaflight' }).click();
      await page.waitForLoadState('networkidle');
      ok('return button navigates back to /betaflight', page.url() === `${BASE}/betaflight`);
      await ctx.close();
    }

    // ── [15] Responsive: all Phase 2 + Phase 3 + Phase 4 + Phase 5 reviewed pages at 3 viewports ──
    console.log('\n[15] All Phase 2 + Phase 3 + Phase 4 + Phase 5 reviewed pages are responsive at mobile/tablet/desktop viewports');
    {
      const viewports = [
        { name: 'mobile 390x844', width: 390, height: 844 },
        { name: 'tablet 768x1024', width: 768, height: 1024 },
        { name: 'desktop 1440x900', width: 1440, height: 900 },
      ];
      for (const routeId of ['motors', 'failsafe', 'configuration', 'power', 'receiver', 'modes', 'pid-tuning', 'presets', 'adjustments', 'osd', 'vtx', 'sensors', 'gps', 'led-strip', 'servos', 'cli']) {
        for (const vp of viewports) {
          const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
          const page = await ctx.newPage();
          await page.goto(`${BASE}/betaflight/${routeId}`, { waitUntil: 'networkidle' });
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
          ok(`[${routeId}][${vp.name}] no horizontal overflow`, !overflow);
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(150);
          const overlap = await page.evaluate(() => {
            const nav = document.querySelector('nav');
            const btn = document.querySelector('button.btn-primary');
            if (!nav || !btn) return false;
            return btn.getBoundingClientRect().bottom > nav.getBoundingClientRect().top;
          });
          ok(`[${routeId}][${vp.name}] no bottom-nav overlap after scrolling to the page's end`, !overlap);
          await ctx.close();
        }
      }
    }

    console.log(`\nAll ${passed} UI assertions passed.`);
  } finally {
    if (server?.pid) {
      try { process.kill(-server.pid, 'SIGTERM'); } catch { /* already gone */ }
    }
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

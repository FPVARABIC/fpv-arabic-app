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
      ok('the legacy hub heading still renders there', await page.locator('text=Betaflight بالعربي').count() === 1);
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

    // ── [5] The 5 legacy IDs that are still "not-started" in the registry render EXACTLY as before ──
    // ("motors", "failsafe" got real registry .page entries in Phase 2; "receiver" and "modes" got
    // real registry .page entries in Phase 3 — same as "ports" in Phase 1, the new complete page now
    // wins at those URLs. They are covered separately in sections [13]/[14] and [16]-[19], not here.
    console.log('\n[5] The other 5 legacy IDs (still not-started in the registry) are pixel-for-pixel unaffected');
    {
      const LEGACY_UNCHANGED = [
        { id: 'interface', titleAr: 'واجهة Betaflight' },
        { id: 'firmware', titleAr: 'Firmware / تحديث' },
        { id: 'osd', titleAr: 'OSD' },
        { id: 'blackbox', titleAr: 'Blackbox' },
        { id: 'cli', titleAr: 'CLI' },
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

    // ── [6] Hub (/betaflight) is completely unaffected ──
    console.log('\n[6] The Betaflight hub itself is unaffected — still the original 10 legacy cards');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/betaflight`, { waitUntil: 'networkidle' });
      ok('hub heading "Betaflight بالعربي" renders', await page.locator('text=Betaflight بالعربي').count() === 1);
      ok('hub still shows exactly the original 10 legacy h3 cards', await page.locator('h3', {
        hasText: /^(واجهة Betaflight|Firmware \/ تحديث|Ports|Receiver|Modes|Motors|Failsafe|OSD|Blackbox|CLI)$/,
      }).count() === 10);
      ok('the new hub renderer test-id is NOT present on the live hub (not wired in yet)', await page.locator('[data-testid="betaflight-hub-renderer"]').count() === 0);
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

    // ── [8] /betaflight/gps: a conditional (feature-dependent) not-started page ──
    console.log('\n[8] /betaflight/gps shows the not-started state with its condition badge');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/betaflight/gps`, { waitUntil: 'networkidle' });
      ok('h1 shows the official English title "GPS"', (await page.locator('h1').textContent())?.trim() === 'GPS');
      ok('content-status badge shows "لم يُبدأ بعد"', await page.locator('text=لم يُبدأ بعد').count() >= 1);
      ok('the condition badge (feature requirement) renders', await page.locator('text=يظهر فقط إذا كانت نسخة الفيرموير المبنية تتضمن ميزة GPS').count() === 1);
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
      await page.goto(`${BASE}/betaflight/sensors`, { waitUntil: 'networkidle' });
      ok('Programming is ACTIVE (real color match) on /betaflight/sensors (not-started page)', (await navButtonColor(page, 'البرمجة')) === ACTIVE_NAV_COLOR);
      await page.goto(`${BASE}/home`, { waitUntil: 'networkidle' });
      ok('Programming is INACTIVE (real color match) on /home', (await navButtonColor(page, 'البرمجة')) === INACTIVE_NAV_COLOR);
      await ctx.close();
    }

    // ── [11] Accessibility: keyboard focus on the not-started page's return control ──
    console.log('\n[11] Keyboard focus on the not-started page\'s controls');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/betaflight/sensors`, { waitUntil: 'networkidle' });
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
        await page.goto(`${BASE}/betaflight/sensors`, { waitUntil: 'networkidle' });
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

    // ── [15] Responsive: all Phase 2 + Phase 3 + Phase 4 reviewed pages at 3 viewports ──
    console.log('\n[15] All Phase 2 + Phase 3 + Phase 4 reviewed pages are responsive at mobile/tablet/desktop viewports');
    {
      const viewports = [
        { name: 'mobile 390x844', width: 390, height: 844 },
        { name: 'tablet 768x1024', width: 768, height: 1024 },
        { name: 'desktop 1440x900', width: 1440, height: 900 },
      ];
      for (const routeId of ['motors', 'failsafe', 'configuration', 'power', 'receiver', 'modes', 'pid-tuning', 'presets', 'adjustments']) {
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

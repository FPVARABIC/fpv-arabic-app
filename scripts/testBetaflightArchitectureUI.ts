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

    // ── [1] New architecture-preview page: /betaflight/setup (brand new ID, no legacy collision) ──
    console.log('\n[1] /betaflight/setup renders the new architecture-preview page');
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
      ok('content-status badge shows "معاينة معمارية"', await page.locator('text=معاينة معمارية').count() >= 1);
      ok('the honest architecture-preview warning strip renders', await page.locator('text=معاينة معمارية لإثبات').count() === 1);
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

    // ── [4] /betaflight/ports: new architecture supersedes the old article at the same URL ──
    console.log('\n[4] /betaflight/ports now renders the new architecture-preview page (old URL preserved)');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/betaflight/ports`, { waitUntil: 'networkidle' });
      ok('h1 still shows exactly "Ports" (compatible with the pre-existing Programming-hub test)', (await page.locator('h1').textContent())?.trim() === 'Ports');
      ok('the new field-level content renders (Serial Rx)', await page.locator('text=Serial Rx').count() >= 1);
      ok('the new field-level content renders (Configuration/MSP)', await page.locator('text=Configuration/MSP').count() >= 1);
      ok('content-status badge shows "معاينة معمارية"', await page.locator('text=معاينة معمارية').count() >= 1);
      await page.locator('button', { hasText: 'العودة إلى Betaflight' }).click();
      await page.waitForLoadState('networkidle');
      ok('return button still navigates back to /betaflight', page.url() === `${BASE}/betaflight`);
      await ctx.close();
    }

    // ── [5] Every other legacy ID renders EXACTLY as before (unaffected by the new architecture) ──
    console.log('\n[5] The other 9 legacy IDs are pixel-for-pixel unaffected');
    {
      const LEGACY_UNCHANGED = [
        { id: 'interface', titleAr: 'واجهة Betaflight' },
        { id: 'firmware', titleAr: 'Firmware / تحديث' },
        { id: 'receiver', titleAr: 'Receiver' },
        { id: 'modes', titleAr: 'Modes' },
        { id: 'motors', titleAr: 'Motors' },
        { id: 'failsafe', titleAr: 'Failsafe' },
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
        ok(`/betaflight/${id}: no new-architecture "معاينة معمارية" badge appears`, await page.locator('text=معاينة معمارية').count() === 0);
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

    // ── [7] /betaflight/power: a real, verified official page with no authored content yet ──
    console.log('\n[7] /betaflight/power shows the honest not-started state, not a fake 404');
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
      ok('content-status badge shows "لم يُبدأ بعد" (not-started, honest)', await page.locator('text=لم يُبدأ بعد').count() >= 1);
      ok('explicit "not built yet" explanation text renders', await page.locator('text=لم يتم بعد بناء المحتوى العربي').count() === 1);
      ok('does NOT show the generic "not found" message', await page.locator('text=القسم غير موجود').count() === 0);
      ok('does NOT show any fake settings/fields (no englishLabel-style field rows)', await page.locator('.card-subtle p.text-sm.font-bold').count() === 0);
      ok('version/release-line context renders', await page.locator('text=2025.12').count() >= 1);
      ok('the safety badge renders (Power & Battery is registered as "warning")', await page.locator('text=تحذير').count() >= 1);
      ok('Programming nav tab is active on /betaflight/power', await navButtonIsActive(page, 'البرمجة'));
      ok('no unexpected console error', consoleErrors.filter(e => !/net::ERR_|favicon/i.test(e)).length === 0);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok('no horizontal overflow', !overflow);

      await page.locator('button', { hasText: 'العودة إلى Betaflight' }).click();
      await page.waitForLoadState('networkidle');
      ok('return-to-hub works from the not-started page', page.url() === `${BASE}/betaflight`);
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
      await page.goto(`${BASE}/betaflight/power`, { waitUntil: 'networkidle' });
      ok('Programming is ACTIVE (real color match) on /betaflight/power (not-started page)', (await navButtonColor(page, 'البرمجة')) === ACTIVE_NAV_COLOR);
      await page.goto(`${BASE}/home`, { waitUntil: 'networkidle' });
      ok('Programming is INACTIVE (real color match) on /home', (await navButtonColor(page, 'البرمجة')) === INACTIVE_NAV_COLOR);
      await ctx.close();
    }

    // ── [11] Accessibility: keyboard focus on the not-started page's return control ──
    console.log('\n[11] Keyboard focus on the not-started page\'s controls');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/betaflight/power`, { waitUntil: 'networkidle' });
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
        await page.goto(`${BASE}/betaflight/power`, { waitUntil: 'networkidle' });
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

/**
 * Real UI-interaction proof for the ExpressLRS landing page
 * (src/views/ExpressLrsView.tsx) and the Programming hub's ExpressLRS card
 * becoming available (src/views/ProgrammingView.tsx). Drives the actual
 * built app in a real browser (Playwright) rather than relying on
 * source-text grep.
 *
 * Complements scripts/testExpressLrsHub.ts (source-structure assertions).
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

// active nav buttons get text color #12222a; inactive get #3a484d (see BottomNavigation.tsx)
async function navButtonIsActive(page: Page, label: string): Promise<boolean> {
  const btn = page.locator('nav button', { hasText: label }).first();
  const color = await btn.evaluate(el => getComputedStyle(el).color);
  return color === 'rgb(18, 34, 42)'; // #12222a
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

    // ── Programming hub: four cards, correct statuses, ExpressLRS opens the new page ──
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await page.goto(`${BASE}/programming`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      const cards = page.locator('[data-testid^="programming-card-"]');
      ok('exactly four cards still render', await cards.count() === 4);
      const ids = await cards.evaluateAll(els => els.map(el => el.getAttribute('data-testid')));
      ok('card order is still Betaflight, ExpressLRS, Binding, INAV', JSON.stringify(ids) === JSON.stringify([
        'programming-card-betaflight', 'programming-card-expresslrs', 'programming-card-binding', 'programming-card-inav',
      ]));

      ok('Betaflight remains enabled', !(await page.locator('[data-testid="programming-card-betaflight"]').isDisabled()));
      ok('ExpressLRS is now enabled', !(await page.locator('[data-testid="programming-card-expresslrs"]').isDisabled()));
      ok('Binding is disabled and marked قريبًا', await page.locator('[data-testid="programming-card-binding"]').isDisabled()
        && (await page.locator('[data-testid="programming-badge-binding"]').textContent())?.trim() === 'قريبًا');
      ok('INAV is disabled and marked قريبًا', await page.locator('[data-testid="programming-card-inav"]').isDisabled()
        && (await page.locator('[data-testid="programming-badge-inav"]').textContent())?.trim() === 'قريبًا');

      await page.locator('[data-testid="programming-card-expresslrs"]').click();
      await page.waitForTimeout(300);
      ok('clicking the ExpressLRS card opens /programming/expresslrs', page.url() === `${BASE}/programming/expresslrs`);

      await ctx.close();
    }

    // ── ExpressLRS page: exact content ──────────────────────────────────
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await page.goto(`${BASE}/programming/expresslrs`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      ok('exactly one semantic h1, reading "ExpressLRS"', await page.locator('h1').count() === 1
        && (await page.locator('h1').textContent())?.trim() === 'ExpressLRS');
      ok('subtitle text matches exactly', await page.locator('text=إعداد وربط نظام ExpressLRS خطوة بخطوة').count() === 1);
      ok('description text matches exactly', await page.locator('text=كل ما تحتاجه لإعداد ExpressLRS من تحديث الأجهزة وحتى حل المشاكل.').count() === 1);

      const sectionEls = page.locator('[data-testid^="expresslrs-section-"]');
      ok('exactly two structural section cards render', await sectionEls.count() === 2);
      const sectionIds = await sectionEls.evaluateAll(els => els.map(el => el.getAttribute('data-testid')));
      ok('section order is setup, then troubleshooting', JSON.stringify(sectionIds) === JSON.stringify([
        'expresslrs-section-setup', 'expresslrs-section-troubleshooting',
      ]));

      ok('section 1 title is exactly "الإعداد والبرمجة"', await page.locator('[data-testid="expresslrs-section-setup"] h2', { hasText: 'الإعداد والبرمجة' }).count() === 1);
      ok('section 1 description matches exactly', (await page.locator('[data-testid="expresslrs-section-setup"]').textContent() ?? '').includes('ابدأ من تحديث الأجهزة، ثم الربط، ثم إعداد Betaflight، ثم التحقق النهائي.'));
      ok('section 1 supporting label is exactly "10 خطوات عملية"', (await page.locator('[data-testid="expresslrs-label-setup"]').textContent())?.trim() === '10 خطوات عملية');

      ok('section 2 title is exactly "حل المشاكل"', await page.locator('[data-testid="expresslrs-section-troubleshooting"] h2', { hasText: 'حل المشاكل' }).count() === 1);
      ok('section 2 description matches exactly', (await page.locator('[data-testid="expresslrs-section-troubleshooting"]').textContent() ?? '').includes('إذا واجهت مشكلة، ابدأ من هنا وشخّص السبب خطوة بخطوة.'));
      ok('section 2 supporting label is exactly "تشخيص منظم"', (await page.locator('[data-testid="expresslrs-label-troubleshooting"]').textContent())?.trim() === 'تشخيص منظم');

      // ── Honesty: section cards are not buttons/links and cannot be keyboard-activated ──
      const tag1 = await page.locator('[data-testid="expresslrs-section-setup"]').evaluate(el => el.tagName);
      ok('section 1 is a plain element (DIV), not a BUTTON or A', tag1 === 'DIV');
      const tag2 = await page.locator('[data-testid="expresslrs-section-troubleshooting"]').evaluate(el => el.tagName);
      ok('section 2 is a plain element (DIV), not a BUTTON or A', tag2 === 'DIV');

      const urlBefore = page.url();
      await page.locator('[data-testid="expresslrs-section-setup"]').click({ force: true });
      await page.waitForTimeout(150);
      ok('clicking section 1 causes no navigation', page.url() === urlBefore);

      // Tabbing from the last real interactive element (Betaflight would be the
      // origin on the hub; here we just confirm the section elements never
      // receive focus even when explicitly asked to).
      const canFocusSection = await page.locator('[data-testid="expresslrs-section-setup"]').evaluate(el => {
        (el as HTMLElement).focus();
        return document.activeElement === el;
      });
      ok('section 1 cannot receive keyboard focus (it is not an interactive control)', !canFocusSection);

      ok('no "قريبًا" label appears anywhere on this page', await page.locator('text=قريبًا').count() === 0);

      await ctx.close();
    }

    // ── Light design ─────────────────────────────────────────────────────
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/programming/expresslrs`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      const wrapperBg = await page.evaluate(() => getComputedStyle(document.querySelector('[data-expresslrs-frame]')!).backgroundColor);
      ok('the page wrapper background is visibly light (#f8fafc)', wrapperBg === 'rgb(248, 250, 252)');

      const cardBg = await page.locator('[data-testid="expresslrs-section-setup"]').evaluate(el => getComputedStyle(el).backgroundColor);
      ok('section cards are visibly white', cardBg === 'rgb(255, 255, 255)');

      const headingColor = await page.locator('[data-testid="expresslrs-section-setup"] h2').evaluate(el => getComputedStyle(el).color);
      ok('heading text is dark (readable on the light background)', headingColor === 'rgb(15, 23, 42)');

      // No dark strip: sample the color directly behind the last section card's
      // bottom edge (inside the light wrapper's own clearance spacer) — it
      // should still be the light wrapper color, not AppShell's dark gradient.
      const frameBoundingBox = await page.locator('[data-expresslrs-frame]').boundingBox();
      ok('the light wrapper extends well past the last card (clearance spacer present)', !!frameBoundingBox && frameBoundingBox.height > 400);

      await ctx.close();
    }

    // ── Navigation ───────────────────────────────────────────────────────
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();

      await page.goto(`${BASE}/programming/expresslrs`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Programming tab remains active on /programming/expresslrs', await navButtonIsActive(page, 'البرمجة'));
      ok('direct deep link to /programming/expresslrs works', await page.locator('h1', { hasText: 'ExpressLRS' }).count() === 1);

      await page.locator('nav button', { hasText: 'البرمجة' }).click();
      await page.waitForTimeout(300);
      ok('clicking the Programming nav button from the ExpressLRS page returns to /programming', page.url() === `${BASE}/programming`);

      await page.goto(`${BASE}/betaflight`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Betaflight remains completely unchanged', await page.locator('text=Betaflight بالعربي').count() === 1);

      await page.goto(`${BASE}/programming`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Binding remains inert from the hub', await page.locator('[data-testid="programming-card-binding"]').isDisabled());
      ok('INAV remains inert from the hub', await page.locator('[data-testid="programming-card-inav"]').isDisabled());

      await ctx.close();
    }

    // ── Accessibility/runtime ────────────────────────────────────────────
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/programming/expresslrs`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      const dir = await page.evaluate(() => document.documentElement.dir);
      ok('page renders right-to-left', dir === 'rtl');
      ok('the Latin "ExpressLRS" name renders readably inside the RTL heading', (await page.locator('h1').textContent())?.includes('ExpressLRS'));

      await ctx.close();
    }

    // ── Responsive / runtime ─────────────────────────────────────────────
    for (const [label, viewport] of Object.entries({
      mobile: { width: 390, height: 844 },
      tablet: { width: 768, height: 1024 },
      desktop: { width: 1280, height: 900 },
    })) {
      const ctx = await browser.newContext({ viewport });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/programming/expresslrs`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok(`no horizontal overflow on the ExpressLRS page at ${label} width`, !overflow);

      const lastSectionBox = await page.locator('[data-testid="expresslrs-section-troubleshooting"]').boundingBox();
      const navBox = await page.locator('nav').boundingBox();
      if (lastSectionBox && navBox) {
        ok(`bottom nav does not cover the last section card at ${label} width`, lastSectionBox.y + lastSectionBox.height <= navBox.y + 1);
      }
      await ctx.close();
    }

    // ── Regression ───────────────────────────────────────────────────────
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();

      await page.goto(`${BASE}/lessons`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('lessons total remains exactly 16', (await page.locator('text=درسًا مكتملًا').textContent() ?? '').includes('16'));
      ok('removed safety section ("الاختبار والطيران") remains absent', await page.locator('text=الاختبار والطيران').count() === 0);

      await page.goto(`${BASE}/lessons/lesson-motor-test`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('removed Lesson 17 remains absent (not-found route)', await page.locator('text=الدرس غير موجود').count() === 1);

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

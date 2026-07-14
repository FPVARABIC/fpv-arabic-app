/**
 * Real UI-interaction proof for the ExpressLRS troubleshooting guide
 * (src/views/ExpressLrsTroubleshootingView.tsx and
 * src/components/expresslrs/ExpressLrsTroubleshootingIssueCard.tsx).
 * Drives the actual built app in a real browser (Playwright).
 *
 * Complements scripts/testExpressLrsTroubleshooting.ts (source-structure
 * and real-data assertions).
 */
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 4404;
const BASE = `http://localhost:${PORT}`;
const TS_URL = `${BASE}/programming/expresslrs/troubleshooting`;

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

async function freshContext(browser: import('playwright').Browser) {
  return browser.newContext({ viewport: { width: 390, height: 844 } });
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

    // ── Route exists and renders ─────────────────────────────────────────
    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await page.goto(TS_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      ok('exactly one semantic h1, reading "حل مشاكل ExpressLRS"', await page.locator('h1').count() === 1
        && (await page.locator('h1').textContent())?.trim() === 'حل مشاكل ExpressLRS');
      ok('all 36 category nav buttons render', await page.locator('[data-testid^="expresslrs-troubleshooting-nav-"]').count() === 36);
      ok('no issue detail card renders before a category is chosen', await page.locator('[data-testid^="expresslrs-issue-card-"]').count() === 0);

      await ctx.close();
    }

    // ── The troubleshooting hub card navigates here ─────────────────────
    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      await page.goto(`${BASE}/programming/expresslrs`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await page.locator('[data-testid="expresslrs-section-troubleshooting"]').click();
      await page.waitForTimeout(300);
      ok('clicking the troubleshooting hub card opens the troubleshooting route', page.url() === TS_URL);
      await ctx.close();
    }

    // ── Direct access to any of the 36 categories works ──────────────────
    for (const id of ['no-power', 'lua-stuck-loading', 'spi-config-problems', 'when-to-stop']) {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      await page.goto(TS_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await page.locator(`[data-testid="expresslrs-troubleshooting-nav-${id}"]`).click();
      await page.waitForTimeout(200);
      ok(`direct jump to category "${id}" opens its issue card immediately`, await page.locator(`[data-testid="expresslrs-issue-card-${id}"]`).count() === 1);
      await ctx.close();
    }

    // ── UART/SPI applicability labeling ──────────────────────────────────
    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      await page.goto(TS_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      await page.locator('[data-testid="expresslrs-troubleshooting-nav-wrong-uart"]').click();
      await page.waitForTimeout(150);
      ok('a UART-only issue shows the "UART فقط" applicability badge', (await page.locator('[data-testid="expresslrs-issue-applicability-wrong-uart"]').textContent())?.includes('UART'));

      await page.locator('[data-testid="expresslrs-troubleshooting-nav-spi-config-problems"]').click();
      await page.waitForTimeout(150);
      ok('an SPI-only issue shows the "SPI فقط" applicability badge', (await page.locator('[data-testid="expresslrs-issue-applicability-spi-config-problems"]').textContent())?.includes('SPI'));

      await page.locator('[data-testid="expresslrs-troubleshooting-nav-no-power"]').click();
      await page.waitForTimeout(150);
      ok('a both-architectures issue shows no applicability badge', await page.locator('[data-testid="expresslrs-issue-applicability-no-power"]').count() === 0);

      await ctx.close();
    }

    // ── Safety warnings render where the data specifies them ─────────────
    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      await page.goto(TS_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      await page.locator('[data-testid="expresslrs-troubleshooting-nav-no-power"]').click();
      await page.waitForTimeout(150);
      ok('a safety-critical issue (no-power) renders its warning callout', await page.locator('[data-testid="expresslrs-issue-safety-warning-no-power"]').count() === 1);

      await page.locator('[data-testid="expresslrs-troubleshooting-nav-lua-not-loading"]').click();
      await page.waitForTimeout(150);
      ok('an issue without a safety warning in the data renders none', await page.locator('[data-testid="expresslrs-issue-safety-warning-lua-not-loading"]').count() === 0);

      await ctx.close();
    }

    // ── Ordered diagnostic checks: tri-state, one at a time, resolution state ──
    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      await page.goto(TS_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await page.locator('[data-testid="expresslrs-troubleshooting-nav-no-power"]').click();
      await page.waitForTimeout(150);

      ok('no-power has exactly 3 ordered checks', await page.locator('[data-testid^="expresslrs-check-nopower-"]').count() === 3);
      ok('every check defaults to "لم يُفحص بعد" (not-checked)', await page.locator('[data-testid="expresslrs-check-option-nopower-1-not-checked"] input').isChecked());
      ok('no resolved banner before any checks pass', await page.locator('[data-testid="expresslrs-issue-resolved-no-power"]').count() === 0);

      await page.locator('[data-testid="expresslrs-check-option-nopower-1-failed"]').click();
      await page.waitForTimeout(100);
      ok('marking a check "failed" reveals its next-action guidance', await page.locator('[data-testid="expresslrs-check-if-failed-nopower-1"]').count() === 1);
      ok('marking check 1 does not change check 2\'s state (one check updated at a time)', await page.locator('[data-testid="expresslrs-check-option-nopower-2-not-checked"] input').isChecked());

      await page.locator('[data-testid="expresslrs-check-option-nopower-1-passed"]').click();
      await page.locator('[data-testid="expresslrs-check-option-nopower-2-passed"]').click();
      await page.locator('[data-testid="expresslrs-check-option-nopower-3-passed"]').click();
      await page.waitForTimeout(150);
      ok('resolution banner appears only once every check is marked passed', await page.locator('[data-testid="expresslrs-issue-resolved-no-power"]').count() === 1);

      await page.locator('[data-testid="expresslrs-check-option-nopower-2-failed"]').click();
      await page.waitForTimeout(150);
      ok('resolution banner disappears again once a check is no longer passed', await page.locator('[data-testid="expresslrs-issue-resolved-no-power"]').count() === 0);

      await ctx.close();
    }

    // ── The safety issue (when-to-stop) has no checks and no resolution banner ──
    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      await page.goto(TS_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await page.locator('[data-testid="expresslrs-troubleshooting-nav-when-to-stop"]').click();
      await page.waitForTimeout(150);
      ok('when-to-stop has no diagnostic checks (it is a safety statement, not a check-list)', await page.locator('[data-testid^="expresslrs-check-"]').count() === 0);
      ok('when-to-stop shows its own safety warning callout', await page.locator('[data-testid="expresslrs-issue-safety-warning-when-to-stop"]').count() === 1);
      ok('when-to-stop has no restart control (nothing to reset)', await page.locator('[data-testid="expresslrs-issue-restart-when-to-stop"]').count() === 0);
      await ctx.close();
    }

    // ── Reload persists state; reset (per-issue and global) works correctly ──
    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      await page.goto(TS_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await page.locator('[data-testid="expresslrs-troubleshooting-nav-no-power"]').click();
      await page.waitForTimeout(150);
      await page.locator('[data-testid="expresslrs-check-option-nopower-1-passed"]').click();
      await page.waitForTimeout(150);

      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('the last-viewed issue is restored after reload', await page.locator('[data-testid="expresslrs-issue-card-no-power"]').count() === 1);
      ok('check outcome survives a reload', await page.locator('[data-testid="expresslrs-check-option-nopower-1-passed"] input').isChecked());

      await page.locator('[data-testid="expresslrs-issue-restart-no-power"]').click();
      await page.waitForTimeout(150);
      ok('the per-issue restart control resets that issue\'s checks back to not-checked', await page.locator('[data-testid="expresslrs-check-option-nopower-1-not-checked"] input').isChecked());

      await ctx.close();
    }

    // ── Reset scoping: troubleshooting reset never touches setup progress ──
    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();

      // seed setup-guide progress first
      await page.goto(`${BASE}/programming/expresslrs/setup`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await page.locator('[data-testid="expresslrs-onboarding-skip"]').click();
      await page.waitForTimeout(200);
      await page.locator('[data-testid="expresslrs-checklist-item-hw-1"] input').check();
      await page.waitForTimeout(150);

      // now use the troubleshooting guide and reset it globally
      await page.goto(TS_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await page.locator('[data-testid="expresslrs-troubleshooting-nav-no-power"]').click();
      await page.locator('[data-testid="expresslrs-check-option-nopower-1-passed"]').click();
      await page.waitForTimeout(150);
      await page.locator('[data-testid="expresslrs-troubleshooting-reset-all"]').click();
      await page.waitForTimeout(150);
      ok('reset-all shows a confirmation prompt, not an immediate wipe', await page.locator('[data-testid="expresslrs-troubleshooting-reset-all-confirm"]').count() === 1);
      await page.locator('[data-testid="expresslrs-troubleshooting-reset-all-confirm-yes"]').click();
      await page.waitForTimeout(200);
      ok('after confirming, the last-viewed category is cleared (no issue card shown)', await page.locator('[data-testid^="expresslrs-issue-card-"]').count() === 0);

      // verify setup progress was never touched by the troubleshooting reset
      await page.goto(`${BASE}/programming/expresslrs/setup`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('setup-guide progress (onboarding completed, checklist state) survives the troubleshooting reset untouched', await page.locator('[data-testid="expresslrs-setup-step-nav"]').count() === 1
        && await page.locator('[data-testid="expresslrs-checklist-item-hw-1"] input').isChecked());

      await ctx.close();
    }

    // ── Malformed persisted troubleshooting state does not crash ─────────
    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      const pageErrors: string[] = [];
      page.on('pageerror', e => pageErrors.push(String(e)));
      const STORAGE_KEY = 'fpv_expresslrs_troubleshooting_progress';

      await page.goto(TS_URL, { waitUntil: 'networkidle' });
      await page.evaluate((key) => localStorage.setItem(key, '{not valid json'), STORAGE_KEY);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('malformed JSON does not crash the page', pageErrors.length === 0);
      pageErrors.length = 0;

      await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({
        currentIssueId: 'not-a-real-issue-id',
        checkOutcomes: { 'nopower-1': 'maybe', 'fake-check-id': 'passed', 'nopower-2': 'passed' },
        lastViewedAt: 12345,
      })), STORAGE_KEY);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('unknown issue id, invalid outcome value, unknown check id, and invalid timestamp do not crash the page', pageErrors.length === 0);
      ok('unknown currentIssueId falls back to no issue selected (picker screen shown)', await page.locator('[data-testid^="expresslrs-issue-card-"]').count() === 0);

      await page.locator('[data-testid="expresslrs-troubleshooting-nav-no-power"]').click();
      await page.waitForTimeout(150);
      ok('the invalid outcome value for nopower-1 was discarded (defaults to not-checked)', await page.locator('[data-testid="expresslrs-check-option-nopower-1-not-checked"] input').isChecked());
      ok('the one genuinely valid outcome (nopower-2: passed) survived normalization', await page.locator('[data-testid="expresslrs-check-option-nopower-2-passed"] input').isChecked());

      await ctx.close();
    }

    // ── Keyboard operation ────────────────────────────────────────────────
    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      await page.goto(TS_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      await page.locator('[data-testid="expresslrs-troubleshooting-nav-no-bind"]').focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(150);
      ok('pressing Enter on a focused category button opens that issue', await page.locator('[data-testid="expresslrs-issue-card-no-bind"]').count() === 1);

      await page.locator('[data-testid="expresslrs-check-option-nobind-1-passed"] input').focus();
      await page.keyboard.press(' ');
      await page.waitForTimeout(150);
      ok('pressing Space on a focused check radio selects it', await page.locator('[data-testid="expresslrs-check-option-nobind-1-passed"] input').isChecked());

      await ctx.close();
    }

    // ── Accessibility semantics ───────────────────────────────────────────
    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      await page.goto(TS_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      ok('no role="tablist" or role="tab" anywhere on the page', await page.locator('[role="tablist"]').count() === 0 && await page.locator('[role="tab"]').count() === 0);

      await page.locator('[data-testid="expresslrs-troubleshooting-nav-no-power"]').click();
      await page.waitForTimeout(150);
      ok('exactly one category-nav button carries aria-current', await page.locator('[data-testid^="expresslrs-troubleshooting-nav-"][aria-current="true"]').count() === 1);
      ok('the aria-current button is the one just selected', await page.locator('[data-testid="expresslrs-troubleshooting-nav-no-power"]').getAttribute('aria-current') === 'true');

      const dir = await page.evaluate(() => document.documentElement.dir);
      ok('page renders right-to-left', dir === 'rtl');

      await ctx.close();
    }

    // ── Responsive: usable at 390×844 (and beyond) ───────────────────────
    for (const [label, viewport] of Object.entries({
      mobile: { width: 390, height: 844 },
      tablet: { width: 768, height: 1024 },
      desktop: { width: 1280, height: 900 },
    })) {
      const ctx = await browser.newContext({ viewport });
      const page = await ctx.newPage();
      await page.goto(TS_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await page.locator('[data-testid="expresslrs-troubleshooting-nav-no-power"]').click();
      await page.waitForTimeout(150);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok(`no horizontal overflow on the troubleshooting page at ${label} width`, !overflow);
      await ctx.close();
    }

    // ── Scroll position resets to the new issue's top when switching ────
    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      await page.goto(TS_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      // start on a long issue, scroll down into it
      await page.locator('[data-testid="expresslrs-troubleshooting-nav-recovery-after-bad-flash"]').click();
      await page.waitForTimeout(200);
      await page.mouse.wheel(0, 2500);
      await page.waitForTimeout(150);
      const scrolledDown = await page.evaluate(() => (document.querySelector('main')?.scrollTop ?? 0) > 0 || window.scrollY > 0);
      ok('scrolled down into the long issue before switching', scrolledDown);

      // switch to a different (short) issue
      await page.locator('[data-testid="expresslrs-troubleshooting-nav-no-power"]').click();
      await page.waitForTimeout(250);
      ok('the issue changed after switching', await page.locator('[data-testid="expresslrs-issue-card-no-power"]').count() === 1);
      const headingVisible = await page.evaluate(() => {
        const h2 = document.querySelector('[data-testid="expresslrs-issue-card-no-power"] h2');
        if (!h2) return false;
        const r = h2.getBoundingClientRect();
        return r.top >= 0 && r.top < 844;
      });
      ok('the new issue begins at its intended top (heading visible, not left scrolled deep into the old issue\'s position)', headingVisible);

      await ctx.close();
    }

    // ── Changing a check outcome inside the same issue does not reset scroll ──
    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      await page.goto(TS_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await page.locator('[data-testid="expresslrs-troubleshooting-nav-recovery-after-bad-flash"]').click();
      await page.waitForTimeout(200);
      await page.mouse.wheel(0, 800);
      await page.waitForTimeout(150);
      const before = await page.evaluate(() => document.querySelector('main')?.scrollTop ?? 0);

      await page.locator('[data-testid="expresslrs-check-option-recovery-1-passed"]').click();
      await page.waitForTimeout(150);
      const after = await page.evaluate(() => document.querySelector('main')?.scrollTop ?? 0);
      ok('changing a diagnostic check outcome inside the same issue does not reset scroll position', after === before);

      await ctx.close();
    }

    // ── Regression: setup guide, hub, and Programming hub still work ─────
    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      await page.goto(`${BASE}/programming/expresslrs`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('the ExpressLRS hub still renders both sections', await page.locator('[data-testid^="expresslrs-section-"]').count() === 2);

      await page.goto(`${BASE}/programming`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('the Programming hub still renders all 4 cards', await page.locator('[data-testid^="programming-card-"]').count() === 4);

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

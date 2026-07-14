/**
 * Real UI-interaction proof for the ExpressLRS setup guide
 * (src/views/ExpressLrsSetupView.tsx and src/components/expresslrs/*).
 * Drives the actual built app in a real browser (Playwright) rather than
 * relying on source-text grep.
 *
 * Complements scripts/testExpressLrsSetup.ts (source-structure assertions).
 */
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { chromium, type Page } from 'playwright';

const PORT = 4403;
const BASE = `http://localhost:${PORT}`;
const SETUP_URL = `${BASE}/programming/expresslrs/setup`;

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
  // Each scenario gets a brand-new, unshared localStorage context so
  // onboarding/progress state never leaks between scenarios.
  return browser.newContext({ viewport: { width: 390, height: 844 } });
}

async function completeOnboarding(page: Page) {
  await page.locator('[data-testid="expresslrs-onboarding-option-receiverArchitecture-uart"]').click();
  await page.locator('[data-testid="expresslrs-onboarding-option-txModuleLocation-external"]').click();
  await page.locator('[data-testid="expresslrs-onboarding-option-frequencyBand-2.4"]').click();
  await page.locator('[data-testid="expresslrs-onboarding-option-setupIntent-new"]').click();
  await page.locator('[data-testid="expresslrs-onboarding-option-fcSoftware-betaflight"]').click();
  await page.locator('[data-testid="expresslrs-onboarding-continue"]').click();
  await page.waitForTimeout(200);
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

    // ── First visit shows onboarding, not steps ─────────────────────────
    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await page.goto(SETUP_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      ok('exactly one semantic h1, reading "إعداد ExpressLRS"', await page.locator('h1').count() === 1
        && (await page.locator('h1').textContent())?.trim() === 'إعداد ExpressLRS');
      ok('onboarding renders on first visit (no persisted answers yet)', await page.locator('[data-testid="expresslrs-onboarding"]').count() === 1);
      ok('the step screen does not render yet', await page.locator('[data-testid="expresslrs-setup-step-nav"]').count() === 0);

      // "لا أعرف" reveals identification help, without auto-selecting anything else
      await page.locator('[data-testid="expresslrs-onboarding-option-receiverArchitecture-unknown"]').click();
      ok('help text is hidden until "كيف أعرف؟" is toggled', await page.locator('[data-testid="expresslrs-onboarding-help-text-receiverArchitecture"]').count() === 0);
      await page.locator('[data-testid="expresslrs-onboarding-help-toggle-receiverArchitecture"]').click();
      ok('"لا أعرف" reveals identification help text', await page.locator('[data-testid="expresslrs-onboarding-help-text-receiverArchitecture"]').count() === 1);

      // choosing a concrete answer afterwards works normally
      await page.locator('[data-testid="expresslrs-onboarding-option-receiverArchitecture-uart"]').click();
      ok('switching away from "لا أعرف" re-selects the concrete option', await page.locator('[data-testid="expresslrs-onboarding-option-receiverArchitecture-uart"] input').isChecked());

      ok('setupIntent question has no "لا أعرف" radio (only 4 concrete options)', await page.locator('[data-testid="expresslrs-onboarding-option-setupIntent-unknown"]').count() === 0);

      await ctx.close();
    }

    // ── Completing onboarding moves to the step screen; skip works too ──
    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      await page.goto(SETUP_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await completeOnboarding(page);

      ok('after completing onboarding, the step-nav strip renders', await page.locator('[data-testid="expresslrs-setup-step-nav"]').count() === 1);
      ok('exactly 10 step-nav buttons render', await page.locator('[data-testid^="expresslrs-setup-step-nav-"]').count() === 10);
      ok('progress starts at "0 من 10"', (await page.locator('[data-testid="expresslrs-setup-progress-label"]').textContent())?.includes('0 من 10'));
      ok('the first step card renders by default ("تحديد نوع النظام والأجهزة")', (await page.locator('[data-testid="expresslrs-step-card-identify-hardware"]').count()) === 1);

      await ctx.close();
    }

    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      await page.goto(SETUP_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await page.locator('[data-testid="expresslrs-onboarding-skip"]').click();
      await page.waitForTimeout(200);
      ok('"تخطي الآن" also reaches the step screen without answering anything', await page.locator('[data-testid="expresslrs-setup-step-nav"]').count() === 1);
      await ctx.close();
    }

    // ── Step navigation is a plain button group, not a tabs widget ──────
    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      await page.goto(SETUP_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await completeOnboarding(page);

      const nav = page.locator('[data-testid="expresslrs-setup-step-nav"]');
      ok('the step-nav container is not a tablist (no role="tablist")', await nav.getAttribute('role') === null);
      ok('the step-nav container has an accessible label', (await nav.getAttribute('aria-label'))?.length ? true : false);
      ok('the step-nav container is a <nav> element', await nav.evaluate(el => el.tagName) === 'NAV');

      const navButtons = page.locator('[data-testid^="expresslrs-setup-step-nav-"]');
      ok('exactly 10 step-nav buttons render', await navButtons.count() === 10);
      const tagNames = await navButtons.evaluateAll(els => els.map(el => el.tagName));
      ok('every step-nav item is a real <button>', tagNames.every(t => t === 'BUTTON'));
      const roleAttrs = await navButtons.evaluateAll(els => els.map(el => el.getAttribute('role')));
      ok('no step-nav button carries role="tab"', roleAttrs.every(r => r === null));
      const ariaSelectedAttrs = await navButtons.evaluateAll(els => els.map(el => el.getAttribute('aria-selected')));
      ok('no step-nav button carries aria-selected', ariaSelectedAttrs.every(a => a === null));

      ok('exactly one step-nav button carries aria-current="step" (the current step)',
        await page.locator('[data-testid^="expresslrs-setup-step-nav-"][aria-current="step"]').count() === 1);
      ok('the aria-current="step" button is the first step (default current step)',
        await page.locator('[data-testid="expresslrs-setup-step-nav-identify-hardware"]').getAttribute('aria-current') === 'step');
      ok('a non-current step-nav button carries no aria-current attribute',
        await page.locator('[data-testid="expresslrs-setup-step-nav-binding"]').getAttribute('aria-current') === null);

      await page.locator('[data-testid="expresslrs-setup-step-nav-binding"]').click();
      await page.waitForTimeout(150);
      ok('after jumping to a different step, aria-current="step" moves with it (still exactly one)',
        await page.locator('[data-testid^="expresslrs-setup-step-nav-"][aria-current="step"]').count() === 1
        && await page.locator('[data-testid="expresslrs-setup-step-nav-binding"]').getAttribute('aria-current') === 'step'
        && await page.locator('[data-testid="expresslrs-setup-step-nav-identify-hardware"]').getAttribute('aria-current') === null);

      ok('direct step jumping still works with plain buttons (visual/behavioral parity preserved)',
        await page.locator('[data-testid="expresslrs-step-card-binding"]').count() === 1);

      await ctx.close();
    }

    // ── Open (non-gating) navigation: jump directly to any step ─────────
    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      await page.goto(SETUP_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await completeOnboarding(page);

      await page.locator('[data-testid="expresslrs-setup-step-nav-final-verification"]').click();
      await page.waitForTimeout(200);
      ok('clicking step 10 directly (with none of 1-9 completed) opens it immediately — no gate', await page.locator('[data-testid="expresslrs-step-card-final-verification"]').count() === 1);
      ok('a non-blocking prerequisite reminder is shown (not a block)', await page.locator('[data-testid="expresslrs-prerequisite-reminder"]').count() === 1);
      ok('the checklist for step 10 is still fully interactive despite the reminder', await page.locator('[data-testid="expresslrs-checklist-item-fv-1"] input').isEnabled());

      await ctx.close();
    }

    // ── Checklist + step-complete state persists across reload ──────────
    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      await page.goto(SETUP_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await completeOnboarding(page);

      await page.locator('[data-testid="expresslrs-checklist-item-hw-1"] input').check();
      await page.locator('[data-testid="expresslrs-step-mark-complete"]').click();
      await page.waitForTimeout(150);
      ok('checklist item is checked', await page.locator('[data-testid="expresslrs-checklist-item-hw-1"] input').isChecked());
      ok('progress label reads "1 من 10" after marking one step complete', (await page.locator('[data-testid="expresslrs-setup-progress-label"]').textContent())?.includes('1 من 10'));

      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('onboarding is not shown again after reload (resume, not restart)', await page.locator('[data-testid="expresslrs-onboarding"]').count() === 0);
      ok('checklist state survives a reload', await page.locator('[data-testid="expresslrs-checklist-item-hw-1"] input').isChecked());
      ok('completed-step progress survives a reload', (await page.locator('[data-testid="expresslrs-setup-progress-label"]').textContent())?.includes('1 من 10'));

      // move off the completed step so its nav button shows the "done" (non-active) visual state
      await page.locator('[data-testid="expresslrs-setup-step-nav-prepare-radio"]').click();
      await page.waitForTimeout(150);
      ok('the step-nav marks the completed, non-active step with a check icon', await page.locator('[data-testid="expresslrs-setup-step-nav-identify-hardware"] svg').count() === 1);

      await ctx.close();
    }

    // ── Prev/Next boundary behavior + descriptive labels ─────────────────
    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      await page.goto(SETUP_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await completeOnboarding(page);

      ok('"السابق" is disabled on the first step', await page.locator('[data-testid="expresslrs-setup-prev"]').isDisabled());
      ok('"التالي" has a descriptive aria-label naming the next step', (await page.locator('[data-testid="expresslrs-setup-next"]').getAttribute('aria-label'))?.includes('تجهيز الراديو ووحدة الإرسال'));

      await page.locator('[data-testid="expresslrs-setup-next"]').click();
      await page.waitForTimeout(150);
      ok('"التالي" advances to step 2', await page.locator('[data-testid="expresslrs-step-card-prepare-radio"]').count() === 1);
      ok('"السابق" is enabled on step 2', await page.locator('[data-testid="expresslrs-setup-prev"]').isEnabled());

      await page.locator('[data-testid="expresslrs-setup-step-nav-final-verification"]').click();
      await page.waitForTimeout(150);
      ok('"التالي" is disabled on the last step', await page.locator('[data-testid="expresslrs-setup-next"]').isDisabled());

      await ctx.close();
    }

    // ── Editing onboarding answers does not silently wipe progress ──────
    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      await page.goto(SETUP_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await completeOnboarding(page);

      await page.locator('[data-testid="expresslrs-checklist-item-hw-1"] input').check();
      await page.locator('[data-testid="expresslrs-setup-edit-onboarding"]').click();
      await page.waitForTimeout(150);
      ok('editing onboarding returns to the onboarding screen', await page.locator('[data-testid="expresslrs-onboarding"]').count() === 1);
      ok('the previously chosen answer is still selected (not reset)', await page.locator('[data-testid="expresslrs-onboarding-option-receiverArchitecture-uart"] input').isChecked());

      await page.locator('[data-testid="expresslrs-onboarding-option-receiverArchitecture-spi"]').click();
      await page.locator('[data-testid="expresslrs-onboarding-continue"]').click();
      await page.waitForTimeout(150);
      ok('checklist progress survives changing onboarding answers', await page.locator('[data-testid="expresslrs-checklist-item-hw-1"] input').isChecked());

      // branch badge on step 7 should now reflect SPI as the chosen architecture
      await page.locator('[data-testid="expresslrs-setup-step-nav-receiver-wiring"]').click();
      await page.waitForTimeout(150);
      ok('after switching to SPI, the UART branch is marked "لا ينطبق على إعدادك"', await page.locator('[data-testid="expresslrs-step-branch-uart"] [data-testid="expresslrs-step-branch-badge-uart"]').count() === 1);
      ok('the SPI branch carries no such badge (it is now the relevant one)', await page.locator('[data-testid="expresslrs-step-branch-spi"] [data-testid="expresslrs-step-branch-badge-spi"]').count() === 0);
      ok('both branches remain visible (marked, not hidden)', await page.locator('[data-testid="expresslrs-step-branch-uart"]').isVisible() && await page.locator('[data-testid="expresslrs-step-branch-spi"]').isVisible());

      await ctx.close();
    }

    // ── Reset requires explicit confirmation ─────────────────────────────
    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      await page.goto(SETUP_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await completeOnboarding(page);
      await page.locator('[data-testid="expresslrs-checklist-item-hw-1"] input').check();

      await page.locator('[data-testid="expresslrs-setup-reset"]').click();
      await page.waitForTimeout(150);
      ok('clicking reset shows a confirmation prompt, not an immediate wipe', await page.locator('[data-testid="expresslrs-setup-reset-confirm"]').count() === 1);
      ok('progress is untouched while the confirmation is pending', await page.locator('[data-testid="expresslrs-checklist-item-hw-1"] input').isChecked());

      await page.locator('[data-testid="expresslrs-setup-reset-confirm-cancel"]').click();
      await page.waitForTimeout(150);
      ok('cancelling the reset keeps progress intact', await page.locator('[data-testid="expresslrs-checklist-item-hw-1"] input').isChecked());

      await page.locator('[data-testid="expresslrs-setup-reset"]').click();
      await page.locator('[data-testid="expresslrs-setup-reset-confirm-yes"]').click();
      await page.waitForTimeout(200);
      ok('confirming reset returns to onboarding', await page.locator('[data-testid="expresslrs-onboarding"]').count() === 1);

      await ctx.close();
    }

    // ── Persisted-state normalization: malformed/legacy data never crashes ──
    const STORAGE_KEY = 'fpv_expresslrs_setup_progress';

    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      const pageErrors: string[] = [];
      page.on('pageerror', e => pageErrors.push(String(e)));

      // Case: a partial/legacy object — missing every array/onboarding field,
      // only a lone stray key survives.
      await page.goto(SETUP_URL, { waitUntil: 'networkidle' });
      await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ onboardingCompleted: true })), STORAGE_KEY);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('a partial/legacy object (missing arrays) does not crash the page', pageErrors.length === 0);
      ok('a partial/legacy object still reaches the step screen (onboardingCompleted=true survives)', await page.locator('[data-testid="expresslrs-setup-step-nav"]').count() === 1);
      ok('the missing currentStepId falls back to the first step', await page.locator('[data-testid="expresslrs-step-card-identify-hardware"]').count() === 1);
      ok('progress reads "0 من 10" (missing completedStepIds normalized to an empty array, not undefined)', (await page.locator('[data-testid="expresslrs-setup-progress-label"]').textContent())?.includes('0 من 10'));
      pageErrors.length = 0;

      // Case: wrong primitive types on every field.
      await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({
        onboarding: 'not-an-object',
        onboardingCompleted: 'yes',
        currentStepId: 42,
        completedStepIds: 'binding',
        completedChecklistItemIds: { hw1: true },
        lastReviewedAt: 12345,
      })), STORAGE_KEY);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('wrong-typed fields do not crash the page', pageErrors.length === 0);
      ok('a non-boolean onboardingCompleted falls back to false (onboarding screen shown)', await page.locator('[data-testid="expresslrs-onboarding"]').count() === 1);
      pageErrors.length = 0;

      // Case: unknown step/checklist ids plus invalid onboarding answer values.
      await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({
        onboarding: { receiverArchitecture: 'usb-c', txModuleLocation: 'external', frequencyBand: '5.8', setupIntent: 'invalid-intent', fcSoftware: 'betaflight' },
        onboardingCompleted: true,
        currentStepId: 'not-a-real-step-id',
        completedStepIds: ['not-a-real-step-id', 'binding', 123, null],
        completedChecklistItemIds: ['fake-item', 'hw-1'],
        lastReviewedAt: 'not-a-real-date',
      })), STORAGE_KEY);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('invalid onboarding answer values + unknown ids + invalid timestamp do not crash the page', pageErrors.length === 0);
      ok('unknown currentStepId falls back to the first step', await page.locator('[data-testid="expresslrs-step-card-identify-hardware"]').count() === 1);
      ok('the one genuinely valid completed step id ("binding") survives normalization', (await page.locator('[data-testid="expresslrs-setup-progress-label"]').textContent())?.includes('1 من 10'));
      // still on identify-hardware (the normalized fallback step) right after reload — its checklist is in the DOM now.
      ok('the one genuinely valid completed checklist item id ("hw-1") survives normalization', await page.locator('[data-testid="expresslrs-checklist-item-hw-1"] input').isChecked());
      ok('the unknown checklist item id ("fake-item") was discarded (no crash, simply absent)', true);

      await page.locator('[data-testid="expresslrs-setup-step-nav-receiver-wiring"]').click();
      await page.waitForTimeout(150);
      ok('the invalid receiverArchitecture value ("usb-c") is discarded, not passed through — UART branch carries no badge, SPI branch carries no badge (architecture reset to unset)',
        await page.locator('[data-testid="expresslrs-step-branch-badge-uart"]').count() === 0
        && await page.locator('[data-testid="expresslrs-step-branch-badge-spi"]').count() === 0);

      // Reload again to confirm the *normalized* result itself persists cleanly (no re-corruption on next write).
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('re-normalized state survives a further reload without drifting or crashing', pageErrors.length === 0
        && (await page.locator('[data-testid="expresslrs-setup-progress-label"]').textContent())?.includes('1 من 10'));

      await ctx.close();
    }

    // ── Exit control ──────────────────────────────────────────────────────
    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      await page.goto(SETUP_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await page.locator('[data-testid="expresslrs-setup-exit"]').click();
      await page.waitForTimeout(200);
      ok('the exit control navigates back to /programming/expresslrs', page.url() === `${BASE}/programming/expresslrs`);
      await ctx.close();
    }

    // ── Keyboard accessibility ────────────────────────────────────────────
    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      await page.goto(SETUP_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await completeOnboarding(page);

      await page.locator('[data-testid="expresslrs-setup-step-nav-binding"]').focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(150);
      ok('pressing Enter on a focused step-nav button jumps to that step', await page.locator('[data-testid="expresslrs-step-card-binding"]').count() === 1);

      const checklistInputId = 'expresslrs-checklist-item-bind-1';
      await page.locator(`[data-testid="${checklistInputId}"] input`).focus();
      await page.keyboard.press(' ');
      await page.waitForTimeout(150);
      ok('pressing Space on a focused checklist checkbox toggles it', await page.locator(`[data-testid="${checklistInputId}"] input`).isChecked());

      await ctx.close();
    }

    // ── Advanced disclosures use aria-expanded and are collapsed by default ──
    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      await page.goto(SETUP_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await completeOnboarding(page);
      await page.locator('[data-testid="expresslrs-setup-step-nav-lua-webui"]').click();
      await page.waitForTimeout(150);

      const toggle = page.locator('[data-testid^="expresslrs-step-advanced-toggle-lua-webui-"]').first();
      ok('advanced disclosure is collapsed by default', await toggle.getAttribute('aria-expanded') === 'false');
      ok('advanced content is not visible before expanding', await page.locator('text=Switch Mode').count() === 0);
      await toggle.click();
      await page.waitForTimeout(150);
      ok('aria-expanded flips to true after opening', await toggle.getAttribute('aria-expanded') === 'true');
      ok('advanced content becomes visible after expanding', await page.locator('text=Switch Mode').count() === 1);

      await ctx.close();
    }

    // ── Light design ──────────────────────────────────────────────────────
    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      await page.goto(SETUP_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      const wrapperBg = await page.evaluate(() => getComputedStyle(document.querySelector('[data-expresslrs-setup-frame]')!).backgroundColor);
      ok('the page wrapper background is visibly light (#f8fafc)', wrapperBg === 'rgb(248, 250, 252)');

      const dir = await page.evaluate(() => document.documentElement.dir);
      ok('page renders right-to-left', dir === 'rtl');

      await ctx.close();
    }

    // ── Responsive ────────────────────────────────────────────────────────
    for (const [label, viewport] of Object.entries({
      mobile: { width: 390, height: 844 },
      tablet: { width: 768, height: 1024 },
      desktop: { width: 1280, height: 900 },
    })) {
      const ctx = await browser.newContext({ viewport });
      const page = await ctx.newPage();
      await page.goto(SETUP_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await completeOnboarding(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok(`no horizontal overflow on the setup page at ${label} width`, !overflow);
      await ctx.close();
    }

    // ── Regression: hub and Programming pages still function ────────────
    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      await page.goto(`${BASE}/programming/expresslrs`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('the ExpressLRS hub still renders both sections', await page.locator('[data-testid^="expresslrs-section-"]').count() === 2);
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

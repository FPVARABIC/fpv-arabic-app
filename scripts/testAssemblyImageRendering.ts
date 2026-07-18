/**
 * Real-browser proof for the Phase 5A image-rendering fixes —
 * OptionCard (BuildFlow.tsx) and FinalReportScreen.tsx's selected-parts
 * summary rows both now use the shared FallbackImage component.
 *
 * No real Assembly part/size/voltage data has an `imagePath` yet (see the
 * Phase 5 image-integration audit), so the only way to exercise a genuine
 * successful image load AND a genuine broken-image fallback in a real
 * browser is via assembly-preview.tsx's dev-only "اختبار الصور" QA screen,
 * added specifically for this purpose. That screen is not part of the
 * production build (only index.html is — see vite.config.ts), so unlike
 * scripts/testAssemblyUI.ts (which drives `vite preview` against `dist/`),
 * this suite drives `vite` (the dev server), which serves any root .html
 * file directly, exactly as assembly-preview.html has always been used for
 * manual QA.
 *
 * Run with: npx tsx scripts/testAssemblyImageRendering.ts
 */
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 4403;
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

const REAL_TEST_IMAGE = '/assets/lesson-images/lesson-11-frame-assembly.png';
const BROKEN_TEST_IMAGE = '/assets/assembly/__qa-nonexistent-image.png';

async function main() {
  let server: ChildProcess | null = null;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  try {
    server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
      cwd: process.cwd(),
      stdio: 'ignore',
      detached: true,
    });
    await waitForServer(BASE);

    const consoleErrors: string[] = [];
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', e => consoleErrors.push(String(e)));

    await page.goto(`${BASE}/assembly-preview.html`, { waitUntil: 'networkidle' });
    await page.locator('[data-testid="preview-nav-images-qa"]').click();
    // No fixed sleep: wait for the specific DOM outcome each assertion
    // needs (the real <img> present, or the broken <img> gone / fallback
    // shown), so this never races the onError round-trip. Playwright's
    // waitForFunction runs in the browser, not Node, so the real image
    // path must be passed as an explicit argument, not a Node closure.
    await page.waitForFunction(
      (src) => document.querySelector(`img[src="${src}"]`) !== null,
      REAL_TEST_IMAGE,
      { timeout: 10000 },
    );

    console.log('\n[1] OptionCard — successful image render');
    {
      const successOption = page.locator('[data-testid="qa-option-success"]');
      ok('OptionCard renders a real <img> with the exact real imagePath src when the load succeeds', await successOption.locator(`img[src="${REAL_TEST_IMAGE}"]`).count() === 1);
      ok('OptionCard does NOT show the fallback emoji while the real image is showing', await successOption.locator('text=✅').count() === 0);
    }

    console.log('\n[2] OptionCard — broken image fallback');
    {
      const brokenOption = page.locator('[data-testid="qa-option-broken"]');
      await page.waitForFunction(
        () => {
          const el = document.querySelector('[data-testid="qa-option-broken"]');
          return !!el && !el.querySelector('img');
        },
        undefined,
        { timeout: 10000 },
      );
      ok('OptionCard removes the broken <img> from the DOM once onError fires (no lingering broken-image icon)', await brokenOption.locator('img').count() === 0);
      ok('OptionCard falls back to its own placeholderIcon after the load fails', await brokenOption.locator('text=🔥').count() === 1);
    }

    console.log('\n[3] FinalReportScreen summary row — successful image render');
    {
      ok('the summary row for the part with a real imagePath renders a real <img> with that exact src', await page.locator(`img[src="${REAL_TEST_IMAGE}"]`).count() === 2); // one from the OptionCard test above, one from the summary row
    }

    console.log('\n[4] FinalReportScreen summary row — broken image fallback');
    {
      await page.waitForFunction(
        (src) => document.querySelectorAll(`img[src="${src}"]`).length === 0,
        BROKEN_TEST_IMAGE,
        { timeout: 10000 },
      );
      ok('no summary-row <img> with the broken src remains in the DOM after onError fires', await page.locator(`img[src="${BROKEN_TEST_IMAGE}"]`).count() === 0);
      // The broken-imagePath part (motors, IMAGE_QA_PRESET) has no
      // placeholderIcon override, so it falls back to PartCard/
      // FinalReportScreen's own generic category default (⚙️), proving the
      // fallback path is the pre-existing default, not a QA-only special case.
      ok('the summary row for that same part instead shows the generic ⚙️ default (the real, pre-existing fallback, not a broken-image icon)', await page.locator('text=⚙️').count() >= 1);
    }

    console.log('\n[5] Hero drone-type image is unaffected by this change');
    {
      // The preview harness's images-qa screen never renders FinalReportScreen
      // with a droneTypeId, so its hero block takes the emoji branch exactly
      // as before — proving the untouched hero code path still works.
      ok('the hero image block still renders its own default icon exactly as before (untouched by Phase 5A)', await page.locator('text=🚁').count() >= 1);
    }

    ok('no unexpected browser console error was raised across the images-QA screen', consoleErrors.filter(e => !e.includes('Failed to load resource')).length === 0);

    await ctx.close();
    console.log(`\nAll ${passed} image-rendering assertions passed.`);
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

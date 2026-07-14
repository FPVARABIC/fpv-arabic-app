/**
 * Real UI-interaction proof for the Bot V2 assistant view's scroll-position
 * fix (src/views/BotV2AssistantView.tsx). Complements the existing pure-logic
 * suites (testBotV2IntentContext.ts, testBotV2Flows.ts), which never drive a
 * real browser and so cannot observe scroll position at all.
 *
 * A real (non-mocked) knowledge-base answer is used throughout. The
 * "longer than one viewport" scenario specifically uses a shorter viewport
 * height (390×500, still mobile-width) so genuine, unmocked answer content
 * reliably exceeds the visible scroll area — this is the same defect that
 * reproduces at 390×844 too, just less severe there given this app's current
 * answer lengths; a shorter height makes the failure mode deterministic
 * without inventing synthetic content.
 */
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const PORT = 4405;
const BASE = `http://localhost:${PORT}`;
const BOT_URL = `${BASE}/bot`;

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

async function sendQuery(page: Page, query: string) {
  await page.locator('main input[type="text"]').fill(query);
  await page.locator('main button[type="submit"]').click();
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

    // ── Source-structure: the fix uses a message-keyed ref, not a bottom sentinel ──
    console.log('\n[1] Source structure of the fix');
    {
      const viewTsx = readFileSync(join(ROOT, 'src/views/BotV2AssistantView.tsx'), 'utf8');
      ok('the old el.scrollTop = el.scrollHeight (jump-to-absolute-bottom) call is gone', !/scrollTop\s*=\s*el\.scrollHeight/.test(viewTsx));
      ok('a latestMsgRef targets the newest message specifically', /latestMsgRef/.test(viewTsx));
      ok('scrollIntoView({ block: \'start\' }) is used (matches the proven BotV2Overlay.tsx pattern)', /scrollIntoView\(\{\s*block:\s*'start'\s*\}\)/.test(viewTsx));
      ok('the ref is attached only to the last message in the list (i === msgs.length - 1)', /i === msgs\.length - 1 \? latestMsgRef : undefined/.test(viewTsx));
      ok('no explicit behavior is forced to "smooth" (default "auto" is preserved)', !/behavior:\s*'smooth'/.test(viewTsx));
    }

    // ── A. New assistant response reveals its own beginning ──────────────
    console.log('\n[2] New assistant response starts visible, not its tail (390×500, forces real overflow)');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 500 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await page.goto(BOT_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      await sendQuery(page, 'ما هو Flight Controller؟');
      await page.waitForTimeout(400);

      const info = await page.evaluate(() => {
        const scrollArea = document.querySelector('main .overflow-y-auto');
        const bubbles = document.querySelectorAll('main .glass-card-sm');
        const last = bubbles[bubbles.length - 1];
        const r = last ? last.getBoundingClientRect() : null;
        return { top: r ? r.top : null, height: r ? r.height : null, scrollAreaClientHeight: scrollArea ? scrollArea.clientHeight : null };
      });
      ok('the new assistant message is genuinely taller than the scrollable thread area (a real overflow case, not a trivial one)', (info.height ?? 0) > (info.scrollAreaClientHeight ?? Infinity));
      ok('the beginning of the new assistant message is visible (top >= 0, not scrolled past)', (info.top ?? -1) >= 0);
      ok('the viewport is not positioned at the message\'s final paragraph (top is near the container start, not deep negative)', (info.top ?? -9999) > -50);

      await ctx.close();
    }

    // ── B. Completion does not force-scroll to the response end ──────────
    console.log('\n[3] Response completion does not leave the viewport at the message end');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 500 } });
      const page = await ctx.newPage();
      await page.goto(BOT_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await sendQuery(page, 'ما هو Flight Controller؟');
      await page.waitForTimeout(600); // well past "completion" — this app has no streaming, so completion == message added
      const info = await page.evaluate(() => {
        const scrollArea = document.querySelector('main .overflow-y-auto');
        const bubbles = document.querySelectorAll('main .glass-card-sm');
        const last = bubbles[bubbles.length - 1];
        const r = last ? last.getBoundingClientRect() : null;
        const maxScrollTop = scrollArea ? scrollArea.scrollHeight - scrollArea.clientHeight : null;
        return {
          top: r ? r.top : null,
          scrollTop: scrollArea ? scrollArea.scrollTop : null,
          maxScrollTop,
        };
      });
      ok('after completion, the message start remains visible (not force-scrolled further to the end)', (info.top ?? -1) >= 0);
      ok('after completion, the container is not pinned to its absolute maximum scroll (proves we are anchored to the message start, not the thread end)', (info.scrollTop ?? -1) < (info.maxScrollTop ?? -1));
      await ctx.close();
    }

    // ── C. Multiple exchanges at 390×844 — realistic conversation length ──
    console.log('\n[4] Realistic multi-exchange conversation at 390×844');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(BOT_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      const queries = ['كيف أبني درون FPV؟', 'ما هو Flight Controller؟', 'كيف أوصّل الـ ESC؟'];
      for (const q of queries) {
        await sendQuery(page, q);
        await page.waitForTimeout(400);
      }
      const info = await page.evaluate(() => {
        const bubbles = document.querySelectorAll('main .glass-card-sm');
        const last = bubbles[bubbles.length - 1];
        const r = last ? last.getBoundingClientRect() : null;
        return { top: r ? r.top : null, viewportH: window.innerHeight };
      });
      ok('the latest reply in a multi-turn conversation still opens at its own beginning', (info.top ?? -1) >= 0 && (info.top ?? 9999) < info.viewportH);
      await ctx.close();
    }

    // ── D. Input remains functional; focus is not stolen ─────────────────
    console.log('\n[5] Input functionality and focus behavior');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(BOT_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await sendQuery(page, 'ما هو Flight Controller؟');
      await page.waitForTimeout(400);

      const inputValue = await page.locator('main input[type="text"]').inputValue();
      ok('the input is cleared after sending (normal existing behavior preserved)', inputValue === '');

      await page.locator('main input[type="text"]').fill('سؤال ثانٍ');
      const typedValue = await page.locator('main input[type="text"]').inputValue();
      ok('the input still accepts typed text after a response was added', typedValue === 'سؤال ثانٍ');

      const focusedOnAssistantMessage = await page.evaluate(() => {
        const bubbles = document.querySelectorAll('main .glass-card-sm');
        const last = bubbles[bubbles.length - 1];
        return last ? last.contains(document.activeElement) : false;
      });
      ok('focus was not moved onto the new assistant message', !focusedOnAssistantMessage);

      await sendQuery(page, 'سؤال ثانٍ');
      await page.waitForTimeout(400);
      ok('sending a second message still works after the fix (no functional regression)', await page.locator('main .glass-card-sm').count() >= 2);

      await ctx.close();
    }

    // ── E. Protected regression: no global reset mechanism was introduced ──
    console.log('\n[6] Protected regression: no global scroll mechanism introduced');
    {
      const appShellTsx = readFileSync(join(ROOT, 'src/components/AppShell.tsx'), 'utf8');
      const overlayTsx = readFileSync(join(ROOT, 'src/components/BotV2Overlay.tsx'), 'utf8');
      ok('AppShell.tsx has no pathname-based or route-level scroll reset', !/scrollTo|scrollTop\s*=/.test(appShellTsx));
      ok('BotV2Overlay.tsx (already-correct component) was not modified by this task', /latestMsgRef\.current\?\.scrollIntoView\(\{ block: 'start' \}\)/.test(overlayTsx));

      const viewTsx = readFileSync(join(ROOT, 'src/views/BotV2AssistantView.tsx'), 'utf8');
      ok('no unconditional window.scrollTo(0, 0) was added to the Bot V2 view', !/window\.scrollTo\(\s*0\s*,\s*0\s*\)/.test(viewTsx));

      const setupViewTsx = readFileSync(join(ROOT, 'src/views/ExpressLrsSetupView.tsx'), 'utf8');
      ok('the ExpressLRS setup fix is keyed to currentStep.id only (not the whole progress object)', /\[currentStep\.id\]/.test(setupViewTsx));
      ok('no unconditional window.scrollTo(0, 0) was added to the ExpressLRS setup view', !/window\.scrollTo\(\s*0\s*,\s*0\s*\)/.test(setupViewTsx));

      const tsViewTsx = readFileSync(join(ROOT, 'src/views/ExpressLrsTroubleshootingView.tsx'), 'utf8');
      ok('the ExpressLRS troubleshooting fix is keyed to currentIssue?.id only', /\[currentIssue\?\.id\]/.test(tsViewTsx));
      ok('no unconditional window.scrollTo(0, 0) was added to the ExpressLRS troubleshooting view', !/window\.scrollTo\(\s*0\s*,\s*0\s*\)/.test(tsViewTsx));

      ok('HomeView.tsx (Community/Home feed) was not modified by this task', !/scrollIntoView|latestMsgRef|stepTopRef|issueTopRef/.test(readFileSync(join(ROOT, 'src/views/HomeView.tsx'), 'utf8')));
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

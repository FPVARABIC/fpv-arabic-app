/**
 * THE FIX, AS A READER MEETS IT
 * =============================
 *
 * The equivalence suite proves the two layers agree in memory. This one walks
 * the actual wizard in a real browser and watches the objection survive the
 * journey it used to disappear on:
 *
 *   advanced mode → declare a 5" build → choose a frame the card refuses →
 *   override it → reach the compatibility report → the SAME objection is there,
 *   as a blocker, holding «التالي» shut.
 *
 * Before Phase 1 the last two steps did not happen: the report never read the
 * declared size, so it printed a clean verdict over a build the card had
 * already called incompatible, and «التالي» opened.
 *
 * It also checks the half that must NOT change: a guided reader still cannot
 * select that frame at all.
 *
 * Run: npx tsx --tsconfig web/tsconfig.json scripts/testCompatEquivalenceE2E.ts
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { chromium, type Browser, type Page } from 'playwright';
import { chromiumLaunchOptions } from './lib/browser';

const PORT = 3171;
const BASE = `http://localhost:${PORT}`;
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 900 };

let passed = 0;
const failures: string[] = [];
function ok(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  ok — ${label}`); }
  else { failures.push(label); console.log(`  FAIL — ${label}`); }
}

const freePort = () =>
  spawnSync('bash', ['-c', `fuser -k ${PORT}/tcp 2>/dev/null || true`], { stdio: 'ignore' });

function buildSite() {
  console.log('\n[build] production build of web/ …');
  const res = spawnSync('npx', ['next', 'build'], {
    cwd: 'web', env: process.env, stdio: ['ignore', 'ignore', 'inherit'],
  });
  if (res.status !== 0) throw new Error('next build failed');
}

async function startServer(): Promise<ChildProcess> {
  freePort();
  const proc = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    cwd: 'web', env: process.env, stdio: ['ignore', 'pipe', 'pipe'], detached: true,
  });
  for (let i = 0; i < 60; i++) {
    if (proc.exitCode !== null) throw new Error(`next start exited ${proc.exitCode}`);
    try {
      const r = await fetch(`${BASE}/build`, { redirect: 'manual' });
      if (r.status > 0) return proc;
    } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('server never came up');
}

const consoleErrors: string[] = [];
function watch(page: Page) {
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push(String(e)));
}

const NEXT = '[data-testid="wizard-next"]';

async function tap(page: Page, selector: string) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  await el.evaluate(n => n.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
  await page.waitForTimeout(80);
  await el.click();
}

async function enterPath(page: Page, mode: 'guided' | 'advanced') {
  await page.goto(`${BASE}/build`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/build/wizard?mode=${mode}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="build-questionnaire"]', { timeout: 20000 });
  for (let i = 0; i < 8; i++) {
    const opt = page.locator('[data-testid="build-questionnaire"] section.card button[data-testid]').first();
    if (await opt.count() === 0) break;
    await opt.click();
    await page.waitForTimeout(180);
    if (await page.locator('[data-testid="build-wizard"]').count() > 0) break;
  }
  await page.waitForSelector('[data-testid="build-wizard"]', { timeout: 20000 });
}

async function main() {
  buildSite();
  const server = await startServer();
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch(chromiumLaunchOptions());

    for (const [name, viewport] of [['390px', PHONE], ['1280px', DESKTOP]] as const) {
      console.log(`\n════════ ${name} ════════`);
      const ctx = await browser.newContext({ viewport, locale: 'ar' });
      const page = await ctx.newPage();
      watch(page);

      // ── ADVANCED: the objection must survive to the report ────────────────
      console.log(`\n[1] ${name} — advanced mode: the card's objection reaches the report`);
      await enterPath(page, 'advanced');
      await tap(page, '[data-testid="goal-freestyle"]');
      await page.waitForTimeout(200);
      await tap(page, NEXT);                       // → step 2, size
      await page.waitForTimeout(300);
      await tap(page, '[data-testid="size-5"]');   // declare a 5" build
      await page.waitForTimeout(200);
      await tap(page, NEXT);                       // → step 3, frames
      await page.waitForTimeout(400);

      const refused = await page.evaluate(() => {
        const card = [...document.querySelectorAll('[data-verdict="incompatible"]')]
          .find(c => (c.querySelector('[data-testid^="part-reasons-"]')?.textContent ?? '').includes('مقاس'));
        if (!card) return null;
        return {
          id: card.getAttribute('data-testid'),
          reason: card.querySelector('[data-testid^="part-reasons-"]')?.textContent?.trim(),
          selectable: !(card.querySelector('button[data-testid^="part-select-"]') as HTMLButtonElement)?.disabled,
        };
      });
      ok(`${name}: the CARD refuses a frame that contradicts the declared size`, !!refused);
      ok(`${name}: and states the size rule as the reason`,
        !!refused?.reason && refused.reason.includes('مقاس'));
      ok(`${name}: advanced mode still allows overriding it on purpose`, refused?.selectable === true);

      if (refused) {
        await tap(page, `[data-testid="${refused.id}"] button[data-testid^="part-select-"]`);
        await page.waitForTimeout(250);
        // Fill the rest of the build and walk to the compatibility report.
        await tap(page, NEXT); await page.waitForTimeout(300);          // → step 4 power
        const v6 = page.locator('[data-testid="voltage-6s"]');
        if (await v6.count()) { await tap(page, '[data-testid="voltage-6s"]'); await page.waitForTimeout(250); }
        for (let step = 4; step <= 10; step++) {
          for (const picker of await page.$$('[data-testid^="part-picker-"]')) {
            const btn = await picker.$('button[data-testid^="part-select-"]:not([disabled])');
            if (btn) { await btn.evaluate(n => n.scrollIntoView({ block: 'center' })); await btn.click(); await page.waitForTimeout(110); }
          }
          if (await page.evaluate(() => (document.querySelector('[data-testid="wizard-next"]') as HTMLButtonElement)?.disabled)) break;
          await tap(page, NEXT); await page.waitForTimeout(320);
          if (await page.locator('[data-testid="build-compat-report"]').count()) break;
        }

        const report = await page.evaluate(() => {
          const el = document.querySelector('[data-testid="build-compat-report"]');
          if (!el) return null;
          return {
            text: el.textContent ?? '',
            blocked: !!document.querySelector('[data-testid="build-compat-blocked"]'),
            hasFrameSize: !!document.querySelector('[data-testid="finding-frame-size"]'),
            frameSizeSeverity: document.querySelector('[data-testid="finding-frame-size"]')
              ?.getAttribute('data-severity'),
            nextDisabled: (document.querySelector('[data-testid="wizard-next"]') as HTMLButtonElement)?.disabled,
          };
        });
        ok(`${name}: the reader reaches the compatibility report`, !!report);
        ok(`${name}: the REPORT now carries the frame↔size finding`, report?.hasFrameSize === true);
        ok(`${name}: and carries it as a blocker`, report?.frameSizeSeverity === 'blocker');
        ok(`${name}: so the report announces a blocker`, report?.blocked === true);
        ok(`${name}: and «التالي» is held shut on it`, report?.nextDisabled === true);
        ok(`${name}: the blocked reason is shown to the reader`,
          await page.locator('[data-testid="wizard-blocked-reason"]').count() === 1);
      }

      // ── GUIDED: the half that must NOT change ─────────────────────────────
      console.log(`\n[2] ${name} — guided mode still refuses the same frame outright`);
      await enterPath(page, 'guided');
      await tap(page, '[data-testid="goal-freestyle"]');
      await page.waitForTimeout(200);
      await tap(page, NEXT); await page.waitForTimeout(300);
      await tap(page, '[data-testid="size-5"]'); await page.waitForTimeout(200);
      await tap(page, NEXT); await page.waitForTimeout(400);

      const guided = await page.evaluate(() => ({
        selectableIncompatible: [...document.querySelectorAll('[data-verdict="incompatible"]')]
          .filter(c => !(c.querySelector('button[data-testid^="part-select-"]') as HTMLButtonElement)?.disabled).length,
        foldToggle: !!document.querySelector('[data-testid^="show-blocked-"]'),
      }));
      ok(`${name}: guided mode makes no incompatible frame selectable`,
        guided.selectableIncompatible === 0);
      ok(`${name}: and still folds the refused ones behind their reasons`, guided.foldToggle);

      // ── No unrelated regression ───────────────────────────────────────────
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(`${name}: no horizontal overflow`, overflow <= 0);

      await ctx.close();
    }

    console.log('\n[3] Console health');
    ok('zero console errors', consoleErrors.length === 0);
    consoleErrors.slice(0, 5).forEach(e => console.log(`      ${e}`));
  } finally {
    if (browser) await browser.close();
    try { process.kill(-server.pid!, 'SIGKILL'); } catch { /* already gone */ }
    freePort();
  }

  console.log(`\n[compat e2e] ${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    failures.forEach(f => console.log(`  FAILED: ${f}`));
    process.exit(1);
  }
}

await main();

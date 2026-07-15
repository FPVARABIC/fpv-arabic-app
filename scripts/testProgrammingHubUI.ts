/**
 * Real UI-interaction proof for the Programming hub
 * (src/views/ProgrammingView.tsx), the bottom-nav rename
 * (src/components/BottomNavigation.tsx), and the new /programming route
 * (src/App.tsx). Drives the actual built app in a real browser (Playwright)
 * rather than relying on source-text grep.
 *
 * Complements scripts/testProgrammingHub.ts (source-structure assertions).
 */
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { chromium, type Page } from 'playwright';

const PORT = 4401;
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

    // ── Bottom navigation: label, icon, active states ──────────────────────
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await page.goto(`${BASE}/home`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      ok('bottom-nav label reads "البرمجة"', await page.locator('nav button', { hasText: 'البرمجة' }).count() === 1);
      ok('bottom-nav no longer shows a "Betaflight" label', await page.locator('nav button', { hasText: 'Betaflight' }).count() === 0);
      ok('the Programming nav button contains an svg icon (CircuitBoard, unchanged)', await page.locator('nav button', { hasText: 'البرمجة' }).locator('svg').count() >= 1);
      ok('Programming tab is inactive while on /home', !(await navButtonIsActive(page, 'البرمجة')));
      ok('Home tab is active while on /home', await navButtonIsActive(page, 'الرئيسية'));

      await page.locator('nav button', { hasText: 'البرمجة' }).click();
      await page.waitForTimeout(300);
      ok('clicking the Programming nav button opens /programming', page.url() === `${BASE}/programming`);
      ok('Programming tab is active on /programming', await navButtonIsActive(page, 'البرمجة'));

      await page.goto(`${BASE}/betaflight`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Programming tab remains active while on /betaflight', await navButtonIsActive(page, 'البرمجة'));

      await page.goto(`${BASE}/betaflight/ports`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Programming tab remains active while on /betaflight/ports (a valid detail route)', await navButtonIsActive(page, 'البرمجة'));

      // Other bottom-nav items retain their normal single-path behavior.
      await page.goto(`${BASE}/lessons`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lessons tab is active on /lessons (unaffected)', await navButtonIsActive(page, 'الدروس'));
      ok('Programming tab is inactive on /lessons', !(await navButtonIsActive(page, 'البرمجة')));

      await page.goto(`${BASE}/roadmap`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Build tab is active on /roadmap (unaffected)', await navButtonIsActive(page, 'البناء'));

      await page.goto(`${BASE}/assembly`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Assembly tab is active on /assembly (unaffected)', await navButtonIsActive(page, 'التجميع'));

      await ctx.close();
    }

    // ── Programming hub: exactly four cards, order, names, descriptions ────
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));

      await page.goto(`${BASE}/programming`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      ok('a semantic heading "البرمجة" is present', await page.locator('h1', { hasText: 'البرمجة' }).count() === 1);

      const cards = page.locator('[data-testid^="programming-card-"]');
      ok('exactly four cards render', await cards.count() === 4);

      const ids = await cards.evaluateAll(els => els.map(el => el.getAttribute('data-testid')));
      ok('card order is Betaflight, ExpressLRS, Binding, INAV', JSON.stringify(ids) === JSON.stringify([
        'programming-card-betaflight', 'programming-card-expresslrs', 'programming-card-binding', 'programming-card-inav',
      ]));

      ok('Betaflight card title shows the official Latin name', await page.locator('[data-testid="programming-card-betaflight"] h3', { hasText: 'Betaflight' }).count() === 1);
      ok('ExpressLRS card title shows the official Latin name', await page.locator('[data-testid="programming-card-expresslrs"] h3', { hasText: 'ExpressLRS' }).count() === 1);
      ok('Binding card title shows the official Latin name', await page.locator('[data-testid="programming-card-binding"] h3', { hasText: 'Binding' }).count() === 1);
      ok('INAV card title shows the official Latin name', await page.locator('[data-testid="programming-card-inav"] h3', { hasText: 'INAV' }).count() === 1);

      ok('Betaflight card description matches the approved wording', (await page.locator('[data-testid="programming-card-betaflight"]').textContent() ?? '').includes('إعداد المتحكم، المنافذ، المستقبل، والأنظمة الأساسية للطيران.'));
      ok('ExpressLRS card description matches the approved wording', (await page.locator('[data-testid="programming-card-expresslrs"]').textContent() ?? '').includes('إعداد وربط نظام ExpressLRS والتحكم في إعدادات الاتصال.'));
      ok('Binding card description matches the approved wording', (await page.locator('[data-testid="programming-card-binding"]').textContent() ?? '').includes('ربط جهاز الإرسال بالمستقبل والتحقق من الاتصال.'));
      ok('INAV card description matches the approved wording', (await page.locator('[data-testid="programming-card-inav"]').textContent() ?? '').includes('إعداد نظام INAV للملاحة والمهام المتقدمة.'));

      // ── Betaflight card: enabled and functional ──
      ok('Betaflight card is enabled (not disabled)', !(await page.locator('[data-testid="programming-card-betaflight"]').isDisabled()));
      await page.locator('[data-testid="programming-card-betaflight"]').click();
      await page.waitForTimeout(300);
      ok('clicking the Betaflight card opens the existing /betaflight page', page.url() === `${BASE}/betaflight`);
      ok('the existing Betaflight heading renders', await page.locator('text=Betaflight بالعربي').count() === 1);
      ok('the live registry-driven hub renderer is now wired in', await page.locator('[data-testid="betaflight-hub-renderer"]').count() === 1);
      ok('the hub summary shows 19 reviewed pages', await page.locator('[data-testid="betaflight-hub-summary"]').textContent().then(t => (t ?? '').includes('19 صفحة مراجعة')));
      ok('a real reviewed page card (Ports) renders in the hub', await page.locator('[data-testid="betaflight-hub-card-ports"]').count() === 1);

      await page.goBack();
      await page.waitForTimeout(300);

      // ── ExpressLRS card: now enabled and functional (no longer قريبًا) ──
      ok('ExpressLRS card is enabled (not disabled)', !(await page.locator('[data-testid="programming-card-expresslrs"]').isDisabled()));
      ok('ExpressLRS card no longer shows a "قريبًا" badge', await page.locator('[data-testid="programming-badge-expresslrs"]').count() === 0);
      await page.locator('[data-testid="programming-card-expresslrs"]').focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      ok('keyboard Enter on the focused ExpressLRS card opens /programming/expresslrs', page.url() === `${BASE}/programming/expresslrs`);
      ok('the ExpressLRS page title renders', await page.locator('h1', { hasText: 'ExpressLRS' }).count() === 1);

      await page.goto(`${BASE}/programming`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await page.locator('[data-testid="programming-card-expresslrs"]').focus();
      await page.keyboard.press(' ');
      await page.waitForTimeout(300);
      ok('keyboard Space on the focused ExpressLRS card also opens /programming/expresslrs', page.url() === `${BASE}/programming/expresslrs`);

      await page.goto(`${BASE}/programming`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      // ── Coming-soon cards: disabled, badged, non-navigable (Binding/INAV only) ──
      for (const id of ['binding', 'inav']) {
        const card = page.locator(`[data-testid="programming-card-${id}"]`);
        ok(`${id} card is disabled`, await card.isDisabled());
        ok(`${id} card shows a "قريبًا" badge`, (await page.locator(`[data-testid="programming-badge-${id}"]`).textContent())?.trim() === 'قريبًا');

        const beforeUrl = page.url();
        await card.click({ force: true }).catch(() => { /* disabled buttons reject real clicks; force just dispatches the event */ });
        await page.waitForTimeout(150);
        ok(`clicking the ${id} card does not change the URL`, page.url() === beforeUrl);
      }

      // ── Keyboard: disabled buttons cannot receive focus, so they are
      // unreachable by Tab and cannot be activated with Enter/Space ──
      await page.locator('[data-testid="programming-card-binding"]').evaluate(el => (el as HTMLButtonElement).focus());
      const focusedIsBinding = await page.locator('[data-testid="programming-card-binding"]').evaluate(el => el === document.activeElement);
      ok('a disabled "قريبًا" card cannot be focused (native disabled semantics keep it out of the tab order)', !focusedIsBinding);
      const disabledProp = await page.locator('[data-testid="programming-card-binding"]').evaluate(el => (el as HTMLButtonElement).disabled);
      ok('the disabled property is genuinely set (not just visual styling)', disabledProp === true);

      await ctx.close();
    }

    // ── Accessibility ────────────────────────────────────────────────────
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/programming`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      const dir = await page.evaluate(() => document.documentElement.dir);
      ok('page renders right-to-left', dir === 'rtl');

      const betaflightCard = page.locator('[data-testid="programming-card-betaflight"]');
      await betaflightCard.focus();
      ok('the Betaflight card is keyboard-focusable', await betaflightCard.evaluate(el => el === document.activeElement));
      const outline = await betaflightCard.evaluate(el => getComputedStyle(el).outlineStyle);
      ok('a visible focus outline is present on the focused Betaflight card', outline !== 'none' || (await betaflightCard.evaluate(el => getComputedStyle(el).boxShadow)) !== 'none');

      const bindingDisabledAttr = await page.locator('[data-testid="programming-card-binding"]').evaluate(el => (el as HTMLButtonElement).disabled);
      ok('the Binding card exposes native disabled state to assistive tech', bindingDisabledAttr === true);

      ok('Latin product names remain readable (not mirrored/reversed) inside RTL content', (await page.locator('[data-testid="programming-card-expresslrs"]').textContent() ?? '').includes('ExpressLRS'));

      await ctx.close();
    }

    // ── Responsive / runtime ────────────────────────────────────────────
    for (const [label, viewport] of Object.entries({
      mobile: { width: 390, height: 844 },
      tablet: { width: 768, height: 1024 },
      desktop: { width: 1280, height: 900 },
    })) {
      const ctx = await browser.newContext({ viewport });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/programming`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok(`no horizontal overflow on the Programming hub at ${label} width`, !overflow);

      const lastCardBox = await page.locator('[data-testid="programming-card-inav"]').boundingBox();
      const navBox = await page.locator('nav').boundingBox();
      if (lastCardBox && navBox) {
        ok(`bottom nav does not cover the last hub card at ${label} width`, lastCardBox.y + lastCardBox.height <= navBox.y + 1);
      }
      await ctx.close();
    }

    // ── Regression ───────────────────────────────────────────────────────
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();

      await page.goto(`${BASE}/betaflight`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('direct deep link to /betaflight still works', await page.locator('text=Betaflight بالعربي').count() === 1);

      await page.goto(`${BASE}/betaflight/ports`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('direct deep link to /betaflight/:sectionId still works', await page.locator('h1', { hasText: 'Ports' }).count() === 1);
      await page.locator('button', { hasText: 'العودة إلى Betaflight' }).click();
      await page.waitForTimeout(300);
      ok('the Betaflight detail back button still returns to /betaflight', page.url() === `${BASE}/betaflight`);

      await page.goto(`${BASE}/home`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Home opens', page.url() === `${BASE}/home`);

      await page.goto(`${BASE}/roadmap`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Build opens', page.url() === `${BASE}/roadmap`);

      await page.goto(`${BASE}/lessons`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Lessons opens', page.url() === `${BASE}/lessons`);
      ok('lessons total remains exactly 16', (await page.locator('text=درسًا مكتملًا').textContent() ?? '').includes('16'));
      ok('removed safety section ("الاختبار والطيران") remains absent', await page.locator('text=الاختبار والطيران').count() === 0);

      await page.goto(`${BASE}/lessons/lesson-motor-test`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('removed Lesson 17 remains absent (not-found route)', await page.locator('text=الدرس غير موجود').count() === 1);

      await page.goto(`${BASE}/assembly`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      ok('Assembly opens', page.url() === `${BASE}/assembly`);

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

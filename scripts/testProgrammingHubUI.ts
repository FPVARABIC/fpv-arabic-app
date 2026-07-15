/**
 * Real UI-interaction proof for the redesigned Programming hub
 * (src/views/ProgrammingView.tsx), the bottom-nav rename
 * (src/components/BottomNavigation.tsx), and the /programming route
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

// Waits for the exact expected h1 text rather than an arbitrary sleep —
// after a client-side React Router transition, the previous page's h1 can
// still be visible for a brief moment before React's re-render commits, so a
// generic sleep/visibility wait can race against stale content.
async function waitForH1(page: Page, expectedText: string, timeout = 5000) {
  await page.waitForFunction(
    (t) => document.querySelector('h1')?.textContent?.includes(t),
    expectedText,
    { timeout },
  );
}

function relLuminance([r, g, b]: number[]) {
  const a = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function contrastRatio(l1: number, l2: number) {
  const [a, b] = [l1, l2].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}
function parseColor(str: string): number[] | null {
  const m = str.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  return m[1].split(',').map(s => parseFloat(s.trim()));
}
async function measureContrast(page: Page, selector: string, fallbackBg: number[] = [10, 13, 18]) {
  // Two real rendering effects a naive "first non-transparent backgroundColor"
  // walk gets wrong:
  //  1. A gradient background sets background-image, not background-color —
  //     .programming-card/.programming-shell are gradient-only, so skipping
  //     them entirely would land on the white AppShell frame underneath.
  //  2. Several accents (e.g. .programming-status badges) use a *translucent*
  //     rgba backgroundColor (alpha < 1) — reading its raw r/g/b while
  //     ignoring alpha treats a 16%-opacity teal tint as if it were solid
  //     teal, which is not what a viewer actually sees (it's blended with
  //     the dark card behind it).
  // So: collect every background layer from the element up to the first
  // fully-opaque one (color alpha=1, or an ancestor with no explicit
  // background at all -> fall back to the darkest gradient stop, which is
  // itself opaque in this app's palette), then alpha-composite them in
  // back-to-front order the way the browser actually paints them.
  const result = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const fg = getComputedStyle(el).color;
    const layers: Array<{ color?: string; gradient?: string }> = [];
    let node: Element | null = el;
    while (node) {
      const cs = getComputedStyle(node);
      if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        layers.push({ color: cs.backgroundColor });
        // An explicit alpha=1 color is fully opaque — nothing behind it matters.
        const a = cs.backgroundColor.match(/rgba?\(([^)]+)\)/)?.[1].split(',').map(s => parseFloat(s.trim()))[3];
        if (a === undefined || a >= 1) break;
      } else if (cs.backgroundImage !== 'none') {
        layers.push({ gradient: cs.backgroundImage });
        break; // this app's gradients are all opaque color-stop gradients
      }
      node = node.parentElement;
    }
    return { fg, layers };
  }, selector);
  if (!result) return null;

  const fg = parseColor(result.fg);
  if (!fg) return null;

  // Composite back-to-front: the last collected layer is the outermost
  // (topmost ancestor found), so walk the collected list in reverse.
  let composited: number[] = fallbackBg;
  for (let i = result.layers.length - 1; i >= 0; i--) {
    const layer = result.layers[i];
    if (layer.gradient) {
      const stops = [...layer.gradient.matchAll(/rgba?\(([^)]+)\)/g)].map(m => m[1].split(',').map(s => parseFloat(s.trim())));
      if (stops.length > 0) composited = stops.reduce((darkest, cur) => relLuminance(cur) < relLuminance(darkest) ? cur : darkest);
    } else if (layer.color) {
      const parsed = parseColor(layer.color);
      if (parsed) {
        const [r, g, b, a = 1] = parsed;
        composited = [
          r * a + composited[0] * (1 - a),
          g * a + composited[1] * (1 - a),
          b * a + composited[2] * (1 - a),
        ];
      }
    }
  }

  return contrastRatio(relLuminance(fg), relLuminance(composited));
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
      await waitForH1(page, 'البرمجة');
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

      ok('exactly one h1 is present', await page.locator('h1').count() === 1);
      ok('a semantic heading "البرمجة" is present', await page.locator('h1', { hasText: 'البرمجة' }).count() === 1);

      // ── Continuous dark shell — no white body area behind the content ──
      const shellBg = await page.evaluate(() => {
        const shell = document.querySelector('.programming-shell');
        return shell ? getComputedStyle(shell).backgroundImage || getComputedStyle(shell).backgroundColor : null;
      });
      ok('the .programming-shell wrapper is present and has a real background declaration', !!shellBg && shellBg !== 'none');
      const frameBgUnderContent = await page.evaluate(() => {
        // Sample a point well below the last likely card position but still
        // inside the app frame — it must show the dark shell, not the white
        // AppShell frame bleeding through. A gradient background sets
        // background-image, not background-color, so backgroundColor alone
        // would false-negative here — a real (non-'none') backgroundImage on
        // an ancestor counts as covering whatever sits behind it.
        const el = document.elementFromPoint(195, 700);
        if (!el) return null;
        let node: Element | null = el;
        while (node) {
          const cs = getComputedStyle(node);
          if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') return { type: 'color', value: cs.backgroundColor };
          if (cs.backgroundImage !== 'none') return { type: 'image', value: cs.backgroundImage };
          node = node.parentElement;
        }
        return null;
      });
      ok('no plain white background shows through behind/around the cards',
        !(frameBgUnderContent?.type === 'color' && frameBgUnderContent.value === 'rgb(255, 255, 255)'));

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

      // ── Enabled cards: chevron affordance present, disabled cards: none ──
      ok('Betaflight (enabled) card shows a chevron action affordance', await page.locator('[data-testid="programming-card-betaflight"] svg.lucide-chevron-left').count() === 1);
      ok('ExpressLRS (enabled) card shows a chevron action affordance', await page.locator('[data-testid="programming-card-expresslrs"] svg.lucide-chevron-left').count() === 1);
      ok('Binding (disabled) card shows no chevron', await page.locator('[data-testid="programming-card-binding"] svg.lucide-chevron-left').count() === 0);
      ok('INAV (disabled) card shows no chevron', await page.locator('[data-testid="programming-card-inav"] svg.lucide-chevron-left').count() === 0);

      // ── Betaflight card: enabled and functional ──
      ok('Betaflight card is enabled (not disabled)', !(await page.locator('[data-testid="programming-card-betaflight"]').isDisabled()));
      await page.locator('[data-testid="programming-card-betaflight"]').click();
      await waitForH1(page, 'Betaflight');
      ok('clicking the Betaflight card opens the existing /betaflight page', page.url() === `${BASE}/betaflight`);
      ok('the existing Betaflight heading renders', await page.locator('text=Betaflight بالعربي').count() === 1);
      ok('the live registry-driven hub renderer is now wired in', await page.locator('[data-testid="betaflight-hub-renderer"]').count() === 1);
      ok('the hub summary shows 19 reviewed pages', await page.locator('[data-testid="betaflight-hub-summary"]').textContent().then(t => (t ?? '').includes('19 صفحة مراجعة')));
      ok('a real reviewed page card (Ports) renders in the hub', await page.locator('[data-testid="betaflight-hub-card-ports"]').count() === 1);

      await page.goBack();
      await waitForH1(page, 'البرمجة');

      // ── ExpressLRS card: enabled and functional ──
      ok('ExpressLRS card is enabled (not disabled)', !(await page.locator('[data-testid="programming-card-expresslrs"]').isDisabled()));
      ok('ExpressLRS card no longer shows a "قريبًا" badge', await page.locator('[data-testid="programming-badge-expresslrs"]').count() === 0);
      await page.locator('[data-testid="programming-card-expresslrs"]').focus();
      await page.keyboard.press('Enter');
      await waitForH1(page, 'ExpressLRS');
      ok('keyboard Enter on the focused ExpressLRS card opens /programming/expresslrs', page.url() === `${BASE}/programming/expresslrs`);
      ok('the ExpressLRS page title renders', await page.locator('h1', { hasText: 'ExpressLRS' }).count() === 1);

      await page.goto(`${BASE}/programming`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await page.locator('[data-testid="programming-card-expresslrs"]').focus();
      await page.keyboard.press(' ');
      await waitForH1(page, 'ExpressLRS');
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

        // keyboard: dispatch Enter/Space directly at the disabled element —
        // if it were misusing aria-disabled instead of the real disabled
        // attribute, this could still fire a click handler and navigate.
        await card.evaluate(el => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
        await card.evaluate(el => el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })));
        await page.waitForTimeout(150);
        ok(`dispatching keyboard Enter/Space at the disabled ${id} card does not change the URL`, page.url() === beforeUrl);

        const opacity = await card.evaluate(el => parseFloat(getComputedStyle(el).opacity));
        ok(`${id} card is not faded into near-invisibility (opacity stays high, state is conveyed by badge/border instead)`, opacity >= 0.9);
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

    // ── Typography, readability, contrast (WCAG AA, measured in-browser) ───
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/programming`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      const h1Contrast = await measureContrast(page, 'h1');
      ok(`h1 contrast passes WCAG AA large-text (>= 3:1): measured ${h1Contrast?.toFixed(2)}:1`, (h1Contrast ?? 0) >= 3);

      const subtitleContrast = await measureContrast(page, '.programming-header p');
      ok(`header subtitle contrast passes WCAG AA normal-text (>= 4.5:1): measured ${subtitleContrast?.toFixed(2)}:1`, (subtitleContrast ?? 0) >= 4.5);

      const betaflightTitleContrast = await measureContrast(page, '[data-testid="programming-card-betaflight"] h3');
      ok(`Betaflight card title contrast passes WCAG AA (>= 4.5:1): measured ${betaflightTitleContrast?.toFixed(2)}:1`, (betaflightTitleContrast ?? 0) >= 4.5);

      const bindingTitleContrast = await measureContrast(page, '[data-testid="programming-card-binding"] h3');
      ok(`Binding (disabled) card title contrast passes WCAG AA (>= 4.5:1): measured ${bindingTitleContrast?.toFixed(2)}:1`, (bindingTitleContrast ?? 0) >= 4.5);

      const inavDescContrast = await measureContrast(page, '[data-testid="programming-card-inav"] p');
      ok(`INAV (disabled) card description contrast passes WCAG AA (>= 4.5:1): measured ${inavDescContrast?.toFixed(2)}:1`, (inavDescContrast ?? 0) >= 4.5);

      const badgeContrast = await measureContrast(page, '[data-testid="programming-badge-binding"]');
      ok(`Binding "قريبًا" badge text contrast passes WCAG AA large-UI (>= 3:1): measured ${badgeContrast?.toFixed(2)}:1`, (badgeContrast ?? 0) >= 3);

      const fontSizes = await page.evaluate(() => {
        const sel = ['h1', 'h3', 'p', '[data-testid^="programming-badge-"]'];
        return sel.map(s => {
          const el = document.querySelector(s);
          return el ? parseFloat(getComputedStyle(el).fontSize) : null;
        });
      });
      ok('no routine text renders below 12px', fontSizes.every(px => px === null || px >= 12));

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
      const bindingAriaLabel = await page.locator('[data-testid="programming-card-binding"]').getAttribute('aria-label');
      ok('the Binding card has a meaningful Arabic accessible name describing its unavailable state', !!bindingAriaLabel && bindingAriaLabel.includes('قريبًا'));
      const inavAriaLabel = await page.locator('[data-testid="programming-card-inav"]').getAttribute('aria-label');
      ok('the INAV card has a meaningful Arabic accessible name describing its unavailable state', !!inavAriaLabel && inavAriaLabel.includes('قريبًا'));

      ok('decorative icons inside cards are aria-hidden', await page.locator('[data-testid="programming-card-betaflight"] svg[aria-hidden="true"]').count() >= 1);

      ok('Latin product names remain readable (not mirrored/reversed) inside RTL content', (await page.locator('[data-testid="programming-card-expresslrs"]').textContent() ?? '').includes('ExpressLRS'));

      await ctx.close();
    }

    // ── Responsive / runtime ────────────────────────────────────────────
    for (const [label, viewport] of Object.entries({
      mobile: { width: 390, height: 844 },
      tablet: { width: 768, height: 1024 },
      desktop: { width: 1440, height: 900 },
    })) {
      const ctx = await browser.newContext({ viewport });
      const page = await ctx.newPage();
      const errs: string[] = [];
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      page.on('pageerror', e => errs.push(String(e)));

      await page.goto(`${BASE}/programming`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ok(`no horizontal overflow on the Programming hub at ${label} width`, !overflow);

      const cardCount = await page.locator('[data-testid^="programming-card-"]').count();
      ok(`all four cards remain discoverable at ${label} width`, cardCount === 4);

      const lastCardBox = await page.locator('[data-testid="programming-card-inav"]').boundingBox();
      const navBox = await page.locator('nav').boundingBox();
      if (lastCardBox && navBox) {
        ok(`bottom nav does not cover the last hub card at ${label} width`, lastCardBox.y + lastCardBox.height <= navBox.y + 1);
      }
      ok(`no console error at ${label} width`, errs.every(e => /firestore|ERR_CONNECTION_RESET|ERR_TUNNEL_CONNECTION_FAILED/i.test(e)));
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

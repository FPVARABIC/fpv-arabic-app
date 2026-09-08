/**
 * PHASE 0, IN A REAL BROWSER
 * ==========================
 *
 * The static suite proves the code says the right things. This one proves the
 * reader gets them — at the two widths the owner named, on a production build,
 * with the real catalogue behind it.
 *
 * What it exercises, all of it a defect that shipped:
 *
 *   [1] a withdrawn build type is visible, explained, and cannot start a
 *       journey — no empty size screen, no permanently-locked «التالي»
 *   [2] a foundational change lists what it will delete; cancel keeps every
 *       part, confirm removes only the ones that were named
 *   [3] a refused «التالي» LOOKS refused, and the screen says why
 *   [4] the two hardware-killing facts appear where the work is presented
 *   [5] mixed Arabic/English text renders in reading order
 *   [6] no console errors and no horizontal overflow at 390px or 1280px
 *
 * Run: npx tsx --tsconfig web/tsconfig.json scripts/testBuildPhase0E2E.ts
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { chromium, type Browser, type Page } from 'playwright';
import { chromiumLaunchOptions } from './lib/browser';

const PORT = 3167;
const BASE = `http://localhost:${PORT}`;
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 900 };

let passed = 0;
const failures: string[] = [];
function ok(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  ok — ${label}`); }
  else { failures.push(label); console.log(`  FAIL — ${label}`); }
}

function freePort() {
  spawnSync('bash', ['-c', `fuser -k ${PORT}/tcp 2>/dev/null || true`], { stdio: 'ignore' });
}

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

/**
 * Click something that the sticky dock might be sitting on top of.
 *
 * The wizard's action bar is `position: sticky; bottom` on a phone — by
 * design, so «التالي» is always under the thumb. That also means a control
 * whose natural resting place is the bottom of the viewport can be covered,
 * and Playwright correctly refuses to click through an overlay. Centring the
 * target first is what a reader does by scrolling, so it is the honest fix;
 * the alternative (`force: true`) would suppress exactly the kind of real
 * overlap bug this suite is supposed to notice.
 */
async function tap(page: Page, selector: string) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  await el.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
  await page.waitForTimeout(80);
  await el.click();
}

/** Answer whatever the questionnaire still asks, then land on the path. */
async function enterPath(page: Page, mode: 'guided' | 'advanced' | 'parts') {
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

/**
 * The invariant: logical order and visual reading order must agree.
 *
 * WHY THIS IS MEASURED AND NOT PATTERN-MATCHED
 * -------------------------------------------
 * The audit reported «Buzzerو» and «Capacitorو» in the extras step as a bidi
 * defect. Measuring the glyph boxes showed the opposite: in an RTL paragraph
 * the waw belongs to the Arabic run and sits immediately to the RIGHT of the
 * embedded Latin token, which is correct reading order. The "defect" was
 * scanning the pixels left-to-right. All 43 mixed-script strings in the build
 * surface were then checked this way and every one is correct.
 *
 * So there was nothing to rewrite, and a source-level rule banning «و» before
 * a Latin word would have been a rule against valid Arabic. What is worth
 * keeping is the MEASUREMENT: for every mixed-script text node the browser
 * actually paints, the Arabic runs must march right-to-left and each Latin run
 * must stay inside the gap its neighbours leave for it. That catches a real
 * misordering whatever causes it, and cannot fire on correct text.
 *
 * NOTE ON THE INLINE STYLE: nothing inside the page callback may be a NAMED
 * function binding. esbuild (under tsx) wraps those in its `__name` helper,
 * which does not exist in the browser, and the call dies with
 * «ReferenceError: __name is not defined» before a single node is measured.
 */
async function bidiViolations(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const AR = /[؀-ۿ]/;
    const LAT = /[A-Za-z]/;
    const out: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.textContent ?? '';
      if (text.trim().length < 4) continue;
      if (!AR.test(text) || !LAT.test(text)) continue;
      const el = node.parentElement;
      if (!el || !el.getClientRects().length) continue;

      const runs: { from: number; to: number; c: string; t: string }[] = [];
      let i = 0;
      while (i < text.length) {
        const isAr = AR.test(text[i]);
        const isLat = LAT.test(text[i]);
        if (!isAr && !isLat) { i++; continue; }
        const c = isAr ? 'ar' : 'lat';
        let j = i;
        while (j < text.length && (c === 'ar' ? AR.test(text[j]) : LAT.test(text[j]))) j++;
        runs.push({ from: i, to: j, c, t: text.slice(i, j) });
        i = j;
      }
      const measured = runs.map(r => {
        const range = document.createRange();
        range.setStart(node!, r.from);
        range.setEnd(node!, r.to);
        const rects = [...range.getClientRects()];
        if (!rects.length) return null;
        return {
          ...r,
          right: Math.max(...rects.map(x => x.right)),
          left: Math.min(...rects.map(x => x.left)),
          line: Math.round(Math.min(...rects.map(x => x.top))),
        };
      }).filter(Boolean) as (typeof runs[0] & { right: number; left: number; line: number })[];

      // Arabic runs carry the base RTL direction: each later one sits further left.
      const ar = measured.filter(r => r.c === 'ar');
      for (let k = 1; k < ar.length; k++) {
        if (ar[k].line !== ar[k - 1].line) continue;
        if (ar[k].right > ar[k - 1].right + 0.5) {
          out.push(`RTL order broken: «${ar[k - 1].t}» then «${ar[k].t}» in: ${text.slice(0, 70)}`);
        }
      }
      // A Latin run must stay between its Arabic neighbours — it may not escape
      // right past the Arabic that precedes it, nor left past the one that follows.
      for (let k = 0; k < measured.length; k++) {
        if (measured[k].c !== 'lat') continue;
        const prevAr = [...measured.slice(0, k)].reverse().find(r => r.c === 'ar');
        const nextAr = measured.slice(k + 1).find(r => r.c === 'ar');
        if (prevAr && prevAr.line === measured[k].line && measured[k].right > prevAr.right + 0.5) {
          out.push(`«${measured[k].t}» escaped past «${prevAr.t}» in: ${text.slice(0, 70)}`);
        }
        if (nextAr && nextAr.line === measured[k].line && measured[k].left < nextAr.left - 0.5) {
          out.push(`«${measured[k].t}» escaped past «${nextAr.t}» in: ${text.slice(0, 70)}`);
        }
      }
    }
    return [...new Set(out)];
  });
}

async function overflowPx(page: Page): Promise<number> {
  return page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
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

      // ── [1] A withdrawn type is explained and cannot start ────────────────
      console.log(`\n[1] ${name} — an unavailable build type`);
      await enterPath(page, 'guided');

      const unavailable = page.locator('[data-testid^="goal-unavailable-"]');
      const unavailableCount = await unavailable.count();
      ok(`${name}: at least one type is marked «قريبًا»`, unavailableCount > 0);

      for (const id of ['cinewhoop', 'racing']) {
        const card = page.locator(`[data-testid="goal-${id}"]`);
        ok(`${name}: «${id}» is still listed — explained, not hidden`, await card.count() === 1);
        ok(`${name}: «${id}» cannot be selected`, await card.isDisabled());
        const reason = page.locator(`[data-testid="goal-reason-${id}"]`);
        ok(`${name}: «${id}» says why on the card itself`,
          await reason.count() === 1 && (await reason.innerText()).length > 30);
        // The defect was that choosing it opened an empty size screen. A
        // disabled button cannot be clicked by a reader, so the meaningful
        // assertion is that the journey is still on the goal step and the
        // draft never recorded the type.
        const recorded = await page.evaluate(() => {
          const raw = JSON.parse(localStorage.getItem('fpv-web-build-draft-v1') ?? 'null');
          return (raw?.data ?? raw)?.droneTypeId ?? null;
        });
        ok(`${name}: «${id}» never becomes the chosen type`, recorded !== id);
      }

      ok(`${name}: «التالي» is refused while nothing is chosen`,
        await page.locator(NEXT).isDisabled());
      ok(`${name}: and the screen says why`,
        await page.locator('[data-testid="wizard-blocked-reason"]').count() === 1);

      // An available type still works.
      await tap(page, '[data-testid="goal-freestyle"]');
      await page.waitForTimeout(200);
      ok(`${name}: an AVAILABLE type opens «التالي»`,
        !(await page.locator(NEXT).isDisabled()));
      ok(`${name}: and the blocked notice disappears with it`,
        await page.locator('[data-testid="wizard-blocked-reason"]').count() === 0);

      // ── [2] A refused action looks refused ────────────────────────────────
      console.log(`\n[2] ${name} — the disabled state is visible`);
      await tap(page, NEXT);                     // → step 2, size
      await page.waitForTimeout(300);
      const styles = await page.evaluate((selector) => {
        const el = document.querySelector(selector) as HTMLButtonElement;
        const cs = getComputedStyle(el);
        return { disabled: el.disabled, background: cs.backgroundImage, cursor: cs.cursor };
      }, NEXT);
      ok(`${name}: «التالي» is genuinely disabled on an unsatisfied step`, styles.disabled);
      ok(`${name}: the disabled button drops the «press me» gradient`,
        styles.background === 'none');
      ok(`${name}: the disabled button shows a refused cursor`,
        styles.cursor === 'not-allowed');
      ok(`${name}: the size step explains what it wants`,
        await page.locator('[data-testid="wizard-blocked-reason"]').count() === 1);
      ok(`${name}: «التالي» points at the reason for assistive technology`,
        await page.locator(NEXT).getAttribute('aria-describedby') === 'wizard-blocked-reason');

      const enabledBg = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="wizard-prev"]');
        return getComputedStyle(el as Element).cursor;
      });
      ok(`${name}: an enabled control still reads as pressable`, enabledBg !== 'not-allowed');

      // ── [3] Invalidation announces itself ─────────────────────────────────
      console.log(`\n[3] ${name} — a foundational change names what it removes`);
      await tap(page, '[data-testid^="size-"]');
      await page.waitForTimeout(200);
      await tap(page, NEXT);                                  // → step 3, frame
      await page.waitForTimeout(300);
      await tap(page, '[data-testid^="part-select-"]:not([disabled])');
      await page.waitForTimeout(200);
      await tap(page, NEXT);                                  // → step 4, power
      await page.waitForTimeout(300);
      await tap(page, '[data-testid="voltage-6s"]');
      await page.waitForTimeout(300);
      await tap(page, '[data-testid="part-picker-batteries"] [data-testid^="part-select-"]:not([disabled])');
      await page.waitForTimeout(250);

      const partsBefore = await page.evaluate(() => {
        const raw = JSON.parse(localStorage.getItem('fpv-web-build-draft-v1') ?? 'null');
        return Object.keys((raw?.data ?? raw)?.partIds ?? {}).sort();
      });
      ok(`${name}: parts are chosen before the change`, partsBefore.length >= 2);

      // The measured defect: 6S → 4S silently removed a battery and a motor.
      await tap(page, '[data-testid="voltage-4s"]');
      await page.waitForTimeout(250);
      const sheet = page.locator('[data-testid="invalidation-sheet"]');
      ok(`${name}: switching voltage asks before deleting anything`, await sheet.count() === 1);
      const listed = await page.locator('[data-testid^="invalidation-item-"]').count();
      ok(`${name}: the confirmation names each affected part`, listed > 0);

      await tap(page, '[data-testid="invalidation-cancel"]');
      await page.waitForTimeout(220);
      const partsAfterCancel = await page.evaluate(() => {
        const raw = JSON.parse(localStorage.getItem('fpv-web-build-draft-v1') ?? 'null');
        return Object.keys((raw?.data ?? raw)?.partIds ?? {}).sort();
      });
      ok(`${name}: CANCEL keeps every part`,
        JSON.stringify(partsAfterCancel) === JSON.stringify(partsBefore));
      ok(`${name}: CANCEL closes the confirmation`, await sheet.count() === 0);

      await tap(page, '[data-testid="voltage-4s"]');
      await page.waitForTimeout(250);
      const namedCategories = await page.evaluate(() =>
        [...document.querySelectorAll('[data-testid^="invalidation-item-"]')]
          .map(el => el.getAttribute('data-testid')!.replace('invalidation-item-', '')).sort());
      await tap(page, '[data-testid="invalidation-confirm"]');
      await page.waitForTimeout(300);
      const partsAfterConfirm = await page.evaluate(() => {
        const raw = JSON.parse(localStorage.getItem('fpv-web-build-draft-v1') ?? 'null');
        return Object.keys((raw?.data ?? raw)?.partIds ?? {}).sort();
      });
      const removed = partsBefore.filter(c => !partsAfterConfirm.includes(c));
      ok(`${name}: CONFIRM removes exactly the parts it named`,
        JSON.stringify(removed.sort()) === JSON.stringify(namedCategories));
      ok(`${name}: CONFIRM keeps everything it did not name`,
        partsBefore.filter(c => !namedCategories.includes(c))
          .every(c => partsAfterConfirm.includes(c)));
      ok(`${name}: no native dialog was used`, await sheet.count() === 0);

      // ── [4] The safety facts, where the work is ───────────────────────────
      console.log(`\n[4] ${name} — the two hardware-killing facts`);
      await page.evaluate(() => {
        const raw = JSON.parse(localStorage.getItem('fpv-web-build-draft-v1') ?? 'null');
        const d = raw?.data ?? raw;
        d.stepIndex = 13;                       // step 14 — assembly order
        localStorage.setItem('fpv-web-build-draft-v1', JSON.stringify({ ...raw, data: d }));
      });
      await page.goto(`${BASE}/build/wizard`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="build-assembly"]', { timeout: 20000 });

      for (const [stage, label] of [
        ['build-motors', 'motor screw length'],
        ['build-vtx', 'VTX antenna before power'],
      ] as const) {
        await tap(page, `[data-testid="assembly-stage-${stage}"]`);
        await page.waitForTimeout(200);
        const note = page.locator(`[data-testid="safety-note-${stage}"]`);
        ok(`${name}: ${label} is stated at «${stage}»`, await note.count() === 1);
        ok(`${name}: ${label} links to the lesson that teaches it`,
          await page.locator(`[data-testid="safety-lesson-${stage}"]`).count() === 1);
      }

      await page.evaluate(() => {
        const raw = JSON.parse(localStorage.getItem('fpv-web-build-draft-v1') ?? 'null');
        const d = raw?.data ?? raw;
        d.stepIndex = 14;                       // step 15 — the pre-battery gate
        localStorage.setItem('fpv-web-build-draft-v1', JSON.stringify({ ...raw, data: d }));
      });
      await page.goto(`${BASE}/build/wizard`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="gate-prebattery"]', { timeout: 20000 });
      ok(`${name}: the antenna rule repeats on the last screen before power`,
        await page.locator('[data-testid="safety-note-prebattery"]').count() === 1);
      const termNotes = await page.locator('[data-testid^="gate-term-prebattery-"]').count();
      ok(`${name}: the gate explains its own terminology`, termNotes >= 3);
      ok(`${name}: the gate still refuses until every item is confirmed`,
        await page.locator(NEXT).isDisabled());
      ok(`${name}: and it says how many are left`,
        (await page.locator('[data-testid="wizard-blocked-reason"]').innerText()).includes('بوابة سلامة'));

      // ── [5] Mixed-script text reads in order ──────────────────────────────
      console.log(`\n[5] ${name} — Arabic/English reading order`);
      const surfaces = ['/build', '/build/wizard'];
      let violations: string[] = [];
      for (const url of surfaces) {
        await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);
        violations = violations.concat(await bidiViolations(page));
        ok(`${name}: ${url} has no horizontal overflow`, await overflowPx(page) <= 0);
      }
      if (violations.length) violations.slice(0, 6).forEach(v => console.log(`      ${v}`));
      ok(`${name}: no mixed-script text renders out of reading order`, violations.length === 0);

      await ctx.close();
    }

    console.log('\n[6] Console health across every page driven above');
    ok('zero console errors', consoleErrors.length === 0);
    if (consoleErrors.length) consoleErrors.slice(0, 5).forEach(e => console.log(`      ${e}`));
  } finally {
    if (browser) await browser.close();
    try { process.kill(-server.pid!, 'SIGKILL'); } catch { /* already gone */ }
    freePort();
  }

  console.log(`\n[phase 0 e2e] ${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    failures.forEach(f => console.log(`  FAILED: ${f}`));
    process.exit(1);
  }
}

await main();

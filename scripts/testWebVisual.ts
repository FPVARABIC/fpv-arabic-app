/**
 * Visual regression — the SHAPE of every page, measured, not assumed.
 *
 * WHY THIS SUITE EXISTS
 * ---------------------
 * The owner's phone screenshots caught what every DOM assertion missed: a
 * 723px-wide page on a 390px phone, met mid-horizontal-scroll, reading as a
 * «broken» header and a clipped bottom bar. Text-presence tests are blind to
 * that entire class of failure. This suite measures geometry:
 *
 *   · document.scrollWidth vs innerWidth on EVERY route at EVERY size
 *   · the bottom bar: full-bleed, six whole tabs, labels unclipped
 *   · the page reserving room above the fixed bar
 *   · RTL on the root element
 *   · every step of the build wizard at the tightest width, not just step one
 *
 * It also writes screenshots to docs/visual-baseline/ — a committed record of
 * what the product looked like when it was last known-good, so a later
 * regression is a diff somebody can SEE, not an adjective in a bug report.
 *
 * Dynamic sample pages (an article, a project, a store section…) are
 * DISCOVERED from the running site's own index pages rather than hardcoded,
 * so renamed content never turns this suite into a liar.
 *
 * Run: npx tsx --tsconfig web/tsconfig.json scripts/testWebVisual.ts
 *      SKIP_BUILD=1 to reuse an existing web/.next build.
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { chromium, type Browser, type Page } from 'playwright';
import { chromiumLaunchOptions } from './lib/browser';

const PORT = 3162;
const BASE = `http://localhost:${PORT}`;
const SHOTS = path.resolve('docs/visual-baseline');

let passed = 0;
const failures: string[] = [];
function ok(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  ok — ${label}`); }
  else { failures.push(label); console.log(`  FAIL — ${label}`); }
}

const freePort = () =>
  spawnSync('bash', ['-c', `fuser -k ${PORT}/tcp 2>/dev/null || true`], { stdio: 'ignore' });

function buildSite() {
  if (process.env.SKIP_BUILD === '1') { console.log('[build] skipped (SKIP_BUILD=1)'); return; }
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
    try { const r = await fetch(`${BASE}/build`); if (r.status > 0) return proc; }
    catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('server never came up');
}

/** The geometry facts a page must satisfy. Runs INSIDE the page. */
async function measure(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const inner = window.innerWidth;
    const offenders: string[] = [];
    if (doc.scrollWidth > inner + 1) {
      for (const el of Array.from(document.querySelectorAll('*'))) {
        if (el.closest('.skip-link') || el.classList.contains('skip-link')) continue;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > inner + 2 && getComputedStyle(el).position !== 'absolute') {
          offenders.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''}[${el.getAttribute('data-testid') ?? ''}] w=${Math.round(r.width)}`);
          if (offenders.length >= 4) break;
        }
      }
    }

    const nav = document.querySelector('nav.nav-bottom');
    let navFacts: Record<string, unknown> | null = null;
    if (nav) {
      const nr = nav.getBoundingClientRect();
      const tabs = Array.from(nav.querySelectorAll('a.nav-tab'));
      const labels = Array.from(nav.querySelectorAll('.nav-tab-label')) as HTMLElement[];
      navFacts = {
        x: Math.round(nr.x), width: Math.round(nr.width), bottomGap: Math.round(window.innerHeight - nr.bottom),
        tabCount: tabs.length,
        tabsInside: tabs.every(t => {
          const r = t.getBoundingClientRect();
          return r.left >= nr.left - 1 && r.right <= nr.right + 1;
        }),
        labelsUnclipped: labels.every(l => l.scrollWidth <= l.clientWidth + 1),
        bodyReserves: parseFloat(getComputedStyle(document.body).paddingBottom) >= nr.height - 4,
      };
    }

    return {
      dir: doc.getAttribute('dir'),
      scroll: doc.scrollWidth,
      inner,
      offenders,
      nav: navFacts,
    };
  });
}

async function auditPage(page: Page, label: string, width: number, expectNav: boolean) {
  const m = await measure(page);
  ok(`${label} @${width}: RTL`, m.dir === 'rtl');
  ok(`${label} @${width}: no horizontal overflow (${m.scroll}/${m.inner})${m.offenders.length ? ' — ' + m.offenders.join(' · ') : ''}`,
    m.scroll <= m.inner + 1);
  if (expectNav && width < 900) {
    ok(`${label} @${width}: bottom bar full-bleed with 6 whole tabs`,
      !!m.nav && m.nav.x === 0 && Math.abs((m.nav.width as number) - m.inner) <= 1
      && m.nav.tabCount === 6 && m.nav.tabsInside === true && (m.nav.bottomGap as number) <= 1);
    ok(`${label} @${width}: tab labels unclipped`, !!m.nav && m.nav.labelsUnclipped === true);
    ok(`${label} @${width}: the page reserves room above the fixed bar`,
      !!m.nav && m.nav.bodyReserves === true);
  }
}

/** Pull the first same-origin link matching a prefix off an index page. */
async function discover(page: Page, indexPath: string, prefix: string): Promise<string | null> {
  await page.goto(`${BASE}${indexPath}`, { waitUntil: 'domcontentloaded' });
  return page.evaluate(pfx => {
    const a = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
      .find(x => x.getAttribute('href')?.startsWith(pfx) && x.getAttribute('href') !== pfx);
    return a?.getAttribute('href') ?? null;
  }, prefix);
}

const consoleErrors: string[] = [];
function watch(page: Page) {
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(`${page.url()}: ${m.text()}`); });
  page.on('pageerror', e => consoleErrors.push(`${page.url()}: ${String(e)}`));
}

const MOBILE = [
  { w: 320, h: 700 }, { w: 360, h: 800 }, { w: 375, h: 812 },
  { w: 390, h: 844 }, { w: 412, h: 915 }, { w: 430, h: 932 },
];
const TABLET = [{ w: 768, h: 1024 }, { w: 1024, h: 768 }];
const DESKTOP = [{ w: 1280, h: 900 }, { w: 1440, h: 900 }];

/** Sizes screenshotted (committed baseline) vs sizes only measured. */
const SHOT_WIDTHS = new Set([390, 1440]);

const slug = (route: string) =>
  (route === '/' ? 'home' : route.replace(/^\//, '').replace(/[/?=&]+/g, '-'));

async function main() {
  buildSite();
  const server = await startServer();
  let browser: Browser | null = null;
  mkdirSync(path.join(SHOTS, 'mobile-390'), { recursive: true });
  mkdirSync(path.join(SHOTS, 'desktop-1440'), { recursive: true });
  mkdirSync(path.join(SHOTS, 'wizard-360'), { recursive: true });

  try {
    browser = await chromium.launch(chromiumLaunchOptions());

    // ── Discover one real page of every dynamic kind ───────────────────────
    // Sequential on ONE page — parallel gotos on a shared page abort each other.
    const scout = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    const dynamicSamples: string[] = [];
    for (const [index, prefix] of [
      ['/kb', '/kb/'], ['/projects', '/projects/'], ['/store', '/store/'],
      ['/betaflight', '/betaflight/'], ['/diagnose', '/diagnose/'],
    ] as const) {
      const found = await discover(scout, index, prefix);
      if (found) dynamicSamples.push(found);
    }
    // An article, one level below the module.
    const article = dynamicSamples[0] ? await discover(scout, dynamicSamples[0], `${dynamicSamples[0]}/`) : null;
    await scout.context().close();

    const ROUTES: string[] = [
      '/', '/build', '/programming', '/programming/expresslrs', '/programming/edgetx',
      '/programming/video', '/betaflight', '/kb', '/glossary', '/diagnose',
      '/projects', '/store', '/store/cart', '/search', '/search?q=UART',
      '/signin', '/settings', '/contact', '/about', '/project',
      ...new Set([...dynamicSamples, ...(article ? [article] : [])]),
    ];
    console.log(`\n[audit] ${ROUTES.length} routes × ${MOBILE.length + TABLET.length + DESKTOP.length} sizes`);

    // ── Every route, every size ────────────────────────────────────────────
    for (const { w, h } of [...MOBILE, ...TABLET, ...DESKTOP]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage(); watch(page);
      for (const route of ROUTES) {
        await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(120);
        await auditPage(page, route, w, true);
        if (SHOT_WIDTHS.has(w)) {
          const dir = w === 390 ? 'mobile-390' : 'desktop-1440';
          await page.screenshot({ path: path.join(SHOTS, dir, `${slug(route)}.png`) });
        }
      }
      await ctx.close();
    }

    // ── The wizard: all twenty steps at the tightest width ─────────────────
    console.log('\n[wizard] every step at 360×800');
    {
      const ctx = await browser.newContext({ viewport: { width: 360, height: 800 } });
      const page = await ctx.newPage(); watch(page);
      const shot = (name: string) =>
        page.screenshot({ path: path.join(SHOTS, 'wizard-360', `${name}.png`) });

      await page.goto(`${BASE}/build/wizard?mode=guided`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="exp-beginner"]');
      await auditPage(page, 'wizard/questions', 360, true);
      await shot('questionnaire');
      await page.click('[data-testid="exp-beginner"]');
      await page.waitForSelector('[data-testid="tier-budget"]'); await page.click('[data-testid="tier-budget"]');
      await page.waitForSelector('[data-testid="video-skip"]'); await page.click('[data-testid="video-skip"]');
      await page.waitForSelector('[data-testid="rc-skip"]'); await page.click('[data-testid="rc-skip"]');

      const nextBtn = '[data-testid="wizard-next"]';
      const progress = '[data-testid="wizard-progress"]';
      const atStep = (n: number) => page.waitForFunction(
        ([sel, want]) => Number(document.querySelector(sel as string)?.textContent?.match(/\d+/)?.[0]) === want,
        [progress, n] as const, { timeout: 20000 });
      const advance = async (n: number) => { await page.click(nextBtn); await atStep(n); };
      const pickFirst = (cat: string) =>
        page.locator(`[data-testid="part-picker-${cat}"] [data-testid^="part-select-"]:not([disabled])`).first().click();
      const confirmGate = async (gateId: string) => {
        const boxes = page.locator(`[data-testid^="gate-item-${gateId}-"]`);
        const count = await boxes.count();
        for (let i = 0; i < count; i++) await boxes.nth(i).check();
      };

      await atStep(1);
      const audit = (name: string) => auditPage(page, `wizard/${name}`, 360, true);

      await audit('step-01-goal'); await shot('step-01-goal');
      await page.click('[data-testid="goal-freestyle"]'); await advance(2);
      await audit('step-02-size');
      await page.click('[data-testid="size-5"]'); await advance(3);
      await audit('step-03-frame'); await shot('step-03-frame');
      await pickFirst('frames'); await advance(4);
      await audit('step-04-power');
      await page.click('[data-testid="voltage-6s"]');
      await page.waitForSelector('[data-testid="part-picker-batteries"]');
      await audit('step-04-power-batteries');
      await pickFirst('batteries'); await advance(5);
      await audit('step-05-propulsion'); await shot('step-05-propulsion');
      await pickFirst('motors'); await pickFirst('propellers'); await advance(6);
      await audit('step-06-esc'); await pickFirst('escs'); await advance(7);
      await audit('step-07-fc'); await pickFirst('flightControllers'); await advance(8);
      await audit('step-08-rc'); await pickFirst('receivers'); await advance(9);
      await audit('step-09-video'); await pickFirst('videoUnits'); await advance(10);
      await audit('step-10-extras'); await advance(11);
      await page.waitForSelector('[data-testid="build-compat-report"]');
      await audit('step-11-compat'); await shot('step-11-compat');
      await advance(12);
      await page.waitForSelector('[data-testid="build-bom"]');
      await audit('step-12-bom'); await shot('step-12-bom');
      await advance(13); await audit('step-13-wiring'); await shot('step-13-wiring');
      await advance(14); await audit('step-14-assembly');
      await advance(15); await audit('step-15-prebattery'); await shot('step-15-gate');
      await confirmGate('prebattery'); await advance(16);
      await audit('step-16-software');
      await advance(17); await audit('step-17-motortest'); await confirmGate('motortest');
      await advance(18); await audit('step-18-failsafe'); await confirmGate('failsafe');
      await advance(19); await audit('step-19-preflight'); await confirmGate('preflight');
      await advance(20); await audit('step-20-firstflight'); await shot('step-20-firstflight');

      await ctx.close();
    }

    // ── The owned-parts screen — where the real-phone bug lived ────────────
    console.log('\n[wizard] the owned-parts screen at every mobile width');
    for (const { w, h } of MOBILE) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage(); watch(page);
      await page.goto(`${BASE}/build/wizard?mode=parts`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="exp-beginner"]');
      await page.click('[data-testid="exp-beginner"]');
      await page.waitForSelector('[data-testid="tier-budget"]'); await page.click('[data-testid="tier-budget"]');
      await page.waitForSelector('[data-testid="video-skip"]'); await page.click('[data-testid="video-skip"]');
      await page.waitForSelector('[data-testid="rc-skip"]'); await page.click('[data-testid="rc-skip"]');
      await page.waitForSelector('[data-testid="build-owned-parts"]');
      await auditPage(page, 'wizard/owned-parts', w, true);
      if (w === 390) await page.screenshot({ path: path.join(SHOTS, 'mobile-390', 'wizard-owned-parts.png') });
      await ctx.close();
    }

    console.log('\n[console] hygiene across every audited page');
    ok(`no console or page errors (${consoleErrors.length})`, consoleErrors.length === 0);
    if (consoleErrors.length) console.log(consoleErrors.slice(0, 6).join('\n'));
  } finally {
    if (browser) await browser.close();
    if (server.pid) { try { process.kill(-server.pid); } catch { /* gone */ } }
    freePort();
  }

  console.log(`\n${failures.length === 0 ? '✅' : '❌'} testWebVisual: ${passed} passed, ${failures.length} failed`);
  if (failures.length > 0) { failures.slice(0, 30).forEach(f => console.log(`   FAIL — ${f}`)); process.exit(1); }
}

main().catch(e => { console.error(e); process.exit(1); });

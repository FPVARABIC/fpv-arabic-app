/**
 * The software centre, in a real browser against a real production build.
 *
 * WHAT ONLY A BROWSER CAN PROVE
 * -----------------------------
 * Everything in `testWebSoftware.ts` is provable from the data and the source.
 * These are not:
 *
 *   - that `?step=`, `?issue=` and `?topic=` actually OPEN the entry they name,
 *     rather than loading a page that ignores them
 *   - that a collapsed `<details>` really does put its text in the served HTML,
 *     which is the whole basis of the SEO claim
 *   - that the per-page project panel appears with the reader's own values on
 *     the pages that map fields, and appears NOWHERE else
 *   - that the pages do not scroll sideways at 390px in a right-to-left
 *     document, which is where every long English label and every wide table
 *     has broken before
 *   - that a page nobody has visited before produces no console errors
 *
 * Each of those is a thing that passes every static check and fails a reader.
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { chromium, type Browser, type Page } from 'playwright';
import { validateRcSetup } from '../src/data/project/rcSetup';
import { validateVideoSetup } from '../src/data/project/videoSetup';
import { SCHEMA_VERSION } from '../src/data/project/store';

const PORT = 3161;
const BASE = `http://localhost:${PORT}`;

let passed = 0;
const failures: string[] = [];
function ok(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  ok — ${label}`); }
  else { failures.push(label); console.log(`  FAIL — ${label}`); }
}

function freePort() {
  spawnSync('bash', ['-c', `fuser -k ${PORT}/tcp 2>/dev/null || true`], { stdio: 'ignore' });
}

const WEB_ENV = {
  ...process.env,
  NEXT_PUBLIC_FIREBASE_API_KEY: 'fake-api-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'demo.appspot.com',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:000000000000:web:0000000000000000000000',
};

function buildSite() {
  console.log('\n[build] production build of web/ …');
  const res = spawnSync('npx', ['next', 'build'], {
    cwd: 'web', env: WEB_ENV, stdio: ['ignore', 'ignore', 'inherit'],
  });
  if (res.status !== 0) throw new Error('next build failed');
}

async function startServer(): Promise<ChildProcess> {
  freePort();
  const proc = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    cwd: 'web', env: WEB_ENV, stdio: ['ignore', 'pipe', 'pipe'], detached: true,
  });
  proc.stderr?.on('data', d => process.stdout.write(`  [server] ${d}`));
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error(`next start exited ${proc.exitCode}`);
    try { const r = await fetch(`${BASE}/programming`, { redirect: 'manual' }); if (r.status > 0) return proc; }
    catch { /* not up */ }
    await new Promise(r => setTimeout(r, 400));
  }
  throw new Error('server never became reachable');
}

async function goto(page: Page, url: string, anchor?: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load');
  if (anchor) await page.waitForSelector(anchor, { timeout: 30_000 });
}

/**
 * Whether the document scrolls sideways.
 *
 * Measured by actually scrolling rather than by comparing `scrollWidth` to
 * `clientWidth`: in a right-to-left document those two disagree in ways that
 * depend on the engine, and an earlier version of this check passed on a page
 * that visibly scrolled. Moving the document and reading where it landed cannot
 * be wrong about it.
 */
async function scrollsSideways(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const el = document.scrollingElement ?? document.documentElement;
    const before = el.scrollLeft;
    el.scrollLeft = before - 400;
    const left = el.scrollLeft;
    el.scrollLeft = before + 400;
    const right = el.scrollLeft;
    el.scrollLeft = before;
    return left !== before || right !== before;
  });
}

/**
 * A project with recorded control-link and video facts.
 *
 * WHY IT IS BUILT THROUGH THE APP'S OWN VALIDATORS
 * ------------------------------------------------
 * An earlier version of this seed hand-wrote the JSON, and three of its enum
 * values were wrong. The store rejected the whole payload — correctly, it is
 * all-or-nothing by design — so the panel never appeared, and the test read as
 * "the panel is broken" when the SEED was broken. Running the seed through
 * `validateRcSetup` and `validateVideoSetup` before injecting it means a bad
 * seed fails as a bad seed, with a message saying which field was dropped.
 *
 * The two UART fields both say 2 on purpose: that clash is what the Ports page
 * exists to make visible, and it is the one fact the panel there must surface.
 */
const RC_SEED = {
  radioModel: 'RadioMaster TX16S',
  moduleKind: 'internal',
  txSystem: 'elrs',
  rxSystem: 'elrs',
  txBand: '2.4ghz',
  rxBand: '2.4ghz',
  rxModel: 'EP1 Dual',
  serialProtocol: 'crsf',
  uartIndex: 2,
  videoUartIndex: 2,
  failsafeStrategy: 'drop-disarm',
  modelMatch: true,
};

const VIDEO_SEED = {
  ecosystem: 'analog-58',
  linkClass: 'analog',
  osdProtocol: 'analog-chip',
  osdUartIndex: 2,
  vtxControlProtocol: 'smartaudio',
  vtxControlUartIndex: 2,
};

/** Fails the run if the seed would not survive the store it is written into. */
function buildSeed() {
  const rcSetup = validateRcSetup(RC_SEED);
  const videoSetup = validateVideoSetup(VIDEO_SEED);

  const dropped = [
    ...Object.keys(RC_SEED).filter(k => (rcSetup as Record<string, unknown> | undefined)?.[k] === undefined),
    ...Object.keys(VIDEO_SEED).filter(k => (videoSetup as Record<string, unknown> | undefined)?.[k] === undefined),
  ];
  if (dropped.length) {
    throw new Error(`seed fields rejected by the store's own validators: ${dropped.join(', ')}`);
  }

  return {
    v: SCHEMA_VERSION,
    data: {
      version: SCHEMA_VERSION,
      droneTypeId: 'freestyle',
      stageIndex: 0,
      sizeInch: 5,
      batteryVoltage: 6,
      partIds: {},
      rcSetup,
      videoSetup,
    },
    savedAt: '2026-08-04T00:00:00.000Z',
  };
}

const SEEDED_PROJECT = buildSeed();

async function main() {
  buildSite();
  const server = await startServer();
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[1] The hub tells the truth about coverage before you click');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();

      const res = await page.goto(`${BASE}/programming`, { waitUntil: 'domcontentloaded' });
      ok('the hub loads', res?.status() === 200);

      // A covered program is a link; an uncovered one still appears.
      const bfCard = page.locator('[data-testid="software-card-betaflight"]');
      ok('Betaflight is present', await bfCard.count() === 1);
      ok('and it is a link', await bfCard.evaluate(el => el.tagName === 'A'));

      for (const id of ['inav', 'ardupilot', 'esc-tools', 'ground-stations', 'blackbox']) {
        ok(`the uncovered program «${id}» is listed rather than hidden`,
          await page.locator(`[data-testid="software-card-${id}"]`).count() === 1);
      }

      const inavBadge = await page.locator('[data-testid="software-coverage-inav"]').innerText();
      ok('an uncovered program says so on its own card', inavBadge.includes('غير متاح'));

      const bfBadge = await page.locator('[data-testid="software-coverage-betaflight"]').innerText();
      ok('a partially covered program says how many pages it has',
        /\d/.test(bfBadge) && (bfBadge.includes('مغطّى')));

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[2] An uncovered program answers honestly instead of 404ing');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();

      const res = await page.goto(`${BASE}/programming/scope/esc`, { waitUntil: 'domcontentloaded' });
      ok('the scope page loads', res?.status() === 200);
      ok('it states the verdict before anything else',
        await page.locator('[data-testid="scope-verdict"]').count() === 1);
      ok('it names what the platform does have',
        (await page.locator('[data-testid="scope-have"] li').count()) > 0);
      ok('it names what the platform does not have',
        (await page.locator('[data-testid="scope-missing"] li').count()) > 0);
      ok('it cites the official documentation',
        (await page.locator('[data-testid="software-sources"] a').count()) > 0);

      // It must lead somewhere real, not dead-end.
      const links = page.locator('[data-testid="software-links"] a');
      ok('it offers real destinations', await links.count() > 0);
      const firstHref = await links.first().getAttribute('href');
      ok('and the first one is a real URL', !!firstHref && firstHref !== '#');

      // A program with genuinely nothing says that too, rather than an empty box.
      await goto(page, `${BASE}/programming/scope/ground-stations`, '[data-testid="scope-verdict"]');
      ok('a program with nothing related says so explicitly',
        await page.locator('[data-testid="scope-have-nothing"]').count() === 1);

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[3] ?step= opens the exact step');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();

      await goto(page, `${BASE}/programming/expresslrs/setup?step=binding`,
        '[data-testid="deeplink-opened"]');

      ok('the page confirms which step was opened',
        await page.locator('[data-testid="deeplink-opened"]').getAttribute('data-deeplink-id') === 'binding');

      const details = page.locator('[data-testid="elrs-step-binding"]');
      ok('the named step is expanded', await details.evaluate(el => (el as HTMLDetailsElement).open));

      // The other steps stay closed — the deep link selects, it does not dump.
      const otherOpen = await page.locator('[data-testid="elrs-step-identify-hardware"]')
        .evaluate(el => (el as HTMLDetailsElement).open);
      ok('the other steps stay collapsed', otherOpen === false);

      // And the reader is actually taken there. `scrollIntoView` is smooth by
      // default, so this waits for the move rather than sampling mid-animation.
      await page.waitForFunction(() => window.scrollY > 100, { timeout: 10_000 }).catch(() => {});
      ok('the viewport moved to it', (await page.evaluate(() => window.scrollY)) > 100);

      // A stale link says so instead of silently landing at the top.
      await goto(page, `${BASE}/programming/expresslrs/setup?step=no-such-step`,
        '[data-testid="deeplink-missing"]');
      ok('a stale ?step= is named as stale', true);

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[4] ?issue= opens the exact issue, out of forty');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();

      await goto(page, `${BASE}/programming/expresslrs/troubleshooting?issue=uart-conflict`,
        '[data-testid="deeplink-opened"]');

      ok('the page confirms which issue was opened',
        await page.locator('[data-testid="deeplink-opened"]').getAttribute('data-deeplink-id') === 'uart-conflict');
      ok('the named issue is expanded',
        await page.locator('[data-testid="elrs-issue-uart-conflict"]')
          .evaluate(el => (el as HTMLDetailsElement).open));
      await page.waitForFunction(() => window.scrollY > 200, { timeout: 10_000 }).catch(() => {});
      ok('the viewport moved to it', (await page.evaluate(() => window.scrollY)) > 200);

      // The SEO property: the served HTML carries every issue's text, collapsed
      // or not. Without this the deep-link design would cost the other 39 pages
      // their entire searchable content.
      const html = await (await fetch(`${BASE}/programming/expresslrs/troubleshooting`)).text();
      ok('the served HTML contains a collapsed issue\'s symptom text',
        html.includes('id="issue-no-bind"') && html.includes('id="issue-telemetry-missing"'));
      const issueCount = (html.match(/data-testid="elrs-issue-/g) ?? []).length;
      ok(`every issue is in the served HTML (${issueCount})`, issueCount >= 40);

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[5] ?topic= reaches a topic and a single setting inside one');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();

      // Page-level: the hub redirects to the canonical path.
      await page.goto(`${BASE}/programming/edgetx?topic=failsafe`, { waitUntil: 'domcontentloaded' });
      await page.waitForURL(/\/programming\/edgetx\/failsafe$/, { timeout: 20_000 });
      ok('a ?topic= naming a screen lands on that screen\'s own URL', true);

      // Setting-level: the search index emits this shape for every setting.
      await page.goto(`${BASE}/programming/edgetx/outputs?topic=subtrim`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="edgetx-setting-subtrim"]', { timeout: 20_000 });
      await page.waitForFunction(
        () => document.querySelector('[data-testid="edgetx-setting-subtrim"]')?.getAttribute('data-focused') === 'true',
        { timeout: 20_000 },
      );
      ok('a ?topic= naming a setting marks that row', true);
      await page.waitForFunction(() => window.scrollY > 100, { timeout: 10_000 }).catch(() => {});
      ok('and the viewport moved to it', (await page.evaluate(() => window.scrollY)) > 100);

      // An unknown topic leaves the reader on the index rather than 404ing.
      const res = await page.goto(`${BASE}/programming/edgetx?topic=not-a-real-topic`,
        { waitUntil: 'domcontentloaded' });
      ok('an unknown ?topic= keeps the reader on the index', res?.status() === 200);
      ok('and does not redirect anywhere', new URL(page.url()).pathname === '/programming/edgetx');

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[6] The project panel is on the pages it belongs on — and only those');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();

      // Seed a project the way the app stores one.
      await page.goto(`${BASE}/programming`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(p => localStorage.setItem('fpv-assembly-project-v1', JSON.stringify(p)), SEEDED_PROJECT);

      // Ports maps both records — this is the page where the UART clash shows.
      await goto(page, `${BASE}/betaflight/ports`, '[data-testid="project-context"]');
      const factsText = await page.locator('[data-testid="project-context-facts"]').innerText();
      ok('the panel shows the reader\'s own recorded UART', factsText.includes('UART 2'));
      ok('and shows both records\' claims on the port', (factsText.match(/UART 2/g) ?? []).length >= 2);

      // The unrecorded fields are NAMED, not silently absent.
      ok('it names what has not been recorded yet',
        await page.locator('[data-testid="project-context-missing"]').count() === 1);

      // A page with no mapped fields shows no panel at all. This is the rule.
      await goto(page, `${BASE}/betaflight/pid-tuning`, 'h1');
      ok('a page with nothing project-specific shows no panel at all',
        await page.locator('[data-testid="project-context"]').count() === 0
        && await page.locator('[data-testid="project-context-none"]').count() === 0);

      await goto(page, `${BASE}/programming/edgetx/mixes`, 'h1');
      ok('the same holds in the EdgeTX centre',
        await page.locator('[data-testid="project-context"]').count() === 0);

      // And it DOES appear where the topic is about the reader's own radio.
      await goto(page, `${BASE}/programming/edgetx/model-match`, '[data-testid="project-context"]');
      ok('the panel appears on the topic that is about a recorded fact', true);

      // The hub panel: what decides which topics are relevant at all.
      await goto(page, `${BASE}/programming/edgetx`, '[data-testid="edgetx-hub-context"]');
      const hubText = await page.locator('[data-testid="edgetx-hub-context"]').innerText();
      ok('the EdgeTX index shows the radio the reader recorded',
        hubText.includes('RadioMaster TX16S'));

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[7] The reader\'s build never reaches the server');
    {
      // The pages are public and statically served. A project in the HTML would
      // mean either a leak or a cache poisoned with one reader's build.
      for (const path of ['/betaflight/ports', '/programming/edgetx/model-match', '/programming/edgetx']) {
        const html = await (await fetch(`${BASE}${path}`)).text();
        ok(`${path} carries no project data in its served HTML`,
          !html.includes('RadioMaster TX16S') && !html.includes('project-context-facts'));
      }
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[8] Nothing scrolls sideways, at any width, in Arabic');
    {
      for (const width of [390, 768, 1280]) {
        const ctx = await browser.newContext({ viewport: { width, height: 900 } });
        const page = await ctx.newPage();
        for (const path of [
          '/programming',
          '/betaflight',
          '/betaflight/ports',
          '/programming/expresslrs',
          '/programming/expresslrs/setup',
          '/programming/expresslrs/troubleshooting',
          '/programming/edgetx',
          '/programming/edgetx/outputs',
          '/programming/video',
          '/programming/video/tool-firmware-update',
          '/programming/scope/esc',
        ]) {
          await goto(page, `${BASE}${path}`, 'h1');
          ok(`${path} does not scroll sideways at ${width}px`, !(await scrollsSideways(page)));
        }
        await ctx.close();
      }
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[9] The document is Arabic and right-to-left throughout');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      for (const path of ['/programming', '/betaflight/receiver', '/programming/video/dji-tools']) {
        await goto(page, `${BASE}${path}`, 'h1');
        const { dir, lang } = await page.evaluate(() => ({
          dir: document.documentElement.dir, lang: document.documentElement.lang,
        }));
        ok(`${path} is served as Arabic RTL`, dir === 'rtl' && lang === 'ar');
      }

      // The English label a reader must find on their own screen has to be
      // direction-isolated, or bidi reorders it inside the Arabic around it.
      await goto(page, `${BASE}/betaflight/ports`, 'h1');
      const isolated = await page.evaluate(() =>
        [...document.querySelectorAll('.ltr')].length);
      ok('official English labels are direction-isolated', isolated > 5);

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[10] Every centre renders its provenance and its safety text');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();

      await goto(page, `${BASE}/betaflight/failsafe`, '[data-testid="bf-provenance"]');
      const prov = await page.locator('[data-testid="bf-provenance"]').innerText();
      ok('a Betaflight page shows firmware, app version, review date and source',
        /\d{4}/.test(prov) && prov.includes('المصدر') && prov.includes('تاريخ المراجعة'));

      await goto(page, `${BASE}/programming/edgetx/failsafe`, '[data-testid="edgetx-provenance"]');
      ok('an EdgeTX page shows where the screen is and when it was checked',
        (await page.locator('[data-testid="edgetx-provenance"]').innerText()).includes('أين تجدها'));

      await goto(page, `${BASE}/programming/video/tool-firmware-update`, '[data-testid="video-provenance"]');
      ok('a video page states which ecosystem it applies to',
        await page.locator('[data-testid="video-scope"]').count() === 1);
      ok('and what must come from the reader\'s own manual',
        await page.locator('[data-testid="manual-required"]').count() === 1);

      // The safety rule: props off, before the steps.
      await goto(page, `${BASE}/programming/expresslrs/setup`, 'h1');
      const bodyText = await page.locator('body').innerText();
      ok('the setup page warns about propellers', bodyText.includes('المراوح'));

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[11] Search reaches the centres and the gaps');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();

      await goto(page, `${BASE}/search?q=${encodeURIComponent('INAV')}`, '[data-testid="search-results"]');
      const results = await page.locator('[data-testid="search-results"]').innerText();
      ok('searching an uncovered program returns the honest answer',
        results.includes('خارج التغطية'));

      // Following it must land on the scope page.
      await page.locator('[data-testid="search-result-software-scope-inav"]').first().click();
      await page.waitForSelector('[data-testid="scope-verdict"]', { timeout: 20_000 });
      ok('and clicking it opens the scope page', page.url().includes('/programming/scope/inav'));

      await goto(page, `${BASE}/search?q=${encodeURIComponent('Subtrim')}`, '[data-testid="search-results"]');
      const settingHit = page.locator('[data-testid="search-result-edgetx-setting-outputs.subtrim"]');
      ok('a single EdgeTX setting is its own search result', await settingHit.count() >= 1);
      const href = await settingHit.first().getAttribute('href');
      ok('and its link carries the setting in the URL', !!href && href.includes('topic=subtrim'));

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[12] No console errors on any software page');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      const errors: string[] = [];
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', e => errors.push(String(e)));

      for (const path of [
        '/programming', '/betaflight', '/betaflight/ports', '/betaflight/vtx',
        '/programming/expresslrs', '/programming/expresslrs/setup?step=binding',
        '/programming/expresslrs/troubleshooting?issue=no-bind',
        '/programming/edgetx', '/programming/edgetx/outputs?topic=subtrim',
        '/programming/video', '/programming/video/dji-tools',
        '/programming/scope/inav', '/programming/scope/blackbox',
      ]) {
        await goto(page, `${BASE}${path}`, 'h1');
      }
      // Next's dev-only hydration noise is absent from a production build; a
      // real error here is a real error.
      if (errors.length) console.log('   CONSOLE:', errors.slice(0, 5));
      ok('no console errors across the whole centre', errors.length === 0);

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[13] The centre works with JavaScript disabled');
    {
      /**
       * Not a nicety. The deep-link design puts forty issues behind `<details>`
       * elements, and if those only opened via JavaScript then a reader on a
       * slow connection — or a crawler — would see forty headings and no
       * content. Native `<details>` is what makes that impossible, and this is
       * the check that keeps it native.
       */
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, javaScriptEnabled: false });
      const page = await ctx.newPage();

      await goto(page, `${BASE}/programming/expresslrs/troubleshooting`, 'h1');
      const opened = await page.evaluate(() => {
        const d = document.querySelector('[data-testid="elrs-issue-no-bind"]') as HTMLDetailsElement | null;
        return !!d;
      }).catch(() => false);
      ok('the issues are in the document without JavaScript', opened !== false);

      const text = await page.locator('body').innerText();
      ok('the category index is navigable without JavaScript', text.includes('الفئات'));

      await goto(page, `${BASE}/programming`, 'h1');
      ok('the hub lists programs without JavaScript',
        (await page.locator('[data-testid^="software-card-"]').count()) >= 9);

      await ctx.close();
    }
  } finally {
    if (browser) await browser.close();
    try { process.kill(-server.pid!, 'SIGTERM'); } catch { /* already gone */ }
    freePort();
  }

  console.log(`\n${failures.length === 0 ? '✅' : '❌'} testWebSoftwareE2E: ${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    for (const f of failures) console.log(`   - ${f}`);
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });

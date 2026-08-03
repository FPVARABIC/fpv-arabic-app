/**
 * Real-browser proof for «مشروعي» — the project workspace.
 *
 * scripts/testProject.ts proves the verdict engine reasons correctly. This
 * proves the user can actually reach those verdicts, read them, and act on
 * them: that the screen renders from a genuinely saved project, that a blocker
 * visibly stops the next step instead of being one card among many, that every
 * link on a finding lands on a page that exists, and that the assembly section
 * and the workspace are joined rather than merely consistent.
 *
 * Builds its own bundle with placeholder Firebase credentials (the workspace
 * touches no Firebase surface) so it runs anywhere, not only on a machine
 * holding real project credentials.
 *
 * Run: npx tsx scripts/testProjectUI.ts
 */
import assert from 'node:assert/strict';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { chromium, type Browser, type Page } from 'playwright';

import { buildStages } from '../src/data/assembly/buildStages';
import { computeFindings } from '../src/data/project/verdicts';
import { SCHEMA_VERSION } from '../src/data/project/store';
import { moduleArticles } from '../src/data/kb/registry';
import type { ProjectSnapshot } from '../src/data/project/types';
import { motors } from '../src/data/assembly/parts/motors';
import { batteries } from '../src/data/assembly/parts/batteries';
import { escs } from '../src/data/assembly/parts/escs';
import { frames } from '../src/data/assembly/parts/frames';
import { propellers } from '../src/data/assembly/parts/propellers';
import { flightControllers } from '../src/data/assembly/parts/flightControllers';

const PORT = 4412;
const BASE = `http://localhost:${PORT}`;
const OUT_DIR = 'dist-project-uitest';
const STORAGE_KEY = 'fpv-assembly-project-v1';

const DUMMY_FIREBASE_ENV = {
  VITE_FIREBASE_API_KEY: 'AIzaSyDUMMY-ui-test-key-000000000000000',
  VITE_FIREBASE_AUTH_DOMAIN: 'demo.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'demo',
  VITE_FIREBASE_STORAGE_BUCKET: 'demo.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
  VITE_FIREBASE_APP_ID: '1:000000000000:web:0000000000000000000000',
};

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

/** The app ships a single 390px column; anything wider than it is a bug. */
async function noHorizontalOverflow(page: Page): Promise<boolean> {
  return !(await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1));
}

function buildFreshBundle() {
  console.log(`\n[build] producing a fresh production bundle in ${OUT_DIR}/ …`);
  const res = spawnSync('npx', ['vite', 'build', '--outDir', OUT_DIR], {
    cwd: process.cwd(), stdio: ['ignore', 'ignore', 'inherit'],
    env: { ...process.env, ...DUMMY_FIREBASE_ENV },
  });
  if (res.status !== 0) throw new Error(`vite build failed with status ${res.status}`);
  console.log('[build] done');
}

async function waitForServer(url: string, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try { const r = await fetch(url); if (r.ok) return; } catch { /* not up */ }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

// Part ids come from the live catalogue, never hardcoded: a saved project is
// discarded wholesale if any id no longer exists, so a stale literal here
// would silently turn every assertion below into "the empty state renders".
const CONFLICT = (() => {
  for (const m of motors) for (const b of batteries) {
    if (!m.specs.compatibleVoltages.includes(b.specs.sCount)) return { motor: m, battery: b };
  }
  throw new Error('expected the catalogue to contain an incompatible motor/battery pair');
})();

const AGREEING_BATTERY = batteries.find(b => CONFLICT.motor.specs.compatibleVoltages.includes(b.specs.sCount));
assert.ok(AGREEING_BATTERY, 'expected a battery the same motor does accept');

const FINAL_REPORT_INDEX = buildStages.findIndex(s => s.id === 'stage-16');
assert.ok(FINAL_REPORT_INDEX > 0, 'expected a final-report stage');

// The article to open is taken from the engine's own link, not hardcoded: the
// point being proved is that the finding reaches the page it points at.
const ESC_ARTICLE_ID = (() => {
  const f = computeFindings({
    exists: true, stageIndex: 0, totalStages: buildStages.length, parts: {},
    motor: motors[0], esc: escs[0],
  }).find(x => x.id === 'current-headroom');
  const link = f?.links.find(l => l.kind === 'article' && moduleArticles('esc').some(a => a.id === l.targetId));
  assert.ok(link, 'expected the current-headroom finding to link to an ESC article');
  return link.targetId;
})();

interface Saved {
  stageIndex: number;
  partIds: Record<string, string>;
}

/**
 * The findings the rendered screen is expected to show, computed from the same
 * engine the screen uses. Asserting the DOM against these — rather than against
 * Arabic strings copied into this file — means the test keeps checking that the
 * user sees the engine's reasoning even after that reasoning is reworded.
 */
function expectedFindings(p: Partial<ProjectSnapshot>) {
  return computeFindings({
    exists: true, stageIndex: 0, totalStages: buildStages.length, parts: {}, ...p,
  });
}

async function seed(page: Page, project: Saved | null) {
  await page.goto(`${BASE}/project`, { waitUntil: 'networkidle' });
  await page.evaluate(({ key, project }) => {
    if (project === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify({
      version: 1,
      droneTypeId: 'freestyle',
      stageIndex: project.stageIndex,
      partIds: project.partIds,
    }));
  }, { key: STORAGE_KEY, project });
}

// Expanding a finding is a React state change, so the assertions that follow
// have to wait for the expanded panel itself rather than for the click to
// return — `count()` does not auto-wait, and a passing race is not a proof.
async function openFinding(card: ReturnType<Page['locator']>) {
  const toggle = card.locator('button[aria-expanded]').first();
  await toggle.click();
  await card.locator('button[aria-expanded="true"]').first().waitFor({ timeout: 10000 });
}

async function newPage(browser: Browser, errors: string[]): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  return page;
}

async function main() {
  let server: ChildProcess | null = null;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const consoleErrors: string[] = [];

  try {
    buildFreshBundle();
    server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--outDir', OUT_DIR], {
      cwd: process.cwd(), stdio: 'ignore', detached: true,
    });
    await waitForServer(BASE);

    console.log('\n[1] With no project, the screen sells the one thing worth doing — and does it');
    {
      const page = await newPage(browser, consoleErrors);
      await seed(page, null);
      await page.reload({ waitUntil: 'networkidle' });

      const next = page.locator('[data-testid="project-next-step"]');
      await next.waitFor({ timeout: 10000 });
      ok('the workspace renders without a project instead of erroring', await next.count() === 1);
      ok('an empty project is not presented as blocked', await next.getAttribute('data-blocked') === 'false');
      ok('no verdicts are invented for a project that does not exist', await page.locator('[data-testid="project-findings"]').count() === 0);
      ok('the empty state explains the value rather than showing a bare "no data" message',
        (await page.locator('[data-testid="project-door-start"]').count()) === 1
        && (await page.locator('text=لا يستطيع أن يقول لك إن محركك يقبل حتى 4S وبطاريتك 6S').count()) === 1);

      await page.locator('[data-testid="project-next-cta"]').click();
      await page.waitForURL('**/assembly', { timeout: 10000 });
      ok('its call to action genuinely opens the build flow', page.url().endsWith('/assembly'));
      await page.close();
    }

    console.log('\n[2] A real conflict in a real saved project stops the user');
    {
      const page = await newPage(browser, consoleErrors);
      await seed(page, {
        stageIndex: 5,
        partIds: { motors: CONFLICT.motor.id, batteries: CONFLICT.battery.id, escs: escs[0].id },
      });
      await page.goto(`${BASE}/project`, { waitUntil: 'networkidle' });

      const next = page.locator('[data-testid="project-next-step"]');
      await next.waitFor({ timeout: 10000 });
      ok('the saved project is restored and judged, not ignored',
        await page.locator(`[data-testid="project-part-${CONFLICT.motor.id}"]`).count() === 1);
      ok('a blocker overrides "carry on building" as the next step', await next.getAttribute('data-blocked') === 'true');
      ok('…and the header says so in plain Arabic', await page.locator('text=أوقف الشراء — هناك مانع').count() === 1);
      ok('the blocker count tile is non-zero',
        Number(await page.locator('[data-testid="project-count-blocker"]').getAttribute('data-count')) >= 1);

      const card = page.locator('[data-testid="project-finding-voltage-motor"]');
      ok('the voltage finding is present and marked as a blocker', await card.getAttribute('data-severity') === 'blocker');

      // Collapsed by default, so the screen is a list of judgements rather
      // than a wall of text; the reasoning has to be one tap away.
      ok('the reasoning is hidden until asked for', await card.locator('text=لماذا').count() === 0);
      await openFinding(card);
      const shown = (await card.textContent() ?? '').replace(/\s+/gu, ' ');
      const expected = expectedFindings({ motor: CONFLICT.motor, battery: CONFLICT.battery, esc: escs[0] })
        .find(f => f.id === 'voltage-motor')!;

      ok('opening a finding reveals why we say it', shown.includes(expected.whyAr.replace(/\s+/gu, ' ')));
      ok('…on what evidence', expected.evidenceAr.every(e => shown.includes(e.replace(/\s+/gu, ' '))));
      ok('…how confident we are', await card.locator('text=درجة الثقة').count() >= 1);
      ok('…and what to do about it', expected.actionsAr.every(a => shown.includes(a.replace(/\s+/gu, ' '))));
      ok('the evidence names the user\'s own parts, not a generic rule', shown.includes(CONFLICT.motor.nameAr));

      // The whole promise of the platform is that a verdict leads somewhere.
      const link = card.locator('[data-testid^="project-link-"]').first();
      ok('a finding offers at least one way into the knowledge base', await link.count() === 1);
      await link.click();
      await page.waitForURL(/\/kb\//, { timeout: 10000 });
      ok('…and that link lands on a real article, not the not-found screen',
        await page.locator('text=الصفحة غير موجودة').count() === 0 && (await page.locator('h1, h2').count()) > 0);
      await page.close();
    }

    console.log('\n[3] A sound project is told what remains unknown, not congratulated');
    {
      const page = await newPage(browser, consoleErrors);
      await seed(page, {
        stageIndex: FINAL_REPORT_INDEX,
        partIds: {
          motors: CONFLICT.motor.id, batteries: AGREEING_BATTERY!.id, escs: escs[0].id,
          frames: frames[0].id, propellers: propellers[0].id, flightControllers: flightControllers[0].id,
        },
      });
      await page.goto(`${BASE}/project`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid="project-next-step"]').waitFor({ timeout: 10000 });

      ok('no blocker is invented for a project that has none',
        Number(await page.locator('[data-testid="project-count-blocker"]').getAttribute('data-count')) === 0);
      ok('what we could not decide is counted and shown rather than passed silently',
        Number(await page.locator('[data-testid="project-count-unknown"]').getAttribute('data-count')) >= 1);
      ok('checks that did pass are reported too, so silence never has to be interpreted',
        Number(await page.locator('[data-testid="project-count-ok"]').getAttribute('data-count')) >= 1);

      const unknown = page.locator('[data-testid="project-finding-current-headroom"]');
      await openFinding(unknown);
      const shown = (await unknown.textContent() ?? '').replace(/\s+/gu, ' ');
      const headroom = expectedFindings({
        motor: CONFLICT.motor, battery: AGREEING_BATTERY!, esc: escs[0],
        frame: frames[0], propeller: propellers[0], flightController: flightControllers[0],
      }).find(f => f.id === 'current-headroom')!;

      ok('the undecidable check names every piece of data it is missing',
        headroom.missingAr.length > 0 && headroom.missingAr.every(m => shown.includes(m.replace(/\s+/gu, ' '))));
      ok('…and points at the manufacturer instead of guessing',
        !!headroom.manualCheckAr && shown.includes(headroom.manualCheckAr.replace(/\s+/gu, ' ')));
      ok('…and still leaves the user with something to do', headroom.actionsAr.every(a => shown.includes(a.replace(/\s+/gu, ' '))));
      await page.close();
    }

    console.log('\n[4] Building and understanding are one platform, not two screens that agree');
    {
      const page = await newPage(browser, consoleErrors);
      await seed(page, {
        stageIndex: FINAL_REPORT_INDEX,
        partIds: {
          motors: CONFLICT.motor.id, batteries: AGREEING_BATTERY!.id, escs: escs[0].id,
          frames: frames[0].id, propellers: propellers[0].id, flightControllers: flightControllers[0].id,
        },
      });
      await page.goto(`${BASE}/assembly`, { waitUntil: 'networkidle' });
      await page.locator('text=فحص التوافق النهائي').first().waitFor({ timeout: 10000 });

      ok('the assembly final report states what it could not decide, in the same words as the workspace',
        await page.locator('text=ما لا نستطيع الحكم فيه').count() === 1);

      await page.locator('button', { hasText: 'افتح «مشروعي»' }).click();
      await page.waitForURL('**/project', { timeout: 10000 });
      ok('the final report opens the workspace on the same project', page.url().endsWith('/project'));
      // The workspace is a lazily-loaded route, so the URL changing is not yet
      // the screen being there.
      await page.locator('[data-testid="project-next-step"]').waitFor({ timeout: 10000 });
      ok('…and the workspace shows the same parts the build flow was holding',
        await page.locator(`[data-testid="project-part-${CONFLICT.motor.id}"]`).count() === 1);
      await page.close();
    }

    console.log('\n[5] The encyclopedia stops being generic once a project exists');
    {
      const page = await newPage(browser, consoleErrors);

      // First without a project: the panel must not exist at all, rather than
      // render a heading over nothing.
      await seed(page, null);
      await page.goto(`${BASE}/kb/esc/${ESC_ARTICLE_ID}`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid="kb-article-summary"]').waitFor({ timeout: 10000 });
      ok('a reader with no project sees no personalisation panel at all',
        await page.locator('[data-testid="kb-project-context"]').count() === 0);

      await seed(page, {
        stageIndex: FINAL_REPORT_INDEX,
        partIds: {
          motors: CONFLICT.motor.id, batteries: AGREEING_BATTERY!.id, escs: escs[0].id,
          frames: frames[0].id, propellers: propellers[0].id, flightControllers: flightControllers[0].id,
        },
      });
      await page.goto(`${BASE}/kb/esc/${ESC_ARTICLE_ID}`, { waitUntil: 'networkidle' });
      const panel = page.locator('[data-testid="kb-project-context"]');
      await panel.waitFor({ timeout: 10000 });

      const text = (await panel.textContent() ?? '').replace(/\s+/gu, ' ');
      ok('the same article now names the reader\'s own ESC', text.includes(escs[0].nameAr));
      ok('…and the motors it drives, because the article\'s subject spans both', text.includes(CONFLICT.motor.nameAr));
      ok('the open question about this build appears on the page that explains it',
        await panel.locator('[data-testid="kb-context-finding-current-headroom"]').count() === 1);

      await panel.locator('[data-testid="kb-context-finding-current-headroom"]').click();
      await page.waitForURL('**/project', { timeout: 10000 });
      await page.locator('[data-testid="project-next-step"]').waitFor({ timeout: 10000 });
      ok('…and tapping it lands on the finding in the workspace', page.url().endsWith('/project'));

      // A page whose subject the project says nothing about must stay clean.
      await page.goto(`${BASE}/kb/esc/${ESC_ARTICLE_ID}`, { waitUntil: 'networkidle' });
      await panel.waitFor({ timeout: 10000 });
      ok('the panel does not repeat the whole parts list — only what this module is about',
        (await panel.locator('[data-testid^="kb-context-part-"]').count()) <= 4);
      await page.close();
    }

    console.log('\n[6] The control-link setup is recorded, and it changes the verdicts');
    {
      const page = await newPage(browser, consoleErrors);
      await seed(page, {
        stageIndex: FINAL_REPORT_INDEX,
        partIds: {
          motors: CONFLICT.motor.id, batteries: AGREEING_BATTERY!.id, escs: escs[0].id,
          frames: frames[0].id, propellers: propellers[0].id, flightControllers: flightControllers[0].id,
        },
      });
      await page.goto(`${BASE}/project`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid="rc-setup-card"]').waitFor({ timeout: 10000 });

      ok('the workspace offers a place to record the control link',
        await page.locator('[data-testid="rc-setup-card"]').count() === 1);
      ok('nothing is judged about a link the user has not described yet',
        await page.locator('[data-testid="project-finding-rc-band-match"]').count() === 0);

      // Record a genuinely impossible link: two different bands.
      await page.locator('[data-testid="rc-tx-band"]').selectOption('sub-ghz');
      await page.locator('[data-testid="rc-rx-band"]').selectOption('2.4ghz');
      await page.locator('[data-testid="rc-failsafe"]').selectOption('hold-last');
      await page.locator('[data-testid="rc-setup-save"]').click();

      const band = page.locator('[data-testid="project-finding-rc-band-match"]');
      await band.waitFor({ timeout: 10000 });
      ok('saving the setup immediately produces a verdict about it',
        await band.getAttribute('data-severity') === 'blocker');
      ok('…and the flyaway failsafe is caught in the same pass',
        await page.locator('[data-testid="project-finding-rc-failsafe-strategy"]')
          .getAttribute('data-severity') === 'blocker');
      ok('…and the next step now stops the user',
        await page.locator('[data-testid="project-next-step"]').getAttribute('data-blocked') === 'true');

      const expected = expectedFindings({
        rcSetup: { txBand: 'sub-ghz', rxBand: '2.4ghz', failsafeStrategy: 'hold-last' },
      }).find(f => f.id === 'rc-band-match')!;
      await openFinding(band);
      const shown = (await band.textContent() ?? '').replace(/\s+/gu, ' ');
      ok('the rendered reasoning is the engine\'s, not a screen\'s copy of it',
        shown.includes(expected.whyAr.replace(/\s+/gu, ' ')));

      // It must survive a reload — this is stored, not screen state.
      await page.reload({ waitUntil: 'networkidle' });
      await page.locator('[data-testid="rc-setup-card"]').waitFor({ timeout: 10000 });
      ok('the recorded setup survives a reload',
        await page.locator('[data-testid="project-finding-rc-band-match"]').count() === 1);

      const stored = await page.evaluate(k => localStorage.getItem(k), STORAGE_KEY);
      const parsedStore = JSON.parse(stored ?? '{}');
      // The version is read from the store rather than pinned here. What this
      // assertion is actually protecting is that there is ONE store and the
      // control-link record lives inside it — not which schema number that
      // store happens to be on. Pinning the number made this fail the moment
      // the video record was added, which is a false alarm about a real
      // additive migration.
      ok('…because it was written into the one project store, not a second one',
        parsedStore?.v === SCHEMA_VERSION && parsedStore?.data?.rcSetup?.txBand === 'sub-ghz');
      ok('…and the parts the build flow chose are still there beside it',
        parsedStore?.data?.partIds?.motors === CONFLICT.motor.id);
      await page.close();
    }

    console.log('\n[7] The tab reaches it from anywhere');
    {
      const page = await newPage(browser, consoleErrors);
      await page.goto(`${BASE}/lessons`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid="nav-project"]').click();
      await page.waitForURL('**/project', { timeout: 10000 });
      ok('the «مشروعي» tab navigates to the workspace from an unrelated section', page.url().endsWith('/project'));
      await page.locator('[data-testid="project-next-step"]').waitFor({ timeout: 10000 });
      ok('…and the workspace renders there', await page.locator('[data-testid="project-next-step"]').count() === 1);
      await page.close();
    }

    console.log('\n[8] The software centres read the same project, and deep links land exactly');
    {
      const page = await newPage(browser, consoleErrors);
      await seed(page, {
        stageIndex: FINAL_REPORT_INDEX,
        partIds: {
          motors: CONFLICT.motor.id, batteries: AGREEING_BATTERY!.id, escs: escs[0].id,
          frames: frames[0].id, propellers: propellers[0].id, flightControllers: flightControllers[0].id,
        },
      });

      // Record a link the software centres can say something true about.
      await page.goto(`${BASE}/project`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid="rc-setup-card"]').waitFor({ timeout: 10000 });
      await page.locator('[data-testid="rc-tx-band"]').selectOption('2.4ghz');
      await page.locator('[data-testid="rc-rx-band"]').selectOption('2.4ghz');
      await page.locator('[data-testid="rc-tx-system"]').selectOption('elrs');
      await page.locator('[data-testid="rc-rx-system"]').selectOption('elrs');
      await page.locator('[data-testid="rc-failsafe"]').selectOption('hold-last');
      await page.locator('[data-testid="rc-model-match-no"]').click();
      await page.locator('[data-testid="rc-rx-target"]').fill('RadioMaster RP1 2400 RX');
      await page.locator('[data-testid="rc-protocol"]').selectOption('crsf');
      await page.locator('[data-testid="rc-uart"]').fill('2');
      await page.locator('[data-testid="rc-gps-uart"]').fill('2');
      await page.locator('[data-testid="rc-setup-save"]').click();
      await page.waitForTimeout(300);

      // ── The EdgeTX centre exists and is reachable from the software section.
      await page.goto(`${BASE}/programming`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid="programming-card-edgetx"]').click();
      await page.waitForURL('**/programming/edgetx', { timeout: 10000 });
      await page.locator('[data-testid="edgetx-sections"]').waitFor({ timeout: 10000 });
      ok('the software section opens the EdgeTX centre', page.url().endsWith('/programming/edgetx'));
      ok('the centre groups its topics into sections rather than listing articles',
        await page.locator('[data-testid^="edgetx-section-"]').count() === 5);
      ok('the centre shows the reader their own radio setup',
        await page.locator('[data-testid="edgetx-hub-project-context"]').count() === 1);

      // ── Search reaches an individual SETTING, not just a topic.
      await page.locator('[data-testid="edgetx-search"]').fill('Subtrim');
      await page.locator('[data-testid="edgetx-search-results"]').waitFor({ timeout: 10000 });
      const settingHit = page.locator('[data-testid="edgetx-result-outputs-subtrim"]');
      ok('searching a field name finds the field, not only its screen',
        await settingHit.count() === 1);
      await settingHit.click();
      await page.waitForURL('**/programming/edgetx/outputs?topic=subtrim', { timeout: 10000 });
      await page.locator('[data-testid="edgetx-page-header"]').waitFor({ timeout: 10000 });
      ok('…and the deep link opens that exact setting expanded',
        await page.locator('[data-testid="edgetx-setting-body-subtrim"]').count() === 1);
      ok('…while its neighbours stay collapsed',
        await page.locator('[data-testid="edgetx-setting-body-min-max"]').count() === 0);

      // ── A topic reads the project, and only what belongs to it.
      await page.goto(`${BASE}/programming/edgetx/failsafe`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid="edgetx-page-header"]').waitFor({ timeout: 10000 });
      ok('the failsafe topic shows the reader\'s recorded strategy',
        await page.locator('[data-testid="edgetx-rc-fact-failsafeStrategy"]').count() === 1);
      ok('…and the verdict about it reaches this exact topic',
        await page.locator('[data-testid="edgetx-finding-rc-failsafe-strategy"]').count() === 1);
      ok('…and it does not show the reader\'s GPS port, which is another page\'s business',
        await page.locator('[data-testid="edgetx-rc-fact-gpsUartIndex"]').count() === 0);

      await page.goto(`${BASE}/programming/edgetx/mixes`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid="edgetx-page-header"]').waitFor({ timeout: 10000 });
      ok('a topic the project has nothing to say about shows no panel at all',
        await page.locator('[data-testid="edgetx-project-context"]').count() === 0);

      // ── A problem topic hands off rather than duplicating the procedure.
      await page.goto(`${BASE}/programming/edgetx/problem-module-missing`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid="edgetx-canonical-diagnosis"]').waitFor({ timeout: 10000 });
      await page.locator('[data-testid="edgetx-canonical-diagnosis-open"]').click();
      await page.waitForURL('**/programming/expresslrs/troubleshooting**', { timeout: 10000 });
      await page.locator('[data-testid="expresslrs-troubleshooting-nav-tx-not-detected"]').waitFor({ timeout: 10000 });
      ok('the radio-side problem hands off to the one owner of the symptom',
        await page.locator('[data-testid="expresslrs-troubleshooting-nav-tx-not-detected"]')
          .getAttribute('aria-current') === 'true');

      // ── The ?issue= deep link, and an unknown id that must not break anything.
      await page.goto(`${BASE}/programming/expresslrs/troubleshooting?issue=uart-conflict`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid="elrs-issue-links"]').waitFor({ timeout: 10000 });
      ok('?issue= opens that exact issue',
        await page.locator('[data-testid="expresslrs-troubleshooting-nav-uart-conflict"]')
          .getAttribute('aria-current') === 'true');
      ok('…the issue shows the ports the reader recorded',
        await page.locator('[data-testid="elrs-rc-fact-uartIndex"]').count() === 1);
      ok('…including the collision the verdict engine found between two of them',
        await page.locator('[data-testid="elrs-finding-rc-uart-conflict"]').count() === 1);
      ok('…and it offers the Ports page and the conflict report as real destinations',
        await page.locator('[data-testid="elrs-issue-link-betaflight-ports"]').count() === 1
        && await page.locator('[data-testid="elrs-issue-link-project-findings"]').count() === 1);

      await page.goto(`${BASE}/programming/expresslrs/troubleshooting?issue=does-not-exist`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid="expresslrs-troubleshooting-nav"]').waitFor({ timeout: 10000 });
      ok('an unknown ?issue= lands on the list instead of breaking the screen',
        await page.locator('[data-testid="expresslrs-troubleshooting-nav"]').count() === 1);

      // ── The ?step= deep link, and its unknown-id behaviour.
      await page.goto(`${BASE}/programming/expresslrs/setup?step=build-options`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid="expresslrs-setup-step-nav"]').waitFor({ timeout: 10000 });
      ok('?step= opens that exact step',
        await page.locator('[data-testid="expresslrs-setup-step-nav-build-options"]')
          .getAttribute('aria-current') === 'step');

      // An unknown id is ignored rather than honoured, so the screen falls back
      // to its ordinary entry point — the onboarding questions here, because
      // this profile has never answered them — instead of erroring.
      await page.goto(`${BASE}/programming/expresslrs/setup?step=nope`, { waitUntil: 'networkidle' });
      await page.locator('[data-expresslrs-setup-frame="true"]').waitFor({ timeout: 10000 });
      ok('an unknown ?step= falls back to the screen\'s normal entry point instead of breaking it',
        await page.locator('[data-testid="expresslrs-onboarding"]').count()
        + await page.locator('[data-testid="expresslrs-setup-step-nav"]').count() === 1);

      // And a valid deep link still works for a reader who never answered the
      // onboarding: the questions must not stand between a link and its target.
      await page.goto(`${BASE}/programming/expresslrs/setup?step=device-category`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid="expresslrs-setup-step-nav"]').waitFor({ timeout: 10000 });
      ok('a deep link reaches its step even before the onboarding questions are answered',
        await page.locator('[data-testid="expresslrs-setup-step-nav-device-category"]')
          .getAttribute('aria-current') === 'step');

      // ── An unknown EdgeTX topic id.
      await page.goto(`${BASE}/programming/edgetx/not-a-real-topic`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid="edgetx-unknown-page"]').waitFor({ timeout: 10000 });
      ok('an unknown EdgeTX topic id renders an honest screen with a way forward',
        await page.locator('[data-testid="edgetx-unknown-back"]').count() === 1);
      await page.locator('[data-testid="edgetx-unknown-back"]').click();
      await page.waitForURL('**/programming/edgetx', { timeout: 10000 });
      ok('…and that way forward works', page.url().endsWith('/programming/edgetx'));

      // ── The 390px column and right-to-left direction, on the new screens.
      await page.goto(`${BASE}/programming/edgetx`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid="edgetx-sections"]').waitFor({ timeout: 10000 });
      ok('the EdgeTX centre does not overflow the 390px column',
        await noHorizontalOverflow(page));
      ok('…and it renders right-to-left like the rest of the app',
        await page.evaluate(() => document.documentElement.getAttribute('dir')) === 'rtl');

      await page.goto(`${BASE}/programming/edgetx/crsf`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid="edgetx-page-header"]').waitFor({ timeout: 10000 });
      ok('a topic with expandable settings does not overflow the column either',
        await noHorizontalOverflow(page));
      await page.locator('[data-testid="edgetx-setting-toggle-crsf-bidirectional"]').click();
      await page.locator('[data-testid="edgetx-setting-body-crsf-bidirectional"]').waitFor({ timeout: 10000 });
      ok('…and it still does not once a setting is expanded',
        await noHorizontalOverflow(page));
      ok('the English label beside each setting is isolated left-to-right',
        await page.locator('[data-testid="edgetx-setting-toggle-crsf-bidirectional"] [dir="ltr"]').count() >= 1);

      // ── An aimed project link: «طلب Target» opens the field itself.
      await page.goto(`${BASE}/project?view=rc&field=rxTarget`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid="rc-setup-card"]').waitFor({ timeout: 10000 });
      ok('an aimed project link opens the control-link form at the requested field',
        await page.locator('[data-testid="rc-setup-card"]').getAttribute('data-focus-field') === 'rxTarget');
      ok('…and that field is the focused input, not merely visible',
        await page.evaluate(() => document.activeElement?.getAttribute('data-testid')) === 'rc-rx-target');
      await page.close();
    }

    const unexpected = consoleErrors.filter(e =>
      !/favicon|manifest|Download the React DevTools|Firebase|firestore|auth\//i.test(e));
    if (unexpected.length) console.error('  unexpected console errors:', unexpected.slice(0, 5));
    ok('no unexpected console or page error across the whole run', unexpected.length === 0);

    console.log(`\n✅ testProjectUI: ${passed} assertions passed\n`);
  } finally {
    await browser.close();
    if (server?.pid) { try { process.kill(-server.pid); } catch { /* already gone */ } }
  }
}

main().catch(e => { console.error(e); process.exit(1); });

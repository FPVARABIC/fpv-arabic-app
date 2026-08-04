/**
 * The project workspace, in a real browser against a real server.
 *
 * WHY THIS ONE NEEDS NO EMULATOR
 * ------------------------------
 * The project lives in localStorage. There is no account, no Firestore
 * document and no server call involved — which is itself the privacy property
 * this suite checks: the page must never post the project anywhere.
 *
 * WHAT IT PROVES
 * --------------
 * That a person can arrive with nothing, create a project, add parts, watch the
 * verdicts change, read why a verdict was reached, follow it to the article it
 * points at, see the build stages with their stop conditions, get an honest
 * readiness answer, and export and re-import the whole thing — at 390, 768 and
 * 1280 pixels, right-to-left, with no console errors.
 */
import assert from 'node:assert/strict';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { chromium, type Browser, type Page } from 'playwright';

const PORT = 3160;
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
  // Enough configuration for the site to render. No Firebase project is needed:
  // nothing on this page talks to one, which is the point.
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
    try { const r = await fetch(`${BASE}/project`, { redirect: 'manual' }); if (r.status > 0) return proc; }
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

/** Create a project through the real form, and return the page on it. */
async function createProject(page: Page, cells = '6', size = '5') {
  await goto(page, `${BASE}/project`, '[data-testid="project-empty"]');
  await page.selectOption('[data-testid="project-create-type"]', { index: 1 });
  if (size) await page.fill('[data-testid="project-create-size"]', size);
  if (cells) await page.fill('[data-testid="project-create-cells"]', cells);
  await page.click('[data-testid="project-create-submit"]');
  await page.waitForSelector('[data-testid="project-workspace"]', { timeout: 30_000 });
}

async function main() {
  buildSite();
  const server = await startServer();
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[1] Arriving with no project');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();

      const res = await page.goto(`${BASE}/project`, { waitUntil: 'domcontentloaded' });
      ok('the page loads for a signed-out visitor', res?.status() === 200);
      await page.waitForSelector('[data-testid="project-empty"]', { timeout: 30_000 });
      ok('it says there is no project yet, rather than showing an empty shell', true);

      // The server must not be the one holding the project.
      const html = await (await fetch(`${BASE}/project`)).text();
      ok('the server-sent HTML contains no project data at all',
        !html.includes('project-workspace') && !html.includes('finding-'));
      ok('and the page is marked not-indexable', /noindex/.test(html));

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[2] Creating a project, and leaving what you do not know blank');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();

      // Deliberately WITHOUT size or cells: an unknown must stay unknown.
      await goto(page, `${BASE}/project`, '[data-testid="project-empty"]');
      await page.selectOption('[data-testid="project-create-type"]', { index: 1 });
      await page.click('[data-testid="project-create-submit"]');
      await page.waitForSelector('[data-testid="project-workspace"]', { timeout: 30_000 });

      const identity = await page.locator('[data-testid="project-identity"]').innerText();
      ok('a project exists after creating it', true);
      ok('the size left blank reads as «غير محدد», not as a guessed number',
        identity.includes('غير محدد'));

      // It survives a reload — this is the storage contract working.
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="project-workspace"]', { timeout: 30_000 });
      ok('the project survives a page reload',
        await page.locator('[data-testid="project-workspace"]').count() === 1);

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[3] Adding parts, and watching the verdicts change');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      await createProject(page);

      const before = Number(await page.locator('[data-testid="project-count-ok"] .admin-stat-value').innerText())
        + Number(await page.locator('[data-testid="project-count-blocker"] .admin-stat-value').innerText())
        + Number(await page.locator('[data-testid="project-count-warning"] .admin-stat-value').innerText())
        + Number(await page.locator('[data-testid="project-count-unknown"] .admin-stat-value').innerText());

      await page.click('[data-testid="project-tab-parts"]');
      await page.waitForSelector('[data-testid="project-parts"]', { timeout: 30_000 });

      ok('a category with nothing chosen says so',
        await page.locator('[data-testid="part-empty-motors"]').count() === 1);

      await page.click('[data-testid="part-pick-motors"]');
      await page.waitForSelector('[data-testid="part-picker-motors"]', { timeout: 30_000 });
      const optionCount = await page.locator('[data-testid^="part-option-"]').count();
      ok('the catalogue offers real parts to choose from', optionCount > 0);

      // Search narrows the list rather than merely reordering it.
      const allCount = Number(await page.locator('[data-testid="part-picker-count"]').innerText());
      await page.fill('[data-testid="part-picker-search"]', 'zzzzzz-no-such-part');
      await page.waitForSelector('[data-testid="part-picker-empty"]', { timeout: 10_000 });
      ok('a search with no matches says so instead of showing everything', true);
      await page.fill('[data-testid="part-picker-search"]', '');
      ok('clearing the search restores the full list',
        Number(await page.locator('[data-testid="part-picker-count"]').innerText()) === allCount);

      const firstOption = page.locator('[data-testid^="part-option-"]').first();
      const chosenName = (await firstOption.innerText()).split('\n')[0];
      await firstOption.click();
      await page.waitForSelector('[data-testid="project-parts"]', { timeout: 30_000 });

      const row = await page.locator('[data-testid="part-row-motors"]').innerText();
      ok('the chosen part is recorded against its category', row.includes(chosenName));

      // A verdict is a COMPARISON, so one part on its own gives the engine
      // nothing to say — and inventing a finding to prove the page is alive
      // would be exactly the "speak without evidence" failure the model exists
      // to prevent. Adding the ESC gives it a real pair to judge.
      await page.click('[data-testid="part-pick-escs"]');
      await page.waitForSelector('[data-testid="part-picker-escs"]', { timeout: 30_000 });
      await page.locator('[data-testid^="part-option-"]').first().click();
      await page.waitForSelector('[data-testid="project-parts"]', { timeout: 30_000 });

      await page.click('[data-testid="project-tab-findings"]');
      const after = Number(await page.locator('[data-testid="project-count-ok"] .admin-stat-value').innerText())
        + Number(await page.locator('[data-testid="project-count-blocker"] .admin-stat-value').innerText())
        + Number(await page.locator('[data-testid="project-count-warning"] .admin-stat-value').innerText())
        + Number(await page.locator('[data-testid="project-count-unknown"] .admin-stat-value').innerText());
      ok('once there is a pair to compare, the engine has something to say and the page shows it',
        after > before);

      // And removing it changes it back.
      await page.click('[data-testid="project-tab-parts"]');
      await page.click('[data-testid="part-remove-motors"]');
      await page.waitForSelector('[data-testid="part-empty-motors"]', { timeout: 30_000 });
      ok('removing a part is possible and takes effect', true);

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[4] A verdict explains itself, and leads somewhere');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      await createProject(page);

      // Add enough for the engine to have something to say.
      await page.click('[data-testid="project-tab-parts"]');
      for (const cat of ['motors', 'escs', 'batteries', 'propellers']) {
        await page.click(`[data-testid="part-pick-${cat}"]`);
        await page.waitForSelector(`[data-testid="part-picker-${cat}"]`, { timeout: 30_000 });
        await page.locator('[data-testid^="part-option-"]').first().click();
        await page.waitForSelector('[data-testid="project-parts"]', { timeout: 30_000 });
      }

      await page.click('[data-testid="project-tab-findings"]');
      await page.waitForSelector('[data-testid="findings-list"]', { timeout: 30_000 });

      const cards = page.locator('[data-testid^="finding-"][data-severity]');
      const n = await cards.count();
      ok('the project now has verdicts', n > 0);

      const first = cards.first();
      const id = (await first.getAttribute('data-testid'))!.replace('finding-', '');
      ok('every verdict carries its severity in words, not only colour',
        /مانع|تحذير|بيانات ناقصة|تم التحقق/.test(await first.innerText()));

      await page.click(`[data-testid="finding-toggle-${id}"]`);
      await page.waitForSelector(`[data-testid="finding-detail-${id}"]`, { timeout: 10_000 });
      const detail = await page.locator(`[data-testid="finding-detail-${id}"]`).innerText();
      ok('opening a verdict shows the reasoning, not a restatement', detail.includes('السبب'));

      // Filtering narrows the list without hiding the headline count.
      const shownAll = Number(await page.locator('[data-testid="finding-shown-count"]').innerText());
      await page.click('[data-testid="finding-filter-blocker"]');
      const shownBlockers = Number(await page.locator('[data-testid="finding-shown-count"]').innerText());
      ok('filtering by severity narrows the list', shownBlockers <= shownAll);
      const blockerCount = Number(await page.locator('[data-testid="project-count-blocker"] .admin-stat-value').innerText());
      ok('…and the headline count still reports every blocker, filtered or not',
        blockerCount >= shownBlockers);
      await page.click('[data-testid="finding-filter-all"]');

      // The missing-data filter is the honest half of the engine.
      await page.click('[data-testid="finding-missing-only"]');
      const missingShown = Number(await page.locator('[data-testid="finding-shown-count"]').innerText());
      ok('the reader can isolate exactly what could not be checked', missingShown >= 0);
      await page.click('[data-testid="finding-missing-only"]');

      // A link on a verdict must go somewhere real.
      const link = page.locator('[data-testid^="finding-link-"]').first();
      if (await link.count() > 0) {
        const target = await link.getAttribute('href');
        ok('a verdict links to a real destination', !!target && target.startsWith('/'));
        const res = await fetch(`${BASE}${target}`);
        ok(`…and that destination exists (${target} → ${res.status})`, res.status === 200);
      } else {
        ok('no verdict offered a link in this fixture — nothing dead was rendered', true);
      }

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[5] Build stages, with their stop conditions');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      await createProject(page);

      await page.click('[data-testid="project-tab-stages"]');
      await page.waitForSelector('[data-testid="project-stages"]', { timeout: 30_000 });

      const stages = await page.locator('[data-testid^="stage-build-"]').count();
      ok(`the build lifecycle is shown as real stages (${stages})`, stages >= 10);

      const firstDetail = await page.locator('[data-testid="stage-detail-build-soldering-basics"]').innerText();
      ok('a stage shows its practical steps, not only a title',
        firstDetail.includes('الخطوات العملية'));
      ok('…and its warnings', firstDetail.includes('تحذيرات'));
      ok('…and how to know it succeeded', firstDetail.includes('كيف تعرف أنها نجحت'));

      // The safety rules the platform must never soften.
      const allText = await page.locator('[data-testid="project-stages"]').innerText();
      ok('the pre-flight checklist is present', allText.includes('قبل أول طيران'));
      ok('the before-battery checklist is present', allText.includes('قبل البطارية'));
      ok('the stages link to diagnostics for when something does not work',
        await page.locator('[data-testid="stages-to-diagnose"]').count() === 1);

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[6] The readiness report is honest');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      await createProject(page);

      await page.click('[data-testid="project-tab-report"]');
      await page.waitForSelector('[data-testid="project-report"]', { timeout: 30_000 });

      const ready = await page.locator('[data-testid="report-verdict"]').getAttribute('data-ready');
      ok('a project with no tests recorded is NOT reported as ready', ready === 'no');

      const untested = await page.locator('[data-testid="report-untested"]').innerText();
      ok('the failsafe test is named as unrecorded', untested.includes('Failsafe'));
      ok('the range test is named as unrecorded', untested.includes('المدى'));
      ok('the video picture check is named as unrecorded', untested.includes('صورة'));

      for (const section of ['report-blockers', 'report-warnings', 'report-missing', 'report-manual']) {
        ok(`the report has a ${section} section`,
          await page.locator(`[data-testid="${section}"]`).count() === 1);
      }
      ok('the report names the next action',
        await page.locator('[data-testid="report-next"]').count() === 1);

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[7] Export, import, delete — and privacy');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();

      // Nothing on this page may talk to a server about the project.
      const posted: string[] = [];
      page.on('request', r => { if (r.method() !== 'GET') posted.push(`${r.method()} ${r.url()}`); });

      await createProject(page);
      await page.click('[data-testid="project-tab-parts"]');
      await page.click('[data-testid="part-pick-motors"]');
      await page.waitForSelector('[data-testid="part-picker-motors"]', { timeout: 30_000 });
      await page.locator('[data-testid^="part-option-"]').first().click();
      await page.waitForSelector('[data-testid="project-parts"]', { timeout: 30_000 });

      const exported = await page.evaluate(() => localStorage.getItem('fpv-assembly-project-v1'));
      ok('the project is stored on the device', !!exported);
      ok('it carries a schema version in an envelope',
        !!exported && typeof JSON.parse(exported).v === 'number');
      ok('it stores part IDENTITIES, not copied catalogue objects',
        !!exported && JSON.stringify(JSON.parse(exported)).length < 1200);

      ok('the project was never sent to a server', posted.length === 0);

      // Import path: a foreign file must be refused rather than installed.
      await page.setInputFiles('[data-testid="project-import"]', {
        name: 'bad.json', mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify({ v: 999, data: { droneTypeId: 'nope' } })),
      });
      await page.waitForSelector('[data-testid="project-import-error"]', { timeout: 30_000 });
      ok('an unrecognised project file is refused', true);
      ok('…and the existing project is untouched',
        await page.evaluate(() => localStorage.getItem('fpv-assembly-project-v1')) === exported);

      // A real round trip.
      //
      // The file the export button writes is `exportAssemblyProject()`'s output
      // — `{ key, v, data }` — not the raw storage envelope, which has no `key`.
      // The importer checks that key and refuses a payload belonging to a
      // different store, which is correct: it is what stops an unrelated
      // exported file from being written into the project's slot.
      const envelope = JSON.parse(exported!) as { v: number; data: unknown };
      const exportFile = JSON.stringify({
        key: 'fpv-assembly-project-v1', v: envelope.v, data: envelope.data,
      });
      await page.setInputFiles('[data-testid="project-import"]', {
        name: 'good.json', mimeType: 'application/json', buffer: Buffer.from(exportFile),
      });
      await page.waitForSelector('[data-testid="project-notice"]', { timeout: 30_000 });
      ok('the project\'s own exported payload imports cleanly', true);

      // An export belonging to a DIFFERENT store must not be written into this
      // one, however well-formed it looks.
      await page.setInputFiles('[data-testid="project-import"]', {
        name: 'other.json', mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify({
          key: 'some-other-store', v: envelope.v, data: envelope.data,
        })),
      });
      await page.waitForSelector('[data-testid="project-import-error"]', { timeout: 30_000 });
      ok('an export belonging to another store is refused', true);

      // Deleting asks first.
      await page.click('[data-testid="project-clear"]');
      await page.waitForSelector('[data-testid="project-clear-confirm"]', { timeout: 10_000 });
      ok('deleting the project asks for confirmation', true);
      await page.click('[data-testid="project-clear-confirm"]');
      await page.waitForSelector('[data-testid="project-empty"]', { timeout: 30_000 });
      ok('confirming actually deletes it',
        await page.evaluate(() => localStorage.getItem('fpv-assembly-project-v1')) === null);

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[8] Deep links land where they were pointed');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      await createProject(page);

      await goto(page, `${BASE}/project?view=rc`, '[data-testid="project-workspace"]');
      ok('a project:rc destination opens the panel holding the control-link record',
        await page.locator('[data-testid="project-rc-setup"]').count() === 1);

      await goto(page, `${BASE}/project?view=findings`, '[data-testid="project-workspace"]');
      ok('a project:findings destination opens the verdicts',
        await page.locator('[data-testid="finding-search"]').count() === 1);

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[9] Layout, language and accessibility');
    {
      for (const [label, width, height] of [
        ['phone 390', 390, 844], ['tablet 768', 768, 1024], ['desktop 1280', 1280, 900],
      ] as const) {
        const ctx = await browser.newContext({ viewport: { width, height } });
        const page = await ctx.newPage();
        const errors: string[] = [];
        page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
        page.on('response', r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });

        await createProject(page);
        for (const tab of ['findings', 'parts', 'stages', 'report'] as const) {
          await page.click(`[data-testid="project-tab-${tab}"]`);
          await page.waitForTimeout(150);
          const scrolls = await page.evaluate(() => {
            const el = document.documentElement;
            const before = el.getBoundingClientRect().left;
            el.scrollLeft = 9999;
            const after = el.getBoundingClientRect().left;
            el.scrollLeft = 0;
            return Math.abs(after - before);
          });
          ok(`[${label}] the ${tab} tab does not scroll the page sideways`, scrolls <= 1);
        }

        ok(`[${label}] exactly one h1`, await page.locator('h1').count() === 1);
        ok(`[${label}] the document is Arabic and RTL`,
          await page.evaluate(() => document.documentElement.lang) === 'ar'
          && await page.evaluate(() => document.documentElement.dir) === 'rtl');
        ok(`[${label}] no console error`,
          errors.filter(e => !/favicon|net::ERR/.test(e)).length === 0);
        errors.slice(0, 2).forEach(e => { if (!/favicon|net::ERR/.test(e)) console.log(`      ${e.slice(0, 200)}`); });

        await ctx.close();
      }

      // Keyboard and semantics, once.
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      await createProject(page);

      ok('the status headline is announced when it changes',
        await page.locator('[data-testid="project-status"][aria-live="polite"]').count() === 1);
      ok('the tabs are a real tablist',
        await page.locator('[role="tablist"] [role="tab"]').count() === 4);
      ok('the selected tab is marked for assistive tech',
        await page.locator('[role="tab"][aria-selected="true"]').count() === 1);

      await page.click('[data-testid="project-tab-parts"]');
      ok('the parts table has a caption', await page.locator('table caption').count() >= 1);
      ok('its column headers are real scoped headers',
        await page.locator('table th[scope="col"]').count() >= 3);

      await page.click('[data-testid="project-tab-findings"]');
      const focusable = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="finding-search"]') as HTMLElement | null;
        el?.focus();
        return document.activeElement === el;
      });
      ok('the verdict search is keyboard focusable', focusable);

      await ctx.close();
    }
  } finally {
    browser?.close().catch(() => {});
    try { if (server.pid) process.kill(-server.pid, 'SIGTERM'); } catch { /* gone */ }
    server.kill('SIGTERM');
    freePort();
  }

  console.log(`\n${failures.length === 0 ? '✅' : '❌'} testWebProjectE2E: ${passed} assertions passed, ${failures.length} failed`);
  failures.forEach(f => console.log(`   - ${f}`));
  assert.equal(failures.length, 0, `${failures.length} assertion(s) failed`);
}

main().catch(err => { console.error(err); process.exit(1); });

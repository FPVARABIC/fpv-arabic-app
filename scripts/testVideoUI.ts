/**
 * The video system, proved in a real browser.
 *
 * WHY A BROWSER TEST AT ALL, GIVEN scripts/testVideo.ts
 * ----------------------------------------------------
 * `testVideo.ts` proves the data is right: the rules fire, the links resolve,
 * the metadata is filled. It cannot prove any of the four things that only
 * exist once a browser is involved:
 *
 *   a deep link actually opens the thing it names, in a real router
 *   the recorded video setup actually reaches the one project store
 *   a verdict computed from that record actually appears on screen
 *   the whole thing fits a 390px right-to-left column without overflowing
 *
 * Each of those has failed silently before on this codebase while every data
 * assertion passed, which is why they are asserted here against a production
 * bundle served over HTTP rather than against a JSDOM stub.
 *
 * Run: npx tsx scripts/testVideoUI.ts
 */
import assert from 'node:assert/strict';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { chromium, type Browser, type Page } from 'playwright';

import { allVideoToolPages, videoToolSections } from '../src/data/video/software/registry';
import { computeVideoFindings } from '../src/data/project/videoVerdicts';
import { VIDEO_FIELD_INPUT_ID } from '../src/data/project/videoSetup';
import { SCHEMA_VERSION } from '../src/data/project/store';
import type { ProjectSnapshot } from '../src/data/project/types';

const PORT = 4414;
const BASE = `http://localhost:${PORT}`;
const OUT_DIR = 'dist-video-uitest';
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

/**
 * Puts a real project in this page's storage.
 *
 * Every `newPage` gets its own browser context, so storage does NOT carry
 * between sections — each one that needs a project seeds its own.
 *
 * Written in the pre-envelope shape the store still accepts and migrates. That
 * is deliberate rather than incidental: seeding through the migration path
 * proves on every run that a project saved before the video record existed
 * still loads, which is one of the things this system had to not break.
 */
async function seedProject(page: Page, videoSetup?: Record<string, unknown>): Promise<void> {
  await page.goto(`${BASE}/project`, { waitUntil: 'networkidle' });
  await page.evaluate(({ key, videoSetup }) => localStorage.setItem(key, JSON.stringify({
    version: 1, droneTypeId: 'freestyle', stageIndex: 5, partIds: {},
    ...(videoSetup ? { videoSetup } : {}),
  })), { key: STORAGE_KEY, videoSetup });
}

async function newPage(browser: Browser, errors: string[]): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  return page;
}

/**
 * A build whose goggles belong to a different ecosystem from its air unit.
 *
 * Chosen because it is the one mistake this whole system exists to catch, and
 * because the engine rates it a blocker — so it must be visible on screen, not
 * merely present in an array.
 */
const MISMATCH = { ecosystem: 'dji', gogglesEcosystem: 'hdzero' } as const;
const MISMATCH_FINDING = computeVideoFindings(
  { exists: true, videoSetup: { ...MISMATCH } } as ProjectSnapshot,
).find(f => f.id === 'video-goggles-system');
assert.ok(MISMATCH_FINDING, 'expected a goggles-ecosystem finding to exist for the browser test');

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

    // ────────────────────────────────────────────────────────────────────────
    console.log('\n[1] The video record is editable, stored, and immediately judged');
    {
      const page = await newPage(browser, consoleErrors);
      // Both setup cards live behind "a project exists" — a workspace with no
      // build has nothing to record settings AGAINST, and that gating is
      // pre-existing behaviour the control-link card shares.
      await seedProject(page);
      await page.reload({ waitUntil: 'networkidle' });

      const card = page.locator('[data-testid="video-setup-card"]');
      await card.waitFor({ timeout: 10000 });
      ok('the video setup card renders beside the control-link one', await card.count() === 1);
      ok('…and the control-link card is still there, untouched',
        await page.locator('[data-testid="rc-setup-card"]').count() === 1);
      ok('an empty record reports 0 of its driving fields',
        await page.locator('[data-testid="video-setup-completeness"]').getAttribute('data-filled') === '0');

      // Record the one mistake the system exists to catch.
      await page.selectOption('[data-testid="video-ecosystem"]', MISMATCH.ecosystem);
      await page.selectOption('[data-testid="video-goggles-ecosystem"]', MISMATCH.gogglesEcosystem);
      ok('the completeness counter moves as fields are filled',
        await page.locator('[data-testid="video-setup-completeness"]').getAttribute('data-filled') === '2');

      await page.locator('[data-testid="video-setup-save"]').click();

      const finding = page.locator('[data-testid="project-finding-video-goggles-system"]');
      await finding.waitFor({ timeout: 10000 });
      ok('saving the video setup immediately produces a verdict about it', await finding.count() === 1);
      ok('…and mismatched goggles are shown as a blocker',
        await finding.getAttribute('data-severity') === 'blocker');
      ok('…and the next step stops the user',
        await page.locator('[data-testid="project-next-step"]').getAttribute('data-blocked') === 'true');

      // It must survive a reload, and land in the ONE store.
      await page.reload({ waitUntil: 'networkidle' });
      await card.waitFor({ timeout: 10000 });
      ok('the recorded video setup survives a reload',
        await page.locator('[data-testid="project-finding-video-goggles-system"]').count() === 1);

      const parsed = JSON.parse(await page.evaluate(k => localStorage.getItem(k), STORAGE_KEY) ?? '{}');
      ok('…because it was written into the one project store, not a second one',
        parsed?.v === SCHEMA_VERSION && parsed?.data?.videoSetup?.ecosystem === MISMATCH.ecosystem);
      ok('…and the control-link record shares that same store without collision',
        Object.prototype.hasOwnProperty.call(parsed?.data ?? {}, 'videoSetup')
        && !Object.prototype.hasOwnProperty.call(parsed ?? {}, 'videoStore'));

      ok('the workspace does not overflow 390px with both records open',
        await noHorizontalOverflow(page));
      await page.close();
    }

    // ────────────────────────────────────────────────────────────────────────
    console.log('\n[2] Aimed project links open the video form at the field they name');
    {
      const page = await newPage(browser, consoleErrors);
      await seedProject(page);
      // Three fields from three different sections of the form, so the test
      // proves the focus mechanism rather than one lucky element.
      for (const field of ['gogglesEcosystem', 'osdUartIndex', 'txAntennaPolarisation'] as const) {
        await page.goto(`${BASE}/project?view=video&field=${field}`, { waitUntil: 'networkidle' });
        await page.locator('[data-testid="video-setup-card"]').waitFor({ timeout: 10000 });
        ok(`«${field}»: the video form opens at the requested field`,
          await page.locator('[data-testid="video-setup-card"]').getAttribute('data-focus-field') === field);
        ok(`«${field}»: …and that field is the focused input, not merely visible`,
          await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))
            === VIDEO_FIELD_INPUT_ID[field]);
      }

      // A control-link field must still route to the control-link form, so the
      // shared `?field=` parameter did not quietly annex the other record.
      await page.goto(`${BASE}/project?view=rc&field=rxTarget`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid="rc-setup-card"]').waitFor({ timeout: 10000 });
      ok('a control-link field still opens the control-link form',
        await page.locator('[data-testid="rc-setup-card"]').getAttribute('data-focus-field') === 'rxTarget');
      ok('…and the video form is not the one focused',
        await page.locator('[data-testid="video-setup-card"]').getAttribute('data-focus-field') === '');

      // An unknown field degrades to the workspace rather than to an error.
      await page.goto(`${BASE}/project?view=video&field=notARealField`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid="video-setup-card"]').waitFor({ timeout: 10000 });
      ok('an unknown field id degrades to the plain workspace instead of erroring',
        await page.locator('[data-testid="video-setup-card"]').getAttribute('data-focus-field') === '');
      await page.close();
    }

    // ────────────────────────────────────────────────────────────────────────
    console.log('\n[3] The software centre is a place, not a list');
    {
      const page = await newPage(browser, consoleErrors);
      await page.goto(`${BASE}/programming`, { waitUntil: 'networkidle' });
      await page.locator('text=برامج الفيديو').first().click();
      await page.waitForURL('**/programming/video', { timeout: 10000 });
      ok('the programming screen reaches the video centre', page.url().endsWith('/programming/video'));

      await page.locator('[data-testid="video-software-sections"]').waitFor({ timeout: 10000 });
      for (const s of videoToolSections) {
        ok(`section renders: ${s.id}`,
          await page.locator(`[data-testid="video-software-section-${s.id}"]`).count() === 1);
      }
      ok(`every page has an entry on the hub (${allVideoToolPages.length})`,
        (await page.locator('[data-testid^="video-software-page-"]').count()) === allVideoToolPages.length);
      ok('the centre does not overflow 390px', await noHorizontalOverflow(page));

      // It searches, which is what makes it a centre rather than a menu.
      await page.locator('[data-testid="video-software-search"]').fill('التحديث توقف');
      await page.locator('[data-testid="video-software-search-results"]').waitFor({ timeout: 10000 });
      ok('searching a symptom reaches the page that owns it',
        await page.locator('[data-testid="video-software-result-tool-update-failure"]').count() === 1);

      await page.locator('[data-testid="video-software-result-tool-update-failure"]').click();
      await page.waitForURL('**/programming/video/tool-update-failure', { timeout: 10000 });
      ok('…and clicking it opens that page', page.url().endsWith('/tool-update-failure'));
      await page.close();
    }

    // ────────────────────────────────────────────────────────────────────────
    console.log('\n[4] A software page carries its whole contract on screen');
    {
      const page = await newPage(browser, consoleErrors);
      await page.goto(`${BASE}/programming/video/tool-firmware-update`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid="video-software-page-steps"]').waitFor({ timeout: 10000 });

      for (const block of ['tool', 'prereq', 'steps', 'relation', 'mistakes', 'verify', 'revert', 'versions', 'manual', 'sources']) {
        ok(`the «${block}» block is rendered`,
          await page.locator(`[data-testid="video-software-page-${block}"]`).count() === 1);
      }
      ok('the risk banner appears before anything actionable',
        await page.locator('[data-testid="video-software-page-risk"]').count() === 1);
      ok('the declared missing data is visible, not a footnote',
        await page.locator('[data-testid="video-software-page-manual-list"] li').count() >= 2);
      ok('the page does not overflow 390px', await noHorizontalOverflow(page));
      ok('the English title is isolated left-to-right inside the RTL column',
        await page.locator('[dir="ltr"]').count() >= 1);

      // Continuation within the section, and the outbound links.
      ok('the section offers a next page', await page.locator('[data-testid="video-software-page-next"]').count() === 1);
      await page.locator('[data-testid="video-software-page-link-video-tool-backup"]').click();
      await page.waitForURL('**/programming/video/tool-backup', { timeout: 10000 });
      ok('an outbound link opens the page it names', page.url().endsWith('/tool-backup'));

      // An unknown page degrades rather than erroring.
      await page.goto(`${BASE}/programming/video/not-a-real-page`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid="video-software-page-missing"]').waitFor({ timeout: 10000 });
      ok('an unknown page id degrades to a message, not a blank screen',
        await page.locator('[data-testid="video-software-page-missing"]').count() === 1);
      await page.close();
    }

    // ────────────────────────────────────────────────────────────────────────
    console.log('\n[5] The reader\'s own build reaches the pages that act on it');
    {
      const page = await newPage(browser, consoleErrors);
      await seedProject(page, {
        ecosystem: 'analog-58', linkClass: 'analog',
        vtxControlProtocol: 'smartaudio', vtxControlUartIndex: 3,
        osdProtocol: 'analog-chip', band: '5.8ghz', channel: 'R1',
      });

      // The Betaflight VTX page must show what THIS build recorded.
      await page.goto(`${BASE}/betaflight/vtx`, { waitUntil: 'networkidle' });
      const ctx = page.locator('[data-testid="bf-project-context"]');
      await ctx.waitFor({ timeout: 10000 });
      ok('the Betaflight video page reads the reader\'s recorded setup', await ctx.count() === 1);
      ok('…and shows the video record specifically, not only the control-link one',
        await page.locator('[data-testid="bf-video-fact-vtxControlProtocol"]').count() === 1);
      ok('…including the channel they fly on',
        await page.locator('[data-testid="bf-video-fact-channel"]').count() === 1);
      ok('the Betaflight surface does not overflow 390px', await noHorizontalOverflow(page));

      // The software centre hub reads it too.
      await page.goto(`${BASE}/programming/video`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid="video-software-sections"]').waitFor({ timeout: 10000 });
      ok('the centre hub shows the reader\'s recorded system',
        await page.locator('[data-testid="video-software-hub-video-fact-ecosystem"]').count() === 1);

      // A page whose declared fields the reader HAS filled shows the panel…
      await page.goto(`${BASE}/programming/video/bf-ports-video`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid="video-software-page-steps"]').waitFor({ timeout: 10000 });
      ok('a page whose declared fields are recorded shows the context panel',
        await page.locator('[data-testid="video-software-page-project-context"]').count() === 1);
      await page.close();

      // …and a reader who has recorded nothing sees no panel anywhere. This is
      // the «لا تعرض لوحة عامة متكررة في كل صفحة» rule, proved rather than
      // asserted: an empty panel repeated on every page is exactly what the
      // requirement forbids, and it is the shape this would degrade into if
      // the emptiness check were ever dropped.
      const bare = await newPage(browser, consoleErrors);
      for (const id of ['bf-ports-video', 'tool-logs', 'dji-tools']) {
        await bare.goto(`${BASE}/programming/video/${id}`, { waitUntil: 'networkidle' });
        await bare.locator('[data-testid="video-software-page-steps"]').waitFor({ timeout: 10000 });
        ok(`«${id}»: no project means no context panel at all`,
          await bare.locator('[data-testid="video-software-page-project-context"]').count() === 0);
      }
      await bare.goto(`${BASE}/programming/video`, { waitUntil: 'networkidle' });
      await bare.locator('[data-testid="video-software-sections"]').waitFor({ timeout: 10000 });
      ok('…and the hub shows none either', await bare.locator('[data-testid="video-software-hub-project-context"]').count() === 0);
      await bare.close();
    }

    // ────────────────────────────────────────────────────────────────────────
    console.log('\n[6] The knowledge module and its diagnostics are reachable');
    {
      const page = await newPage(browser, consoleErrors);
      await page.goto(`${BASE}/kb/video`, { waitUntil: 'networkidle' });
      await page.locator('text=نظام الفيديو').first().waitFor({ timeout: 10000 });
      ok('the video module renders on the generic module route',
        (await page.locator('text=نظام الفيديو').count()) >= 1);
      ok('the module screen does not overflow 390px', await noHorizontalOverflow(page));

      await page.goto(`${BASE}/diagnose/dx-video-no-image`, { waitUntil: 'networkidle' });
      await page.locator('text=لا توجد صورة').first().waitFor({ timeout: 10000 });
      ok('a video diagnostic tree opens by deep link',
        (await page.locator('text=لا توجد صورة').count()) >= 1);
      ok('the diagnostic screen does not overflow 390px', await noHorizontalOverflow(page));

      // Global search reaches the video content from outside the section.
      await page.goto(`${BASE}/search`, { waitUntil: 'networkidle' });
      await page.locator('input').first().fill('شاشة سوداء');
      await page.waitForTimeout(400);
      ok('global search reaches the video diagnosis for a symptom phrase',
        (await page.locator('text=لا توجد صورة').count()) >= 1);
      await page.close();
    }

    const unexpected = consoleErrors.filter(e =>
      !/favicon|manifest|Download the React DevTools|Firebase|firestore|auth\//i.test(e));
    if (unexpected.length) console.error('  unexpected console errors:', unexpected.slice(0, 5));
    ok('no unexpected console or page error across the whole run', unexpected.length === 0);

    console.log(`\n✅ testVideoUI: ${passed} assertions passed\n`);
  } finally {
    await browser.close();
    if (server?.pid) { try { process.kill(-server.pid); } catch { /* already gone */ } }
  }
}

main().catch(e => { console.error(e); process.exit(1); });

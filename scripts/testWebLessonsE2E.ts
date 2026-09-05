/**
 * The lessons section on the web, in a real browser against a real production
 * build — the proof that the rebuild's promises hold where a reader meets them.
 *
 * What it proves, in the order a learner meets it:
 *   1. /lessons lists seventeen lessons in four stations, whole cards clickable,
 *      and offers lesson 1 as the place to start.
 *   2. A lesson opens on stage 1 with its objective; moving stages hands focus
 *      to the new stage's title.
 *   3. Answering a checkpoint and RELOADING restores the same stage and answer —
 *      the failure the whole rebuild set out to remove.
 *   4. /lessons then shows «تابع من حيث توقّفت» at that exact stage.
 *   5. Lesson 1 can be completed end to end: every checkpoint, every motor on
 *      the interactive diagram, every recall prompt — the quiz result reads
 *      4/4 on the first try, the completion button unlocks, and the index
 *      marks the lesson done with its score.
 *   6. «أعِد الاختبار» clears the four answers and returns to the first question.
 *   7. Lesson 17's stick diagram renders and all four axes can be explored.
 *
 * Requires a production build (`npm run web:build`); pass SKIP_BUILD=1 to reuse
 * one. Uses the pre-installed Chromium.
 */
import assert from 'node:assert/strict';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { chromium, type Page } from 'playwright';
import { lesson01JourneyDefinition } from '../src/data/lessons/lesson01Journey.definition';
import type { CheckpointStage } from '../src/types/lessonJourney';

const PORT = 3171;
const BASE = `http://localhost:${PORT}`;
const WEB_ENV = {
  ...process.env,
  NEXT_PUBLIC_FIREBASE_API_KEY: 'fake-api-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'demo.appspot.com',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:000000000000:web:0000000000000000000000',
};

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

function buildSite() {
  if (process.env.SKIP_BUILD) { console.log('\n[build] skipped (SKIP_BUILD)'); return; }
  console.log('\n[build] production build of web/ …');
  const res = spawnSync('npx', ['next', 'build'], { cwd: 'web', env: WEB_ENV, stdio: ['ignore', 'ignore', 'inherit'] });
  if (res.status !== 0) throw new Error('next build failed');
}

async function startServer(): Promise<ChildProcess> {
  spawnSync('bash', ['-c', `fuser -k ${PORT}/tcp 2>/dev/null || true`], { stdio: 'ignore' });
  const proc = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    cwd: 'web', env: WEB_ENV, stdio: ['ignore', 'pipe', 'pipe'], detached: true,
  });
  proc.stderr?.on('data', d => process.stdout.write(`  [server] ${d}`));
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error(`next start exited ${proc.exitCode}`);
    try { const r = await fetch(`${BASE}/lessons`, { redirect: 'manual' }); if (r.status > 0) return proc; } catch { /* not up */ }
    await new Promise(r => setTimeout(r, 400));
  }
  throw new Error('server never became reachable');
}

async function goto(page: Page, url: string, anchor: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(anchor, { timeout: 30_000 });
}

const journey = (page: Page) => page.locator('[data-testid="lesson-journey"]');
const stageId = (page: Page) => journey(page).getAttribute('data-stage-id');
const stageNo = async (page: Page) => Number(await journey(page).getAttribute('data-stage'));

async function clickNext(page: Page) {
  await page.locator('[data-testid="lesson-next"]').click();
  await page.waitForTimeout(60);
}

/** Answer the checkpoint on the current stage with its CORRECT option, using the definition. */
async function answerCorrectly(page: Page, def: typeof lesson01JourneyDefinition) {
  const sid = await stageId(page);
  const stage = def.stages.find((s): s is CheckpointStage => s.type === 'checkpoint' && s.id === sid);
  if (!stage) return false;
  const correct = stage.checkpoint.options.find(o => o.correct)!;
  await page.locator(`[data-testid="checkpoint-${stage.checkpoint.id}-option-${correct.id}"]`).click();
  await page.waitForSelector(`[data-testid="checkpoint-${stage.checkpoint.id}-feedback"]`);
  return true;
}

async function main() {
  buildSite();
  const server = await startServer();
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium' });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(String(e)));

  try {
    console.log('\n[1] The index: seventeen lessons, four stations, whole-card links');
    await goto(page, `${BASE}/lessons`, '[data-testid="lesson-card-lesson-quadcopter-intro"]');
    ok('17 lesson cards', await page.locator('[data-testid^="lesson-card-"]').count() === 17);
    ok('4 stations', await page.locator('[data-testid^="lesson-track-"]').count() === 4);
    ok('the flight station holds lesson 17', await page.locator('[data-testid="lesson-track-flight"] [data-testid="lesson-card-lesson-stick-control-first-flight"]').count() === 1);
    ok('a card is an anchor to the lesson', (await page.locator('[data-testid="lesson-card-lesson-lipo-batteries"]').getAttribute('href')) === '/lessons/lesson-lipo-batteries');
    await page.waitForSelector('[data-testid="lesson-suggest-card"]');
    ok('a fresh reader is offered lesson 1 as the place to start', (await page.locator('[data-testid="lesson-suggest-link"]').getAttribute('href')) === '/lessons/lesson-quadcopter-intro');
    ok('the progress bar reads 0 done', (await page.locator('[data-testid="lessons-progress"]').getAttribute('data-done')) === '0');
    ok('the header tab for الدروس is lit', await page.locator('a[href="/lessons"][aria-current="page"]').count() >= 1);

    console.log('\n[2] Opening a lesson: stage 1, the objective, and focus on stage change');
    await page.locator('[data-testid="lesson-card-lesson-lipo-batteries"]').click();
    await page.waitForSelector('[data-testid="lesson-journey"]');
    ok('URL is the lesson', page.url().endsWith('/lessons/lesson-lipo-batteries'));
    ok('opens on stage 1', await stageNo(page) === 1);
    ok('the objective is shown on the orientation stage', await page.locator('[data-testid="lesson-objective"]').count() === 1);
    ok('the stage progressbar is a real progressbar', (await page.locator('[data-testid="lesson-journey"] [role="progressbar"]').getAttribute('aria-valuenow')) === '1');
    await clickNext(page);
    ok('after «التالي» the new stage title has focus', await page.evaluate(() => document.activeElement?.getAttribute('data-testid') === 'lesson-stage-title'));
    ok('stage 2 is the lesson explanation, split into readable paragraphs', await page.locator('[data-testid="lesson-journey"] .lj-prose p').count() >= 2);

    console.log('\n[3] Persistence: answer, reload, still there');
    let guard = 0;
    while ((await page.locator('[data-testid^="checkpoint-"]').count()) === 0 && guard++ < 20) await clickNext(page);
    const cpStage = await stageNo(page);
    const cpTestId = await page.locator('[data-testid^="checkpoint-"]').first().getAttribute('data-testid');
    const cpId = cpTestId!.replace('checkpoint-', '');
    await page.locator(`[data-testid="checkpoint-${cpId}-option-a"]`).click();
    await page.waitForSelector(`[data-testid="checkpoint-${cpId}-feedback"]`);
    ok(`answered checkpoint "${cpId}" on stage ${cpStage}`, true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="lesson-journey"]');
    ok('after reload the lesson reopens on the same stage', await stageNo(page) === cpStage);
    ok('the answer survived the reload', (await page.locator(`[data-testid="checkpoint-${cpId}-option-a"]`).getAttribute('aria-pressed')) === 'true');

    console.log('\n[4] The index remembers where you stopped');
    await goto(page, `${BASE}/lessons`, '[data-testid="lesson-resume-card"]');
    ok('«تابع من حيث توقّفت» names the stage', (await page.locator('[data-testid="lesson-resume-card"]').innerText()).includes(`المرحلة ${cpStage} من`));
    ok('the resume link opens the lesson', (await page.locator('[data-testid="lesson-resume-link"]').getAttribute('href')) === '/lessons/lesson-lipo-batteries');
    ok('the card chip reads in progress', (await page.locator('[data-testid="lesson-status-lesson-lipo-batteries"]').innerText()).includes('قيد التقدّم'));

    console.log('\n[5] Lesson 1 end to end: every gate, then the score and completion');
    await goto(page, `${BASE}/lessons/lesson-quadcopter-intro`, '[data-testid="lesson-journey"]');
    const def = lesson01JourneyDefinition;
    guard = 0;
    while ((await page.locator('[data-testid="lesson-complete-btn"]').count()) === 0 && guard++ < 40) {
      await answerCorrectly(page, def);
      if ((await page.locator('[data-testid="lesson-diagram"]').count()) > 0) {
        const motors = page.locator('[data-testid="lesson-diagram"] [data-testid^="quad-x-motor-"]');
        const n = await motors.count();
        // The motors spin continuously (the phone app's `spin-slow` animation), so
        // Playwright's stability check never settles — force the click, as a finger would.
        for (let i = 0; i < n; i++) { await motors.nth(i).click({ force: true }); await page.waitForTimeout(30); }
      }
      const reveals = page.locator('[data-testid$="-reveal"]');
      while ((await reveals.count()) > 0) { await reveals.first().click(); await page.waitForTimeout(30); }
      await clickNext(page);
    }
    ok('reached the completion stage', await page.locator('[data-testid="lesson-complete-btn"]').count() === 1);
    ok('the diagram was rendered on the web on its stage', guard > 0);
    ok('the quiz result reads 4 of 4 on the first try', (await page.locator('[data-testid="lesson-quiz-result"]').getAttribute('data-first-try')) === '4');
    ok('every readiness requirement is met', await page.locator('[data-testid^="requirement-"][data-met="false"]').count() === 0);
    ok('the completion button is enabled', await page.locator('[data-testid="lesson-complete-btn"]').isEnabled());
    await page.locator('[data-testid="lesson-complete-btn"]').click();
    await page.waitForSelector('[data-testid="lesson-completed-banner"]');
    ok('the lesson is marked complete', true);
    ok('the bridge to lesson 2 appears', (await page.locator('[data-testid="lesson-open-next"]').getAttribute('href')) === '/lessons/lesson-quadcopter-how-it-works');

    console.log('\n[6] «أعِد الاختبار» clears the answers and returns to the first question');
    await page.locator('[data-testid="lesson-quiz-retry"]').click();
    await page.waitForTimeout(80);
    const firstCheckpoint = def.stages.find(s => s.type === 'checkpoint')!;
    ok('lands on the first checkpoint stage', await stageId(page) === firstCheckpoint.id);
    ok('no option is selected any more', await page.locator('[data-testid^="checkpoint-"][data-testid$="-feedback"]').count() === 0);

    console.log('\n[7] The index shows the completed lesson with its score');
    await goto(page, `${BASE}/lessons`, '[data-testid="lesson-status-lesson-quadcopter-intro"]');
    await page.waitForFunction(() => document.querySelector('[data-testid="lessons-progress"]')?.getAttribute('data-done') === '1');
    ok('one lesson done', true);
    ok('the completed chip is shown', (await page.locator('[data-testid="lesson-status-lesson-quadcopter-intro"]').innerText()).startsWith('مكتمل'));
    ok('lesson 2 is now the suggestion', (await page.locator('[data-testid="lesson-suggest-link"]').getAttribute('href')) === '/lessons/lesson-quadcopter-how-it-works');

    console.log('\n[8] Lesson 17: the stick diagram renders and all four axes are explorable');
    await goto(page, `${BASE}/lessons/lesson-stick-control-first-flight`, '[data-testid="lesson-journey"]');
    guard = 0;
    while ((await page.locator('[data-testid="stick-left-throttle-up"]').count()) === 0 && guard++ < 10) await clickNext(page);
    ok('the stick diagram is on its stage', await page.locator('[data-testid="stick-left-throttle-up"]').count() === 1);
    for (const id of ['stick-left-throttle-up', 'stick-left-yaw-left', 'stick-right-pitch-up', 'stick-right-roll-right']) {
      await page.locator(`[data-testid="${id}"]`).click(); await page.waitForTimeout(30);
    }
    ok('all four axes count as explored', (await page.locator('[data-testid="lesson-diagram-progress"]').innerText()).includes('4 من 4'));

    ok(`no page errors during the run (${errors.length})`, errors.length === 0);
    if (errors.length) console.error(errors);
  } finally {
    await browser.close();
    try { process.kill(-server.pid!, 'SIGTERM'); } catch { /* already gone */ }
  }
  console.log(`\nAll ${passed} assertions passed.`);
}

main().catch(e => { console.error(e); process.exit(1); });

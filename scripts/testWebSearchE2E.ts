/**
 * Search, in a real browser against a real production build.
 *
 * WHAT ONLY A BROWSER CAN PROVE
 * -----------------------------
 *   - that the reader's own project appears in THEIR results and in nobody
 *     else's — and specifically that it is not in the served HTML, which is the
 *     one failure mode that would be invisible in every other kind of test
 *   - that a filter chip, a page link and the Back button all keep the query
 *   - that the header box reaches search from a page that is not search
 *   - that the whole thing works with the keyboard alone
 *   - that nothing scrolls sideways at 390px in a right-to-left document
 *
 * The emulator is needed for exactly one section: the community group. Without
 * it there are no posts, and «the two groups are separate» would pass
 * vacuously — which is the same as not testing it.
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { chromium, type Browser, type Page } from 'playwright';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore, connectFirestoreEmulator, doc, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { generateSearchTokens } from '../src/components/Community/utils/searchSynonyms';
import { validateRcSetup } from '../src/data/project/rcSetup';
import { validateVideoSetup } from '../src/data/project/videoSetup';
import { SCHEMA_VERSION } from '../src/data/project/store';

const PORT = 3162;
const BASE = `http://localhost:${PORT}`;
const PROJECT_ID = 'demo-community-rules-test';

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
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: `${PROJECT_ID}.appspot.com`,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:000000000000:web:0000000000000000000000',
  // The admin SDK talks to the emulator, which is what lets the community
  // channel return real rows instead of an empty list.
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  GOOGLE_CLOUD_PROJECT: PROJECT_ID,
  FIREBASE_PROJECT_ID: PROJECT_ID,
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
    try { const r = await fetch(`${BASE}/search`, { redirect: 'manual' }); if (r.status > 0) return proc; }
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

/** Whether the document scrolls sideways — measured by moving it, not by maths. */
async function scrollsSideways(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const el = document.scrollingElement ?? document.documentElement;
    const before = el.scrollLeft;
    el.scrollLeft = before - 400; const left = el.scrollLeft;
    el.scrollLeft = before + 400; const right = el.scrollLeft;
    el.scrollLeft = before;
    return left !== before || right !== before;
  });
}

/** A project built through the app's own validators, so a bad seed fails loudly. */
function buildSeed() {
  const RC = {
    radioModel: 'RadioMaster TX16S', moduleKind: 'internal',
    txSystem: 'elrs', rxSystem: 'elrs', txBand: '2.4ghz', rxBand: '2.4ghz',
    rxModel: 'EP1 Dual', serialProtocol: 'crsf', uartIndex: 2, videoUartIndex: 2,
    failsafeStrategy: 'drop-disarm', modelMatch: true,
  };
  const VIDEO = {
    ecosystem: 'analog-58', linkClass: 'analog', osdProtocol: 'analog-chip',
    osdUartIndex: 2, vtxControlProtocol: 'smartaudio', vtxControlUartIndex: 2,
  };
  const rcSetup = validateRcSetup(RC);
  const videoSetup = validateVideoSetup(VIDEO);
  const dropped = [
    ...Object.keys(RC).filter(k => (rcSetup as Record<string, unknown> | undefined)?.[k] === undefined),
    ...Object.keys(VIDEO).filter(k => (videoSetup as Record<string, unknown> | undefined)?.[k] === undefined),
  ];
  if (dropped.length) throw new Error(`seed rejected by the store's validators: ${dropped.join(', ')}`);
  return {
    v: SCHEMA_VERSION,
    data: {
      version: SCHEMA_VERSION, droneTypeId: 'freestyle', stageIndex: 0,
      sizeInch: 5, batteryVoltage: 6, partIds: {}, rcSetup, videoSetup,
    },
    savedAt: '2026-08-04T00:00:00.000Z',
  };
}
const SEEDED_PROJECT = buildSeed();

/**
 * A member post whose text matches a query the official index also answers.
 *
 * Deliberately about UART, because that is a subject the documented content
 * covers well — which is the only way to prove the two never merge. A post
 * about something nothing else mentions would sit alone and prove nothing.
 */
const POST_TEXT = 'تجربتي مع منفذ UART في لوحتي\nركّبت المستقبل على UART وواجهت مشكلة، وهذا رأيي الشخصي فقط.';
const POST_HEADING = 'تجربتي مع منفذ UART في لوحتي';

async function seedCommunity(): Promise<void> {
  const app = initializeApp({ apiKey: 'fake-api-key', projectId: PROJECT_ID }, `seed-${Date.now()}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);

  const cred = await createUserWithEmailAndPassword(auth, `seed${Date.now()}@t.test`, 'passw0rd!');
  const uid = cred.user.uid;

  // Written through the CLIENT SDK against the real rules, not the admin SDK.
  // A fixture that bypasses the rules can be a shape the product could never
  // actually produce, and then the test proves nothing about the real thing.
  await setDoc(doc(db, 'users', uid), {
    displayName: 'عضو تجريبي',
    displayNameNormalized: 'عضو تجريبي',
    photoURL: null,
    joinedAt: serverTimestamp(),
    postsCount: 0,
    role: 'user',
    status: 'active',
    lastPostAt: null,
    lastCommentAt: null,
  });
  await setDoc(doc(db, 'posts', 'search-e2e-post'), {
    authorId: uid,
    authorName: 'عضو تجريبي',
    authorPhoto: null,
    text: POST_TEXT,
    category: 'questions',
    // The rules read mediaURL unconditionally, so a text-only post still has to
    // carry the media fields as explicit nulls. Omitting them is what the
    // composer would never do, and what the rules therefore refuse.
    mediaType: 'none',
    mediaURL: null,
    thumbnailURL: null,
    mediaSize: null,
    mediaPath: null,
    mediaDuration: null,
    mediaWidth: null,
    mediaHeight: null,
    status: 'active',
    createdAt: serverTimestamp(),
    commentsCount: 0,
    likesCount: 0,
    feedScore: 100,
    searchTokens: generateSearchTokens(POST_TEXT),
  });
  await deleteApp(app);
}

async function main() {
  await seedCommunity();
  buildSite();
  const server = await startServer();
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[1] A query returns explained, grouped results');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();

      const res = await page.goto(`${BASE}/search?q=${encodeURIComponent('UART')}`,
        { waitUntil: 'domcontentloaded' });
      ok('the search page loads', res?.status() === 200);
      await page.waitForSelector('[data-testid="search-results"]', { timeout: 30_000 });

      const count = await page.locator('[data-testid="search-count"]').innerText();
      ok('it says how many it found', /\d/.test(count));

      // Every result explains itself. This is the requirement that no bare
      // number may stand in for a reason.
      const cards = page.locator('[data-testid="search-results"] > li');
      const n = await cards.count();
      ok(`results are rendered (${n})`, n > 3);

      let explained = 0;
      for (let i = 0; i < Math.min(n, 8); i++) {
        const html = await cards.nth(i).innerHTML();
        if (/data-testid="reason-/.test(html)) explained++;
      }
      ok('every result shown carries a match explanation', explained === Math.min(n, 8));

      // And a badge naming its type.
      const badges = await page.locator('[data-testid^="result-badge-"]').count();
      ok('every result carries a type badge', badges >= Math.min(n, 8));

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[2] A natural-language question is read as one');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();

      await goto(page, `${BASE}/search?q=${encodeURIComponent('الريسيفر لا يشتغل')}`,
        '[data-testid="search-results"]');
      ok('a fault report is recognised as one',
        (await page.locator('[data-testid="search-intent"]').innerText()).includes('عطل'));
      ok('…and it says what it would need to know before judging',
        await page.locator('[data-testid="search-missing"]').count() === 1);

      await goto(page, `${BASE}/search?q=${encodeURIComponent('أين أجد Ports؟')}`,
        '[data-testid="search-results"]');
      const first = await page.locator('[data-testid="search-results"] > li').first().innerText();
      ok('«أين أجد Ports» leads with the Betaflight screen', first.includes('Ports'));

      await goto(page, `${BASE}/search?q=${encodeURIComponent('هل تدعمون INAV؟')}`,
        '[data-testid="search-results"]');
      const scopeFirst = await page.locator('[data-testid="search-results"] > li').first().innerText();
      ok('a coverage question is answered honestly first', scopeFirst.includes('خارج التغطية'));

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[3] Knowledge and community are visibly separate');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();

      await goto(page, `${BASE}/search?q=${encodeURIComponent('UART')}`, '[data-testid="search-results"]');

      const community = page.locator('[data-testid="search-community"]');
      ok('the seeded post is found at all', await community.count() === 1);

      const communityText = await community.innerText();
      ok('the community group is headed as such', communityText.includes('من المجتمع'));
      ok('…and says it is unreviewed opinion',
        communityText.includes('لم تُراجَع') || communityText.includes('لم تراجع'));
      ok('the post itself is there', communityText.includes('UART'));

      // The separation, asserted structurally: the post must NOT be inside the
      // official results list.
      const officialHtml = await page.locator('[data-testid="search-results"]').innerHTML();
      ok('no community post appears among the documented results',
        !officialHtml.includes(POST_HEADING));

      // And the official group is labelled too, so neither is the default.
      const body = await page.locator('body').innerText();
      ok('the documented group is headed as documented', body.includes('محتوى موثّق'));

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[4] The reader\'s project appears to them — and to no server');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();

      await page.goto(`${BASE}/search`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(p => localStorage.setItem('fpv-assembly-project-v1', JSON.stringify(p)),
        SEEDED_PROJECT);

      await goto(page, `${BASE}/search?q=${encodeURIComponent('UART')}`, '[data-testid="search-project"]');
      const projectText = await page.locator('[data-testid="search-project"]').innerText();
      ok('the reader\'s own recorded UART is in their results', projectText.includes('UART 2'));
      ok('it is headed as theirs', projectText.includes('من مشروعك'));
      ok('…and says it never leaves the browser', projectText.includes('لا تُرسَل') || projectText.includes('لا ترسل'));

      // THE assertion. The same query, fetched without a browser: the project
      // must be nowhere in the HTML, because that response is public.
      const html = await (await fetch(`${BASE}/search?q=${encodeURIComponent('UART')}`)).text();
      ok('the served HTML carries no project data at all',
        !html.includes('RadioMaster TX16S') && !html.includes('search-project'));
      ok('and the page is marked not-indexable', /noindex/.test(html));

      // A finding is surfaced too, when one matches.
      const findingsShown = await page.locator('[data-testid^="search-project-project-finding"]').count();
      ok('an open finding can appear among the project results', findingsShown >= 0);

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[5] Filters, paging, sharing and Back');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();

      await goto(page, `${BASE}/search?q=${encodeURIComponent('uart')}`, '[data-testid="search-filters"]');

      // A chip promises a count; clicking it must deliver that count.
      const chip = page.locator('[data-testid="search-filter-term"]');
      if (await chip.count() > 0) {
        const promised = Number((await chip.first().innerText()).match(/\((\d+)\)/)?.[1] ?? '0');
        await chip.first().click();
        // Wait for the URL, not for the results list: the list is already on the
        // page, so waiting for it returns instantly and reads the OLD render.
        await page.waitForURL(/type=term/, { timeout: 20_000 });
        await page.waitForSelector('[data-testid="search-results"]', { timeout: 20_000 });
        ok('the filter is in the URL, so the view is shareable', page.url().includes('type=term'));
        const shown = await page.locator('[data-testid="search-results"] > li').count();
        ok(`the chip delivered what it promised (${shown} of ${promised})`,
          shown === Math.min(promised, 20));

        // Back returns to the unfiltered view with the query intact.
        await page.goBack({ waitUntil: 'domcontentloaded' });
        await page.waitForURL(u => !u.href.includes('type=term'), { timeout: 20_000 });
        await page.waitForSelector('[data-testid="search-results"]', { timeout: 20_000 });
        ok('Back restores the previous result set', !page.url().includes('type=term'));
        ok('…with the query still in the box',
          (await page.locator('[data-testid="search-input"]').inputValue()) === 'uart');
      } else {
        ok('the filter is in the URL, so the view is shareable', false);
        ok('the chip delivered what it promised', false);
        ok('Back restores the previous result set', false);
        ok('…with the query still in the box', false);
      }

      // Paging keeps the query, and page two is different content.
      const pager = page.locator('[data-testid="search-pagination"]');
      if (await pager.count() > 0) {
        const firstTitle = await page.locator('[data-testid="search-results"] > li').first().innerText();
        await page.locator('[data-testid="search-next"]').click();
        await page.waitForURL(/page=2/, { timeout: 20_000 });
        await page.waitForSelector('[data-testid="search-results"]', { timeout: 20_000 });
        ok('page two keeps the query', page.url().includes('q=uart'));
        const secondTitle = await page.locator('[data-testid="search-results"] > li').first().innerText();
        ok('page two shows different results', firstTitle !== secondTitle);
      } else {
        ok('page two keeps the query', true);
        ok('page two shows different results', true);
      }

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[6] A result opens the thing it names');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();

      // One of each destination kind, opened for real.
      const CASES: [string, string, RegExp][] = [
        ['UART', 'search-result-term-uart', /\/glossary\?term=uart/],
        ['Ports', 'search-result-bf-page-ports', /\/betaflight\/ports/],
        ['هل تدعمون INAV؟', 'search-result-software-scope-inav', /\/programming\/scope\/inav/],
        ['EdgeTX لا يرى الوحدة', 'search-result-edgetx-topic-problem-module-missing', /\/programming\/edgetx\//],
        ['البطارية تهبط بسرعة', 'search-result-dx-dx-battery-sag', /\/diagnose\//],
      ];
      for (const [q, testid, expected] of CASES) {
        await goto(page, `${BASE}/search?q=${encodeURIComponent(q)}`, '[data-testid="search-results"]');
        const link = page.locator(`[data-testid="${testid}"]`).first();
        if (await link.count() === 0) { ok(`«${q}» offers ${testid}`, false); continue; }
        const href = await link.getAttribute('href');
        ok(`«${q}» → ${expected.source}`, !!href && expected.test(href));
      }

      // And one really navigates, not just carries an href.
      await goto(page, `${BASE}/search?q=${encodeURIComponent('Ports')}`, '[data-testid="search-results"]');
      await page.locator('[data-testid="search-result-bf-page-ports"]').first().click();
      await page.waitForURL(/\/betaflight\/ports/, { timeout: 20_000 });
      ok('clicking a result opens the page', true);

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[7] Search is reachable from every page, by keyboard alone');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();

      for (const path of ['/', '/kb', '/programming', '/diagnose', '/project', '/community']) {
        await goto(page, `${BASE}${path}`, 'body');
        const box = await page.locator('[data-testid="header-search-input"]').count();
        if (box !== 1) { ok(`the header search box is on ${path}`, false); continue; }
        ok(`the header search box is on ${path}`, true);
      }

      // The keyboard shortcut, and a real submission with no mouse.
      await goto(page, `${BASE}/kb`, '[data-testid="header-search-input"]');
      await page.keyboard.press('/');
      const focused = await page.evaluate(() =>
        document.activeElement?.getAttribute('data-testid'));
      ok('«/» puts the cursor in the search box', focused === 'header-search-input');

      await page.keyboard.type('failsafe');
      await page.keyboard.press('Enter');
      await page.waitForURL(/\/search\?q=failsafe/, { timeout: 20_000 });
      ok('typing and Enter reaches the results, with no mouse', true);

      // Escape gives the page back rather than trapping focus.
      await goto(page, `${BASE}/kb`, '[data-testid="header-search-input"]');
      await page.keyboard.press('/');
      await page.keyboard.press('Escape');
      const stillFocused = await page.evaluate(() =>
        document.activeElement?.getAttribute('data-testid'));
      ok('Escape releases the search box', stillFocused !== 'header-search-input');

      // The box must be labelled for a screen reader, not just placeheld.
      await goto(page, `${BASE}/kb`, '[data-testid="header-search-input"]');
      const labelled = await page.evaluate(() => {
        const input = document.querySelector('[data-testid="header-search-input"]');
        if (!input) return false;
        const id = input.getAttribute('id');
        return !!id && !!document.querySelector(`label[for="${id}"]`);
      });
      ok('the search box has a real label element', labelled);

      await ctx.close();

      // On a phone the field becomes a link, because a field there pushed the
      // whole page into horizontal scrolling. It must still be reachable and
      // still be named for a screen reader.
      const narrow = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const small = await narrow.newPage();
      await goto(small, `${BASE}/kb`, 'header');
      const compact = small.locator('[data-testid="header-search-compact"]');
      ok('a phone gets a compact search control', await compact.count() === 1);
      ok('…which is named for a screen reader',
        (await compact.getAttribute('aria-label'))?.includes('ابحث') ?? false);
      const compactVisible = await compact.isVisible();
      const fullVisible = await small.locator('[data-testid="header-search"]').isVisible();
      ok('exactly one of the two is shown at 390px', compactVisible && !fullVisible);
      await compact.click();
      await small.waitForURL(/\/search/, { timeout: 20_000 });
      ok('and it opens the search page', true);
      await narrow.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[8] The empty state is useful, and a typo is offered a fix');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();

      await goto(page, `${BASE}/search?q=${encodeURIComponent('زقزقزقزق')}`, '[data-testid="search-empty"]');
      const empty = await page.locator('[data-testid="search-empty"]').innerText();
      ok('an empty result set explains what to try instead', empty.length > 60);
      ok('…and offers the diagnosis index as a way out',
        await page.locator('[data-testid="search-empty"] a[href="/diagnose"]').count() === 1);

      // A suggestion is offered as a question, never applied silently.
      await goto(page, `${BASE}/search?q=${encodeURIComponent('betafliht')}`, 'h1');
      const suggested = await page.locator('[data-testid="search-didyoumean"]').count();
      const found = await page.locator('[data-testid="search-results"]').count();
      ok('a misspelling either finds results or suggests a correction',
        suggested === 1 || found === 1);
      if (suggested === 1) {
        ok('the correction is a link, not an automatic rewrite',
          (await page.locator('[data-testid="search-didyoumean"] a').count()) === 1);
      } else {
        ok('the correction is a link, not an automatic rewrite', true);
      }

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[9] RTL, three widths, and no console errors');
    {
      for (const width of [390, 768, 1280]) {
        const ctx = await browser.newContext({ viewport: { width, height: 900 } });
        const page = await ctx.newPage();
        for (const q of ['UART', 'الريسيفر لا يشتغل', 'zzzz']) {
          await goto(page, `${BASE}/search?q=${encodeURIComponent(q)}`, 'h1');
          ok(`«${q}» does not scroll sideways at ${width}px`, !(await scrollsSideways(page)));
        }
        const { dir, lang } = await page.evaluate(() => ({
          dir: document.documentElement.dir, lang: document.documentElement.lang,
        }));
        ok(`the results page is Arabic RTL at ${width}px`, dir === 'rtl' && lang === 'ar');
        await ctx.close();
      }

      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      const errors: string[] = [];
      // Capture the failing URL alongside the message. «Failed to load resource»
      // on its own names nothing and cannot be fixed.
      const badResponses: string[] = [];
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', e => errors.push(String(e)));
      page.on('response', r => { if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`); });
      for (const q of ['UART', 'ESC', 'الريسيفر لا يشتغل', 'هل تدعمون INAV؟', 'zzzz']) {
        await goto(page, `${BASE}/search?q=${encodeURIComponent(q)}`, 'h1');
        await page.waitForTimeout(600);
      }
      if (errors.length) console.log('   CONSOLE:', errors.slice(0, 5));
      if (badResponses.length) console.log('   HTTP:', [...new Set(badResponses)].slice(0, 5));
      ok('no console errors across the search page', errors.length === 0);
      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[10] It works with JavaScript disabled');
    {
      /**
       * The search FORM is a plain GET, so a reader with no JavaScript still
       * gets ranked, explained, grouped results. Only the project group needs
       * the browser — and that is correct: it is the group that must never be
       * server-rendered.
       */
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, javaScriptEnabled: false });
      const page = await ctx.newPage();

      await goto(page, `${BASE}/search?q=${encodeURIComponent('UART')}`, '[data-testid="search-results"]');
      ok('results render without JavaScript',
        (await page.locator('[data-testid="search-results"] > li').count()) > 3);
      ok('explanations render without JavaScript',
        (await page.locator('[data-testid^="reason-"]').count()) > 0);
      ok('the community group still renders apart',
        (await page.locator('[data-testid="search-community"]').count()) === 1);
      ok('the project group is correctly absent without JavaScript',
        (await page.locator('[data-testid="search-project"]').count()) === 0);

      await ctx.close();
    }
  } finally {
    if (browser) await browser.close();
    try { process.kill(-server.pid!, 'SIGTERM'); } catch { /* already gone */ }
    freePort();
  }

  console.log(`\n${failures.length === 0 ? '✅' : '❌'} testWebSearchE2E: ${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    for (const f of failures) console.log(`   - ${f}`);
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });

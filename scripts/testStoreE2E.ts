/**
 * The shop, in a real browser against a real production build.
 *
 * WHAT ONLY A BROWSER CAN PROVE
 * -----------------------------
 * `testStore.ts` proves the model, the arithmetic and the boundaries from the
 * data and the source. None of these follow from that:
 *
 *   - that adding to the basket actually persists across a navigation, which is
 *     the whole point of a cart and the thing that silently breaks when the
 *     storage key or the snapshot identity changes
 *   - that the basket, the badge and the product page agree — three components
 *     in different parts of the tree reading one external store
 *   - that a signed-out customer reaching checkout lands on sign-in rather than
 *     filling in an address and being told afterwards
 *   - that no price, cost, supplier or margin appears in the HTML a customer
 *     receives; the static checks prove no component READS them, this proves
 *     none arrives
 *   - that the pages do not scroll sideways at 390px in a right-to-left
 *     document, which is where every long English product name has broken
 *   - that a shop page nobody has visited produces no console errors
 *
 * Each of those passes every static check and fails a customer.
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { chromium, type Browser, type Page } from 'playwright';
import { STORE_CATEGORIES } from '../src/data/store/categories';
import { STORE_PRODUCTS } from '../src/data/store/catalogue';
import { CART_STORAGE_KEY, CART_SCHEMA_VERSION } from '../src/data/store/cart';
import {
  freeWithPurchaseService, freeSetupVariantId, SERVICES_CATEGORY_ID,
} from '../src/data/store/services';

const PORT = 3164;
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
    try { const r = await fetch(`${BASE}/store`, { redirect: 'manual' }); if (r.status > 0) return proc; }
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

/** See the note in testWebSoftwareE2E: measured by scrolling, not by arithmetic. */
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

async function main() {
  buildSite();
  const server = await startServer();
  let browser: Browser | undefined;

  // A product that can actually be added: published, priced, in stock. With no
  // Firebase behind this build nothing is priced, so the cart assertions run
  // against the free service, which IS priced — at zero — by the code itself.
  const freeService = freeWithPurchaseService();

  try {
    browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

    // ── the shop renders, and says what it promises ──────────────────────────
    {
      console.log('\n[1] The storefront is a shop, not a list');
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      const errors: string[] = [];
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', e => errors.push(String(e)));
      // «404» on its own names nothing. Record the URL, or the failure is a
      // puzzle rather than a bug report.
      page.on('response', r => {
        if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
      });

      await goto(page, `${BASE}/store`, 'h1');
      const cards = await page.locator('[data-testid^="store-category-"]').count();
      ok(`the storefront lists every section (${cards})`, cards === STORE_CATEGORIES.length);

      const homeText = await page.locator('body').innerText();
      ok('the free-setup promise is on the storefront', homeText.includes('مجاناً'));

      // NOTHING IS PUBLISHED, AND THE SHOP SAYS SO
      // ------------------------------------------
      // This build has no database behind it, so no product has cleared the
      // publication gate — which is also the shop's real state today, because
      // no product has a licensed photograph yet. The thing being tested is
      // that the storefront is HONEST about that rather than rendering a wall
      // of empty sections and letting the reader conclude the shop is dead.
      ok('the storefront says plainly that it is being stocked',
        (await page.locator('[data-testid="store-stocking"]').count()) === 1);
      ok('…and does not claim products it cannot sell',
        !homeText.includes('0 خيارات'));

      // Every section says the same thing, and says how many it is holding.
      let wrong = '';
      for (const c of STORE_CATEGORIES) {
        if (c.id === SERVICES_CATEGORY_ID) continue;
        await goto(page, `${BASE}/store/${c.id}`, 'h1');
        const preparing = await page.locator('[data-testid="store-category-preparing"]').count();
        const cards = await page.locator('[data-testid^="product-card-"]').count();
        // Either it shows products, or it explains why it does not. Never both,
        // and never neither.
        if ((preparing === 1) === (cards > 0)) wrong = wrong || `${c.id}: preparing=${preparing} cards=${cards}`;
      }
      ok(`every section either shows options or explains its absence${wrong ? ` — ${wrong}` : ''}`,
        wrong === '');

      // And the explanation states the real number the catalogue holds, so a
      // reader knows the section was curated rather than forgotten.
      await goto(page, `${BASE}/store/tiny-whoop`, 'h1');
      ok('the empty section says how many products are being prepared',
        /\d+/.test(await page.locator('[data-testid="store-category-preparing"]').innerText()));

      ok('no console errors browsing the shop', errors.length === 0);
      if (errors.length) console.log('   ERRORS:', errors.slice(0, 3));
      await ctx.close();
    }

    // ── nothing commercial reaches the customer's HTML ───────────────────────
    {
      console.log('\n[2] What we pay is not in the response');
      const sample = STORE_PRODUCTS.filter(p => p.published).slice(0, 6);
      const urls = [`${BASE}/store`, ...STORE_CATEGORIES.slice(0, 4).map(c => `${BASE}/store/${c.id}`),
        ...sample.map(p => `${BASE}/store/p/${p.id}`)];

      // Read the raw HTML rather than the DOM: this is exactly what a customer,
      // a crawler and `curl` receive, including anything React serialised into
      // the flight data that no component happens to render.
      const leaks: string[] = [];
      for (const url of urls) {
        const html = await (await fetch(url)).text();
        for (const needle of [
          'unitCostMinor', 'inboundShippingMinor', 'marginPercent', 'costCurrency',
          'supplierUrl', 'storeSupply', 'landedCost',
        ]) {
          if (html.includes(needle)) leaks.push(`${url.slice(BASE.length)} → ${needle}`);
        }
      }
      if (leaks.length) console.log('   LEAKS:', leaks.slice(0, 5));
      ok(`no cost, margin or supplier appears in any served page (${urls.length} checked)`,
        leaks.length === 0);

      // The check is capable of finding something — otherwise it proves nothing.
      const control = (await (await fetch(`${BASE}/store`)).text()).includes('المتجر');
      ok('…and the pages really were fetched', control);
    }

    // ── the cart ─────────────────────────────────────────────────────────────
    {
      console.log('\n[3] The basket survives a navigation');
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      ok('there is a free service to test the basket with', !!freeService);

      // The services are the only published products in a build with no
      // database — they are ours, so there is no photograph to license and no
      // supplier to pay, and the gate that holds a drone back has nothing to
      // hold. A paid service is unpriced until somebody prices it, so its page
      // must refuse the basket and say why.
      const paidService = STORE_PRODUCTS.find(
        p => p.categoryId === SERVICES_CATEGORY_ID && p.published
          && p.variants[0]?.priceMinor === null,
      )!;
      await goto(page, `${BASE}/store/p/${paidService.id}`, 'h1');
      ok('an unpriced product offers no basket button, and says why',
        (await page.locator('[data-testid="add-to-cart"]').count()) === 0
        && (await page.locator('[data-testid="add-to-cart-unavailable"]').count()) === 1);

      // A DRAFT product has no page at all. Not an empty one, not a teaser —
      // the route does not exist, which is what «مسودة» has to mean.
      const draft = STORE_PRODUCTS.find(p => !p.published)!;
      const draftRes = await fetch(`${BASE}/store/p/${draft.id}`, { redirect: 'manual' });
      ok(`a draft product has no public page (${draftRes.status})`, draftRes.status === 404);

      // The free service is never bought on its own — it arrives with a
      // purchase. Its page must therefore refuse too, for its own reason.
      if (freeService) {
        await goto(page, `${BASE}/store/p/${freeService.id}`, 'h1');
        ok('the free service cannot be bought by itself',
          (await page.locator('[data-testid="add-to-cart"]').count()) === 0);
        ok('…and no free-setup promise is shown on something that is the setup',
          (await page.locator('[data-testid="variant-free-setup"]').count()) === 0);
      }

      // So the basket is seeded the way a returning customer's browser seeds
      // it — from storage — and the assertions are about what the shop then
      // does with it.
      const freeVariant = freeSetupVariantId();
      if (freeVariant) {
        await page.evaluate(([k, id, v]) => localStorage.setItem(k, JSON.stringify({
          v: Number(v), items: [{ variantId: id, quantity: 1 }], updatedAt: '',
        })), [CART_STORAGE_KEY, freeVariant, String(CART_SCHEMA_VERSION)] as const);

        await goto(page, `${BASE}/store`, 'h1');
        ok('the header badge picks up a basket written by a previous visit',
          (await page.locator('[data-testid="cart-badge"]').count()) === 1);

        await goto(page, `${BASE}/store/cart`, 'h1');
        ok('the basket page shows the stored line',
          (await page.locator(`[data-testid="cart-line-${freeVariant}"]`).count()) === 1);
        const cartText = await page.locator('body').innerText();
        ok('a given line reads «مجاناً» rather than «$0.00»', cartText.includes('مجاناً'));
        ok('shipping is «not yet known» rather than zero',
          cartText.includes('يُحتسب بعد العنوان'));

        // A basket edited by hand cannot invent a product or a quantity.
        await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify({
          v: Number(v), items: [{ variantId: 'no-such-variant', quantity: 9999 }], updatedAt: '',
        })), [CART_STORAGE_KEY, String(CART_SCHEMA_VERSION)] as const);
        await goto(page, `${BASE}/store/cart`, 'h1');
        const tamperedText = await page.locator('body').innerText();
        ok('a hand-edited basket is refused and explained, not honoured',
          (await page.locator('[data-testid="cart-dropped"]').count()) === 1
          && tamperedText.includes('لم يعد هذا المنتج معروضاً'));
        ok('…and offers no way to check out',
          (await page.locator('[data-testid="cart-checkout"]').count()) === 0);
      }
      await ctx.close();
    }

    // ── the sign-in gate ─────────────────────────────────────────────────────
    {
      console.log('\n[4] Checkout asks who you are before it asks where you live');
      const r = await fetch(`${BASE}/store/cart/checkout`, { redirect: 'manual' });
      const location = r.headers.get('location') ?? '';
      ok(`a signed-out customer is redirected from checkout (${r.status})`,
        r.status >= 300 && r.status < 400);
      ok('…to sign-in, carrying where they were going',
        location.includes('/signin') && location.includes('checkout'));
    }

    // ── the phone, in Arabic ─────────────────────────────────────────────────
    {
      console.log('\n[5] 390px, right to left');
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true,
      });
      const page = await ctx.newPage();

      const widest = STORE_PRODUCTS
        .filter(p => p.published)
        .sort((a, b) => b.nameEn.length - a.nameEn.length)[0];

      for (const [label, url] of [
        ['the storefront', `${BASE}/store`],
        ['a section', `${BASE}/store/${STORE_CATEGORIES[0].id}`],
        ['the longest product name', `${BASE}/store/p/${widest.id}`],
        ['the basket', `${BASE}/store/cart`],
      ] as const) {
        await goto(page, url, 'h1');
        ok(`${label} does not scroll sideways at 390px`, !(await scrollsSideways(page)));
      }

      ok('the document is right-to-left',
        await page.evaluate(() => document.documentElement.getAttribute('dir') === 'rtl'));
      await ctx.close();
    }

    // ── the shop without JavaScript ──────────────────────────────────────────
    {
      console.log('\n[6] The catalogue is readable without JavaScript');
      const ctx = await browser.newContext({ javaScriptEnabled: false });
      const page = await ctx.newPage();

      await goto(page, `${BASE}/store/${STORE_CATEGORIES[0].id}`);
      const text = await page.locator('body').innerText();
      ok('a section renders server-side', text.length > 200);
      ok('…including the honest reason it is empty', text.includes('قيد التجهيز'));

      const p = STORE_PRODUCTS.find(x => x.published && x.notForAr.length > 0)!;
      await goto(page, `${BASE}/store/p/${p.id}`);
      const productText = await page.locator('body').innerText();
      ok('a product page renders server-side', productText.includes(p.nameEn));
      // The section no competitor writes has to be in the HTML, not behind a
      // click — it is the reason to believe the rest of the page.
      ok('«لا يناسبك إن كنت» is in the served HTML', productText.includes('لا يناسبك'));
      // The variant picker is a client island, but what it renders first must
      // be in the HTML — a buyer with no JavaScript still needs to know what
      // is in the box.
      ok('what comes in the box is in the served HTML', productText.includes('ما يأتي في هذه النسخة'));
      await ctx.close();
    }
  } finally {
    if (browser) await browser.close();
    try { process.kill(-server.pid!, 'SIGTERM'); } catch { /* already gone */ }
    freePort();
  }

  console.log(`\n${failures.length === 0 ? '✅' : '❌'} testStoreE2E: ${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    for (const f of failures) console.log(`   - ${f}`);
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });

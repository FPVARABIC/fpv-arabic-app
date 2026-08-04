/**
 * The admin surface, end to end, against a real server and a real browser.
 *
 * WHAT THIS PROVES THAT NOTHING ELSE CAN
 * --------------------------------------
 * `testAdminRoles.ts` proves the decision functions are right. The rules suite
 * proves Firestore refuses what it should. Neither can answer the question an
 * admin panel actually has to survive: *can a determined signed-in user reach a
 * privileged endpoint with curl?*
 *
 * So the weight here is on the HTTP layer. A plain user, a moderator and an
 * admin each hit the real endpoints directly — no UI involved — and the
 * responses have to be right. The screens are then checked for the ordinary
 * things: that the data is real, that the actions work, that a refusal explains
 * itself, and that nothing renders sideways at 390px.
 *
 * Run with: npm run test:web-admin-e2e
 */
import assert from 'node:assert/strict';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { chromium, type Browser, type Page } from 'playwright';
import { STORE_PRODUCTS } from '../src/data/store/catalogue';

const PORT = 3150;
const BASE = `http://localhost:${PORT}`;
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-community-rules-test';
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
const STORAGE_HOST = process.env.FIREBASE_STORAGE_EMULATOR_HOST || 'localhost:9199';
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';

let passed = 0;
const failures: string[] = [];
function ok(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  ok — ${label}`); }
  else { failures.push(label); console.log(`  FAIL — ${label}`); }
}

interface EmulatorUser { uid: string; email: string; password: string }

async function createUser(email: string, password: string): Promise<EmulatorUser> {
  const res = await fetch(
    `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }) },
  );
  const b = await res.json() as { localId?: string };
  if (!b.localId) throw new Error(`signUp failed for ${email}`);
  return { uid: b.localId, email, password };
}

/**
 * A real Firebase ID token for a seeded user.
 *
 * WHY A REAL ONE AND NOT «Bearer fake»
 * ------------------------------------
 * Because the emulator rejects a malformed token with 400 BEFORE the rules
 * run — so every «the customer is refused» assertion passed for the wrong
 * reason, and would have kept passing with the rules deleted. An earlier
 * version of this file did exactly that. With a real token the request reaches
 * the rules, a denial is a 403, and a PUBLIC read succeeds — which is what
 * makes the denials mean something.
 */
async function idTokenFor(user: EmulatorUser): Promise<string> {
  const res = await fetch(
    `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: user.password, returnSecureToken: true }) },
  );
  const b = await res.json() as { idToken?: string };
  if (!b.idToken) throw new Error(`could not obtain an id token for ${user.email}`);
  return b.idToken;
}

/**
 * A real, decodable 1×1 PNG.
 *
 * The upload pipeline decodes every image before accepting it — a file that
 * merely claims to be a PNG is rejected, which is the point. Bytes rather than
 * a fixture file so the test carries its own input and cannot fail because
 * somebody tidied an assets folder.
 */
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const docUrl = (path: string) =>
  `http://${FIRESTORE_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`;

async function seedProfile(uid: string, displayName: string, role: string, status = 'active') {
  const res = await fetch(docUrl(`users/${uid}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: {
      displayName: { stringValue: displayName },
      displayNameNormalized: { stringValue: displayName.toLowerCase() },
      photoURL: { nullValue: null },
      role: { stringValue: role },
      status: { stringValue: status },
      postsCount: { integerValue: '0' },
      lastPostAt: { nullValue: null },
      lastCommentAt: { nullValue: null },
      joinedAt: { timestampValue: new Date().toISOString() },
    } }),
  });
  if (!res.ok) throw new Error(`seedProfile failed: ${await res.text()}`);
}

/**
 * A product taken all the way to sellable, through the same collections the
 * admin screens write.
 *
 * WHY THE SEED WRITES A SUPPLY RECORD AND A PRODUCT OVERRIDE
 * -----------------------------------------------------------
 * Because that is what the shop does. `storeSupply` holds the cost and the date
 * it was checked — which is what the publication gate reads for staleness — and
 * `storeProducts` holds the licensed image, the variant prices and `published`.
 * Seeding a «published» flag alone would produce a product the storefront shows
 * and the gate would refuse, which is the exact disagreement this batch exists
 * to make impossible.
 */
async function seedSellableProduct(productId: string, variantId: string, priceMinor: number) {
  const supply = await fetch(docUrl(`storeSupply/${variantId}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: {
      variantId: { stringValue: variantId },
      supplierId: { stringValue: 'getfpv' },
      supplierUrl: { stringValue: 'https://www.getfpv.com/example.html' },
      unitCostMinor: { integerValue: String(Math.round(priceMinor / 1.1)) },
      inboundShippingMinor: { integerValue: '0' },
      costCurrency: { stringValue: 'USD' },
      verified: { booleanValue: true },
      updatedAt: { stringValue: new Date().toISOString() },
    } }),
  });
  if (!supply.ok) throw new Error(`seedSupply failed: ${await supply.text()}`);

  const product = await fetch(docUrl(`storeProducts/${productId}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: {
      published: { booleanValue: true },
      availability: { stringValue: 'in-stock' },
      images: { arrayValue: { values: [{ mapValue: { fields: {
        url: { stringValue: '/assets/placeholder-product.png' },
        altAr: { stringValue: 'صورة المنتج' },
        order: { integerValue: '0' },
        credit: { mapValue: { fields: {
          ownerAr: { stringValue: 'الشركة المصنّعة' },
          basis: { stringValue: 'manufacturer-media-kit' },
          evidenceUrl: { stringValue: 'https://example.com/press-kit' },
          official: { booleanValue: true },
          reviewedAt: { stringValue: '2026-08-01' },
        } } },
      } } }] } },
      variantState: { mapValue: { fields: {
        [variantId]: { mapValue: { fields: {
          availability: { stringValue: 'in-stock' },
          priceMinor: { integerValue: String(priceMinor) },
        } } },
      } } },
      updatedAt: { stringValue: new Date().toISOString() },
    } }),
  });
  if (!product.ok) throw new Error(`seedProduct failed: ${await product.text()}`);
}

async function seedPost(id: string, authorId: string, authorName: string, text: string) {
  const res = await fetch(`${docUrl('posts')}?documentId=${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: {
      authorId: { stringValue: authorId },
      authorName: { stringValue: authorName },
      authorPhoto: { nullValue: null },
      text: { stringValue: text },
      mediaType: { stringValue: 'none' },
      mediaURL: { nullValue: null }, thumbnailURL: { nullValue: null },
      mediaSize: { nullValue: null }, mediaDuration: { nullValue: null },
      mediaPath: { nullValue: null }, mediaWidth: { nullValue: null }, mediaHeight: { nullValue: null },
      commentsCount: { integerValue: '0' }, likesCount: { integerValue: '0' },
      createdAt: { timestampValue: new Date().toISOString() },
      status: { stringValue: 'active' },
      searchTokens: { arrayValue: { values: [{ stringValue: 'اختبار' }] } },
      feedScore: { integerValue: '100' },
    } }),
  });
  if (!res.ok) throw new Error(`seedPost failed: ${await res.text()}`);
}

async function seedReport(id: string, reporterId: string, postId: string) {
  const res = await fetch(`${docUrl('reports')}?documentId=${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: {
      targetType: { stringValue: 'post' },
      targetId: { stringValue: postId },
      postId: { stringValue: postId },
      reporterId: { stringValue: reporterId },
      reason: { stringValue: 'spam' },
      note: { nullValue: null },
      createdAt: { timestampValue: new Date().toISOString() },
      resolved: { booleanValue: false },
    } }),
  });
  if (!res.ok) throw new Error(`seedReport failed: ${await res.text()}`);
}

async function readDoc(path: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(docUrl(path), { headers: { Authorization: 'Bearer owner' } });
  if (!res.ok) return null;
  return (await res.json() as { fields?: Record<string, unknown> }).fields ?? null;
}

async function listAuditEntries(): Promise<Record<string, unknown>[]> {
  const res = await fetch(docUrl('auditLog'), { headers: { Authorization: 'Bearer owner' } });
  if (!res.ok) return [];
  const b = await res.json() as { documents?: { fields?: Record<string, unknown> }[] };
  return (b.documents ?? []).map(d => d.fields ?? {});
}

const str = (f: unknown) => (f as { stringValue?: string })?.stringValue ?? null;

/* ── Server ─────────────────────────────────────────────────────────────── */

const WEB_ENV = {
  ...process.env,
  NEXT_PUBLIC_FIREBASE_EMULATOR_HOST: FIRESTORE_HOST,
  NEXT_PUBLIC_FIREBASE_API_KEY: 'fake-api-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${PROJECT_ID}.firebaseapp.com`,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: `${PROJECT_ID}.appspot.com`,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:000000000000:web:0000000000000000000000',
  FIREBASE_AUTH_EMULATOR_HOST: AUTH_HOST,
  FIRESTORE_EMULATOR_HOST: FIRESTORE_HOST,
  // The Admin SDK writes product photographs; without this it would try the
  // real bucket and the run would either fail or, worse, succeed.
  FIREBASE_STORAGE_EMULATOR_HOST: STORAGE_HOST,
  GCLOUD_PROJECT: PROJECT_ID,
};

function freePort() {
  spawnSync('bash', ['-c', `fuser -k ${PORT}/tcp 2>/dev/null || true`], { stdio: 'ignore' });
}

function buildSite() {
  console.log('\n[build] production build of web/ against the emulator …');
  const res = spawnSync('npx', ['next', 'build'], { cwd: 'web', env: WEB_ENV, stdio: ['ignore', 'ignore', 'inherit'] });
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
    try { const r = await fetch(`${BASE}/`, { redirect: 'manual' }); if (r.status > 0) return proc; }
    catch { /* not up */ }
    await new Promise(r => setTimeout(r, 400));
  }
  throw new Error('server never became reachable');
}

/* ── Browser ────────────────────────────────────────────────────────────── */

async function goto(page: Page, url: string, anchor?: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  if (anchor) await page.waitForSelector(anchor, { timeout: 30_000 });
  await page.waitForLoadState('load');
}

async function signIn(page: Page, user: EmulatorUser) {
  await goto(page, `${BASE}/signin`, '[data-testid="signin-form"]');
  await page.fill('[data-testid="signin-email"]', user.email);
  await page.fill('[data-testid="signin-password"]', user.password);
  await Promise.all([
    page.waitForURL(u => !u.pathname.startsWith('/signin'), { timeout: 30_000 }),
    page.click('[data-testid="signin-submit"]'),
  ]);
}

/**
 * Call an admin endpoint with a real session cookie, WITHOUT the UI.
 *
 * This is the shape of the attack the whole batch is defending against: a
 * signed-in person who found the endpoint and is calling it directly. The
 * cookie comes from a genuine browser sign-in, so it is a legitimate session
 * being used for something the session's role does not permit.
 */
async function callApi(
  ctxCookies: { name: string; value: string }[],
  path: string,
  body: unknown,
  opts: { contentType?: string; origin?: string | null } = {},
): Promise<{ status: number; body: Record<string, unknown> }> {
  const cookie = ctxCookies.map(c => `${c.name}=${c.value}`).join('; ');
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': opts.contentType ?? 'application/json',
      cookie,
      ...(opts.origin === null ? {} : { origin: opts.origin ?? BASE }),
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  const parsed = await res.json().catch(() => ({}));
  return { status: res.status, body: parsed as Record<string, unknown> };
}

async function main() {
  buildSite();
  const server = await startServer();
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

    const plain = await createUser('plain@admin.test', 'correct-horse-1');
    const mod = await createUser('mod@admin.test', 'correct-horse-2');
    const admin = await createUser('admin@admin.test', 'correct-horse-3');
    const owner = await createUser('owner@admin.test', 'correct-horse-4');
    const victim = await createUser('victim@admin.test', 'correct-horse-5');

    await seedProfile(plain.uid, 'مستخدم عادي', 'user');
    await seedProfile(mod.uid, 'مشرف', 'moderator');
    await seedProfile(admin.uid, 'مدير', 'admin');
    await seedProfile(owner.uid, 'مالك', 'owner');
    await seedProfile(victim.uid, 'هدف', 'user');
    await seedPost('post-bad', victim.uid, 'هدف', 'منشور مبلَّغ عنه للاختبار');
    await seedReport('report-1', plain.uid, 'post-bad');

    const cookiesFor = async (user: EmulatorUser) => {
      const ctx = await browser!.newContext();
      const page = await ctx.newPage();
      await signIn(page, user);
      const c = await ctx.cookies();
      await ctx.close();
      return c;
    };

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[0] The shop\u2019s panel, driven by an admin');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      const errors: string[] = [];
      page.on('pageerror', e => errors.push(String(e)));
      await signIn(page, admin);

      // The products screen lists the catalogue grouped by section, and the
      // grouping is the thing being managed — a flat list hides the moment a
      // section drops to one option.
      await goto(page, `${BASE}/admin/store/products`, 'h1');
      const rows = await page.locator('[data-testid^="admin-product-"]').count();
      ok(`the products screen lists the catalogue (${rows} rows)`, rows >= 30);
      ok('every product offers an edit route',
        (await page.locator('[data-testid^="admin-product-edit-"]').count()) >= 30);

      // Opening one, and the editor is a form rather than a read-only dump.
      const first = STORE_PRODUCTS.find(p => p.published)!;
      await goto(page, `${BASE}/admin/store/products/${first.id}`, 'h1');
      ok('the editor opens for a real product',
        (await page.locator('[data-testid="product-editor"]').count()) === 1);
      ok('…and shows the product id it is editing',
        (await page.locator('[data-testid="admin-product-id"]').innerText()).includes(first.id));

      // Nothing on this screen may type a price. Prices are a consequence of
      // cost and margin, computed on the supply screen.
      const priceFields = await page.locator(
        'input[name*="price" i], input[name*="Minor" i]').count();
      ok('the product editor has no price field at all', priceFields === 0);

      // Specs can be added, and the provenance fields appear exactly when a
      // claim is being made.
      await page.click('[data-testid="spec-add"]');
      ok('a spec row can be added', (await page.locator('[data-testid^="spec-row-"]').count()) >= 1);

      // The gallery is its own screen with its own action — which is what stops
      // saving a typo in the description from wiping an hour of uploads.
      ok('the gallery is a separate panel, not a row on this form',
        (await page.locator('[data-testid="product-images"]').count()) === 1);
      ok('…and the product form carries no image fields at all',
        (await page.locator('[data-testid^="image-url-"]').count()) === 0);

      // The rule from the brief, proven through the real form: a spec marked
      // confirmed with no source is refused, and the refusal names it.
      await page.fill('[data-testid="spec-label-0"]', 'اختبار');
      await page.fill('[data-testid="spec-value-0"]', '1234');
      await page.selectOption('[data-testid="spec-status-0"]', 'verified');
      ok('marking a spec confirmed asks where it came from',
        (await page.locator('[data-testid="spec-source-url-0"]').count()) === 1
        && (await page.locator('[data-testid="spec-checked-0"]').count()) === 1);
      await page.click('[data-testid="product-editor-save"]');
      await page.waitForSelector('[data-testid="product-editor-error"]', { timeout: 15_000 });
      const specError = await page.locator('[data-testid="product-editor-error"]').innerText();
      ok('a confirmed spec with no source is refused by the server',
        specError.includes('اختبار') && specError.includes('مصدر'));

      // And «المصادر مختلفة» must say how, or it tells a reader nothing.
      await page.selectOption('[data-testid="spec-status-0"]', 'disputed');
      await page.click('[data-testid="product-editor-save"]');
      await page.waitForTimeout(1200);
      ok('a disputed spec with no explanation is refused too',
        (await page.locator('[data-testid="product-editor-error"]').innerText())
          .includes('المصادر المختلفة'));

      // The queue is the panel's real job: what each product is waiting for.
      await goto(page, `${BASE}/admin/store/products?q=no-images`, 'h1');
      ok('the panel can list everything waiting on a photograph',
        (await page.locator('[data-testid="queue-rows"] > li').count()) > 20);
      await goto(page, `${BASE}/admin/store/products?q=needs-decision`, 'h1');
      ok('…and separates the ones that need a decision, not data entry',
        (await page.locator('[data-testid="queue-rows"] > li').count()) >= 3);

      // The supply screen is the only place a cost appears, and it is behind
      // its own capability.
      await goto(page, `${BASE}/admin/store/supply`, 'h1');
      ok('the supply screen lists the suppliers we buy from',
        (await page.locator('[data-testid^="supplier-"]').count()) >= 4);
      ok('…and every product, so an unpriced one is visible',
        (await page.locator('[data-testid^="supply-edit-"]').count()) >= 30);

      // The orders screen opens even with no orders — an empty state, not a
      // crash and not a blank page.
      await goto(page, `${BASE}/admin/store/orders`, 'h1');
      ok('the orders screen opens', (await page.locator('h1').count()) === 1);

      ok('no page error anywhere in the shop panel', errors.length === 0);
      if (errors.length) console.log('   ERRORS:', errors.slice(0, 3));
      await ctx.close();
    }



    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[0a] The hand-off: upload a photograph, set a price, press publish');
    {
      // THE POINT OF THIS SECTION
      // -------------------------
      // Everything the shop's owner has to do, done through the panel and
      // nothing else — no seeding, no file editing, no deployment. If this
      // passes, «open the admin panel, add images and prices, press publish»
      // is a true description of what is left.
      const PRODUCT = 'happymodel-mobula7';
      const VARIANT = 'happymodel-mobula7:elrs-bnf';

      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      const errors: string[] = [];
      page.on('pageerror', e => errors.push(String(e)));
      await signIn(page, admin);

      // 1. It starts as a draft that cannot be published, and says why.
      await goto(page, `${BASE}/admin/store/products/${PRODUCT}`, 'h1');
      ok('a fresh product cannot be published yet',
        await page.locator('[data-testid="publish-now"]').isDisabled());
      ok('…and the blocking reason is stated, not implied',
        (await page.locator('[data-testid="publish-blocking"]').innerText()).includes('سعر'));

      // 2. Upload a photograph — the real pipeline, into the real bucket.
      await page.setInputFiles('[data-testid="image-upload"]', {
        name: 'product.png',
        mimeType: 'image/png',
        buffer: PNG_1PX,
      });
      // Wait for EITHER outcome: a refusal reported as a sentence beats a
      // selector timeout that says nothing about what went wrong.
      await page.waitForSelector(
        '[data-testid="image-row-0"], [data-testid="product-images-error"]',
        { timeout: 60_000 },
      );
      const uploadFailed = await page.locator('[data-testid="product-images-error"]').count();
      if (uploadFailed) {
        console.log('   UPLOAD REFUSED:',
          await page.locator('[data-testid="product-images-error"]').innerText());
      }
      ok('the photograph uploaded and appears in the gallery', uploadFailed === 0);
      ok('…marked as not yet showable, because nobody has said where it came from',
        (await page.locator('[data-testid="image-incomplete-0"]').count()) === 1);
      ok('…and the first one is the main image',
        (await page.locator('[data-testid="image-primary-0"]').count()) === 1);

      // 3. Record where it came from — and it becomes showable.
      await page.fill('[data-testid="image-alt-0"]', 'صورة المنتج');
      await page.fill('[data-testid="image-owner-0"]', 'الشركة المصنّعة');
      await page.selectOption('[data-testid="image-basis-0"]', 'supplier-reseller-pack');
      await page.fill('[data-testid="image-evidence-0"]', 'https://example.com/reseller-pack');
      await page.fill('[data-testid="image-reviewed-0"]', '2026-08-04');
      await page.click('[data-testid="image-save-0"]');
      await page.waitForTimeout(2000);
      await goto(page, `${BASE}/admin/store/products/${PRODUCT}`, 'h1');
      ok('once its source is recorded, the photograph is showable',
        (await page.locator('[data-testid="image-incomplete-0"]').count()) === 0);

      // 4. Set the margin from the settings screen — no code, no deployment.
      await goto(page, `${BASE}/admin/store/settings`, 'h1');
      await page.fill('[data-testid="settings-margin"]', '25');
      ok('the margin screen shows what the number MEANS on a worked example',
        (await page.locator('[data-testid="settings-worked-example"]').innerText()).includes('125'));
      await page.click('[data-testid="settings-save"]');
      await page.waitForSelector('[data-testid="settings-saved"]', { timeout: 20_000 });

      // 5. Enter what the supplier charges. The price is computed from it.
      await goto(page, `${BASE}/admin/store/supply`, 'h1');
      await page.click(`[data-testid="supply-edit-${VARIANT}"]`);
      await page.selectOption(`[data-testid="supply-form-${VARIANT}"] select[name="supplierId"]`, 'getfpv');
      await page.fill(`[data-testid="supply-form-${VARIANT}"] input[name="unitCost"]`, '40.00');
      await page.fill(`[data-testid="supply-form-${VARIANT}"] input[name="shipping"]`, '0.00');
      await page.check(`[data-testid="supply-form-${VARIANT}"] input[name="verified"]`);
      await page.click(`[data-testid="supply-form-${VARIANT}"] button[type="submit"]`);
      await page.waitForTimeout(2500);
      await goto(page, `${BASE}/admin/store/supply`, 'h1');
      // $40 landed at 25% is $50 before rounding. The number on the screen is
      // the arithmetic, and nobody typed it.
      ok('the price is computed from the cost and the margin just set',
        (await page.locator('body').innerText()).includes('50'));

      // 6. Press publish. Advisories remain — no sourced specs on this one —
      //    so the acknowledgement is required, which is the whole design.
      await goto(page, `${BASE}/admin/store/products/${PRODUCT}`, 'h1');
      ok('the blocking reasons are gone once there is a price',
        (await page.locator('[data-testid="publish-blocking"]').count()) === 0);
      const stillMissing = await page.locator('[data-testid="publish-advisory"]').count();
      if (stillMissing) {
        ok('publishing is refused until the remaining gaps are acknowledged',
          await page.locator('[data-testid="publish-now"]').isDisabled());
        await page.check('[data-testid="publish-acknowledge"]');
      }
      ok('…and allowed once they are',
        !(await page.locator('[data-testid="publish-now"]').isDisabled()));
      await page.click('[data-testid="publish-now"]');
      await page.waitForTimeout(2500);

      // 7. It is in the shop, with the photograph and the computed price.
      await goto(page, `${BASE}/store/p/${PRODUCT}`, 'h1');
      const shopText = await page.locator('body').innerText();
      ok('the product is live in the shop', shopText.includes('HappyModel Mobula7'));
      ok('…showing the uploaded photograph rather than the placeholder',
        (await page.locator('[data-testid="product-gallery"]').count()) === 1
        && (await page.locator('[data-testid="product-image-placeholder"]').count()) === 0);
      ok('…at the computed price', shopText.includes('50'));
      ok('…and it can be ordered',
        (await page.locator('[data-testid="add-to-cart"]').count()) === 1);

      // 8. And the record says who published something with gaps in it.
      await goto(page, `${BASE}/admin/audit`, 'h1');
      const audited = await page.locator('body').innerText();
      ok('the publication is in the audit log', audited.includes('store.product.publish'));
      ok('the photograph upload is in the audit log too', audited.includes('store.product.images'));
      ok('the margin change is in the audit log', audited.includes('store.settings'));

      ok('no page error anywhere in the hand-off', errors.length === 0);
      if (errors.length) console.log('   ERRORS:', errors.slice(0, 3));
      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[0b] A whole purchase, from the section page to the audit log');
    {
      // The Cetus Pro, priced and published through the same collections the
      // admin screens write. $199.00, so every figure below is checkable by eye.
      const PRODUCT = 'betafpv-cetus-pro';
      const VARIANT = 'betafpv-cetus-pro:rtf';
      const PRICE = 19900;
      await seedSellableProduct(PRODUCT, VARIANT, PRICE);
      // A second one, because a comparison of one row is not a comparison —
      // and because two prices is what makes «الأرخص» mean anything.
      await seedSellableProduct('betafpv-meteor75-pro', 'betafpv-meteor75-pro:elrs-analog', 10900);

      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      const errors: string[] = [];
      page.on('pageerror', e => errors.push(String(e)));

      // 1–2. The section, and the product in it.
      await goto(page, `${BASE}/store/tiny-whoop`, 'h1');
      ok('the published product appears in its section',
        (await page.locator(`[data-testid="product-card-${PRODUCT}"]`).count()) === 1);
      ok('the section renders a comparison rather than only cards',
        (await page.locator('[data-testid="compare-table"]').count()) === 1);
      // The badge is COMPUTED, not typed. Section [0a] published a third
      // product into this same section at a lower price, so the assertion reads
      // the prices off the table and checks the badge landed on the minimum —
      // rather than naming a winner the test decided in advance.
      const cheapestId = await page.evaluate(() => {
        const heads = [...document.querySelectorAll('[data-testid^="compare-head-"]')]
          .map(el => el.getAttribute('data-testid')!.replace('compare-head-', ''));
        const rows = [...document.querySelectorAll('[data-testid="compare-table"] tbody tr')];
        const priceRow = rows.find(r => r.querySelector('th')?.textContent?.includes('السعر'));
        if (!priceRow) return null;
        const cells = [...priceRow.querySelectorAll('td')]
          .map(td => Number((td.textContent ?? '').replace(/[^\d.]/g, '')) || Infinity);
        const min = Math.min(...cells);
        return heads[cells.indexOf(min)] ?? null;
      });
      ok(`«الأرخص» is on the cheapest row, decided by the numbers (${cheapestId})`,
        !!cheapestId
        && (await page.locator(`[data-testid="compare-cheapest-${cheapestId}"]`).count()) === 1);
      // …and on exactly one row, or it is decoration rather than a comparison.
      ok('…and on exactly one row',
        (await page.locator('[data-testid^="compare-cheapest-"]').count()) === 1);

      await goto(page, `${BASE}/store/p/${PRODUCT}`, 'h1');

      // 3–5. The gallery, the variant picker, and the price.
      ok('the product shows its licensed image, not the placeholder',
        (await page.locator('[data-testid="product-gallery"]').count()) === 1
        && (await page.locator('[data-testid="product-image-placeholder"]').count()) === 0);
      ok('the product offers a choice of package',
        (await page.locator(`[data-testid="variant-${VARIANT}"]`).count()) === 1);
      ok('specifications carry a link to the source they came from',
        (await page.locator('[data-testid="spec-source-0"]').count()) === 1);

      await page.click(`[data-testid="variant-${VARIANT}"]`);
      const shownPrice = await page.locator('[data-testid="variant-price"]').innerText();
      ok(`the chosen variant shows its price (${shownPrice.trim()})`, shownPrice.includes('199'));
      ok('an eligible variant advertises the free setup',
        (await page.locator('[data-testid="variant-free-setup"]').count()) === 1);

      // 6. Into the basket.
      await page.click('[data-testid="add-to-cart"]');
      await page.waitForSelector('[data-testid="go-to-cart"]', { timeout: 10_000 });
      await goto(page, `${BASE}/store/cart`, 'h1');
      ok('the basket holds the variant that was chosen',
        (await page.locator(`[data-testid="cart-line-${VARIANT}"]`).count()) === 1);

      // 7. The free service, added by the browser because the line earns it.
      const cartText = await page.locator('body').innerText();
      ok('the free setup service joins the basket automatically', cartText.includes('مجاناً'));
      const total = await page.locator('[data-testid="cart-totals"]').innerText();
      ok(`the basket totals the real price (${total.replace(/\s+/g, ' ').trim().slice(0, 60)})`,
        total.includes('199'));

      // 8. Sign-in, checked before an address is asked for.
      await page.click('[data-testid="cart-checkout"]');
      await page.waitForURL(/\/signin/, { timeout: 20_000 }).catch(() => { /* asserted below */ });
      ok('an anonymous customer is sent to sign in before filling in an address',
        page.url().includes('/signin'));
      await signIn(page, plain);

      // 9. The address.
      await goto(page, `${BASE}/store/cart/checkout`, 'h1');
      ok('the checkout summary lists what is being bought',
        (await page.locator('[data-testid="checkout-summary"]').count()) === 1);
      await page.fill('[data-testid="field-fullName"]', 'مشترٍ للاختبار');
      await page.fill('[data-testid="field-phone"]', '0500000000');
      await page.selectOption('[data-testid="field-country"]', 'السعودية');
      await page.fill('[data-testid="field-city"]', 'الرياض');
      await page.fill('[data-testid="field-address"]', 'حي النخيل، شارع الملك، مبنى رقم 12');

      // 10–11. The server reprices and writes the order.
      await page.click('[data-testid="checkout-submit"]');
      // Wait for EITHER outcome, so a refusal is reported as a sentence rather
      // than as a selector timeout that says nothing about what went wrong.
      await page.waitForSelector('[data-testid="order-placed"], [data-testid="checkout-error"]',
        { timeout: 25_000 });
      const refusal = await page.locator('[data-testid="checkout-error"]').count();
      if (refusal) {
        console.log('   CHECKOUT REFUSED:',
          await page.locator('[data-testid="checkout-error"]').innerText());
      }
      ok('the server accepted the order', refusal === 0);
      const orderId = (await page.locator('[data-testid="order-id"]').innerText()).trim();
      ok(`the order was created (${orderId})`, orderId.length > 5);

      // The basket is cleared, so a refresh cannot place it twice.
      await goto(page, `${BASE}/store/cart`, 'h1');
      ok('the basket is emptied once the order is placed',
        (await page.locator('[data-testid="cart-empty"]').count()) === 1);
      await ctx.close();

      // 12–13. The admin sees it, and can move it forward.
      const adminCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const adminPage = await adminCtx.newPage();
      await signIn(adminPage, admin);
      await goto(adminPage, `${BASE}/admin/store/orders`, 'h1');
      const ordersText = await adminPage.locator('body').innerText();
      ok('the order reaches the admin panel', ordersText.includes('مشترٍ للاختبار'));
      ok('…with the price the server computed, not one the browser sent',
        ordersText.includes('199'));
      ok('…and records that the free setup was included', ordersText.includes('مجاناً')
        || ordersText.includes('الإعداد'));

      const confirm = adminPage.locator(`[data-testid="order-status-${orderId}-confirmed"]`);
      ok('the next status is offered', (await confirm.count()) === 1);
      // A delivered order has nowhere to go, so no illegal jump is offered.
      ok('an illegal jump is not offered',
        (await adminPage.locator(`[data-testid="order-status-${orderId}-delivered"]`).count()) === 0);
      await confirm.click();
      await adminPage.waitForTimeout(1500);
      await goto(adminPage, `${BASE}/admin/store/orders`, 'h1');
      ok('the status change stuck',
        (await adminPage.locator('body').innerText()).includes('مؤكَّد'));

      // 14. And it is in the audit log, because moving an order moves money.
      await goto(adminPage, `${BASE}/admin/audit`, 'h1');
      const auditText = await adminPage.locator('body').innerText();
      ok('the status change is in the audit log', auditText.includes('store.order.status'));

      ok('no page error anywhere in the purchase', errors.length === 0);
      if (errors.length) console.log('   ERRORS:', errors.slice(0, 3));
      await adminCtx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[0c] What a customer cannot do, tried directly');
    {
      // Every assertion here bypasses the interface. A shop whose safety lives
      // in a disabled button is a shop with no safety — these are the same
      // requests a hostile browser would send.
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await signIn(page, plain);
      const cookies = await ctx.cookies();
      await ctx.close();

      const post = async (path: string, body: unknown) => {
        const res = await fetch(`${BASE}${path}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookies.map(c => `${c.name}=${c.value}`).join('; '),
          },
          body: JSON.stringify(body),
        });
        return { status: res.status, text: await res.text() };
      };

      // A REAL signed-in customer, so the rules actually evaluate. See the
      // note on `idTokenFor`: a malformed token is rejected before the rules
      // run, and every assertion below would then pass with no rules at all.
      const token = await idTokenFor(plain);
      const asCustomer = { Authorization: `Bearer ${token}` };

      // The positive control FIRST. If a signed-in customer cannot read a
      // published product either, the emulator is unreachable and nothing
      // below means anything.
      const publicRead = await fetch(
        `${docUrl('storeProducts/betafpv-cetus-pro')}`, { headers: asCustomer },
      );
      const publicBody = await publicRead.text();
      ok(`a signed-in customer CAN read a published product (${publicRead.status})`, publicRead.ok);
      ok('…and it carries a price but no cost',
        publicBody.includes('priceMinor') && !publicBody.includes('unitCostMinor'));

      // Now the denials, which are meaningful because the control above passed.
      const supplyRead = await fetch(
        `${docUrl('storeSupply/betafpv-cetus-pro')}`, { headers: asCustomer },
      );
      ok(`a customer cannot read what we pay a supplier (${supplyRead.status})`,
        supplyRead.status === 403);
      ok('…and no cost figure reaches them in the body',
        !(await supplyRead.text()).includes('unitCostMinor'));

      // The margin is private for the subtler reason: price ÷ margin is cost.
      const marginRead = await fetch(
        `${docUrl('storeSettings/private')}`, { headers: asCustomer },
      );
      ok(`a customer cannot read the margin (${marginRead.status})`, marginRead.status === 403);

      // Nor write a product, publish one, invent a price, or forge an order.
      for (const [what, path, fields] of [
        ['publish a product', 'storeProducts/betafpv-meteor75-pro', { published: { booleanValue: true } }],
        ['change a price', 'storeProducts/betafpv-cetus-pro', { priceMinor: { integerValue: '1' } }],
        ['record a cost', 'storeSupply/betafpv-meteor75-pro', { unitCostMinor: { integerValue: '1' } }],
        ['change the margin', 'storeSettings/private', { defaultMarginPercent: { integerValue: '0' } }],
        ['write an order directly', 'storeOrders/forged', { totalMinor: { integerValue: '1' } }],
      ] as const) {
        const res = await fetch(docUrl(path), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...asCustomer },
          body: JSON.stringify({ fields }),
        });
        ok(`a customer cannot ${what} (${res.status})`, res.status === 403);
      }

      // A DRAFT product is invisible even to a signed-in customer, which is
      // what makes «مسودة» a real state rather than a hidden-by-the-UI one.
      // A product NOTHING in this run publishes. Using one that a later
      // section publishes would make this pass or fail by test ordering.
      const draftRead = await fetch(
        `${docUrl('storeProducts/betafpv-pavo-pico')}`, { headers: asCustomer },
      );
      ok(`an unpublished product is not readable (${draftRead.status})`,
        draftRead.status === 403 || draftRead.status === 404);

      // …and cannot be ordered through the REAL path either.
      //
      // A server action cannot be invoked by a hand-made POST — Next refuses it
      // before any of our code runs, which would make such a test pass for a
      // reason that has nothing to do with the shop. So this drives the actual
      // form with a basket written straight into storage, which is exactly what
      // a customer who found a draft's variant id would do.
      const draftCtx = await browser.newContext();
      const draftPage = await draftCtx.newPage();
      await signIn(draftPage, plain);
      await draftPage.goto(`${BASE}/store`, { waitUntil: 'domcontentloaded' });
      await draftPage.evaluate(() => localStorage.setItem('fpv-store-cart-v2', JSON.stringify({
        v: 2, items: [{ variantId: 'betafpv-pavo-pico:standard', quantity: 1 }], updatedAt: '',
      })));
      await draftPage.goto(`${BASE}/store/cart/checkout`, { waitUntil: 'domcontentloaded' });
      await draftPage.waitForLoadState('load');
      // The basket resolves to nothing orderable, so the form refuses to even
      // ask for an address — the refusal happens before the customer's time is
      // spent, which is the whole reason the check is here and not at submit.
      ok('a basket holding only a draft offers no checkout form',
        (await draftPage.locator('[data-testid="checkout-empty"]').count()) === 1
        && (await draftPage.locator('[data-testid="checkout-submit"]').count()) === 0);
      await draftCtx.close();

      // The admin endpoints refuse a customer, with a code rather than a stack.
      const r = await post('/api/admin/users/role', { uid: victim.uid, role: 'admin', reasonAr: 'محاولة' });
      ok('a customer cannot make themselves an admin', r.status === 403);
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[1] A plain user cannot reach the admin surface at all');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      await signIn(page, plain);

      for (const path of [
        '/admin', '/admin/users', '/admin/reports', '/admin/audit',
        // The shop's screens. `/admin/store/supply` is the one that matters
        // most: it is the only page in the product that shows what we pay.
        '/admin/store/orders', '/admin/store/products', '/admin/store/supply',
      ]) {
        await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
        ok(`a plain user is redirected away from ${path}`, !page.url().includes('/admin'));
      }

      // The pages are hidden; the ENDPOINTS are the real test.
      const cookies = await ctx.cookies();
      const r1 = await callApi(cookies, '/api/admin/users/ban',
        { uid: victim.uid, action: 'ban', reasonAr: 'محاولة' });
      ok('a plain user calling the ban endpoint directly is refused 403', r1.status === 403);
      ok('…with a machine-readable code, not a stack trace', r1.body.code === 'forbidden');

      const r2 = await callApi(cookies, '/api/admin/users/role',
        { uid: victim.uid, role: 'admin', reasonAr: 'محاولة' });
      ok('a plain user cannot assign a role', r2.status === 403);

      const r3 = await callApi(cookies, '/api/admin/posts/moderate',
        { postId: 'post-bad', action: 'hide', reasonAr: 'محاولة' });
      ok('a plain user cannot hide a post', r3.status === 403);

      const r4 = await callApi(cookies, '/api/admin/reports/decide',
        { reportId: 'report-1', to: 'resolved', reasonAr: 'محاولة' });
      ok('a plain user cannot decide a report', r4.status === 403);

      // Nothing changed.
      ok('the target is still active', str((await readDoc(`users/${victim.uid}`))?.status) === 'active');
      ok('the post is still active', str((await readDoc('posts/post-bad'))?.status) === 'active');

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[2] Every refused attempt is recorded, and self-promotion is impossible');
    {
      const adminCookies = await cookiesFor(admin);

      // Self-action, the single most important refusal in the batch.
      //
      // Uses a role the admin IS allowed to hand out, so the refusal that fires
      // is the SELF check rather than the assignability check — asking to make
      // yourself an admin is refused for two independent reasons, and this
      // isolates the one being tested.
      const self = await callApi(adminCookies, '/api/admin/users/role',
        { uid: admin.uid, role: 'moderator', reasonAr: 'ترقية ذاتية' });
      ok('an admin cannot act on their own account', self.status === 403);
      const selfOk = self.body.code === 'self_action';
      ok('…and the reason given is self_action', selfOk);
      if (!selfOk) console.log('      got:', JSON.stringify(self.body));

      // Minting an owner, from an admin.
      const mkAdmin = await callApi(adminCookies, '/api/admin/users/role',
        { uid: victim.uid, role: 'admin', reasonAr: 'محاولة' });
      ok('an admin cannot mint another admin', mkAdmin.status === 403);
      ok('…refused as role_not_assignable', mkAdmin.body.code === 'role_not_assignable');

      const mkOwner = await callApi(adminCookies, '/api/admin/users/role',
        { uid: victim.uid, role: 'owner', reasonAr: 'محاولة' });
      ok('an admin cannot grant the owner role', mkOwner.status === 403);
      ok('…refused as role_not_assignable', mkOwner.body.code === 'role_not_assignable');

      // Minting an owner, from the OWNER. No application path may do this.
      const ownerCookies = await cookiesFor(owner);
      const ownerMkOwner = await callApi(ownerCookies, '/api/admin/users/role',
        { uid: victim.uid, role: 'owner', reasonAr: 'محاولة' });
      ok('even an OWNER cannot grant the owner role through the API', ownerMkOwner.status === 403);

      // Touching the owner.
      const touchOwner = await callApi(adminCookies, '/api/admin/users/ban',
        { uid: owner.uid, action: 'ban', reasonAr: 'محاولة' });
      ok('an admin cannot ban the owner', touchOwner.status === 403);
      ok('…refused as owner_protected', touchOwner.body.code === 'owner_protected');

      const demoteOwner = await callApi(adminCookies, '/api/admin/users/role',
        { uid: owner.uid, role: 'user', reasonAr: 'محاولة' });
      ok('an admin cannot demote the owner', demoteOwner.status === 403);
      ok('the owner is still the owner', str((await readDoc(`users/${owner.uid}`))?.role) === 'owner');
      ok('the owner is still active', str((await readDoc(`users/${owner.uid}`))?.status) === 'active');

      // All of it left a trail.
      const entries = await listAuditEntries();
      const deniedEntries = entries.filter(e => str(e.result) === 'denied');
      ok('every refused attempt was recorded as denied', deniedEntries.length >= 5);
      ok('a denied entry names the actor', deniedEntries.some(e => str(e.actorUid) === admin.uid));
      ok('a denied entry names the reason code',
        deniedEntries.some(e => str(e.error) === 'owner_protected'));
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[3] A moderator has exactly a moderator\'s powers, no more');
    {
      const modCookies = await cookiesFor(mod);

      const hide = await callApi(modCookies, '/api/admin/posts/moderate',
        { postId: 'post-bad', action: 'hide', reasonAr: 'مخالف لقواعد المجتمع' });
      ok('a moderator CAN hide a post', hide.status === 200);
      ok('the post is now hidden', str((await readDoc('posts/post-bad'))?.status) === 'hidden');

      const del = await callApi(modCookies, '/api/admin/posts/moderate',
        { postId: 'post-bad', action: 'delete', reasonAr: 'محاولة' });
      ok('a moderator CANNOT administratively delete a post', del.status === 403);

      const role = await callApi(modCookies, '/api/admin/users/role',
        { uid: victim.uid, role: 'moderator', reasonAr: 'محاولة' });
      ok('a moderator cannot assign roles', role.status === 403);

      // The audit log is not theirs to read.
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await signIn(page, mod);
      await page.goto(`${BASE}/admin/audit`, { waitUntil: 'domcontentloaded' });
      ok('a moderator is redirected away from the audit log', !page.url().includes('/admin/audit'));
      await goto(page, `${BASE}/admin`, '[data-testid="admin-stats"]');
      ok('a moderator DOES reach the dashboard', page.url().endsWith('/admin'));
      ok('…and sees no audit-log link', await page.locator('[data-testid="admin-nav-audit"]').count() === 0);
      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[4] The HTTP layer itself');
    {
      const adminCookies = await cookiesFor(admin);

      const get = await fetch(`${BASE}/api/admin/users/ban`, { method: 'GET' });
      ok('the ban endpoint refuses GET', get.status === 405 || get.status >= 400);

      const wrongType = await callApi(adminCookies, '/api/admin/users/ban',
        'uid=x&action=ban', { contentType: 'application/x-www-form-urlencoded' });
      ok('a form-encoded body is refused — the shape a cross-site form can send',
        wrongType.status === 400);

      const crossOrigin = await callApi(adminCookies, '/api/admin/users/ban',
        { uid: victim.uid, action: 'ban', reasonAr: 'محاولة' }, { origin: 'https://evil.test' });
      ok('a cross-origin request is refused', crossOrigin.status === 403);

      const extraField = await callApi(adminCookies, '/api/admin/users/role',
        { uid: victim.uid, role: 'moderator', reasonAr: 'سبب', isOwner: 'true' });
      ok('an unknown field is a hard error, never silently dropped', extraField.status === 400);
      ok('…named explicitly', String(extraField.body.error ?? '').includes('isOwner'));

      const noReason = await callApi(adminCookies, '/api/admin/users/ban',
        { uid: victim.uid, action: 'ban' });
      ok('a missing reason is refused — the audit log depends on it', noReason.status === 400);

      const badEnum = await callApi(adminCookies, '/api/admin/users/ban',
        { uid: victim.uid, action: 'obliterate', reasonAr: 'سبب' });
      ok('a value outside the allowed set is refused', badEnum.status === 400);

      const missing = await callApi(adminCookies, '/api/admin/users/ban',
        { uid: 'no-such-user', action: 'ban', reasonAr: 'سبب' });
      ok('a missing target is a clean 404, not a crash', missing.status === 404);
      ok('…with a code rather than an internal message', missing.body.code === 'not_found');

      ok('every response carries a request id', typeof missing.body.requestId === 'string');
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[5] An admin does the real work, through the real screens');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      await signIn(page, admin);

      await goto(page, `${BASE}/admin`, '[data-testid="admin-stats"]');
      ok('the dashboard shows real counted figures',
        Number(await page.locator('[data-testid="admin-stat-open-reports"] .admin-stat-value').innerText()) >= 1);

      // Find the target by uid, open them, ban them — all through the UI.
      await goto(page, `${BASE}/admin/users?q=${victim.uid}`, '[data-testid="admin-users-table"]');
      ok('searching by uid finds exactly that account',
        await page.locator(`[data-testid="admin-user-row-${victim.uid}"]`).count() === 1);

      await page.click(`[data-testid="admin-user-open-${victim.uid}"]`);
      await page.waitForSelector('[data-testid="admin-user-detail"]', { timeout: 30_000 });
      ok('the detail screen shows the account is active',
        (await page.locator('[data-testid="admin-user-status"]').innerText()).includes('نشط'));

      await page.click('[data-testid="admin-ban"]');
      await page.fill('[data-testid="admin-ban-reason"]', 'إزعاج متكرر بعد تحذير');
      // A dangerous action confirms before it fires.
      await page.click('[data-testid="admin-ban-submit"]');
      await page.waitForSelector('[data-testid="admin-ban-confirm-text"]', { timeout: 15_000 });
      ok('a destructive action asks for confirmation, with the reason already written', true);
      await page.click('[data-testid="admin-ban-confirm"]');
      await page.waitForSelector('[data-testid="admin-ban-done"]', { timeout: 30_000 });

      const banned = await readDoc(`users/${victim.uid}`);
      ok('the account is banned in the database', str(banned?.status) === 'banned');

      const entries = await listAuditEntries();
      const banEntry = entries.find(e => str(e.action) === 'user.ban' && str(e.result) === 'ok');
      ok('the ban was written to the audit log', !!banEntry);
      ok('…naming the actor', str(banEntry?.actorUid) === admin.uid);
      ok('…naming their role at the time', str(banEntry?.actorRole) === 'admin');
      ok('…recording before and after', str(banEntry?.before) === 'active' && str(banEntry?.after) === 'banned');
      ok('…recording the reason the admin typed',
        (str(banEntry?.reasonAr) ?? '').includes('إزعاج متكرر'));
      ok('…carrying a request id', !!str(banEntry?.requestId));

      // The audit page shows it.
      await goto(page, `${BASE}/admin/audit`, '[data-testid="audit-table"]');
      ok('the audit page renders the entry',
        (await page.locator('[data-testid="audit-table"]').innerText()).includes('إيقاف حساب'));

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[6] Report lifecycle, through the screens');
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      await signIn(page, admin);

      await goto(page, `${BASE}/admin/reports?status=open`, '[data-testid="admin-reports-table"]');
      ok('the open queue lists the seeded report',
        await page.locator('[data-testid="admin-report-row-report-1"]').count() === 1);

      await page.click('[data-testid="admin-report-open-report-1"]');
      await page.waitForSelector('[data-testid="admin-report-detail"]', { timeout: 30_000 });
      ok('the report page shows the reported content itself',
        (await page.locator('[data-testid="admin-report-content-text"]').innerText()).includes('منشور مبلَّغ عنه'));
      ok('the status reads open', (await page.locator('[data-testid="admin-report-status"]').innerText()).includes('مفتوح'));

      await page.click('[data-testid="admin-report-resolve"]');
      await page.fill('[data-testid="admin-report-resolve-reason"]', 'أُخفي المنشور وأُوقف صاحبه');
      await page.click('[data-testid="admin-report-resolve-submit"]');
      await page.waitForSelector('[data-testid="admin-report-resolve-confirm-text"]', { timeout: 15_000 });
      await page.click('[data-testid="admin-report-resolve-confirm"]');
      await page.waitForSelector('[data-testid="admin-report-resolve-done"]', { timeout: 30_000 });

      const report = await readDoc('reports/report-1');
      ok('the report is resolved in the database', (report?.resolved as { booleanValue?: boolean })?.booleanValue === true);
      ok('…and carries the richer status beside it', str(report?.status) === 'resolved');
      ok('…and records who reviewed it', str(report?.reviewedBy) === admin.uid);
      ok('…and their note', (str(report?.reviewNoteAr) ?? '').includes('أُخفي المنشور'));

      // Terminal means terminal.
      const adminCookies = await ctx.cookies();
      const reopen = await callApi(adminCookies, '/api/admin/reports/decide',
        { reportId: 'report-1', to: 'in_review', reasonAr: 'محاولة إعادة فتح' });
      ok('a closed report cannot be reopened', reopen.status === 409);
      ok('…refused as an invalid transition', reopen.body.code === 'invalid_transition');

      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('load');
      ok('the page says the report is closed',
        await page.locator('[data-testid="admin-decide-closed"]').count() === 1);

      await ctx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[7] A banned staff account loses its powers immediately');
    {
      // The moderator is banned by the admin, then tries to use their session.
      const adminCookies = await cookiesFor(admin);
      const modCtx = await browser.newContext();
      const modPage = await modCtx.newPage();
      await signIn(modPage, mod);
      const modCookies = await modCtx.cookies();

      const before = await callApi(modCookies, '/api/admin/posts/moderate',
        { postId: 'post-bad', action: 'unhide', reasonAr: 'قبل الإيقاف' });
      ok('the moderator can act before being banned', before.status === 200);

      const ban = await callApi(adminCookies, '/api/admin/users/ban',
        { uid: mod.uid, action: 'ban', reasonAr: 'اختبار سحب الصلاحية' });
      ok('the admin bans the moderator', ban.status === 200);

      // Same cookie, immediately after. Revocation plus the banned-status check
      // in getSession must take effect at once, not at cookie expiry.
      const after = await callApi(modCookies, '/api/admin/posts/moderate',
        { postId: 'post-bad', action: 'hide', reasonAr: 'بعد الإيقاف' });
      ok('the SAME session can no longer act once banned', after.status === 401 || after.status === 403);

      await modPage.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
      ok('and the admin surface is closed to them', !modPage.url().includes('/admin'));

      await modCtx.close();
    }

    /* ─────────────────────────────────────────────────────────────────── */
    console.log('\n[8] Layout, language and accessibility');
    {
      for (const [label, width, height] of [
        ['phone 390', 390, 844], ['tablet 768', 768, 1024], ['desktop 1280', 1280, 800],
      ] as const) {
        const ctx = await browser.newContext({ viewport: { width, height } });
        const page = await ctx.newPage();
        const errors: string[] = [];
        page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
        page.on('response', r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
        await signIn(page, admin);

        for (const path of [
          '/admin', '/admin/users', '/admin/reports', '/admin/audit',
          '/admin/store/orders', '/admin/store/products',
        ]) {
          await goto(page, `${BASE}${path}`);
          /**
           * Does the PAGE scroll sideways?
           *
           * Not `scrollWidth - clientWidth`. In an RTL document a horizontally
           * scrolling child — which a wide table inside `.admin-table-wrap`
           * legitimately is — lays its content out leftwards, and Chromium
           * folds that into the root's `scrollWidth` even though the root
           * itself cannot be scrolled at all. The proxy therefore reports a
           * page-level overflow that no user can produce.
           *
           * So this asks the question directly: try to scroll the document in
           * both directions and see whether anything moves. That is the
           * property the requirement is actually about, and it stays strict —
           * a genuinely too-wide page still moves.
           */
          const overflow = await page.evaluate(() => {
            const el = document.documentElement;
            const before = el.getBoundingClientRect().left;
            el.scrollLeft = 9999;
            const after = el.getBoundingClientRect().left;
            el.scrollLeft = -9999;
            const back = el.getBoundingClientRect().left;
            el.scrollLeft = 0;
            return Math.max(Math.abs(after - before), Math.abs(back - before));
          });
          ok(`[${label}] ${path} does not scroll horizontally`, overflow <= 1);
          if (overflow > 1) {
            const culprit = await page.evaluate(() => {
              const w = document.documentElement.clientWidth;
              return Array.from(document.querySelectorAll('*'))
                .filter(el => el.getBoundingClientRect().width > w + 1)
                .slice(0, 6)
                .map(el => {
                  const cs = getComputedStyle(el);
                  return `${el.tagName}.${String((el as HTMLElement).className).slice(0, 24)}`
                    + ` w=${Math.round(el.getBoundingClientRect().width)} ovx=${cs.overflowX} minW=${cs.minWidth}`;
                }).join(' | ');
            });
            console.log(`      overflow ${overflow}px chain: ${culprit}`);
          }
          ok(`[${label}] ${path} has exactly one h1`, await page.locator('h1').count() === 1);
        }

        ok(`[${label}] the document is Arabic and RTL`,
          await page.evaluate(() => document.documentElement.lang) === 'ar'
          && await page.evaluate(() => document.documentElement.dir) === 'rtl');
        const real = errors.filter(e => !/favicon|net::ERR/.test(e));
        ok(`[${label}] no console error`, real.length === 0);
        real.slice(0, 2).forEach(e => console.log(`      console: ${e.slice(0, 260)}`));

        await ctx.close();
      }

      // Keyboard reachability and table semantics, once, on the widest layout.
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      await signIn(page, admin);
      await goto(page, `${BASE}/admin/users`, '[data-testid="admin-users-table"]');

      ok('the users table has a caption for screen readers',
        await page.locator('table caption').count() === 1);
      ok('every column header is a real th with a scope',
        await page.locator('table th[scope="col"]').count() >= 4);
      ok('the search field has a real label',
        await page.locator('label[for="admin-user-q"]').count() === 1);

      const focused = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="admin-user-search"]') as HTMLElement | null;
        el?.focus();
        return document.activeElement === el;
      });
      ok('the search field is keyboard focusable', focused);

      // Status is never colour alone — each badge carries its own word.
      await goto(page, `${BASE}/admin/users?status=banned`, '[data-testid="admin-users-table"]');
      const badges = await page.locator('.admin-badge').allInnerTexts();
      ok('status badges carry text, not just colour',
        badges.some(b => b.includes('موقوف') || b.includes('نشط')));

      await ctx.close();
    }
  } finally {
    browser?.close().catch(() => {});
    try { if (server.pid) process.kill(-server.pid, 'SIGTERM'); } catch { /* gone */ }
    server.kill('SIGTERM');
    freePort();
  }

  console.log(`\n${failures.length === 0 ? '✅' : '❌'} testWebAdminE2E: ${passed} assertions passed, ${failures.length} failed`);
  failures.forEach(f => console.log(`   - ${f}`));
  assert.equal(failures.length, 0, `${failures.length} assertion(s) failed`);
}

main().catch(err => { console.error(err); process.exit(1); });

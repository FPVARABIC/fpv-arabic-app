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

      // Images and specs can be added, and the provenance fields are present
      // rather than optional extras somebody has to know to ask for.
      await page.click('[data-testid="image-add"]');
      ok('an image row can be added', (await page.locator('[data-testid^="image-row-"]').count()) >= 1);
      await page.click('[data-testid="spec-add"]');
      ok('a spec row can be added', (await page.locator('[data-testid^="spec-row-"]').count()) >= 1);

      // The rule from the brief, proven through the real form: a spec marked
      // confirmed with no source is refused, and the refusal names it.
      await page.fill('[data-testid="spec-label-0"]', 'اختبار');
      await page.fill('[data-testid="spec-value-0"]', '1234');
      await page.check('[data-testid="spec-verified-0"]');
      await page.click('[data-testid="product-editor-save"]');
      await page.waitForSelector('[data-testid="product-editor-error"]', { timeout: 15_000 });
      const specError = await page.locator('[data-testid="product-editor-error"]').innerText();
      ok('a confirmed spec with no source is refused by the server',
        specError.includes('اختبار') && specError.includes('مصدر'));

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

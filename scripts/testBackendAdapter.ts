#!/usr/bin/env tsx
/**
 * The Backend Adapter, EXERCISED — and the boundary it exists to draw, ASSERTED.
 *
 * TWO KINDS OF ASSERTION, AND WHY BOTH ARE NEEDED
 * ===============================================
 *
 *   BEHAVIOURAL   The fake provider is driven like a real backend: posts are
 *                 created, paged, edited by strangers, soft-deleted, ordered.
 *                 This is what proves the DECISIONS are right — the cursor's
 *                 tiebreaker, the soft delete, the clamp, the fact that a
 *                 basket cannot carry a price.
 *
 *   STRUCTURAL    The source tree is read and searched. This is what proves
 *                 the BOUNDARY holds — that no page imports the SDK, that the
 *                 secret key appears in exactly one file, that `admin.ts` is
 *                 `server-only`, that `Backend` has no `admin` key.
 *
 * Neither substitutes for the other. A perfect fake proves nothing about which
 * files import what; a perfect grep proves nothing about whether the cursor
 * skips a row.
 *
 * WHY THE REAL ADAPTERS ARE NOT IMPORTED HERE
 * ===========================================
 * `@supabase/*` is installed in `web/node_modules`, and `supabase/server.ts`
 * imports `next/headers`, which throws outside a request. Importing either from
 * a root-run script would fail for reasons that have nothing to do with what is
 * being tested.
 *
 * What IS imported is everything provider-free: `ports.ts`, the fake, and
 * `supabase/rows.ts` — which is a separate file precisely so its mapping can be
 * fed hostile rows here. The rest is covered structurally, and by
 * `npm run web:typecheck`, which compiles them for real.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createFakeBackend, FakeClock, type FakeState } from '../web/lib/backend/fake/index';
import {
  BUCKETS, POST_CATEGORIES, POSTS_PAGE_MAX, ownedPath,
  type Backend, type PostSummary, type StoreProductSummary, type StoreVariantSummary,
} from '../web/lib/backend/ports';
import {
  clampLimit, keysetFilter, parseFulfilmentState, parsePaymentState, toCategory,
  toCommentSummary, toIso, toOrderSummary, toPostSummary, toSupplyRecord, toVariantSummary,
} from '../web/lib/backend/supabase/rows';
import { ALL_CATEGORY_IDS } from '../src/components/Community/types';
import { ORDER_STATUS_NEXT } from '../src/data/store/types';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'web');

let passed = 0;
let failed = 0;
function ok(label: string, cond: boolean, detail = ''): void {
  if (cond) { passed++; console.log(`  ok — ${label}`); }
  else { failed++; console.log(`  FAIL — ${label}${detail ? ` — ${detail}` : ''}`); }
}

/* ── Source walking ───────────────────────────────────────────────────────── */

/**
 * Every source file under a directory.
 *
 * `.next`, `out` and `.netlify` are excluded because they hold GENERATED
 * bundles — a 35 MB compiled blob that contains every string in the project,
 * including any the assertions below are looking for. Reading one turned a
 * previous suite's search into a guaranteed false positive.
 */
function sources(dir: string, exts = ['.ts', '.tsx']): string[] {
  const out: string[] = [];
  const skip = new Set(['node_modules', '.next', 'out', '.netlify', '.git', 'dist']);
  const walk = (d: string) => {
    let entries: string[];
    try { entries = readdirSync(d); } catch { return; }
    for (const name of entries) {
      if (skip.has(name)) continue;
      const full = path.join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (exts.some(e => name.endsWith(e))) out.push(full);
    }
  };
  walk(dir);
  return out;
}

const rel = (p: string) => path.relative(ROOT, p);
const readIf = (p: string) => { try { return readFileSync(p, 'utf8'); } catch { return ''; } };

/**
 * The file with its comments removed.
 *
 * NECESSARY, NOT FASTIDIOUS. This repository documents its decisions in prose,
 * and that prose NAMES the things the assertions below search for: `env.ts`
 * explains at length that it does not read `SUPABASE_SECRET_KEY`, and
 * `ports.ts` explains why it does not import a Firebase type. A raw search
 * would find both sentences and report the exact opposite of the truth.
 *
 * Block comments go first, then whole-line `//` comments — trailing `//` is
 * left alone deliberately, because stripping it correctly means parsing string
 * literals, and a half-correct stripper that eats `https://…` would introduce
 * the false negatives this exists to prevent.
 */
function codeOf(file: string): string {
  return readIf(file)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(l => !/^\s*(\/\/|\*)/.test(l))
    .join('\n');
}

/* ═══════════════════════════════════════════════════════════════════════════
 * PART ONE — the fake provider satisfies every port
 * ═══════════════════════════════════════════════════════════════════════════ */

console.log('\n[1] المزوّد الوهمي يحقق كل الواجهات');
{
  const be = createFakeBackend();

  const shape: Record<string, string[]> = {
    auth: ['currentUser', 'signInWithPassword', 'signUpWithPassword', 'signInWithProvider', 'signOut'],
    read: ['listPosts', 'getPost', 'listComments', 'listPublishedProducts', 'listVariants', 'myOrders', 'projectOverrides'],
    write: ['createPost', 'editPost', 'deleteOwnPost', 'createComment', 'deleteOwnComment', 'togglePostLike', 'report', 'updateOwnProfile'],
    storage: ['upload', 'remove', 'publicUrl'],
    realtime: ['onPostsChanged', 'onCommentsChanged'],
    admin: ['createOrder', 'setPaymentState', 'setFulfilmentState', 'setUserRole', 'setUserStatus', 'moderateContent', 'supplyFor', 'appendAudit', 'listReports'],
  };

  for (const [port, methods] of Object.entries(shape)) {
    const obj = (be as unknown as Record<string, Record<string, unknown>>)[port];
    const missing = methods.filter(m => typeof obj?.[m] !== 'function');
    ok(`${port}: all ${methods.length} methods present`, missing.length === 0, missing.join(', '));
  }

  // THE ONE THAT MATTERS FOR THE BOUNDARY: `Backend` — what a page is handed —
  // must not carry `admin`. The fake DOES expose an admin port, because a test
  // needs to drive it; the point is that it hangs off a key `Backend` does not
  // declare, exactly as `adminBackend()` lives in a module a page cannot import.
  //
  // That the type omits it is a COMPILE-time fact, erased before this line
  // runs, so it is asserted against the source in part [14]. What can be
  // checked here is the complement: the five declared ports are all present
  // and usable, so the omission is a boundary rather than an oversight.
  const asBackend: Backend = be;
  const declared: Array<keyof Backend> = ['auth', 'read', 'write', 'storage', 'realtime'];
  ok('every port `Backend` declares is present and usable',
    declared.every(k => asBackend[k] && typeof asBackend[k] === 'object'));
  ok('the fake reaches AdminPort through a key outside `Backend`',
    typeof be.admin.setUserRole === 'function'
    && !declared.includes('admin' as keyof Backend));
}

/* ── Community reads and the cursor ───────────────────────────────────────── */

console.log('\n[2] المجتمع — القراءة والترقيم');
{
  const clock = new FakeClock();
  const be = createFakeBackend(seedCommunity(clock), clock);

  const strangerPage = await be.read.listPosts({ limit: 50 });
  ok('a stranger sees only active posts',
    strangerPage.posts.every(p => p.status === 'active'),
    strangerPage.posts.map(p => p.status).join(','));
  ok('a stranger does not see the hidden post',
    !strangerPage.posts.some(p => p.id === 'post-hidden'));
  ok('a stranger does not see the deleted post',
    !strangerPage.posts.some(p => p.id === 'post-deleted'));

  // The control. If everything above passed because nothing is visible at all,
  // this fails and says so.
  ok('…and there ARE posts to see (the control)', strangerPage.posts.length >= 3,
    `saw ${strangerPage.posts.length}`);

  be.signInAs('alice');
  const alicePage = await be.read.listPosts({ limit: 50 });
  ok('an author DOES see their own deleted post in the feed',
    alicePage.posts.some(p => p.id === 'post-deleted'));
  ok('…but not their own HIDDEN post — moderation is not negotiable',
    !alicePage.posts.some(p => p.id === 'post-hidden'));
  ok('a permalink to a deleted post is still null, even for its author',
    (await be.read.getPost('post-deleted')) === null);

  be.signInAs(null);
}

console.log('\n[3] المؤشر (cursor) لا يُسقط منشوراً ولا يكرره');
{
  // TWENTY posts, of which SIX share a single instant. That tie is the entire
  // reason the cursor carries an id, and a suite that never produces one is a
  // suite that cannot tell a working cursor from a broken one.
  const clock = new FakeClock();
  const posts: PostSummary[] = [];
  for (let i = 0; i < 20; i++) {
    const at = i >= 7 && i < 13 ? clock.same() : clock.tick();
    posts.push(post(`p-${String(i).padStart(2, '0')}`, 'alice', at));
  }
  const be = createFakeBackend({ posts, profiles: [profile('alice')] });

  const seen: string[] = [];
  let cursor: string | null = null;
  let guard = 0;
  do {
    const page = await be.read.listPosts({ limit: 3, cursor });
    seen.push(...page.posts.map(p => p.id));
    cursor = page.nextCursor;
  } while (cursor && ++guard < 50);

  ok('paging three at a time terminates', guard < 50, `stopped after ${guard} pages`);
  ok('every post is seen exactly once', new Set(seen).size === seen.length,
    `${seen.length} rows, ${new Set(seen).size} distinct`);
  ok('all twenty posts are seen', seen.length === 20, `saw ${seen.length}`);

  const single = await be.read.listPosts({ limit: 50 });
  ok('the pages are in the same order as one big page',
    seen.join(',') === single.posts.map(p => p.id).join(','));

  // A cursor arrives from a query string a stranger can edit.
  for (const hostile of ['', 'not-base64', 'X'.repeat(400), Buffer.from('abc').toString('base64url')]) {
    const page = await be.read.listPosts({ limit: 3, cursor: hostile });
    ok(`a malformed cursor (${hostile.slice(0, 12) || 'empty'}) falls back to page one`,
      page.posts.length === 3 && page.posts[0].id === single.posts[0].id);
  }

  ok('limit is clamped, not obeyed',
    (await be.read.listPosts({ limit: 9999 })).posts.length <= POSTS_PAGE_MAX);
  ok('a nonsense limit becomes the default',
    (await be.read.listPosts({ limit: Number.NaN })).posts.length === 12);
}

/* ── Writes and ownership ─────────────────────────────────────────────────── */

console.log('\n[4] الكتابة — الملكية والحذف الناعم');
{
  const clock = new FakeClock();
  const be = createFakeBackend(seedCommunity(clock), clock);

  be.signInAs(null);
  ok('an anonymous visitor cannot post',
    (await be.write.createPost({ text: 'مرحبا' })).ok === false);

  be.signInAs('mallory');
  const steal = await be.write.editPost('post-live', 'تم الاختراق');
  ok('a stranger cannot edit somebody else\'s post', steal.ok === false);
  const stealDelete = await be.write.deleteOwnPost('post-live');
  ok('a stranger cannot delete somebody else\'s post', stealDelete.ok === false);

  const ghost = await be.write.editPost('post-does-not-exist', 'x');
  ok('«not yours» and «does not exist» are the SAME refusal — no id oracle',
    !steal.ok && !ghost.ok && steal.errorAr === ghost.errorAr);

  be.signInAs('alice');
  ok('the author CAN edit their own post',
    (await be.write.editPost('post-live', 'نص محدَّث')).ok === true);
  ok('…and the control: the text actually changed',
    be.state.posts.find(p => p.id === 'post-live')?.text === 'نص محدَّث');

  const created = await be.write.createPost({ text: 'منشور جديد', category: 'parts' });
  ok('the author can create a post', created.ok === true);
  if (created.ok) {
    ok('delete is SOFT — the row survives',
      (await be.write.deleteOwnPost(created.id)).ok === true
      && be.state.posts.some(p => p.id === created.id && p.status === 'deleted'));
  }

  ok('an over-long post is refused before the round trip',
    (await be.write.createPost({ text: 'ا'.repeat(2001) })).ok === false);
  ok('an empty post is refused', (await be.write.createPost({ text: '   ' })).ok === false);

  // A banned account keeps a session and loses every write.
  be.signInAs('banned-user');
  ok('a banned account cannot post', (await be.write.createPost({ text: 'x' })).ok === false);
  ok('a banned account cannot comment',
    (await be.write.createComment('post-live', 'x')).ok === false);
  const bannedSession = await be.auth.currentUser();
  ok('a banned staff account reports role `user`, whatever the row says',
    bannedSession?.role === 'user' && bannedSession.status === 'banned');
}

console.log('\n[5] الإعجاب والبلاغ');
{
  const clock = new FakeClock();
  const be = createFakeBackend(seedCommunity(clock), clock);
  be.signInAs('alice');

  const on = await be.write.togglePostLike('post-live');
  const off = await be.write.togglePostLike('post-live');
  ok('a like toggles on and back off',
    on.ok && on.liked === true && off.ok && off.liked === false);
  ok('the count returns to where it started',
    be.state.posts.find(p => p.id === 'post-live')?.likesCount === 0);

  ok('a report is accepted once',
    (await be.write.report({ targetType: 'post', targetId: 'post-live', reason: 'spam' })).ok === true);
  ok('the same reporter cannot pile on the same target',
    (await be.write.report({ targetType: 'post', targetId: 'post-live', reason: 'spam' })).ok === false);
  be.signInAs('mallory');
  ok('…but a DIFFERENT reporter still can',
    (await be.write.report({ targetType: 'post', targetId: 'post-live', reason: 'abuse' })).ok === true);
}

/* ── Storage ──────────────────────────────────────────────────────────────── */

console.log('\n[6] التخزين — المسار والصلاحية');
{
  const be = createFakeBackend({
    profiles: [profile('alice'), profile('mod', 'moderator'), profile('boss', 'admin')],
  });

  be.signInAs('alice');
  ok('a user uploads into their own avatar folder',
    (await be.storage.upload({ bucket: 'avatars', path: 'alice/me.webp', file: new ArrayBuffer(8), contentType: 'image/webp' })).ok === true);
  ok('a user cannot upload into somebody else\'s folder',
    (await be.storage.upload({ bucket: 'avatars', path: 'mallory/me.webp', file: new ArrayBuffer(8), contentType: 'image/webp' })).ok === false);

  for (const bad of ['alice/../mallory/x.webp', '/alice/x.webp', 'alice//x.webp', 'alice/x.tar.gz', 'alice\\x.webp']) {
    ok(`a hostile path is refused: ${bad}`,
      (await be.storage.upload({ bucket: 'avatars', path: bad, file: new ArrayBuffer(8), contentType: 'image/webp' })).ok === false);
  }

  ok('community media requires exactly {uid}/{postId}/file',
    (await be.storage.upload({ bucket: 'community-media', path: 'alice/post-1/a.webp', file: new ArrayBuffer(8), contentType: 'image/webp' })).ok === true
    && (await be.storage.upload({ bucket: 'community-media', path: 'alice/b.webp', file: new ArrayBuffer(8), contentType: 'image/webp' })).ok === false);

  ok('a plain user cannot upload product photography',
    (await be.storage.upload({ bucket: 'store-products', path: 'alice/p.webp', file: new ArrayBuffer(8), contentType: 'image/webp' })).ok === false);

  be.signInAs('mod');
  // is_admin, NOT is_staff. A moderator moderates the community; they do not
  // publish the shop's photography.
  ok('a MODERATOR cannot upload product photography either',
    (await be.storage.upload({ bucket: 'store-products', path: 'mod/p.webp', file: new ArrayBuffer(8), contentType: 'image/webp' })).ok === false);
  ok('…but a moderator CAN remove community media (take-down without upload)',
    (await be.storage.remove('community-media', 'alice/post-1/a.webp')).ok === true);

  be.signInAs('boss');
  ok('an ADMIN can upload product photography',
    (await be.storage.upload({ bucket: 'store-products', path: 'boss/p.webp', file: new ArrayBuffer(8), contentType: 'image/webp' })).ok === true);

  ok('no upsert: a duplicate path is refused rather than overwriting',
    (await be.storage.upload({ bucket: 'store-products', path: 'boss/p.webp', file: new ArrayBuffer(8), contentType: 'image/webp' })).ok === false);

  ok('publicUrl is a pure function of bucket and path',
    be.storage.publicUrl('avatars', 'alice/me.webp').endsWith('/avatars/alice/me.webp'));

  // The path builder in `ports.ts`.
  const built = ownedPath('alice', ['post 1'], 'صورة رحلة.WEBP');
  ok('ownedPath roots at the uid', built.startsWith('alice/'));
  ok('ownedPath leaves exactly one dot in the file name',
    (built.slice(built.lastIndexOf('/') + 1).match(/\./g) ?? []).length === 1, built);
  ok('ownedPath survives a name that is entirely non-ASCII',
    ownedPath('alice', [], 'صورة.png').split('/')[1].endsWith('.png'));
  ok('ownedPath cannot be made to traverse',
    !ownedPath('alice', ['../..'], 'a/../b.png').includes('..'));
}

/* ── Realtime ─────────────────────────────────────────────────────────────── */

console.log('\n[7] البث الحي — معرّف فقط، وإلغاء اشتراك يعمل');
{
  const clock = new FakeClock();
  const be = createFakeBackend(seedCommunity(clock), clock);
  be.signInAs('alice');

  const events: string[] = [];
  const stop = be.realtime.onPostsChanged(e => events.push(`${e.kind}:${e.postId}`));

  const made = await be.write.createPost({ text: 'حدث' });
  ok('creating a post notifies the subscriber',
    made.ok && events.some(e => e === `insert:${made.id}`), events.join(' '));

  await be.write.editPost('post-live', 'تعديل');
  ok('editing notifies as an update', events.includes('update:post-live'));

  await be.write.deleteOwnPost('post-live');
  ok('a SOFT delete notifies as an update, not a delete — the row is still there',
    events.filter(e => e === 'update:post-live').length === 2
    && !events.some(e => e.startsWith('delete:')));

  const before = events.length;
  stop();
  await be.write.createPost({ text: 'بعد إلغاء الاشتراك' });
  ok('unsubscribing actually stops the handler', events.length === before);

  const otherThread: string[] = [];
  const ownThread: string[] = [];
  const stopOther = be.realtime.onCommentsChanged('post-three', e => otherThread.push(e.commentId));
  const stopOwn = be.realtime.onCommentsChanged('post-two', e => ownThread.push(e.commentId));
  const c = await be.write.createComment('post-two', 'تعليق');
  ok('a comment notifies the thread it belongs to',
    c.ok === true && ownThread.length === 1 && ownThread[0] === c.id);
  ok('…and NOT a different thread — the subscription is scoped',
    otherThread.length === 0);
  stopOther(); stopOwn();
}

/* ── The store, and the price the client cannot send ──────────────────────── */

console.log('\n[8] المتجر — السعر يُحسب خادمياً');
{
  const clock = new FakeClock();
  const be = createFakeBackend(seedStore(), clock);

  const draft = {
    items: [{ productId: 'prod-live', variantId: 'var-1', quantity: 2 }],
    shippingRegionId: 'eu',
    email: 'a@example.com',
    shipTo: { city: 'Amsterdam' },
  };

  const result = await be.admin.createOrder(draft, 'alice');
  ok('an order is created', result.ok === true, result.ok ? '' : result.errorAr);
  if (result.ok) {
    // 2 × 4999 = 9998, plus 700 shipping. Not a number the caller supplied —
    // `DraftOrderInput` has no field for one.
    ok('the subtotal is the catalogue price × quantity', result.order.subtotalMinor === 9998,
      String(result.order.subtotalMinor));
    ok('shipping comes from the region table', result.order.shippingMinor === 700);
    ok('the total is the sum the SERVER computed', result.order.totalMinor === 10698);
    ok('a new order starts as `draft`, not `paid`', result.order.paymentState === 'draft');
    ok('…and as `received` on the fulfilment axis', result.order.fulfilmentState === 'received');
    ok('the order is audited', be.state.audit.some(a => a.action === 'order.create'));
  }

  // THE ASSERTION THAT PROVES THE TYPE IS THE ENFORCEMENT: a caller trying to
  // dictate a total has nowhere to put it, so the extra property is ignored
  // and the catalogue still decides.
  const forged = await be.admin.createOrder(
    { ...draft, totalMinor: 1, shippingMinor: 0 } as typeof draft, 'alice');
  ok('a forged total changes nothing — the catalogue prices the basket',
    forged.ok === true && forged.order.totalMinor === 10698);

  ok('an unpublished product cannot be ordered',
    (await be.admin.createOrder({ ...draft, items: [{ productId: 'prod-draft', variantId: 'var-2', quantity: 1 }] }, 'alice')).ok === false);
  ok('a suspended product cannot be ordered',
    (await be.admin.createOrder({ ...draft, items: [{ productId: 'prod-suspended', variantId: 'var-3', quantity: 1 }] }, 'alice')).ok === false);
  ok('an unshippable region refuses the order rather than quoting zero',
    (await be.admin.createOrder({ ...draft, shippingRegionId: 'antarctica' }, 'alice')).ok === false);
  ok('an empty basket is refused',
    (await be.admin.createOrder({ ...draft, items: [] }, 'alice')).ok === false);

  // Free-over threshold: 20 × 4999 = 99 980 ≥ 50 000.
  const big = await be.admin.createOrder(
    { ...draft, items: [{ productId: 'prod-live', variantId: 'var-1', quantity: 20 }] }, 'alice');
  ok('the free-shipping threshold applies', big.ok === true && big.order.shippingMinor === 0);

  // `myOrders` is RLS, not a filter — the fake enforces it the same way.
  be.signInAs('alice');
  ok('a customer sees their own orders', (await be.read.myOrders()).length >= 1);
  be.signInAs('mallory');
  ok('a customer does NOT see somebody else\'s orders',
    (await be.read.myOrders()).length === 0);
  be.signInAs(null);
  ok('an anonymous visitor sees no orders at all',
    (await be.read.myOrders()).length === 0);
}

console.log('\n[9] المحورَان — الدفع والتنفيذ');
{
  const be = createFakeBackend(seedStore());
  const made = await be.admin.createOrder({
    items: [{ productId: 'prod-live', variantId: 'var-1', quantity: 1 }],
    shippingRegionId: 'eu', email: 'a@example.com', shipTo: {},
  }, 'alice');
  if (!made.ok) throw new Error('setup failed: ' + made.errorAr);
  const id = made.order.id;

  ok('fulfilment moves forward one step at a time',
    (await be.admin.setFulfilmentState(id, 'confirmed', 'boss')).ok === true);
  ok('it cannot skip a step',
    (await be.admin.setFulfilmentState(id, 'delivered', 'boss')).ok === false);
  ok('…and it cannot move backwards',
    (await be.admin.setFulfilmentState(id, 'received', 'boss')).ok === false);

  await be.admin.setFulfilmentState(id, 'ordered-from-supplier', 'boss');
  await be.admin.setFulfilmentState(id, 'shipped', 'boss');
  ok('a shipped order cannot be cancelled — the parcel has left',
    (await be.admin.setFulfilmentState(id, 'cancelled', 'boss')).ok === false);
  ok('a shipped order CAN be delivered (the control)',
    (await be.admin.setFulfilmentState(id, 'delivered', 'boss')).ok === true);

  // The two axes are independent: payment moves while fulfilment stays put.
  ok('payment state moves independently of fulfilment',
    (await be.admin.setPaymentState(id, 'refunded', null)).ok === true
    && be.state.orders[0].fulfilmentState === 'delivered'
    && be.state.orders[0].paymentState === 'refunded');

  ok('the fake\'s transition table IS the panel\'s',
    JSON.stringify(ORDER_STATUS_NEXT.shipped) === JSON.stringify(['delivered']));
}

console.log('\n[10] الأدوار والإشراف والمورّد');
{
  const be = createFakeBackend({
    profiles: [profile('alice'), profile('boss', 'owner'), profile('mod', 'moderator')],
    supply: [
      { productId: 'prod-live', variantId: null, supplierName: 'MoriSupplier', supplierUrl: null, costMinor: 2500, currency: 'EUR', marginPct: 45, moq: null, leadTimeDays: null, updatedAt: '2026-01-01T00:00:00.000Z' },
      { productId: 'prod-live', variantId: 'var-1', supplierName: 'NewerSupplier', supplierUrl: null, costMinor: 2400, currency: 'EUR', marginPct: 50, moq: null, leadTimeDays: null, updatedAt: '2026-06-01T00:00:00.000Z' },
    ],
  });

  ok('the last owner cannot be demoted',
    (await be.admin.setUserRole('boss', 'user', 'boss')).ok === false);
  ok('a normal user CAN be promoted (the control)',
    (await be.admin.setUserRole('alice', 'admin', 'boss')).ok === true);
  ok('…and now the former last owner can step down',
    (await be.admin.setUserRole('alice', 'owner', 'boss')).ok === true
    && (await be.admin.setUserRole('boss', 'admin', 'alice')).ok === true);

  ok('every role change is audited',
    be.state.audit.filter(a => a.action === 'role.change').length === 3);

  ok('banning is recorded',
    (await be.admin.setUserStatus('mod', 'banned', 'alice')).ok === true
    && be.state.audit.some(a => a.action === 'user.ban'));

  const supply = await be.admin.supplyFor('prod-live');
  ok('supplyFor returns the FRESHEST record, not the first',
    supply?.supplierName === 'NewerSupplier', supply?.supplierName ?? 'null');

  // The structural half of this rule is asserted in part three: `supplyFor`
  // exists on `AdminPort` and on no other port.
  const readKeys = Object.keys(be.read);
  ok('no supplier, cost or margin read exists on ReadPort',
    !readKeys.some(k => /supply|cost|margin|supplier/i.test(k)), readKeys.join(','));
}

/* ── Row mapping, fed hostile input ───────────────────────────────────────── */

console.log('\n[11] تحويل الصفوف — مدخلات معادية');
{
  const empty = toPostSummary({});
  ok('a completely empty row still maps to a renderable post',
    empty.commentsCount === 0 && empty.likesCount === 0
    && empty.status === 'active' && empty.authorName === 'طيّار');
  ok('a missing timestamp becomes null, not «Invalid Date»', empty.createdAt === null);

  ok('a garbage timestamp becomes null', toIso('not-a-date') === null);
  ok('a real timestamp survives',
    toIso('2026-06-01T10:00:00+02:00') === '2026-06-01T08:00:00.000Z');

  // `numeric` and `bigint` arrive as STRINGS from PostgREST. Dropping them to
  // null would silently unprice the catalogue.
  const v = toVariantSummary({ id: 'v', product_id: 'p', label_ar: 'x', price_minor: '4999' });
  ok('a bigint delivered as a string is still a number', v.priceMinor === 4999);
  const s = toSupplyRecord({ product_id: 'p', margin_pct: '45.5' });
  ok('a numeric delivered as a string is still a number', s.marginPct === 45.5);
  ok('a genuinely absent price stays null, and does not become zero',
    toVariantSummary({ id: 'v', product_id: 'p', label_ar: 'x' }).priceMinor === null);

  ok('an unknown category is dropped rather than rendered raw',
    toCategory('not-a-category') === null && toCategory('parts') === 'parts');

  ok('an unknown payment state falls back to the state claiming least',
    toOrderSummary({ payment_state: 'wat' }).paymentState === 'draft');
  ok('an unknown fulfilment state falls back to `received`',
    toOrderSummary({ fulfilment: 'wat' }).fulfilmentState === 'received');
  ok('the strict parsers refuse what the tolerant ones absorb',
    parsePaymentState('wat') === null && parsePaymentState('paid') === 'paid'
    && parseFulfilmentState('wat') === null && parseFulfilmentState('shipped') === 'shipped');

  ok('a comment row with a null text maps to an empty string, not «null»',
    toCommentSummary({ id: 'c', text: null }).text === '');

  ok('clampLimit floors, ceilings and defaults',
    clampLimit(undefined, 12, 50) === 12 && clampLimit(0, 12, 50) === 1
    && clampLimit(9999, 12, 50) === 50 && clampLimit(Number.NaN, 12, 50) === 12);

  // The keyset filter is interpolated into a PostgREST query string.
  const f = keysetFilter('2026-01-01T00:00:00.000Z', 'p-1', 'desc');
  ok('the keyset filter compares BOTH halves', f.includes('created_at.lt') && f.includes('id.lt'));
  ok('the keyset filter quotes its values', f.includes('"2026-01-01T00:00:00.000Z"'));
  const hostile = keysetFilter('2026-01-01T00:00:00.000Z', 'a"b\\c', 'asc');
  ok('a quote inside an id is escaped, not closed',
    hostile.includes('\\"') && hostile.includes('\\\\'), hostile);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * PART TWO — the boundary, asserted against the source tree
 * ═══════════════════════════════════════════════════════════════════════════ */

console.log('\n[12] الحدود — لا SDK داخل الصفحات والمكونات');
{
  const adapterDir = path.join(WEB, 'lib', 'backend', 'supabase');
  const all = sources(WEB);
  const offenders = all.filter(f => {
    if (f.startsWith(adapterDir + path.sep)) return false;
    return /from\s+['"]@supabase\//.test(codeOf(f));
  });
  ok('the Supabase SDK is imported ONLY inside lib/backend/supabase',
    offenders.length === 0, offenders.map(rel).join(', '));

  // The control: if the search is broken, this fails.
  const inside = sources(adapterDir).filter(f => /from\s+['"]@supabase\//.test(codeOf(f)));
  ok('…and it IS imported in there (the control)', inside.length >= 3,
    `${inside.length} files`);

  const appAndComponents = [
    ...sources(path.join(WEB, 'app')),
    ...sources(path.join(WEB, 'components')),
  ];
  ok('no page or component imports the SDK',
    !appAndComponents.some(f => /@supabase\//.test(codeOf(f))));
  ok('…and there ARE pages and components to check (the control)',
    appAndComponents.length > 20, `${appAndComponents.length} files`);
}

console.log('\n[13] المفتاح السري — ملف واحد فقط');
{
  const all = sources(WEB);
  const holders = all.filter(f => /SUPABASE_SECRET_KEY|service_role/.test(codeOf(f)));
  const expected = path.join(WEB, 'lib', 'backend', 'supabase', 'admin.ts');
  ok('SUPABASE_SECRET_KEY is read in exactly one file',
    holders.length === 1 && holders[0] === expected,
    holders.map(rel).join(', '));

  const adminSrc = readIf(expected);
  ok('…and that file is `server-only` on its FIRST line',
    adminSrc.split('\n')[0].trim() === "import 'server-only';");

  // A `'use client'` file that imported it would be a build failure, but the
  // build is not run by this suite — so the import graph is checked directly.
  const clientFiles = sources(WEB).filter(f => {
    const head = readIf(f).slice(0, 200);
    return /^\s*['"]use client['"]/.test(head);
  });
  const leaked = clientFiles.filter(f => /backend\/supabase\/(admin|server)/.test(codeOf(f)));
  ok('no `use client` file imports the admin or server adapter',
    leaked.length === 0, leaked.map(rel).join(', '));
  ok('…and there ARE client components to check (the control)',
    clientFiles.length > 5, `${clientFiles.length} files`);

  ok('the public env module reads no secret, whatever its prose discusses',
    !/SECRET|service_role/.test(codeOf(path.join(WEB, 'lib', 'backend', 'supabase', 'env.ts'))));

  // No key VALUE anywhere. A publishable key is `sb_publishable_…` and a secret
  // is `sb_secret_…`; a JWT-shaped legacy key starts `eyJ`.
  const literals = all.filter(f => /sb_secret_|service_role.*eyJ|['"]eyJ[A-Za-z0-9_-]{20,}/.test(readIf(f)));
  ok('no key literal is committed anywhere under web/', literals.length === 0,
    literals.map(rel).join(', '));
}

console.log('\n[14] الواجهات مستقلة عن المزود');
{
  const portsSrc = readIf(path.join(WEB, 'lib', 'backend', 'ports.ts'));
  ok('ports.ts imports nothing at all',
    !/^\s*import\s/m.test(portsSrc));
  ok('ports.ts names no provider type in its CODE',
    !/SupabaseClient|PostgrestError|RealtimeChannel|firebase|firestore/i.test(
      codeOf(path.join(WEB, 'lib', 'backend', 'ports.ts'))));

  const indexSrc = readIf(path.join(WEB, 'lib', 'backend', 'index.ts'));
  ok('the barrel re-exports the ports and nothing else',
    indexSrc.split('\n').filter(l => /^\s*export\s/.test(l)).length === 1
    && indexSrc.includes("export * from './ports'"));
  ok('the barrel cannot drag in the admin adapter',
    !indexSrc.includes('./supabase/'));

  ok('the fake provider imports no SDK',
    !/@supabase\//.test(codeOf(path.join(WEB, 'lib', 'backend', 'fake', 'index.ts'))));

  // `Backend` must not expose the privileged port. Checked as SOURCE, because
  // the type is erased at runtime and a test that cannot see it cannot assert
  // it.
  const backendDecl = portsSrc.slice(portsSrc.indexOf('export interface Backend'));
  const body = backendDecl.slice(0, backendDecl.indexOf('}') + 1);
  ok('the `Backend` interface has no `admin` member', !/\badmin\s*:/.test(body), body.trim());
  ok('…and it does declare the five that belong to it',
    ['auth', 'read', 'write', 'storage', 'realtime'].every(k => new RegExp(`\\b${k}\\s*:`).test(body)));
}

console.log('\n[15] الاتفاق مع الهجرات والنواة');
{
  // The nine categories, duplicated in ports.ts on purpose. This is the check
  // that makes the duplication safe.
  ok('POST_CATEGORIES equals the core ALL_CATEGORY_IDS, element for element',
    JSON.stringify([...POST_CATEGORIES]) === JSON.stringify([...ALL_CATEGORY_IDS]),
    `${POST_CATEGORIES.length} vs ${ALL_CATEGORY_IDS.length}`);

  // The four bucket names appear in a policy file the adapter never reads.
  const storageSql = readIf(path.join(ROOT, 'supabase', 'migrations', '0003_storage.sql'));
  const declared = [...storageSql.matchAll(/^\s*\('([a-z-]+)',\s*'\1',/gm)].map(m => m[1]);
  ok('every bucket in ports.ts is created by 0003',
    BUCKETS.every(b => declared.includes(b)), declared.join(','));
  ok('0003 creates no bucket ports.ts does not know about',
    declared.every(b => (BUCKETS as readonly string[]).includes(b)), declared.join(','));
  ok('…and there are four of them (the control)', declared.length === 4, String(declared.length));

  // The two order axes exist as columns.
  const fulfilSql = readIf(path.join(ROOT, 'supabase', 'migrations', '0004_order_fulfilment.sql'));
  ok('0004 adds the fulfilment column', /add column fulfilment order_fulfilment/.test(fulfilSql));
  ok('0004 renames the old `state` so neither axis is «the» state',
    /rename column state to payment_state/.test(fulfilSql));
  for (const s of Object.keys(ORDER_STATUS_NEXT)) {
    ok(`the enum in 0004 carries «${s}»`, new RegExp(`'${s}'`).test(fulfilSql));
  }

  // The migrations are still unapplied, and must not claim otherwise.
  const migrations = readdirSync(path.join(ROOT, 'supabase', 'migrations')).filter(f => f.endsWith('.sql'));
  ok('every migration says plainly it is not yet applied',
    migrations.every(f => /NOT YET APPLIED|not been applied|لم تُطبَّق/i.test(
      readIf(path.join(ROOT, 'supabase', 'migrations', f)))),
    migrations.join(','));
}

/* ── Seeds ────────────────────────────────────────────────────────────────── */

function profile(id: string, role: 'user' | 'moderator' | 'admin' | 'owner' = 'user',
  status: 'active' | 'banned' = 'active') {
  return {
    id, email: `${id}@example.com`, emailVerified: true, displayName: id,
    photoURL: null, bio: null, role, status, password: 'pw',
  };
}

function post(id: string, authorId: string, createdAt: string,
  status: 'active' | 'hidden' | 'deleted' = 'active'): PostSummary {
  return {
    id, authorId, authorName: authorId, authorPhoto: null, text: `نص ${id}`,
    category: null, mediaType: 'none', mediaURL: null, thumbnailURL: null,
    mediaWidth: null, mediaHeight: null, mediaDuration: null,
    commentsCount: 0, likesCount: 0, createdAt, editedAt: null, status,
  };
}

function seedCommunity(clock: FakeClock): Partial<FakeState> {
  return {
    profiles: [
      profile('alice'), profile('mallory'), profile('mod', 'moderator'),
      profile('banned-user', 'moderator', 'banned'),
    ],
    posts: [
      post('post-live', 'alice', clock.tick()),
      post('post-two', 'mallory', clock.tick()),
      post('post-three', 'alice', clock.tick()),
      post('post-hidden', 'alice', clock.tick(), 'hidden'),
      post('post-deleted', 'alice', clock.tick(), 'deleted'),
    ],
  };
}

function seedStore(): Partial<FakeState> {
  const products: StoreProductSummary[] = [
    { id: 'prod-live', nameAr: 'منتج منشور', nameEn: null, brand: null, categoryId: 'frames', published: true, suspendedReasonAr: null },
    { id: 'prod-draft', nameAr: 'منتج مسودة', nameEn: null, brand: null, categoryId: 'frames', published: false, suspendedReasonAr: null },
    { id: 'prod-suspended', nameAr: 'منتج موقوف', nameEn: null, brand: null, categoryId: 'frames', published: true, suspendedReasonAr: 'نفد المخزون' },
  ];
  const variants: StoreVariantSummary[] = [
    { id: 'var-1', productId: 'prod-live', labelAr: 'قياسي', priceMinor: 4999, currency: 'EUR', isDefault: true },
    { id: 'var-2', productId: 'prod-draft', labelAr: 'قياسي', priceMinor: 1000, currency: 'EUR', isDefault: true },
    { id: 'var-3', productId: 'prod-suspended', labelAr: 'قياسي', priceMinor: 1000, currency: 'EUR', isDefault: true },
  ];
  return {
    profiles: [profile('alice'), profile('mallory'), profile('boss', 'owner')],
    products,
    variants,
    shipping: [{ id: 'eu', baseMinor: 700, freeOverMinor: 50_000, active: true }],
  };
}

/* ── Verdict ──────────────────────────────────────────────────────────────── */

console.log('\n──────────────────────────────────────────────────────────────────');
console.log(`backend adapter: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

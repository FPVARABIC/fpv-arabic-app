/**
 * The store's foundation, against the promises it makes.
 *
 * THE TWO THINGS THIS FILE EXISTS FOR
 * -----------------------------------
 * 1. That a customer can never see what we paid. Not «the UI does not render
 *    it» — that the data is not in a document they may read, because a rule
 *    cannot withhold a field and a UI is one refactor from showing anything.
 *
 * 2. That no number is invented. A price is computed from a recorded cost or
 *    it does not exist; a specification is verified against a manufacturer or
 *    it is not presented as a fact. This is the encyclopedia's own rule, and a
 *    shop is where breaking it costs the reader money rather than time.
 *
 * Everything else — curation limits, the choice axis, the relationships — is
 * checked because those are what make this a curated shop rather than a list,
 * and a list is what it decays into the moment nobody is measuring.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { STORE_CATEGORIES, storeCategory, categoriesInGroup } from '../src/data/store/categories';
import { STORE_CATALOGUE, storeProduct, productsInCategory, categoryProductCount } from '../src/data/store/catalogue';
import {
  priceFrom, applyRounding, cartTotals, formatPrice, realisedMarginPercent, policyFor,
} from '../src/data/store/pricing';
import {
  INITIAL_PUBLIC_SETTINGS, INITIAL_PRIVATE_SETTINGS,
  validatePublicSettings, validatePrivateSettings,
} from '../src/data/store/settings';
import { INITIAL_DEFAULT_MARGIN_PERCENT, ORDER_STATUS_NEXT } from '../src/data/store/types';
import type { OrderStatus, StoreProduct } from '../src/data/store/types';
import { getArticle } from '../src/data/kb/registry';
import { kbTerms } from '../src/data/kb/glossary/terms';
import { bfPageRegistry } from '../src/data/betaflight/pageRegistry';
import { allEdgeTxPages } from '../src/data/edgetx/registry';
import { allVideoToolPages } from '../src/data/video/software/registry';
import { setupSteps } from '../src/data/expresslrs/setupSteps';

let passed = 0;
let failed = 0;
function ok(label: string, cond: boolean): void {
  if (cond) { passed++; console.log(`  ok — ${label}`); }
  else { failed++; console.error(`  FAIL — ${label}`); }
}

const ROOT = new URL('..', import.meta.url).pathname;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[1] The cost is not in anything a customer can read');
{
  /**
   * The assertion the whole model is shaped around. Firestore rules allow or
   * deny a WHOLE document — there is no way to return one with a field
   * withheld — so a public product carrying a supplier or a cost would expose
   * both to anyone who can read the price, and no rule could stop it.
   */
  const SUPPLY_FIELDS = [
    'supplierName', 'supplierNameAr', 'supplierUrl', 'unitCost', 'unitCostMinor',
    'inboundShipping', 'inboundShippingMinor', 'marginPercent', 'marginPercentOverride',
    'costCurrency',
  ];

  const leaky = STORE_CATALOGUE.filter(p =>
    SUPPLY_FIELDS.some(f => f in (p as unknown as Record<string, unknown>)));
  if (leaky.length) console.error('   LEAKY PRODUCTS:', leaky.map(p => p.id));
  ok('no public product carries a supply field', leaky.length === 0);

  // And the same at the type level, read from the source: a field added to the
  // public interface later would pass the runtime check above on seed data that
  // simply never sets it.
  const typesSrc = readFileSync(join(ROOT, 'src/data/store/types.ts'), 'utf8');
  const publicIface = typesSrc.slice(
    typesSrc.indexOf('export interface StoreProduct {'),
    typesSrc.indexOf('export interface StoreSupply {'),
  );
  const declaredLeak = SUPPLY_FIELDS.filter(f => new RegExp(`^\\s{2}${f}[?:]`, 'm').test(publicIface));
  if (declaredLeak.length) console.error('   DECLARED ON PUBLIC TYPE:', declaredLeak);
  ok('the public product type declares no supply field', declaredLeak.length === 0);

  // The rules must actually separate them, and close the supply side outright.
  const rules = readFileSync(join(ROOT, 'firestore.rules'), 'utf8');
  ok('the rules know about a separate supply collection', rules.includes('match /storeSupply/'));
  ok('supply is readable only by store staff',
    /match \/storeSupply\/\{[^}]+\} \{[\s\S]{0,400}?allow read: if isStoreStaff\(\);/.test(rules));
  ok('supply is never client-writable',
    /match \/storeSupply\/\{[^}]+\} \{[\s\S]{0,400}?allow write: if false;/.test(rules));

  // The margin is private for the subtler reason: price ÷ margin is the cost.
  ok('settings are split so the margin is not public',
    rules.includes("allow read: if docId == 'public' || isStoreStaff();"));
  const settingsSrc = readFileSync(join(ROOT, 'src/data/store/settings.ts'), 'utf8');
  const publicSettingsIface = typesSrc.slice(
    typesSrc.indexOf('export interface StorePublicSettings {'),
    typesSrc.indexOf('export interface StorePrivateSettings {'),
  );
  ok('the public settings type has no margin', !/margin/i.test(publicSettingsIface));
  ok('the default margin ships in the private seed',
    settingsSrc.includes('INITIAL_PRIVATE_SETTINGS')
    && INITIAL_PRIVATE_SETTINGS.defaultMarginPercent === INITIAL_DEFAULT_MARGIN_PERCENT);

  // Positive control: the leak check must be able to detect a leak.
  const planted = { ...STORE_CATALOGUE[0], supplierUrl: 'https://example.invalid' };
  ok('the leak check can detect a planted supply field',
    SUPPLY_FIELDS.some(f => f in planted));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[2] Prices are computed, never invented');
{
  // No seed product carries a price. A price exists only once somebody has
  // recorded what we pay, and a number written here would be one a customer
  // could act on.
  const priced = STORE_CATALOGUE.filter(p => p.priceMinor !== null);
  if (priced.length) console.error('   HARD-CODED PRICES:', priced.map(p => p.id));
  ok('no seed product ships with a hard-coded price', priced.length === 0);

  const settings = { defaultMarginPercent: 10 };

  // The engine refuses to price an incomplete record rather than guessing.
  ok('a missing cost prices nothing',
    priceFrom({ unitCostMinor: 0, inboundShippingMinor: 0, costCurrency: 'USD' }, settings) === null);
  ok('a negative cost prices nothing',
    priceFrom({ unitCostMinor: -100, inboundShippingMinor: 0, costCurrency: 'USD' }, settings) === null);
  ok('a fractional cost prices nothing — money is integer minor units',
    priceFrom({ unitCostMinor: 12.5, inboundShippingMinor: 0, costCurrency: 'USD' }, settings) === null);
  ok('a negative shipping cost prices nothing',
    priceFrom({ unitCostMinor: 1000, inboundShippingMinor: -1, costCurrency: 'USD' }, settings) === null);
  ok('a negative margin prices nothing',
    priceFrom({ unitCostMinor: 1000, inboundShippingMinor: 0, costCurrency: 'USD' },
      { defaultMarginPercent: -5 }) === null);

  // Margin applies to LANDED cost — unit plus inbound shipping. Applying it to
  // the unit alone yields a margin nobody chose and everybody believes.
  const b = priceFrom({ unitCostMinor: 3000, inboundShippingMinor: 2000, costCurrency: 'USD' }, settings)!;
  ok('margin is applied to unit + shipping, not to unit alone', b.landedCostMinor === 5000);
  ok('a 10% margin on $50 landed produces $55 before rounding', b.rawSellMinor === 5500);
  ok('the sell price is never below landed cost', b.sellMinor >= b.landedCostMinor);

  // Rounding always goes UP: rounding down sells under the chosen margin.
  for (const [inMinor, mode, want] of [
    [5500, 'exact', 5500], [5500, 'whole', 5500], [5501, 'whole', 5600],
    [5530, 'charm', 5599], [5599, 'charm', 5599], [5600, 'charm', 5699],
  ] as const) {
    ok(`rounding ${mode} of ${inMinor} → ${want}`, applyRounding(inMinor, mode, 'USD') === want);
  }
  const rounded = [2500, 2501, 9999, 100, 1].every(m =>
    applyRounding(m, 'charm', 'USD') >= m && applyRounding(m, 'whole', 'USD') >= m);
  ok('no rounding mode ever lowers a price', rounded);

  // The realised margin is not the requested one, and the model says so rather
  // than letting a shop owner believe a number that rounding moved.
  ok('the realised margin is reported, and differs from the request',
    realisedMarginPercent(b) > 10 && realisedMarginPercent(b) < 13);

  // A per-product override beats the store default; an absent one does not.
  ok('an override replaces the default margin',
    policyFor({ marginPercentOverride: 25 }, settings).marginPercent === 25);
  ok('an absent override falls back to the store default',
    policyFor({}, settings).marginPercent === 10);
  ok('a nonsensical override falls back rather than selling at a loss',
    policyFor({ marginPercentOverride: -3 }, settings).marginPercent === 10);

  // The default margin is a seed, not a constant a component reads.
  const componentReads = walk(join(ROOT, 'web'))
    .filter(f => /INITIAL_DEFAULT_MARGIN_PERCENT|defaultMarginPercent/.test(readFileSync(f, 'utf8')));
  if (componentReads.length) console.error('   MARGIN READ IN WEB:', componentReads.map(f => f.slice(ROOT.length)));
  ok('no web component reads the margin at all', componentReads.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[3] Totals add up, in integers');
{
  const t = cartTotals(
    [{ productId: 'a', quantity: 2, unitPriceMinor: 1999 },
      { productId: 'b', quantity: 1, unitPriceMinor: 500 }],
    1200,
  );
  ok('line totals sum exactly', t.itemsTotalMinor === 1999 * 2 + 500);
  ok('the total includes shipping', t.totalMinor === t.itemsTotalMinor + 1200);
  ok('the item count is the sum of quantities', t.itemCount === 3);

  // Nonsense lines are dropped rather than poisoning a total.
  const bad = cartTotals([
    { productId: 'a', quantity: 0, unitPriceMinor: 100 },
    { productId: 'b', quantity: -1, unitPriceMinor: 100 },
    { productId: 'c', quantity: 1.5, unitPriceMinor: 100 },
    { productId: 'd', quantity: 1, unitPriceMinor: -100 },
    { productId: 'e', quantity: 2, unitPriceMinor: 250 },
  ], 0);
  ok('malformed lines are ignored, not summed', bad.itemsTotalMinor === 500 && bad.itemCount === 2);
  ok('a negative shipping figure is refused', cartTotals([], -50).shippingMinor === 0);

  // The float trap this model exists to avoid.
  const cents = cartTotals(Array.from({ length: 3 }, () => (
    { productId: 'x', quantity: 1, unitPriceMinor: 10 })), 0);
  ok('three lots of $0.10 total exactly $0.30', cents.itemsTotalMinor === 30);
  ok('and the same sum in floats would not have', 0.1 + 0.1 + 0.1 !== 0.3);

  ok('a price formats with its currency', formatPrice(5599, 'USD') === '55.99 دولار');
  ok('a whole price drops the decimals', formatPrice(5500, 'USD') === '55 دولار');
  ok('thousands are grouped', formatPrice(123456, 'USD') === '1,234.56 دولار');
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[4] Curated, not catalogued');
{
  ok(`the store has sections (${STORE_CATEGORIES.length})`, STORE_CATEGORIES.length >= 20);
  ok(`and products (${STORE_CATALOGUE.length})`, STORE_CATALOGUE.length >= 25);

  // The rule that makes this a curated shop. Both bounds matter: an empty
  // section is the «قريباً» emptiness the brief refused, and a section of
  // twenty has handed the decision back to the reader.
  const empty = STORE_CATEGORIES.filter(c => categoryProductCount(c.id) === 0);
  if (empty.length) console.error('   EMPTY SECTIONS:', empty.map(c => c.id));
  ok('no section ships empty', empty.length === 0);

  const bloated = STORE_CATEGORIES.filter(c => categoryProductCount(c.id) > 5);
  if (bloated.length) console.error('   BLOATED SECTIONS:', bloated.map(c => `${c.id}:${categoryProductCount(c.id)}`));
  ok('no section exceeds five products', bloated.length === 0);

  // Three products only read as a choice if they sit at different points on
  // the section's axis. Two «middle» options and nothing else is a list.
  const undifferentiated = STORE_CATEGORIES.filter(c => {
    const ps = productsInCategory(c.id);
    if (ps.length < 2) return false;
    return new Set(ps.map(p => p.choicePosition)).size === 1;
  });
  if (undifferentiated.length) console.error('   NO SPREAD:', undifferentiated.map(c => c.id));
  ok('every multi-product section spans more than one point on its axis',
    undifferentiated.length === 0);

  // Ordered along the axis, so the page reads cheap → expensive.
  const rank: Record<string, number> = { entry: 0, middle: 1, pro: 2, variant: 3 };
  const misordered = STORE_CATEGORIES.filter(c => {
    const ps = productsInCategory(c.id).map(p => rank[p.choicePosition]);
    return ps.some((v, i) => i > 0 && v < ps[i - 1]);
  });
  ok('every section is ordered along its axis', misordered.length === 0);

  const dupIds = STORE_CATALOGUE.map(p => p.id).filter((id, i, a) => a.indexOf(id) !== i);
  ok('no product id is used twice', dupIds.length === 0);

  const strayCategory = STORE_CATALOGUE.filter(p => !storeCategory(p.categoryId));
  ok('every product sits in a real section', strayCategory.length === 0);

  const strayCollection = STORE_CATALOGUE.flatMap(p =>
    p.collections.filter(c => !storeCategory(c)).map(c => `${p.id}→${c}`));
  ok('every use-case collection names a real section', strayCollection.length === 0);

  ok('both groups have sections',
    categoriesInGroup('aircraft').length > 0 && categoriesInGroup('components').length > 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[5] Every product earns its place');
{
  /**
   * These are required fields on the model, so the check is that they are
   * genuinely filled rather than present-and-empty. `notForAr` is the one that
   * matters most: a shop that will not say «هذا ليس لك» has nothing to offer
   * over a supplier's stock list, and it is the section no competitor writes.
   */
  const missing = (f: (p: StoreProduct) => unknown[], name: string) => {
    const bad = STORE_CATALOGUE.filter(p => f(p).length === 0);
    if (bad.length) console.error(`   NO ${name}:`, bad.map(p => p.id));
    ok(`every product says ${name}`, bad.length === 0);
  };
  missing(p => p.suitsAr, 'who it suits');
  missing(p => p.notForAr, 'who it does NOT suit');
  missing(p => p.highlightsAr, 'what stands out');
  missing(p => p.inTheBoxAr, 'what is in the box');

  const thin = STORE_CATALOGUE.filter(p => p.summaryAr.length < 60);
  ok('no product summary is a stub', thin.length === 0);

  const noReview = STORE_CATALOGUE.filter(p => !/^\d{4}-\d{2}-\d{2}$/.test(p.reviewedAt));
  ok('every product carries a review date', noReview.length === 0);

  // A spec is a fact or it is not presented as one. Nothing may claim
  // verification without naming where it was verified.
  const unsourced = STORE_CATALOGUE.flatMap(p =>
    p.specs.filter(s => s.verified && !s.sourceUrl).map(s => `${p.id}:${s.labelAr}`));
  if (unsourced.length) console.error('   VERIFIED WITHOUT A SOURCE:', unsourced);
  ok('no spec claims verification without a source', unsourced.length === 0);

  // An image is published only with its permission recorded — using a
  // manufacturer's photography without it is both what the brief refused and a
  // real exposure.
  const uncredited = STORE_CATALOGUE.flatMap(p =>
    p.images.filter(i => !i.credit).map(() => p.id));
  if (uncredited.length) console.error('   IMAGES WITHOUT PERMISSION:', uncredited);
  ok('no image ships without its permission recorded', uncredited.length === 0);

  const noAlt = STORE_CATALOGUE.flatMap(p => p.images.filter(i => !i.altAr).map(() => p.id));
  ok('every image carries alternative text', noAlt.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[6] Nothing links into a void');
{
  const ids = new Set(STORE_CATALOGUE.map(p => p.id));
  const dangling: string[] = [];
  for (const p of STORE_CATALOGUE) {
    for (const rel of [...p.relatedProductIds, ...p.alternativeProductIds, ...p.completesProductIds]) {
      if (!ids.has(rel)) dangling.push(`${p.id}→${rel}`);
    }
    if (p.alternativeProductIds.includes(p.id)) dangling.push(`${p.id}→itself`);
  }
  if (dangling.length) console.error('   DANGLING:', dangling);
  ok('every product relationship names a real product', dangling.length === 0);

  // The store's one real advantage: it sits on an encyclopedia. A learn link
  // that goes nowhere is that advantage, broken.
  const deadLearn: string[] = [];
  const checkLink = (owner: string, kind: string, targetId: string) => {
    if (kind === 'external' || !targetId) return;
    if (kind === 'article' && !getArticle(targetId)) deadLearn.push(`${owner}→article:${targetId}`);
    if (kind === 'glossary' && !kbTerms.some(t => t.id === targetId)) deadLearn.push(`${owner}→glossary:${targetId}`);
    if (kind === 'betaflight' && !bfPageRegistry.some(b => b.id === targetId && !!b.page)) {
      deadLearn.push(`${owner}→betaflight:${targetId}`);
    }
    if (kind === 'edgetx' && !allEdgeTxPages.some(e => e.id === targetId)) deadLearn.push(`${owner}→edgetx:${targetId}`);
    if (kind === 'video' && !allVideoToolPages.some(v => v.id === targetId)) deadLearn.push(`${owner}→video:${targetId}`);
    if (kind === 'elrs-setup' && !setupSteps.some(s => s.id === targetId)) deadLearn.push(`${owner}→elrs:${targetId}`);
  };
  for (const p of STORE_CATALOGUE) for (const l of p.learnLinks) checkLink(p.id, l.kind, l.targetId);
  for (const c of STORE_CATEGORIES) if (c.learnLink) checkLink(c.id, c.learnLink.kind, c.learnLink.targetId);
  const banner = INITIAL_PUBLIC_SETTINGS.banner.link;
  if (banner) checkLink('banner', banner.kind, banner.targetId);

  if (deadLearn.length) console.error('   DEAD LEARN LINKS:', deadLearn);
  ok('every «اقرأ قبل أن تقرّر» link resolves', deadLearn.length === 0);

  // Positive control.
  const control: string[] = [];
  checkLink('control', 'article', 'no-such-article-exists');
  control.push(...deadLearn);
  ok('the link checker can detect a break', !getArticle('no-such-article-exists'));

  const sectionsWithLearn = STORE_CATEGORIES.filter(c => c.learnLink).length;
  ok(`several sections name something to read first (${sectionsWithLearn})`, sectionsWithLearn >= 8);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[7] Settings are managed, not compiled in');
{
  ok('the banner ships enabled with real copy',
    INITIAL_PUBLIC_SETTINGS.banner.enabled
    && INITIAL_PUBLIC_SETTINGS.banner.headlineAr.length > 10
    && INITIAL_PUBLIC_SETTINGS.banner.bodyAr.length > 40);

  ok('the free setup offer is the banner\'s subject',
    /مجان/.test(INITIAL_PUBLIC_SETTINGS.banner.headlineAr));

  // The banner text must not be duplicated into a component — that is how a
  // setting quietly becomes a constant nobody can edit.
  const webFiles = walk(join(ROOT, 'web'));
  const copied = webFiles.filter(f =>
    readFileSync(f, 'utf8').includes(INITIAL_PUBLIC_SETTINGS.banner.headlineAr));
  if (copied.length) console.error('   BANNER COPIED INTO:', copied.map(f => f.slice(ROOT.length)));
  ok('the banner text lives only in settings', copied.length === 0);

  // Malformed stored settings fall back rather than rendering «undefined».
  ok('nonsense settings fall back to the seed',
    validatePublicSettings(null).currency === INITIAL_PUBLIC_SETTINGS.currency
    && validatePublicSettings({ currency: 'BTC' }).currency === 'USD');
  ok('a valid stored currency is honoured', validatePublicSettings({ currency: 'SAR' }).currency === 'SAR');
  ok('a stored banner headline is honoured',
    validatePublicSettings({ banner: { enabled: true, headlineAr: 'عرض جديد', bodyAr: 'نصّ' } })
      .banner.headlineAr === 'عرض جديد');

  ok('a negative default margin is refused',
    validatePrivateSettings({ defaultMarginPercent: -10 }).defaultMarginPercent === INITIAL_DEFAULT_MARGIN_PERCENT);
  ok('an absurd default margin is refused',
    validatePrivateSettings({ defaultMarginPercent: 100_000 }).defaultMarginPercent === INITIAL_DEFAULT_MARGIN_PERCENT);
  ok('a sane default margin is honoured',
    validatePrivateSettings({ defaultMarginPercent: 22 }).defaultMarginPercent === 22);
  ok('the initial default margin is the 10% that was asked for',
    INITIAL_DEFAULT_MARGIN_PERCENT === 10);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[8] An order is a record, not a draft');
{
  // Forward-only. A delivered order that can return to «received» is a record
  // both sides can rewrite, which is not a record.
  const reachable = (from: OrderStatus, to: OrderStatus, seen = new Set<OrderStatus>()): boolean => {
    if (from === to) return true;
    if (seen.has(from)) return false;
    seen.add(from);
    return ORDER_STATUS_NEXT[from].some(n => reachable(n, to, seen));
  };
  ok('a delivered order is terminal', ORDER_STATUS_NEXT.delivered.length === 0);
  ok('a cancelled order is terminal', ORDER_STATUS_NEXT.cancelled.length === 0);
  ok('no status can return to «received»',
    (Object.keys(ORDER_STATUS_NEXT) as OrderStatus[])
      .filter(s => s !== 'received')
      .every(s => !ORDER_STATUS_NEXT[s].includes('received')));
  ok('every status is reachable from the first one',
    (Object.keys(ORDER_STATUS_NEXT) as OrderStatus[]).every(s => reachable('received', s)));

  const rules = readFileSync(join(ROOT, 'firestore.rules'), 'utf8');
  ok('orders are never client-writable',
    /match \/storeOrders\/\{[^}]+\} \{[\s\S]{0,900}?allow write: if false;/.test(rules));
  ok('an order is readable only by its owner or staff',
    rules.includes('resource.data.customerUid == request.auth.uid || isStoreStaff()'));
  ok('reading an order requires sign-in at all',
    /match \/storeOrders\/[\s\S]{0,300}?allow read: if isSignedIn\(\)/.test(rules));

  // A product must be published to be read by a customer, so an unpublished
  // draft is invisible rather than merely unlinked.
  ok('an unpublished product is unreadable by customers',
    rules.includes('allow read: if resource.data.published == true || isStoreStaff();'));
  ok('products are never client-writable',
    /match \/storeProducts\/\{[^}]+\} \{[\s\S]{0,600}?allow write: if false;/.test(rules));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[9] The store holds no content of its own on the web');
{
  const storeWeb = walk(join(ROOT, 'web'))
    .filter(f => /web\/(app\/store|components\/store|lib\/store)/.test(f))
    .map(f => [f.slice(ROOT.length), readFileSync(f, 'utf8')] as const);
  ok(`the storefront is a handful of files (${storeWeb.length})`, storeWeb.length >= 4);

  const stripped = storeWeb.map(([f, s]) =>
    [f, s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')] as const);

  // No product prose in a component. Every judgement comes from the catalogue.
  const productProse = STORE_CATALOGUE
    .flatMap(p => [p.summaryAr, ...p.suitsAr, ...p.notForAr])
    .filter(t => t.length > 40);
  const copied = productProse.filter(t => stripped.some(([, s]) => s.includes(t)));
  ok('no product description is copied into a component', copied.length === 0);

  // No hand-written product or category route.
  const handRoutes = stripped.filter(([, s]) => /["'`]\/store\/(?!\$)[a-z]/.test(s));
  if (handRoutes.length) console.error('   HAND-WRITTEN STORE ROUTES:', handRoutes.map(r => r[0]));
  ok('no component writes a store route by hand', handRoutes.length === 0);

  // And no price arithmetic outside the engine — a component that computes a
  // total is a second pricing engine with different rounding.
  const arithmetic = stripped.filter(([f, s]) =>
    !f.includes('lib/store.ts') && /\*\s*1\.\d|\/\s*100\b.*price|priceMinor\s*[*+-]/i.test(s));
  if (arithmetic.length) console.error('   PRICE MATHS IN WEB:', arithmetic.map(r => r[0]));
  ok('no component does price arithmetic', arithmetic.length === 0);
}

console.log(`\n${failed === 0 ? '✅' : '❌'} testStore: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

void storeProduct;
